const pool = require('../../src/config/database');
const { scanLogger } = require('../../src/utils/logger');
const { validateTargetUrl } = require('../../src/utils/securityValidator');
const { emitToUser } = require('../../src/services/socket/socketService');
const { notifyScanCompleted, notifyScanFailed, notifySecurityAlert } = require('../../src/services/notification/notificationService');
const { calculateSecurityScore } = require('../../src/services/scanner/scoreCalculator');

// Pure Node.js scanners (no external CLI tools required)
const { scanHeaders } = require('../../src/services/scanner/headerScanner');
const { scanSSL } = require('../../src/services/scanner/sslScanner');
const { scanDNS } = require('../../src/services/scanner/dnsScanner');
const { scanCookies } = require('../../src/services/scanner/cookieScanner');
const { scanTechnologies } = require('../../src/services/scanner/technologyScanner');

/**
 * Main Scan Pipeline
 * Orchestrates the scanning process through all stages using pure Node.js scanners
 */
async function processScanJob(job) {
  const { userId, targetUrl, scanType, scanOptions, dbScanId: existingDbId } = job.data;
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

    // Step 2: Reuse the existing DB record created by the controller, or create one if absent
    if (existingDbId) {
      await pool.query(
        `UPDATE scan_jobs
         SET target_hostname = $1, target_ip = $2, status = 'validating', updated_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [validation.hostname, validation.ip, existingDbId]
      );
      scanJobId = existingDbId;
      scanLogger.info(`[Pipeline] Using existing scan job record ${scanJobId}`);
    } else {
      const scanJobResult = await pool.query(
        `INSERT INTO scan_jobs 
         (user_id, target_url, target_hostname, target_ip, queue_job_id, status, scan_type, scan_options)
         VALUES ($1, $2, $3, $4, $5, 'validating', $6, $7)
         RETURNING id`,
        [userId, targetUrl, validation.hostname, validation.ip, jobId, scanType, JSON.stringify(scanOptions)]
      );
      scanJobId = scanJobResult.rows[0].id;
      scanLogger.info(`[Pipeline] Created scan job record ${scanJobId}`);
    }

    // Step 3: Create scan target record
    await pool.query(
      `INSERT INTO scan_targets 
       (scan_job_id, url, hostname, ip_address, port, protocol, is_valid, is_reachable)
       VALUES ($1, $2, $3, $4, $5, $6, true, true)
       ON CONFLICT (scan_job_id, url) DO NOTHING`,
      [scanJobId, targetUrl, validation.hostname, validation.ip, validation.port, validation.url ? validation.url.protocol : 'https:']
    );

    // Step 4: Update job status to running
    await updateJobStatus(scanJobId, 'running');
    emitToUser(userId, 'scan:queued', { scanId: scanJobId, targetUrl });

    // Step 5: Execute pipeline stages (pure Node.js, no external tools)
    const pipelineResults = await executePipeline(scanJobId, userId, targetUrl, validation);

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
    scanLogger.info(`[Pipeline] Preparing to notify user for completed scan ${scanJobId}`);
    await Promise.all([
      notifyScanCompleted(userId, scanJobId, scoreData.score, targetUrl),
      pipelineResults.severityCounts.critical > 0
        ? notifySecurityAlert(userId, scanJobId, targetUrl, pipelineResults.severityCounts.critical)
        : Promise.resolve(),
    ]);
    scanLogger.info(`[Pipeline] Notifications sent for scan ${scanJobId}`);

    scanLogger.info(`[Pipeline] Emitting scan:completed event for scan ${scanJobId}`);
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

    if (scanJobId) {
      try {
        await pool.query(
          `UPDATE scan_jobs
           SET status = 'failed',
               error_message = $1,
               error_code = $2,
               failed_at = CURRENT_TIMESTAMP
           WHERE id = $3`,
          [error.message, error.code || 'UNKNOWN_ERROR', scanJobId]
        );

        await pool.query(
          `INSERT INTO scan_logs (scan_job_id, level, stage, message, context)
           VALUES ($1, 'error', 'pipeline', $2, $3)`,
          [scanJobId, error.message, JSON.stringify({ stack: error.stack })]
        ).catch(() => {}); // Non-fatal

        await notifyScanFailed(userId, scanJobId, targetUrl).catch(() => {});
        emitToUser(userId, 'scan:failed', {
          scanId: scanJobId,
          status: 'failed',
          targetUrl,
          error: error.message,
        });
      } catch (dbError) {
        scanLogger.error(`[Pipeline] Failed to update job status on error:`, dbError);
      }
    }

    throw error;
  }
}

/**
 * Execute the scanning pipeline using pure Node.js scanners
 */
async function executePipeline(scanJobId, userId, targetUrl, validation) {
  const allFindings = [];
  const severityCounts = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    informational: 0,
  };

  const STAGE_TIMEOUT_MS = 30000; // 30s per stage

  // Helper to run a scanner with timeout
  async function runWithTimeout(fn, timeoutMs) {
    return Promise.race([
      fn(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Stage timeout')), timeoutMs)
      ),
    ]);
  }

  // Stage 1: HTTP Headers
  try {
    await updateJobStatus(scanJobId, 'running_headers');
    await updateProgress(scanJobId, 'headers', 'running', 0, 'Scanning HTTP security headers');
    emitToUser(userId, 'scan:running_headers', { scanId: scanJobId });

    const headerFindings = await runWithTimeout(
      () => scanHeaders(targetUrl),
      STAGE_TIMEOUT_MS
    );
    const tagged = headerFindings.map(f => ({ ...f, scannerName: f.scannerName || 'header-scanner' }));
    allFindings.push(...tagged);
    updateSeverityCounts(severityCounts, tagged);

    await updateProgress(scanJobId, 'headers', 'completed', 20, `Headers scanned — ${tagged.length} findings`);
    scanLogger.info(`[Pipeline] Headers stage completed for job ${scanJobId}: ${tagged.length} findings`);
  } catch (error) {
    scanLogger.error(`[Pipeline] Headers stage failed for job ${scanJobId}:`, error);
    await updateProgress(scanJobId, 'headers', 'failed', 20, `Headers scan failed: ${error.message}`);
  }

  // Stage 2: SSL/TLS
  try {
    await updateJobStatus(scanJobId, 'running_ssl');
    await updateProgress(scanJobId, 'ssl', 'running', 20, 'Scanning SSL/TLS configuration');
    emitToUser(userId, 'scan:running_ssl', { scanId: scanJobId });

    const sslFindings = await runWithTimeout(
      () => scanSSL(targetUrl),
      STAGE_TIMEOUT_MS
    );
    const tagged = sslFindings.map(f => ({ ...f, scannerName: f.scannerName || 'ssl-scanner' }));
    allFindings.push(...tagged);
    updateSeverityCounts(severityCounts, tagged);

    await updateProgress(scanJobId, 'ssl', 'completed', 40, `SSL/TLS scanned — ${tagged.length} findings`);
    scanLogger.info(`[Pipeline] SSL stage completed for job ${scanJobId}: ${tagged.length} findings`);
  } catch (error) {
    scanLogger.error(`[Pipeline] SSL stage failed for job ${scanJobId}:`, error);
    await updateProgress(scanJobId, 'ssl', 'failed', 40, `SSL scan failed: ${error.message}`);
  }

  // Stage 3: DNS Security
  try {
    await updateJobStatus(scanJobId, 'running_dns');
    await updateProgress(scanJobId, 'dns', 'running', 40, 'Scanning DNS security configuration');
    emitToUser(userId, 'scan:running_dns', { scanId: scanJobId });

    const dnsFindings = await runWithTimeout(
      () => scanDNS(targetUrl),
      STAGE_TIMEOUT_MS
    );
    const tagged = dnsFindings.map(f => ({ ...f, scannerName: f.scannerName || 'dns-scanner' }));
    allFindings.push(...tagged);
    updateSeverityCounts(severityCounts, tagged);

    await updateProgress(scanJobId, 'dns', 'completed', 60, `DNS scanned — ${tagged.length} findings`);
    scanLogger.info(`[Pipeline] DNS stage completed for job ${scanJobId}: ${tagged.length} findings`);
  } catch (error) {
    scanLogger.error(`[Pipeline] DNS stage failed for job ${scanJobId}:`, error);
    await updateProgress(scanJobId, 'dns', 'failed', 60, `DNS scan failed: ${error.message}`);
  }

  // Stage 4: Cookie Security
  try {
    await updateJobStatus(scanJobId, 'running_cookies');
    await updateProgress(scanJobId, 'cookies', 'running', 60, 'Scanning cookie security');
    emitToUser(userId, 'scan:running_cookies', { scanId: scanJobId });

    const cookieFindings = await runWithTimeout(
      () => scanCookies(targetUrl),
      STAGE_TIMEOUT_MS
    );
    const tagged = cookieFindings.map(f => ({ ...f, scannerName: f.scannerName || 'cookie-scanner' }));
    allFindings.push(...tagged);
    updateSeverityCounts(severityCounts, tagged);

    await updateProgress(scanJobId, 'cookies', 'completed', 80, `Cookies scanned — ${tagged.length} findings`);
    scanLogger.info(`[Pipeline] Cookies stage completed for job ${scanJobId}: ${tagged.length} findings`);
  } catch (error) {
    scanLogger.error(`[Pipeline] Cookies stage failed for job ${scanJobId}:`, error);
    await updateProgress(scanJobId, 'cookies', 'failed', 80, `Cookie scan failed: ${error.message}`);
  }

  // Stage 5: Technology Detection
  try {
    await updateJobStatus(scanJobId, 'running_tech');
    await updateProgress(scanJobId, 'technology', 'running', 80, 'Detecting technologies');
    emitToUser(userId, 'scan:running_tech', { scanId: scanJobId });

    const techFindings = await runWithTimeout(
      () => scanTechnologies(targetUrl),
      STAGE_TIMEOUT_MS
    );
    const tagged = techFindings.map(f => ({ ...f, scannerName: f.scannerName || 'tech-scanner' }));
    allFindings.push(...tagged);
    updateSeverityCounts(severityCounts, tagged);

    await updateProgress(scanJobId, 'technology', 'completed', 95, `Technologies detected — ${tagged.length} findings`);
    scanLogger.info(`[Pipeline] Technology stage completed for job ${scanJobId}: ${tagged.length} findings`);
  } catch (error) {
    scanLogger.error(`[Pipeline] Technology stage failed for job ${scanJobId}:`, error);
    await updateProgress(scanJobId, 'technology', 'failed', 95, `Technology scan failed: ${error.message}`);
  }

  // Stage 6: Store findings
  try {
    await updateJobStatus(scanJobId, 'parsing');
    await updateProgress(scanJobId, 'parsing', 'running', 95, 'Storing findings');

    await storeFindings(scanJobId, allFindings);

    await updateProgress(scanJobId, 'parsing', 'completed', 100, 'Scan complete');
    scanLogger.info(`[Pipeline] All findings stored for job ${scanJobId}`);
  } catch (error) {
    scanLogger.error(`[Pipeline] Findings storage failed for job ${scanJobId}:`, error);
    await updateProgress(scanJobId, 'parsing', 'failed', 100, `Storage failed: ${error.message}`).catch(() => {});
    // Non-fatal: allow scan to complete even if storage partially failed
  }

  return { allFindings, severityCounts };
}

/**
 * Update job status in database
 */
async function updateJobStatus(scanJobId, status) {
  try {
    await pool.query(
      `UPDATE scan_jobs SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [status, scanJobId]
    );
  } catch (error) {
    scanLogger.error(`[Pipeline] Failed to update job status to ${status}:`, error);
  }
}

/**
 * Update progress for a stage
 */
async function updateProgress(scanJobId, stageName, status, percentage, message) {
  try {
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
  } catch (error) {
    scanLogger.error(`[Pipeline] Failed to update progress for stage ${stageName}:`, error);
  }
}

/**
 * Update severity counts
 */
function updateSeverityCounts(severityCounts, findings) {
  findings.forEach(finding => {
    const severity = (finding.severity || 'informational').toLowerCase();
    if (Object.prototype.hasOwnProperty.call(severityCounts, severity)) {
      severityCounts[severity]++;
    }
  });
}

/**
 * Store findings in database
 */
async function storeFindings(scanJobId, findings) {
  if (findings.length === 0) {
    scanLogger.info(`[Pipeline] No findings to store for job ${scanJobId}`);
    return;
  }

  scanLogger.info(`[Pipeline] Storing ${findings.length} findings for job ${scanJobId}`);

  // Insert in batches of 50 to avoid hitting parameter limits
  const BATCH_SIZE = 50;
  for (let i = 0; i < findings.length; i += BATCH_SIZE) {
    const batch = findings.slice(i, i + BATCH_SIZE);
    const values = [];
    const params = [];
    let paramIndex = 1;

    for (const finding of batch) {
      values.push(
        `($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6}, $${paramIndex + 7}, $${paramIndex + 8})`
      );
      params.push(
        scanJobId,
        finding.category || 'General',
        finding.severity || 'informational',
        finding.title || 'Finding',
        finding.description || null,
        finding.recommendation || null,
        finding.scannerName || 'unknown',
        finding.templateId || null,
        finding.metadata ? JSON.stringify(finding.metadata) : null
      );
      paramIndex += 9;
    }

    await Promise.race([
      pool.query(
        `INSERT INTO scan_findings (scan_job_id, category, severity, title, description, recommendation, scanner_name, template_id, metadata)
         VALUES ${values.join(', ')}`,
        params
      ),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Batch insert timeout')), 15000)),
    ]);
  }

  scanLogger.info(`[Pipeline] Stored ${findings.length} findings for job ${scanJobId}`);
}

module.exports = {
  processScanJob,
};
