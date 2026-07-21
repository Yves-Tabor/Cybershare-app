const pool = require('../../src/config/database');
const { scanLogger } = require('../../src/utils/logger');
const { validateTargetUrl } = require('../../src/utils/securityValidator');
const { emitToUser } = require('../../src/services/socket/socketService');
const { notifyScanCompleted, notifyScanFailed, notifySecurityAlert } = require('../../src/services/notification/notificationService');
const { calculateSecurityScore } = require('../../src/services/scanner/scoreCalculator');

// Pipeline stages
const { runHttpxStage } = require('./stages/httpxStage');
const { runNmapStage } = require('./stages/nmapStage');
const { runNucleiStage } = require('./stages/nucleiStage');

/**
 * Main Scan Pipeline
 * Orchestrates the scanning process through all stages
 */
async function processScanJob(job) {
  const { userId, targetUrl, scanType, scanOptions } = job.data;
  const jobId = job.id;

  scanLogger.info(`[Pipeline] Starting scan job ${jobId} for user ${userId}`, {
    jobId,
    userId,
    targetUrl,
    scanType,
  });

  let scanJobId = null;

  try {
    // Step 1: Validate target URL
    const validation = await validateTargetUrl(targetUrl);
    if (!validation.valid) {
      throw new Error(`Target validation failed: ${validation.error}`);
    }

    // Step 2: Create scan job record in database
    const scanJobResult = await pool.query(
      `INSERT INTO scan_jobs 
       (user_id, target_url, target_hostname, target_ip, queue_job_id, status, scan_type, scan_options)
       VALUES ($1, $2, $3, $4, $5, 'validating', $6, $7)
       RETURNING id`,
      [userId, targetUrl, validation.hostname, validation.ip, jobId, scanType, JSON.stringify(scanOptions)]
    );

    scanJobId = scanJobResult.rows[0].id;
    scanLogger.info(`[Pipeline] Created scan job record ${scanJobId}`);

    // Step 3: Create scan target record
    await pool.query(
      `INSERT INTO scan_targets 
       (scan_job_id, url, hostname, ip_address, port, protocol, is_valid, is_reachable)
       VALUES ($1, $2, $3, $4, $5, $6, true, true)`,
      [scanJobId, targetUrl, validation.hostname, validation.ip, validation.port, validation.url.protocol]
    );

    // Step 4: Update job status to running
    await updateJobStatus(scanJobId, 'queued');
    emitToUser(userId, 'scan:queued', { scanId: scanJobId, targetUrl });

    // Step 5: Execute pipeline stages
    const pipelineResults = await executePipeline(scanJobId, userId, targetUrl, validation, job);

    // Step 6: Calculate security score
    const scoreData = calculateSecurityScore(pipelineResults.allFindings);

    // Step 7: Update scan job with final results
    await pool.query(
      `UPDATE scan_jobs
       SET status = 'completed',
           security_score = $1,
           total_findings = $2,
           critical_findings = $3,
           high_findings = $4,
           medium_findings = $5,
           low_findings = $6,
           info_findings = $7,
           completed_at = CURRENT_TIMESTAMP
       WHERE id = $8`,
      [
        scoreData.score,
        pipelineResults.allFindings.length,
        pipelineResults.severityCounts.critical,
        pipelineResults.severityCounts.high,
        pipelineResults.severityCounts.medium,
        pipelineResults.severityCounts.low,
        pipelineResults.severityCounts.informational,
        scanJobId,
      ]
    );

    // Step 8: Notify user
    await Promise.all([
      notifyScanCompleted(userId, scanJobId, scoreData.score, targetUrl),
      pipelineResults.severityCounts.critical > 0
        ? notifySecurityAlert(userId, scanJobId, targetUrl, pipelineResults.severityCounts.critical)
        : Promise.resolve(),
    ]);

    emitToUser(userId, 'scan:completed', {
      scanId: scanJobId,
      status: 'completed',
      securityScore: scoreData.score,
      targetUrl,
      totalFindings: pipelineResults.allFindings.length,
      severityCounts: pipelineResults.severityCounts,
    });

    scanLogger.info(`[Pipeline] Scan job ${scanJobId} completed successfully`, {
      scanJobId,
      securityScore: scoreData.score,
      totalFindings: pipelineResults.allFindings.length,
    });

    return {
      success: true,
      scanJobId,
      securityScore: scoreData.score,
      totalFindings: pipelineResults.allFindings.length,
    };

  } catch (error) {
    scanLogger.error(`[Pipeline] Scan job ${scanJobId} failed:`, error);

    // Update job status to failed
    if (scanJobId) {
      await pool.query(
        `UPDATE scan_jobs
         SET status = 'failed',
             error_message = $1,
             error_code = $2,
             failed_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [error.message, error.code || 'UNKNOWN_ERROR', scanJobId]
      );

      // Log the error
      await pool.query(
        `INSERT INTO scan_logs (scan_job_id, level, stage, message, context)
         VALUES ($1, 'error', 'pipeline', $2, $3)`,
        [scanJobId, error.message, JSON.stringify({ stack: error.stack })]
      );

      // Notify user of failure
      await notifyScanFailed(userId, scanJobId, targetUrl);
      emitToUser(userId, 'scan:failed', {
        scanId: scanJobId,
        status: 'failed',
        targetUrl,
        error: error.message,
      });
    }

    throw error;
  }
}

/**
 * Execute the scanning pipeline
 */
async function executePipeline(scanJobId, userId, targetUrl, validation, job) {
  const allFindings = [];
  const severityCounts = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    informational: 0,
  };

  try {
    // Stage 1: HTTPX - Target validation and HTTP metadata
    await updateJobStatus(scanJobId, 'running_httpx');
    await updateProgress(scanJobId, 'httpx', 'running', 0, 'Starting HTTPX scan');
    emitToUser(userId, 'scan:running_httpx', { scanId: scanJobId });

    const httpxResults = await runHttpxStage(scanJobId, targetUrl, validation, job);
    allFindings.push(...httpxResults.findings);
    updateSeverityCounts(severityCounts, httpxResults.findings);

    await updateProgress(scanJobId, 'httpx', 'completed', 25, 'HTTPX scan completed');
    scanLogger.info(`[Pipeline] HTTPX stage completed for job ${scanJobId}`);

    // Stage 2: Nmap - Port scanning
    await updateJobStatus(scanJobId, 'running_nmap');
    await updateProgress(scanJobId, 'nmap', 'running', 25, 'Starting Nmap scan');
    emitToUser(userId, 'scan:running_nmap', { scanId: scanJobId });

    const nmapResults = await runNmapStage(scanJobId, targetUrl, validation, job);
    allFindings.push(...nmapResults.findings);
    updateSeverityCounts(severityCounts, nmapResults.findings);

    await updateProgress(scanJobId, 'nmap', 'completed', 60, 'Nmap scan completed');
    scanLogger.info(`[Pipeline] Nmap stage completed for job ${scanJobId}`);

    // Stage 3: Nuclei - Vulnerability scanning
    await updateJobStatus(scanJobId, 'running_nuclei');
    await updateProgress(scanJobId, 'nuclei', 'running', 60, 'Starting Nuclei scan');
    emitToUser(userId, 'scan:running_nuclei', { scanId: scanJobId });

    const nucleiResults = await runNucleiStage(scanJobId, targetUrl, validation, job);
    allFindings.push(...nucleiResults.findings);
    updateSeverityCounts(severityCounts, nucleiResults.findings);

    await updateProgress(scanJobId, 'nuclei', 'completed', 90, 'Nuclei scan completed');
    scanLogger.info(`[Pipeline] Nuclei stage completed for job ${scanJobId}`);

    // Stage 4: Parsing and finalization
    await updateJobStatus(scanJobId, 'parsing');
    await updateProgress(scanJobId, 'parsing', 'running', 90, 'Parsing results');
    emitToUser(userId, 'scan:parsing', { scanId: scanJobId });

    // Store all findings in database
    await storeFindings(scanJobId, allFindings);

    await updateProgress(scanJobId, 'parsing', 'completed', 100, 'Parsing completed');
    scanLogger.info(`[Pipeline] Parsing stage completed for job ${scanJobId}`);

  } catch (error) {
    scanLogger.error(`[Pipeline] Pipeline execution failed for job ${scanJobId}:`, error);
    throw error;
  }

  return {
    allFindings,
    severityCounts,
  };
}

/**
 * Update job status in database
 */
async function updateJobStatus(scanJobId, status) {
  await pool.query(
    `UPDATE scan_jobs SET status = $1 WHERE id = $2`,
    [status, scanJobId]
  );
}

/**
 * Update progress for a stage
 */
async function updateProgress(scanJobId, stageName, status, percentage, message) {
  await pool.query(
    `INSERT INTO scan_progress (scan_job_id, stage_name, status, progress_percentage, message)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (scan_job_id, stage_name)
     DO UPDATE SET
       status = EXCLUDED.status,
       progress_percentage = EXCLUDED.progress_percentage,
       message = EXCLUDED.message,
       updated_at = CURRENT_TIMESTAMP`,
    [scanJobId, stageName, status, percentage, message]
  );
}

/**
 * Update severity counts
 */
function updateSeverityCounts(severityCounts, findings) {
  findings.forEach(finding => {
    const severity = finding.severity.toLowerCase();
    if (severityCounts.hasOwnProperty(severity)) {
      severityCounts[severity]++;
    }
  });
}

/**
 * Store findings in database
 */
async function storeFindings(scanJobId, findings) {
  if (findings.length === 0) return;

  const values = [];
  const params = [];
  let paramIndex = 1;

  for (const finding of findings) {
    values.push(
      `($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6}, $${paramIndex + 7}, $${paramIndex + 8})`
    );
    params.push(
      scanJobId,
      finding.category,
      finding.severity,
      finding.title,
      finding.description || null,
      finding.recommendation || null,
      finding.scannerName || 'unknown',
      finding.templateId || null,
      finding.metadata ? JSON.stringify(finding.metadata) : null
    );
    paramIndex += 9;
  }

  await pool.query(
    `INSERT INTO scan_findings (scan_job_id, category, severity, title, description, recommendation, scanner_name, template_id, metadata)
     VALUES ${values.join(', ')}`,
    params
  );

  scanLogger.info(`[Pipeline] Stored ${findings.length} findings for job ${scanJobId}`);
}

module.exports = {
  processScanJob,
};
