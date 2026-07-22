const pool = require('../config/database');
const { addScanJob, JobPriority, isRedisAvailable } = require('../services/queue/queueService');
const { validateTargetUrl, validateScanOptions } = require('../utils/securityValidator');
const { checkDependencies } = require('../services/scanner/dependencyChecker');
const { logger } = require('../utils/logger');

// Create new scan
const createScan = async (req, res) => {
  try {
    const userId = req.userId;
    const { target_url, scan_type = 'standard', scan_options = {} } = req.body;

    // Check if Redis is available
    if (!isRedisAvailable) {
      return res.status(503).json({
        error: 'Redis is not available',
        message: 'Scan features are currently disabled because Redis is not running. Please install and start Redis to enable scanning.',
      });
    }

    // Validate target URL
    const urlValidation = await validateTargetUrl(target_url);
    if (!urlValidation.valid) {
      return res.status(400).json({ error: urlValidation.error });
    }

    // Validate scan options
    const optionsValidation = validateScanOptions(scan_options);
    if (!optionsValidation.valid) {
      return res.status(400).json({ error: optionsValidation.error });
    }

    // Add job to queue
    const job = await addScanJob({
      userId,
      targetUrl: target_url,
      scanType: scan_type,
      scanOptions: scan_options,
    }, {
      priority: JobPriority.NORMAL,
    });

    res.status(201).json({
      message: 'Scan queued successfully',
      job: {
        id: job.id,
        targetUrl: target_url,
        status: 'queued',
        queuedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Create scan error:', error);
    if (error.message.includes('Redis is not available')) {
      return res.status(503).json({
        error: 'Redis is not available',
        message: 'Scan features are currently disabled because Redis is not running.',
      });
    }
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
};


// Get all scans for current user
const getUserScans = async (req, res) => {
  try {
    const userId = req.userId;

    const result = await pool.query(
      `SELECT id, target_url, status, security_score, created_at, completed_at,
              total_findings, critical_findings, high_findings, medium_findings, low_findings, info_findings
       FROM scan_jobs
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    const scans = result.rows.map(row => ({
      id: row.id,
      targetUrl: row.target_url,
      status: row.status,
      securityScore: row.security_score,
      createdAt: row.created_at,
      completedAt: row.completed_at,
      totalFindings: row.total_findings,
      severityCounts: {
        critical: row.critical_findings,
        high: row.high_findings,
        medium: row.medium_findings,
        low: row.low_findings,
        informational: row.info_findings,
      },
    }));

    res.status(200).json({ scans });
  } catch (error) {
    logger.error('Get user scans error:', error);
    // Handle case where scan_jobs table doesn't exist
    if (error.code === '42P01') { // PostgreSQL error for relation does not exist
      return res.status(200).json({ scans: [] });
    }
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
};

// Get single scan by ID
const getScanById = async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    // Get scan job
    const scanResult = await pool.query(
      `SELECT id, target_url, status, security_score, created_at, completed_at,
              total_findings, critical_findings, high_findings, medium_findings, low_findings, info_findings
       FROM scan_jobs
       WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );

    if (scanResult.rows.length === 0) {
      return res.status(404).json({ error: 'Scan not found' });
    }

    const scan = scanResult.rows[0];

    // Get scan findings
    const findingsResult = await pool.query(
      `SELECT id, category, severity, title, description, recommendation, scanner_name, 
              template_id, metadata, created_at
       FROM scan_findings
       WHERE scan_job_id = $1
       ORDER BY 
         CASE severity
           WHEN 'critical' THEN 1
           WHEN 'high' THEN 2
           WHEN 'medium' THEN 3
           WHEN 'low' THEN 4
           WHEN 'informational' THEN 5
         END`,
      [id]
    );

    const findings = findingsResult.rows.map(row => ({
      id: row.id,
      category: row.category,
      severity: row.severity,
      title: row.title,
      description: row.description,
      recommendation: row.recommendation,
      scannerName: row.scanner_name,
      templateId: row.template_id,
      metadata: row.metadata ? JSON.parse(row.metadata) : null,
      createdAt: row.created_at,
    }));

    // Get scan progress
    const progressResult = await pool.query(
      `SELECT stage_name, status, progress_percentage, message, updated_at
       FROM scan_progress
       WHERE scan_job_id = $1
       ORDER BY stage_name`,
      [id]
    );

    const progress = progressResult.rows.map(row => ({
      stage: row.stage_name,
      status: row.status,
      progress: row.progress_percentage,
      message: row.message,
      updatedAt: row.updated_at,
    }));

    // Get scan results summary
    const resultsResult = await pool.query(
      `SELECT scanner_name, scanner_stage, success, duration_ms, findings_count, completed_at
       FROM scan_results
       WHERE scan_job_id = $1
       ORDER BY completed_at`,
      [id]
    );

    const results = resultsResult.rows.map(row => ({
      scannerName: row.scanner_name,
      stage: row.scanner_stage,
      success: row.success,
      duration: row.duration_ms,
      findingsCount: row.findings_count,
      completedAt: row.completed_at,
    }));

    const severityCounts = {
      critical: scan.critical_findings,
      high: scan.high_findings,
      medium: scan.medium_findings,
      low: scan.low_findings,
      informational: scan.info_findings,
    };

    res.status(200).json({
      scan: {
        id: scan.id,
        targetUrl: scan.target_url,
        status: scan.status,
        securityScore: scan.security_score,
        createdAt: scan.created_at,
        completedAt: scan.completed_at,
      },
      findings,
      severityCounts,
      totalFindings: scan.total_findings,
      progress,
      results,
    });
  } catch (error) {
    logger.error('Get scan by ID error:', error);
    // Handle case where scan tables don't exist
    if (error.code === '42P01') {
      return res.status(404).json({ error: 'Scan not found' });
    }
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
};

// Delete scan
const deleteScan = async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    // Check if scan exists and belongs to user
    const existingScan = await pool.query(
      'SELECT id FROM scan_jobs WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (existingScan.rows.length === 0) {
      return res.status(404).json({ error: 'Scan not found' });
    }

    await pool.query('DELETE FROM scan_jobs WHERE id = $1', [id]);

    res.status(200).json({ message: 'Scan deleted successfully' });
  } catch (error) {
    logger.error('Delete scan error:', error);
    // Handle case where scan_jobs table doesn't exist
    if (error.code === '42P01') {
      return res.status(404).json({ error: 'Scan not found' });
    }
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
};

// Delete all scans for user
const deleteAllScans = async (req, res) => {
  try {
    const userId = req.userId;
    await pool.query('DELETE FROM scan_jobs WHERE user_id = $1', [userId]);
    res.status(200).json({ message: 'All scans deleted successfully' });
  } catch (error) {
    logger.error('Delete all scans error:', error);
    // Handle case where scan_jobs table doesn't exist
    if (error.code === '42P01') {
      return res.status(200).json({ message: 'All scans deleted successfully' });
    }
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
};

// Check scanner dependencies
const checkScanDependencies = async (req, res) => {
  try {
    const dependencyInfo = await checkDependencies();
    res.status(200).json(dependencyInfo);
  } catch (error) {
    console.error('Check dependencies error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  createScan,
  getUserScans,
  getScanById,
  deleteScan,
  deleteAllScans,
  checkScanDependencies,
};
