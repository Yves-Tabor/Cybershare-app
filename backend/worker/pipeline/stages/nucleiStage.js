const { spawn } = require('child_process');
const { URL } = require('url');
const path = require('path');
const fs = require('fs');
const { scanLogger } = require('../../../src/utils/logger');
const pool = require('../../../src/config/database');
const { resolveToolExecutable, resolveNucleiTemplatesDir } = require('../../../src/services/scanner/toolResolver');
const { parseNucleiJsonl } = require('../parsers/nucleiParser');

/**
 * Nuclei Stage
 * Performs vulnerability scanning using Nuclei templates
 */
async function runNucleiStage(scanJobId, targetUrl, validation, job) {
  scanLogger.info(`[Nuclei] Starting Nuclei scan for job ${scanJobId}`);

  const findings = [];
  const startTime = Date.now();
  const NUCLEI_TIMEOUT_MS = Math.min(
    Number(process.env.NUCLEI_TIMEOUT_MS) || 30000,
    30000,
  );

  try {
    // Create scan result record
    const resultId = await createScanResult(scanJobId, 'nuclei', 'nuclei');

    // Resolve Nuclei executable
    const nucleiExecutable = resolveToolExecutable('nuclei') || 'nuclei';

    // Resolve Nuclei templates directory
    const nucleiTemplatesDir = resolveNucleiTemplatesDir();

    if (!nucleiTemplatesDir || !fs.existsSync(nucleiTemplatesDir)) {
      scanLogger.warn(`[Nuclei] Templates directory not found for job ${scanJobId}`);
      
      findings.push({
        category: 'Vulnerability',
        severity: 'critical',
        title: 'Nuclei Templates Not Found',
        description: 'Nuclei templates directory could not be located. Vulnerability scanning requires templates.',
        recommendation: 'Run nuclei -update-templates or set NUCLEI_TEMPLATES_DIR to your nuclei templates folder.',
        scannerName: 'nuclei',
      });

      await updateScanResult(resultId, false, Date.now() - startTime, null, 'Templates directory not found');
      return { success: false, findings };
    }

    // Get quick template paths for fast scanning
    const templatePaths = getQuickTemplatePaths(nucleiTemplatesDir);

    if (templatePaths.length === 0) {
      scanLogger.warn(`[Nuclei] No template paths found for job ${scanJobId}`);
      
      findings.push({
        category: 'Vulnerability',
        severity: 'critical',
        title: 'Nuclei Templates Not Found',
        description: 'No supported quick-scan template folders were found.',
        recommendation: 'Update nuclei templates with nuclei -update-templates or set NUCLEI_TEMPLATES_DIR correctly.',
        scannerName: 'nuclei',
      });

      await updateScanResult(resultId, false, Date.now() - startTime, null, 'No template paths found');
      return { success: false, findings };
    }

    // Prepare Nuclei command
    const args = [
      '-u', targetUrl,
      '-severity', 'critical,high,medium',
      '-rl', '50',
      '-timeout', '5',
      '-retries', '0',
      '-json',
      '-silent',
      '-duc',
      '-ni',
      '-nh',
      '-no-stdin',
    ];

    // Add template paths
    templatePaths.forEach(templatePath => {
      args.push('-t', templatePath);
    });

    scanLogger.info(`[Nuclei] Executing: ${nucleiExecutable} ${args.join(' ')}`);

    // Spawn Nuclei process
    const nucleiProcess = spawn(nucleiExecutable, args);

    let stdout = '';
    let stderr = '';

    nucleiProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    nucleiProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    // Set timeout
    const timeout = setTimeout(() => {
      nucleiProcess.kill('SIGKILL');
      scanLogger.warn(`[Nuclei] Process timeout for job ${scanJobId}`);
    }, NUCLEI_TIMEOUT_MS);

    // Wait for process completion
    await new Promise((resolve, reject) => {
      nucleiProcess.on('close', (code) => {
        clearTimeout(timeout);
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Nuclei exited with code ${code}`));
        }
      });

      nucleiProcess.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });

    // Parse Nuclei JSONL output
    const nucleiData = parseNucleiJsonl(stdout);

    // Update scan result
    const duration = Date.now() - startTime;
    await updateScanResult(resultId, true, duration, stdout, null);

    // Generate findings based on Nuclei data
    const nucleiFindings = generateNucleiFindings(nucleiData, targetUrl);
    findings.push(...nucleiFindings);

    // Store parsed data
    if (nucleiData && nucleiData.length > 0) {
      await pool.query(
        `UPDATE scan_results
         SET parsed_data = $1,
             findings_count = $2
         WHERE id = $3`,
        [JSON.stringify(nucleiData), nucleiData.length, resultId]
      );
    }

    scanLogger.info(`[Nuclei] Completed for job ${scanJobId}`, {
      duration,
      findingsCount: nucleiFindings.length,
      vulnerabilitiesFound: nucleiData.length,
    });

    return {
      success: true,
      findings: nucleiFindings,
      data: nucleiData,
    };

  } catch (error) {
    scanLogger.error(`[Nuclei] Failed for job ${scanJobId}:`, error);

    // Generate error finding
    findings.push({
      category: 'Vulnerability',
      severity: 'critical',
      title: 'Nuclei Scan Failed',
      description: `Failed to run Nuclei scan: ${error.message}`,
      recommendation: 'Ensure Nuclei is installed and accessible. Check network connectivity to the target.',
      scannerName: 'nuclei',
    });

    return {
      success: false,
      findings,
      error: error.message,
    };
  }
}

/**
 * Get quick template paths for fast scanning
 */
function getQuickTemplatePaths(nucleiTemplatesDir) {
  const quickTemplateDirs = [
    ['http', 'exposures', 'apis'],
    ['http', 'exposures', 'backups'],
    ['http', 'exposures', 'logs'],
    ['http', 'misconfiguration', 'debug'],
    ['http', 'misconfiguration', 'apache'],
    ['http', 'misconfiguration', 'nginx'],
    ['http', 'misconfiguration', 'proxy'],
    ['http', 'vulnerabilities'],
  ];

  return quickTemplateDirs
    .map(segments => path.join(nucleiTemplatesDir, ...segments))
    .filter(templatePath => fs.existsSync(templatePath));
}

/**
 * Generate findings从 Nuclei data
 */
function generateNucleiFindings(nucleiData, targetUrl) {
  const findings = [];

  if (!nucleiData || nucleiData.length === 0) {
    findings.push({
      category: 'Vulnerability',
      severity: 'informational',
      title: 'Nuclei: No Vulnerabilities Detected',
      description: 'Nuclei did not detect any critical, high, or medium severity vulnerabilities with the current template set.',
      recommendation: 'This is a good sign, but continue to monitor for new vulnerabilities and keep systems updated.',
      scannerName: 'nuclei',
    });
    return findings;
  }

  // Process each Nuclei finding
  nucleiData.forEach(finding => {
    // Map nuclei severity to our severity levels
    let severity = 'low';
    if (finding.info && finding.info.severity) {
      const nucleiSeverity = finding.info.severity.toLowerCase();
      if (nucleiSeverity === 'critical') severity = 'critical';
      else if (nucleiSeverity === 'high') severity = 'high';
      else if (nucleiSeverity === 'medium') severity = 'medium';
      else if (nucleiSeverity === 'low') severity = 'low';
      else severity = 'informational';
    }

    findings.push({
      category: 'Vulnerability',
      severity,
      title: `Nuclei: ${finding.info?.name || 'Security Finding'}`,
      description: finding.info?.description || `Nuclei detected: ${finding.templateID}`,
      recommendation: finding.info?.remediation || 'Review the finding and apply appropriate security measures.',
      scannerName: 'nuclei',
      templateId: finding.templateID,
      metadata: {
        templateId: finding.templateID,
        severity: finding.info?.severity,
        tags: finding.info?.tags,
        cveId: finding.info?.classification?.cve?.id,
        cvssScore: finding.info?.classification?.cvss?.score,
        references: finding.info?.reference,
      },
    });
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
  runNucleiStage,
};
