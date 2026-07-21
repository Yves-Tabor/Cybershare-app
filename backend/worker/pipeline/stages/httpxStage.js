const { spawn } = require('child_process');
const { URL } = require('url');
const { scanLogger } = require('../../../src/utils/logger');
const pool = require('../../../src/config/database');
const { resolveToolExecutable } = require('../../../src/services/scanner/toolResolver');

/**
 * HTTPX Stage
 * Validates target reachability and collects HTTP metadata
 */
async function runHttpxStage(scanJobId, targetUrl, validation, job) {
  scanLogger.info(`[HTTPX] Starting HTTPX scan for job ${scanJobId}`);

  const findings = [];
  const startTime = Date.now();

  try {
    // Create scan result record
    const resultId = await createScanResult(scanJobId, 'httpx', 'httpx');

    // Resolve HTTPX executable
    const httpxExecutable = resolveToolExecutable('httpx') || 'httpx';

    // Prepare HTTPX command
    const args = [
      '-u', targetUrl,
      '-json',
      '-silent',
      '-no-color',
      '-tech-detect',
      '-status-code',
      '-title',
      '-server',
      '-content-length',
      '-response-time',
    ];

    scanLogger.info(`[HTTPX] Executing: ${httpxExecutable} ${args.join(' ')}`);

    // Spawn HTTPX process
    const httpxProcess = spawn(httpxExecutable, args);

    let stdout = '';
    let stderr = '';

    httpxProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    httpxProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    // Set timeout
    const timeout = setTimeout(() => {
      httpxProcess.kill('SIGKILL');
      scanLogger.warn(`[HTTPX] Process timeout for job ${scanJobId}`);
    }, 30000); // 30 second timeout

    // Wait for process completion
    await new Promise((resolve, reject) => {
      httpxProcess.on('close', (code) => {
        clearTimeout(timeout);
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`HTTPX exited with code ${code}`));
        }
      });

      httpxProcess.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });

    // Parse HTTPX output
    const httpxData = parseHttpxOutput(stdout);

    // Update scan target with HTTPX data
    if (httpxData) {
      await updateScanTarget(scanJobId, httpxData);
    }

    // Update scan result
    const duration = Date.now() - startTime;
    await updateScanResult(resultId, true, duration, stdout, null);

    // Generate findings based on HTTPX data
    const httpxFindings = generateHttpxFindings(httpxData, targetUrl);
    findings.push(...httpxFindings);

    scanLogger.info(`[HTTPX] Completed for job ${scanJobId}`, {
      duration,
      findingsCount: httpxFindings.length,
    });

    return {
      success: true,
      findings: httpxFindings,
      data: httpxData,
    };

  } catch (error) {
    scanLogger.error(`[HTTPX] Failed for job ${scanJobId}:`, error);

    // Generate error finding
    findings.push({
      category: 'Target Validation',
      severity: 'high',
      title: 'HTTPX Scan Failed',
      description: `Failed to validate target with HTTPX: ${error.message}`,
      recommendation: 'Ensure the target URL is accessible and HTTPX is properly installed.',
      scannerName: 'httpx',
    });

    return {
      success: false,
      findings,
      error: error.message,
    };
  }
}

/**
 * Parse HTTPX JSON output
 */
function parseHttpxOutput(stdout) {
  if (!stdout.trim()) return null;

  try {
    const lines = stdout.trim().split('\n');
    const results = [];

    for (const line of lines) {
      try {
        const data = JSON.parse(line);
        results.push(data);
      } catch (e) {
        // Skip invalid JSON lines
      }
    }

    return results.length > 0 ? results[0] : null;
  } catch (error) {
    scanLogger.error('[HTTPX] Failed to parse output:', error);
    return null;
  }
}

/**
 * Update scan target with HTTPX data
 */
async function updateScanTarget(scanJobId, httpxData) {
  try {
    await pool.query(
      `UPDATE scan_targets
       SET http_status = $1,
           http_server = $2,
           content_type = $3,
           content_length = $4,
           response_time_ms = $5,
           technologies = $6
       WHERE scan_job_id = $7`,
      [
        httpxData.status_code || null,
        httpxData.server || null,
        httpxData.content_type || null,
        httpxData.content_length || null,
        httpxData.response_time || null,
        JSON.stringify(httpxData.technologies || []),
        scanJobId,
      ]
    );
  } catch (error) {
    scanLogger.error('[HTTPX] Failed to update scan target:', error);
  }
}

/**
 * Generate findings from HTTPX data
 */
function generateHttpxFindings(httpxData, targetUrl) {
  const findings = [];

  if (!httpxData) {
    findings.push({
      category: 'Target Validation',
      severity: 'high',
      title: 'Target Not Reachable',
      description: 'HTTPX could not reach the target URL. The target may be down or blocking scans.',
      recommendation: 'Verify the target URL is accessible and not blocking security scanners.',
      scannerName: 'httpx',
    });
    return findings;
  }

  // Check for HTTP instead of HTTPS
  if (httpxData.url && httpxData.url.startsWith('http://')) {
    findings.push({
      category: 'SSL/TLS',
      severity: 'critical',
      title: 'Target Uses HTTP Instead of HTTPS',
      description: 'The target is using HTTP instead of HTTPS, which transmits data unencrypted.',
      recommendation: 'Configure the target to use HTTPS with a valid SSL certificate.',
      scannerName: 'httpx',
    });
  }

  // Check for server information disclosure
  if (httpxData.server) {
    findings.push({
      category: 'HTTP Headers',
      severity: 'low',
      title: 'Server Header Disclosure',
      description: `The Server header reveals: ${httpxData.server}`,
      recommendation: 'Configure your server to hide or minimize the Server header information.',
      scannerName: 'httpx',
    });
  }

  // Check for missing security headers (basic check)
  if (httpxData.headers) {
    const headers = httpxData.headers;
    const securityHeaders = [
      { name: 'Content-Security-Policy', severity: 'high' },
      { name: 'Strict-Transport-Security', severity: 'high' },
      { name: 'X-Frame-Options', severity: 'medium' },
      { name: 'X-Content-Type-Options', severity: 'medium' },
    ];

    for (const header of securityHeaders) {
      const headerExists = Object.keys(headers).some(
        key => key.toLowerCase() === header.name.toLowerCase()
      );

      if (!headerExists) {
        findings.push({
          category: 'HTTP Headers',
          severity: header.severity,
          title: `Missing ${header.name} Header`,
          description: `The ${header.name} header is missing, which may expose the application to security risks.`,
          recommendation: `Implement the ${header.name} header to improve security.`,
          scannerName: 'httpx',
        });
      }
    }
  }

  // Technology detection findings
  if (httpxData.technologies && httpxData.technologies.length > 0) {
    findings.push({
      category: 'Technology Detection',
      severity: 'informational',
      title: 'Technologies Detected',
      description: `The following technologies were detected: ${httpxData.technologies.join(', ')}`,
      recommendation: 'Keep detected technologies updated and monitor for security advisories.',
      scannerName: 'httpx',
      metadata: { technologies: httpxData.technologies },
    });
  }

  return findings;
}

/**
 * Create scan result record
 */
async function createScanResult(scanJobId, scannerName, scannerStage) {
  const result = await pool.query(
    `INSERT INTO scan_results (scan_job_id, scanner_name, scanner_stage, started_at)
     VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
     RETURNING id`,
    [scanJobId, scannerName, scannerStage]
  );
  return result.rows[0].id;
}

/**
 * Update scan result record
 */
async function updateScanResult(resultId, success, duration, rawOutput, errorMessage) {
  await pool.query(
    `UPDATE scan_results
     SET success = $1,
         duration_ms = $2,
         raw_output = $3,
         error_message = $4,
         completed_at = CURRENT_TIMESTAMP
     WHERE id = $5`,
    [success, duration, rawOutput, errorMessage, resultId]
  );
}

module.exports = {
  runHttpxStage,
};
