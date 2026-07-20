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

  const pipelineStartTime = Date.now();
  scanLogger.info(`[Pipeline] ============================================`, { jobId });
  scanLogger.info(`[Pipeline] Starting scan job ${jobId} for user ${userId}`, {
    jobId,
    userId,
    targetUrl,
    scanType,
  });

  let scanJobId = null;

  try {
    // Step 1: Validate target URL
    scanLogger.info(`[Pipeline] Step 1: Validating target URL`, { jobId, targetUrl });
    const validation = await validateTargetUrl(targetUrl);
    if (!validation.valid) {
      throw new Error(`Target validation failed: ${validation.error}`);
    }
    scanLogger.info(`[Pipeline] Step 1 complete: Target validated`, { jobId, hostname: validation.hostname });

    // Step 2: Reuse the existing DB record created by the controller, or create one if absent
    scanLogger.info(`[Pipeline] Step 2: Managing scan job record`, { jobId, existingDbId });
    if (existingDbId) {
      await pool.query(
        `UPDATE scan_jobs
         SET target_hostname = $1, target_ip = $2, status = 'validating', updated_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [validation.hostname, validation.ip, existingDbId]
      );
      scanJobId = existingDbId;
      scanLogger.info(`[Pipeline] Step 2 complete: Using existing scan job record ${scanJobId}`, { jobId, scanJobId });
    } else {
      const scanJobResult = await pool.query(
        `INSERT INTO scan_jobs
         (user_id, target_url, target_hostname, target_ip, queue_job_id, status, scan_type, scan_options)
         VALUES ($1, $2, $3, $4, $5, 'validating', $6, $7)
         RETURNING id`,
        [userId, targetUrl, validation.hostname, validation.ip, jobId, scanType, JSON.stringify(scanOptions)]
      );
      scanJobId = scanJobResult.rows[0].id;
      scanLogger.info(`[Pipeline] Step 2 complete: Created scan job record ${scanJobId}`, { jobId, scanJobId });
    }

    // Step 3: Create scan target record
    scanLogger.info(`[Pipeline] Step 3: Creating scan target record`, { jobId, scanJobId });
    await pool.query(
      `INSERT INTO scan_targets
       (scan_job_id, url, hostname, ip_address, port, protocol, is_valid, is_reachable)
       VALUES ($1, $2, $3, $4, $5, $6, true, true)
       ON CONFLICT (scan_job_id, url) DO NOTHING`,
      [scanJobId, targetUrl, validation.hostname, validation.ip, validation.port, validation.url ? validation.url.protocol : 'https:']
    );
    scanLogger.info(`[Pipeline] Step 3 complete: Scan target record created`, { jobId, scanJobId });

    // Step 4: Update job status to running
    scanLogger.info(`[Pipeline] Step 4: Updating job status to running`, { jobId, scanJobId });
    await updateJobStatus(scanJobId, 'running');
    emitToUser(userId, 'scan:queued', { scanId: scanJobId, targetUrl });
    scanLogger.info(`[Pipeline] Step 4 complete: Job status updated to running`, { jobId, scanJobId });

    // Step 5: Execute pipeline stages (pure Node.js, no external tools)
    scanLogger.info(`[Pipeline] Step 5: Executing pipeline stages`, { jobId, scanJobId });
    const pipelineResults = await executePipeline(scanJobId, userId, targetUrl, validation);
    scanLogger.info(`[Pipeline] Step 5 complete: Pipeline execution finished`, { jobId, scanJobId, totalFindings: pipelineResults.allFindings.length });

    // Step 6: Calculate security score
    scanLogger.info(`[Pipeline] Step 6: Calculating security score`, { jobId, scanJobId });
    const scoreData = calculateSecurityScore(pipelineResults.allFindings);
    scanLogger.info(`[Pipeline] Step 6 complete: Security score calculated`, { jobId, scanJobId, score: scoreData.score });

    // Step 7: Update scan job with final results
    scanLogger.info(`[Pipeline] Step 7: Updating scan job with final results`, { jobId, scanJobId });
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
    scanLogger.info(`[Pipeline] Step 7 complete: Scan job updated with final results`, { jobId, scanJobId });

    // Step 8: Notify user
    scanLogger.info(`[Pipeline] Step 8: Preparing to notify user for completed scan ${scanJobId}`, { jobId, scanJobId });
    await Promise.all([
      notifyScanCompleted(userId, scanJobId, scoreData.score, targetUrl),
      pipelineResults.severityCounts.critical > 0
        ? notifySecurityAlert(userId, scanJobId, targetUrl, pipelineResults.severityCounts.critical)
        : Promise.resolve(),
    ]);
    scanLogger.info(`[Pipeline] Step 8 complete: Notifications sent for scan ${scanJobId}`, { jobId, scanJobId });

    scanLogger.info(`[Pipeline] Step 9: Emitting scan:completed event for scan ${scanJobId}`, { jobId, scanJobId });
    emitToUser(userId, 'scan:completed', {
      scanId: scanJobId,
      status: 'completed',
      securityScore: scoreData.score,
      targetUrl,
      totalFindings: pipelineResults.allFindings.length,
      severityCounts: pipelineResults.severityCounts,
    });
    scanLogger.info(`[Pipeline] Step 9 complete: scan:completed event emitted`, { jobId, scanJobId });

    const pipelineDuration = Date.now() - pipelineStartTime;
    scanLogger.info(`[Pipeline] ============================================`, { jobId });
    scanLogger.info(`[Pipeline] Scan job ${scanJobId} completed successfully`, {
      jobId,
      scanJobId,
      securityScore: scoreData.score,
      totalFindings: pipelineResults.allFindings.length,
      durationMs: pipelineDuration,
    });

    return {
      success: true,
      scanJobId,
      securityScore: scoreData.score,
      totalFindings: pipelineResults.allFindings.length,
    };

  } catch (error) {
    const pipelineDuration = Date.now() - pipelineStartTime;
    scanLogger.error(`[Pipeline] ============================================`, { jobId });
    scanLogger.error(`[Pipeline] Scan job ${scanJobId} failed after ${pipelineDuration}ms:`, {
      jobId,
      scanJobId,
      error: error.message,
      stack: error.stack,
      durationMs: pipelineDuration,
    });

    if (scanJobId) {
      try {
        scanLogger.info(`[Pipeline] Updating job status to failed in database`, { jobId, scanJobId });
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
        scanLogger.info(`[Pipeline] Job status updated to failed`, { jobId, scanJobId });
      } catch (dbError) {
        scanLogger.error(`[Pipeline] Failed to update job status on error:`, {
          jobId,
          scanJobId,
          dbError: dbError.message,
          stack: dbError.stack,
        });
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
  const pipelineStartTime = Date.now();

  scanLogger.info(`[Pipeline] executePipeline started`, { scanJobId, targetUrl });

  // Helper to run a scanner with timeout
  async function runWithTimeout(fn, timeoutMs, stageName) {
    const stageStartTime = Date.now();
    scanLogger.info(`[Pipeline] Stage ${stageName}: Starting with ${timeoutMs}ms timeout`, { scanJobId });
    return Promise.race([
      fn().then(result => {
        const duration = Date.now() - stageStartTime;
        scanLogger.info(`[Pipeline] Stage ${stageName}: Completed in ${duration}ms`, { scanJobId, duration });
        return result;
      }),
      new Promise((_, reject) =>
        setTimeout(() => {
          const duration = Date.now() - stageStartTime;
          scanLogger.error(`[Pipeline] Stage ${stageName}: Timeout after ${duration}ms`, { scanJobId, duration });
          reject(new Error('Stage timeout'));
        }, timeoutMs)
      ),
    ]);
  }

  // Stage 1: HTTP Headers
  try {
    scanLogger.info(`[Pipeline] Stage 1: HTTP Headers - STARTING`, { scanJobId });
    await updateJobStatus(scanJobId, 'running_headers');
    await updateProgress(scanJobId, 'headers', 'running', 0, 'Scanning HTTP security headers');
    emitToUser(userId, 'scan:running_headers', { scanId: scanJobId });

    const headerFindings = await runWithTimeout(
      () => scanHeaders(targetUrl),
      STAGE_TIMEOUT_MS,
      'HTTP Headers'
    );
    const tagged = headerFindings.map(f => ({ ...f, scannerName: f.scannerName || 'header-scanner' }));
    allFindings.push(...tagged);
    updateSeverityCounts(severityCounts, tagged);

    await updateProgress(scanJobId, 'headers', 'completed', 20, `Headers scanned — ${tagged.length} findings`);
    scanLogger.info(`[Pipeline] Stage 1: HTTP Headers - COMPLETED`, { scanJobId, findingsCount: tagged.length });
  } catch (error) {
    scanLogger.error(`[Pipeline] Stage 1: HTTP Headers - FAILED`, { scanJobId, error: error.message, stack: error.stack });
    await updateProgress(scanJobId, 'headers', 'failed', 20, `Headers scan failed: ${error.message}`);
  }

  // Stage 2: SSL/TLS
  try {
    scanLogger.info(`[Pipeline] Stage 2: SSL/TLS - STARTING`, { scanJobId });
    await updateJobStatus(scanJobId, 'running_ssl');
    await updateProgress(scanJobId, 'ssl', 'running', 20, 'Scanning SSL/TLS configuration');
    emitToUser(userId, 'scan:running_ssl', { scanId: scanJobId });

    const sslFindings = await runWithTimeout(
      () => scanSSL(targetUrl),
      STAGE_TIMEOUT_MS,
      'SSL/TLS'
    );
    const tagged = sslFindings.map(f => ({ ...f, scannerName: f.scannerName || 'ssl-scanner' }));
    allFindings.push(...tagged);
    updateSeverityCounts(severityCounts, tagged);

    await updateProgress(scanJobId, 'ssl', 'completed', 40, `SSL/TLS scanned — ${tagged.length} findings`);
    scanLogger.info(`[Pipeline] Stage 2: SSL/TLS - COMPLETED`, { scanJobId, findingsCount: tagged.length });
  } catch (error) {
    scanLogger.error(`[Pipeline] Stage 2: SSL/TLS - FAILED`, { scanJobId, error: error.message, stack: error.stack });
    await updateProgress(scanJobId, 'ssl', 'failed', 40, `SSL scan failed: ${error.message}`);
  }

  // Stage 3: DNS Security
  try {
    scanLogger.info(`[Pipeline] Stage 3: DNS Security - STARTING`, { scanJobId });
    await updateJobStatus(scanJobId, 'running_dns');
    await updateProgress(scanJobId, 'dns', 'running', 40, 'Scanning DNS security configuration');
    emitToUser(userId, 'scan:running_dns', { scanId: scanJobId });

    const dnsFindings = await runWithTimeout(
      () => scanDNS(targetUrl),
      STAGE_TIMEOUT_MS,
      'DNS Security'
    );
    const tagged = dnsFindings.map(f => ({ ...f, scannerName: f.scannerName || 'dns-scanner' }));
    allFindings.push(...tagged);
    updateSeverityCounts(severityCounts, tagged);

    await updateProgress(scanJobId, 'dns', 'completed', 60, `DNS scanned — ${tagged.length} findings`);
    scanLogger.info(`[Pipeline] Stage 3: DNS Security - COMPLETED`, { scanJobId, findingsCount: tagged.length });
  } catch (error) {
    scanLogger.error(`[Pipeline] Stage 3: DNS Security - FAILED`, { scanJobId, error: error.message, stack: error.stack });
    await updateProgress(scanJobId, 'dns', 'failed', 60, `DNS scan failed: ${error.message}`);
  }

  // Stage 4: Cookie Security
  try {
    scanLogger.info(`[Pipeline] Stage 4: Cookie Security - STARTING`, { scanJobId });
    await updateJobStatus(scanJobId, 'running_cookies');
    await updateProgress(scanJobId, 'cookies', 'running', 60, 'Scanning cookie security');
    emitToUser(userId, 'scan:running_cookies', { scanId: scanJobId });

    const cookieFindings = await runWithTimeout(
      () => scanCookies(targetUrl),
      STAGE_TIMEOUT_MS,
      'Cookie Security'
    );
    const tagged = cookieFindings.map(f => ({ ...f, scannerName: f.scannerName || 'cookie-scanner' }));
    allFindings.push(...tagged);
    updateSeverityCounts(severityCounts, tagged);

    await updateProgress(scanJobId, 'cookies', 'completed', 80, `Cookies scanned — ${tagged.length} findings`);
    scanLogger.info(`[Pipeline] Stage 4: Cookie Security - COMPLETED`, { scanJobId, findingsCount: tagged.length });
  } catch (error) {
    scanLogger.error(`[Pipeline] Stage 4: Cookie Security - FAILED`, { scanJobId, error: error.message, stack: error.stack });
    await updateProgress(scanJobId, 'cookies', 'failed', 80, `Cookie scan failed: ${error.message}`);
  }

  // Stage 5: Technology Detection
  try {
    scanLogger.info(`[Pipeline] Stage 5: Technology Detection - STARTING`, { scanJobId });
    await updateJobStatus(scanJobId, 'running_tech');
    await updateProgress(scanJobId, 'technology', 'running', 80, 'Detecting technologies');
    emitToUser(userId, 'scan:running_tech', { scanId: scanJobId });

    const techFindings = await runWithTimeout(
      () => scanTechnologies(targetUrl),
      STAGE_TIMEOUT_MS,
      'Technology Detection'
    );
    const tagged = techFindings.map(f => ({ ...f, scannerName: f.scannerName || 'tech-scanner' }));
    allFindings.push(...tagged);
    updateSeverityCounts(severityCounts, tagged);

    await updateProgress(scanJobId, 'technology', 'completed', 95, `Technologies detected — ${tagged.length} findings`);
    scanLogger.info(`[Pipeline] Stage 5: Technology Detection - COMPLETED`, { scanJobId, findingsCount: tagged.length });
  } catch (error) {
    scanLogger.error(`[Pipeline] Stage 5: Technology Detection - FAILED`, { scanJobId, error: error.message, stack: error.stack });
    await updateProgress(scanJobId, 'technology', 'failed', 95, `Technology scan failed: ${error.message}`);
  }

  // Stage 6: Store findings
  try {
    scanLogger.info(`[Pipeline] Stage 6: Store Findings - STARTING`, { scanJobId, totalFindings: allFindings.length });
    await updateJobStatus(scanJobId, 'parsing');
    await updateProgress(scanJobId, 'parsing', 'running', 95, 'Storing findings');

    await storeFindings(scanJobId, allFindings);

    await updateProgress(scanJobId, 'parsing', 'completed', 100, 'Scan complete');
    scanLogger.info(`[Pipeline] Stage 6: Store Findings - COMPLETED`, { scanJobId, storedCount: allFindings.length });
  } catch (error) {
    scanLogger.error(`[Pipeline] Stage 6: Store Findings - FAILED`, { scanJobId, error: error.message, stack: error.stack });
    await updateProgress(scanJobId, 'parsing', 'failed', 100, `Storage failed: ${error.message}`).catch(() => {});
    // Non-fatal: allow scan to complete even if storage partially failed
  }

  const pipelineDuration = Date.now() - pipelineStartTime;
  scanLogger.info(`[Pipeline] executePipeline COMPLETED`, {
    scanJobId,
    totalFindings: allFindings.length,
    durationMs: pipelineDuration,
    severityCounts,
  });

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
  const storeStartTime = Date.now();
  scanLogger.info(`[Pipeline] storeFindings STARTING`, { scanJobId, findingsCount: findings.length });

  if (findings.length === 0) {
    scanLogger.info(`[Pipeline] storeFindings: No findings to store for job ${scanJobId}`);
    return;
  }

  scanLogger.info(`[Pipeline] storeFindings: Storing ${findings.length} findings in batches`, { scanJobId });

  // Insert in batches of 50 to avoid hitting parameter limits
  const BATCH_SIZE = 50;
  let batchCount = 0;

  for (let i = 0; i < findings.length; i += BATCH_SIZE) {
    const batchStartTime = Date.now();
    batchCount++;
    const batch = findings.slice(i, i + BATCH_SIZE);
    const values = [];
    const params = [];
    let paramIndex = 1;

    scanLogger.info(`[Pipeline] storeFindings: Processing batch ${batchCount} (${batch.length} findings)`, { scanJobId, batchCount });

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

    try {
      await Promise.race([
        pool.query(
          `INSERT INTO scan_findings (scan_job_id, category, severity, title, description, recommendation, scanner_name, template_id, metadata)
           VALUES ${values.join(', ')}`,
          params
        ),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Batch insert timeout')), 15000)),
      ]);
      const batchDuration = Date.now() - batchStartTime;
      scanLogger.info(`[Pipeline] storeFindings: Batch ${batchCount} stored in ${batchDuration}ms`, { scanJobId, batchCount, batchDuration });
    } catch (error) {
      const batchDuration = Date.now() - batchStartTime;
      scanLogger.error(`[Pipeline] storeFindings: Batch ${batchCount} FAILED after ${batchDuration}ms`, {
        scanJobId,
        batchCount,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  const storeDuration = Date.now() - storeStartTime;
  scanLogger.info(`[Pipeline] storeFindings COMPLETED`, {
    scanJobId,
    totalFindings: findings.length,
    batchesProcessed: batchCount,
    durationMs: storeDuration,
  });
}

module.exports = {
  processScanJob,
};
