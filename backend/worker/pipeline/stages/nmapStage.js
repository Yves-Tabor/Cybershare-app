const { spawn } = require('child_process');
const { URL } = require('url');
const { scanLogger } = require('../../../src/utils/logger');
const pool = require('../../../src/config/database');
const { resolveToolExecutable } = require('../../../src/services/scanner/toolResolver');
const { parseNmapXmlSync } = require('../parsers/nmapParser');

/**
 * Nmap Stage
 * Performs port scanning and service detection
 */
async function runNmapStage(scanJobId, targetUrl, validation, job) {
  scanLogger.info(`[Nmap] Starting Nmap scan for job ${scanJobId}`);

  const findings = [];
  const startTime = Date.now();
  const NMAP_TIMEOUT_MS = Math.min(
    Number(process.env.NMAP_TIMEOUT_MS) || 30000,
    30000,
  );

  try {
    // Create scan result record
    const resultId = await createScanResult(scanJobId, 'nmap', 'nmap');

    // Resolve Nmap executable
    const nmapExecutable = resolveToolExecutable('nmap') || 'nmap';

    // Parse hostname from URL
    const url = new URL(targetUrl);
    const hostname = validation.hostname || url.hostname;

    // Prepare Nmap command
    const args = [
      '-Pn', // Skip host discovery
      '-T4', // Aggressive timing
      '-F', // Fast scan (fewer ports)
      '--host-timeout', '25s',
      '-oX', '-', // Output XML to stdout
      hostname,
    ];

    scanLogger.info(`[Nmap] Executing: ${nmapExecutable} ${args.join(' ')}`);

    // Spawn Nmap process
    const nmapProcess = spawn(nmapExecutable, args);

    let stdout = '';
    let stderr = '';

    nmapProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    nmapProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    // Set timeout
    const timeout = setTimeout(() => {
      nmapProcess.kill('SIGKILL');
      scanLogger.warn(`[Nmap] Process timeout for job ${scanJobId}`);
    }, NMAP_TIMEOUT_MS);

    // Wait for process completion
    await new Promise((resolve, reject) => {
      nmapProcess.on('close', (code) => {
        clearTimeout(timeout);
        if (code === 0 || code === 1) { // Nmap returns 1 if no hosts found, which is OK
          resolve();
        } else {
          reject(new Error(`Nmap exited with code ${code}`));
        }
      });

      nmapProcess.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });

    // Parse Nmap XML output
    const nmapData = parseNmapXmlSync(stdout);

    // Update scan result
    const duration = Date.now() - startTime;
    await updateScanResult(resultId, true, duration, stdout, null);

    // Generate findings based on Nmap data
    const nmapFindings = generateNmapFindings(nmapData, hostname);
    findings.push(...nmapFindings);

    // Store parsed data
    if (nmapData) {
      await pool.query(
        `UPDATE scan_results
         SET parsed_data = $1
         WHERE id = $2`,
        [JSON.stringify(nmapData), resultId]
      );
    }

    scanLogger.info(`[Nmap] Completed for job ${scanJobId}`, {
      duration,
      findingsCount: nmapFindings.length,
      portsFound: nmapData?.ports?.length || 0,
    });

    return {
      success: true,
      findings: nmapFindings,
      data: nmapData,
    };

  } catch (error) {
    scanLogger.error(`[Nmap] Failed for job ${scanJobId}:`, error);

    // Generate error finding
    findings.push({
      category: 'Network',
      severity: 'high',
      title: 'Nmap Scan Failed',
      description: `Failed to run Nmap scan: ${error.message}`,
      recommendation: 'Ensure Nmap is installed and accessible. Check network connectivity to the target.',
      scannerName: 'nmap',
    });

    return {
      success: false,
      findings,
      error: error.message,
    };
  }
}

/**
 * Generate findings from Nmap data
 */
function generateNmapFindings(nmapData, hostname) {
  const findings = [];

  if (!nmapData || !nmapData.ports) {
    findings.push({
      category: 'Network',
      severity: 'informational',
      title: 'Nmap: No Open Ports Detected',
      description: `Nmap did not detect any open ports on ${hostname}. This can happen if the host filters probes or has no commonly exposed ports.`,
      recommendation: 'Verify the target is accessible and consider scanning all ports if needed.',
      scannerName: 'nmap',
    });
    return findings;
  }

  const openPorts = nmapData.ports.filter(p => p.state === 'open');

  if (openPorts.length === 0) {
    findings.push({
      category: 'Network',
      severity: 'informational',
      title: 'Nmap: No Open Ports Detected',
      description: `Nmap did not detect any open ports on ${hostname}.`,
      recommendation: 'Verify the target is accessible and consider scanning all ports if needed.',
      scannerName: 'nmap',
    });
    return findings;
  }

  // Report open ports
  const portList = openPorts.map(p => `Port ${p.port}/${p.protocol} (${p.service || 'unknown'})`).join(', ');
  findings.push({
    category: 'Network',
    severity: 'informational',
    title: 'Nmap: Open Ports Detected',
    description: `The following open ports were detected: ${portList}.`,
    recommendation: 'Review each open port and ensure only necessary services are exposed. Consider closing unused ports.',
    scannerName: 'nmap',
    metadata: { ports: openPorts },
  });

  // Check for potentially risky services
  const riskyServices = ['ssh', 'telnet', 'ftp', 'http', 'https', 'smb', 'netbios', 'mysql', 'postgresql', 'redis', 'mongodb'];
  
  openPorts.forEach(({ port, service, version }) => {
    const serviceLower = (service || '').toLowerCase();
    if (riskyServices.some(risk => serviceLower.includes(risk))) {
      findings.push({
        category: 'Network',
        severity: 'medium',
        title: `Nmap: Potentially Exposed Service ${service} on Port ${port}`,
        description: `Service ${service}${version ? ` (${version})` : ''} is exposed on port ${port}. Ensure this service is properly secured and only accessible from trusted networks.`,
        recommendation: 'Review access controls for this service and consider using firewalls to restrict access.',
        scannerName: 'nmap',
        metadata: { port, service, version },
      });
    }
  });

  // Check for common web ports
  const webPorts = openPorts.filter(p => p.port === 80 || p.port === 443 || p.port === 8080 || p.port === 8443);
  if (webPorts.length > 0) {
    findings.push({
      category: 'Network',
      severity: 'informational',
      title: 'Nmap: Web Services Detected',
      description: `Web services are running on ports: ${webPorts.map(p => p.port).join(', ')}.`,
      recommendation: 'Ensure web servers are properly configured with security headers and HTTPS.',
      scannerName: 'nmap',
      metadata: { webPorts: webPorts.map(p => p.port) },
    });
  }

  // Check for outdated service versions (basic check)
  openPorts.forEach(({ port, service, version }) => {
    if (version && (version.includes('1.0') || version.includes('2.0') || version.includes('old'))) {
      findings.push({
        category: 'Network',
        severity: 'medium',
        title: `Nmap: Potentially Outdated Service Version`,
        description: `Service ${service} on port ${port} appears to be running version ${version}, which may be outdated.`,
        recommendation: 'Update the service to the latest stable version to patch known vulnerabilities.',
        scannerName: 'nmap',
        metadata: { port, service, version },
      });
    }
  });

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
  runNmapStage,
};
