const pool = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const { scanHeaders } = require('../services/scanner/headerScanner');
const { scanSSL } = require('../services/scanner/sslScanner');
const { scanDNS } = require('../services/scanner/dnsScanner');
const { scanCookies } = require('../services/scanner/cookieScanner');
const { scanTechnologies } = require('../services/scanner/technologyScanner');
const { scanNmap } = require('../services/scanner/nmapScanner');
const { scanNuclei } = require('../services/scanner/nucleiScanner');
const { calculateSecurityScore } = require('../services/scanner/scoreCalculator');
const { checkDependencies } = require('../services/scanner/dependencyChecker');
const { notifyScanCompleted, notifyScanFailed, notifySecurityAlert } = require('../services/notification/notificationService');
const { emitToUser } = require('../services/socket/socketService');

async function storeScanResults(scanId, allResults) {
  if (allResults.length === 0) return;

  const values = [];
  const params = [];
  let paramIndex = 1;

  for (const result of allResults) {
    values.push(
      `($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5})`
    );
    params.push(
      scanId,
      result.category,
      result.severity,
      result.title,
      result.description,
      result.recommendation
    );
    paramIndex += 6;
  }

  await pool.query(
    `INSERT INTO scan_results (scan_id, category, severity, title, description, recommendation)
     VALUES ${values.join(', ')}`,
    params
  );
}

// Create new scan
const createScan = async (req, res) => {
  try {
    const userId = req.userId;
    const { target_url } = req.body;

    // Create scan record
    const scanResult = await pool.query(
      `INSERT INTO scans (target_url, user_id, status)
       VALUES ($1, $2, 'running')
       RETURNING id, target_url, user_id, status, created_at`,
      [target_url, userId]
    );

    const scan = scanResult.rows[0];

    // Run scans asynchronously (don't wait for completion)
    runScans(scan.id, target_url, userId);

    res.status(201).json({
      message: 'Scan started successfully',
      scan: {
        id: scan.id,
        targetUrl: scan.target_url,
        status: scan.status,
        createdAt: scan.created_at,
      },
    });
  } catch (error) {
    console.error('Create scan error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Run all scans and store results
async function runScans(scanId, targetUrl, userId) {
  try {
    const allResults = [];

    // Run all scanner modules
    const [headerResults, sslResults, dnsResults, cookieResults, techResults, nmapResults, nucleiResults] = await Promise.all([
      scanHeaders(targetUrl),
      scanSSL(targetUrl),
      scanDNS(targetUrl),
      scanCookies(targetUrl),
      scanTechnologies(targetUrl),
      scanNmap(targetUrl),
      scanNuclei(targetUrl),
    ]);

    allResults.push(...headerResults);
    allResults.push(...sslResults);
    allResults.push(...dnsResults);
    allResults.push(...cookieResults);
    allResults.push(...techResults);
    allResults.push(...nmapResults);
    allResults.push(...nucleiResults);

    // Calculate security score
    const scoreData = calculateSecurityScore(allResults);
    const criticalIssues = allResults.filter((r) => r.severity === 'critical').length;

    // Persist findings before marking scan complete
    await storeScanResults(scanId, allResults);

    // Mark scan complete
    await pool.query(
      `UPDATE scans
       SET status = 'completed', security_score = $1, completed_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [scoreData.score, scanId]
    );

    // Notify immediately
    await Promise.all([
      notifyScanCompleted(userId, scanId, scoreData.score, targetUrl),
      criticalIssues > 0
        ? notifySecurityAlert(userId, scanId, targetUrl, criticalIssues)
        : Promise.resolve(),
    ]);

    emitToUser(userId, 'scan:completed', {
      scanId,
      status: 'completed',
      securityScore: scoreData.score,
      targetUrl,
    });

  } catch (error) {
    console.error('Run scans error:', error);
    // Update scan status to failed
    await pool.query(
      `UPDATE scans SET status = 'failed' WHERE id = $1`,
      [scanId]
    );
    
    // Notify user of scan failure
    await notifyScanFailed(userId, scanId, targetUrl);

    emitToUser(userId, 'scan:completed', {
      scanId,
      status: 'failed',
      targetUrl,
    });
  }
}

// Get all scans for current user
const getUserScans = async (req, res) => {
  try {
    const userId = req.userId;

    const result = await pool.query(
      `SELECT id, target_url, status, security_score, created_at, completed_at
       FROM scans
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
    }));

    res.status(200).json({ scans });
  } catch (error) {
    console.error('Get user scans error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get single scan by ID
const getScanById = async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    // Get scan
    const scanResult = await pool.query(
      `SELECT id, target_url, status, security_score, created_at, completed_at
       FROM scans
       WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );

    if (scanResult.rows.length === 0) {
      return res.status(404).json({ error: 'Scan not found' });
    }

    const scan = scanResult.rows[0];

    // Get scan results
    const resultsResult = await pool.query(
      `SELECT id, category, severity, title, description, recommendation, created_at
       FROM scan_results
       WHERE scan_id = $1
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

    const results = resultsResult.rows.map(row => ({
      id: row.id,
      category: row.category,
      severity: row.severity,
      title: row.title,
      description: row.description,
      recommendation: row.recommendation,
      createdAt: row.created_at,
    }));

    // Calculate score breakdown
    const severityCounts = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      informational: 0,
    };

    results.forEach(result => {
      const severity = result.severity.toLowerCase();
      if (severityCounts.hasOwnProperty(severity)) {
        severityCounts[severity]++;
      }
    });

    res.status(200).json({
      scan: {
        id: scan.id,
        targetUrl: scan.target_url,
        status: scan.status,
        securityScore: scan.security_score,
        createdAt: scan.created_at,
        completedAt: scan.completed_at,
      },
      results,
      severityCounts,
      totalFindings: results.length,
    });
  } catch (error) {
    console.error('Get scan by ID error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete scan
const deleteScan = async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    // Check if scan exists and belongs to user
    const existingScan = await pool.query(
      'SELECT id FROM scans WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (existingScan.rows.length === 0) {
      return res.status(404).json({ error: 'Scan not found' });
    }

    await pool.query('DELETE FROM scans WHERE id = $1', [id]);

    res.status(200).json({ message: 'Scan deleted successfully' });
  } catch (error) {
    console.error('Delete scan error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete all scans for user
const deleteAllScans = async (req, res) => {
  try {
    const userId = req.userId;
    await pool.query('DELETE FROM scans WHERE user_id = $1', [userId]);
    res.status(200).json({ message: 'All scans deleted successfully' });
  } catch (error) {
    console.error('Delete all scans error:', error);
    res.status(500).json({ error: 'Internal server error' });
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
