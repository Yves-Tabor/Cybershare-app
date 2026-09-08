const db = require('../config/database');
const { logger } = require('../utils/logger');

// Get related groups for a finding based on vulnerability type tags
const getRelatedGroups = async (req, res) => {
  try {
    const { resultId } = req.params;
    const userId = req.userId;

    // First, get the finding with its type_slug
    const findingQuery = `
      SELECT sf.type_slug, sf.category, sf.severity, sf.title, sf.metadata
      FROM scan_findings sf
      WHERE sf.id = $1
    `;
    const findingResult = await db.query(findingQuery, [resultId]);

    if (findingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Finding not found' });
    }

    const finding = findingResult.rows[0];

    // If no type_slug, return empty groups array (graceful degradation)
    if (!finding.type_slug) {
      return res.json({ groups: [], findingId: resultId });
    }

    // Get the vulnerability type to fetch its tags
    const typeQuery = `
      SELECT tags FROM vulnerability_types WHERE type_slug = $1
    `;
    const typeResult = await db.query(typeQuery, [finding.type_slug]);

    if (typeResult.rows.length === 0 || !typeResult.rows[0].tags || typeResult.rows[0].tags.length === 0) {
      return res.json({ groups: [], findingId: resultId });
    }

    const tags = typeResult.rows[0].tags;

    // Find groups with overlapping tags using Postgres array overlap operator (&&)
    const groupsQuery = `
      SELECT
        g.id,
        g.name,
        g.category,
        g.description,
        g.tags,
        u.username as owner_username,
        COUNT(DISTINCT gm.user_id) as member_count,
        CASE WHEN gm2.user_id IS NOT NULL THEN true ELSE false END as joined,
        MAX(gp.created_at) as last_activity
      FROM groups g
      LEFT JOIN users u ON g.owner_id = u.id
      LEFT JOIN group_members gm ON g.id = gm.group_id
      LEFT JOIN group_members gm2 ON g.id = gm2.group_id AND gm2.user_id = $1
      LEFT JOIN group_posts gp ON g.id = gp.group_id
      WHERE g.tags && $2
      GROUP BY g.id, g.name, g.category, g.description, g.tags, u.username, gm2.user_id
      ORDER BY last_activity DESC NULLS LAST, g.created_at DESC
      LIMIT 5
    `;

    const groupsResult = await db.query(groupsQuery, [userId || null, tags]);

    res.json({
      groups: groupsResult.rows,
      findingId: resultId,
      tags: tags
    });
  } catch (error) {
    logger.error('Error fetching related groups:', error);
    res.status(500).json({ error: 'Failed to fetch related groups' });
  }
};

// Get vulnerability type by type_slug
const getVulnerabilityType = async (req, res) => {
  try {
    const { typeSlug } = req.params;

    const query = `
      SELECT type_slug, title, explanation_template, remediation_steps, tags
      FROM vulnerability_types
      WHERE type_slug = $1
    `;
    const result = await db.query(query, [typeSlug]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Vulnerability type not found' });
    }

    res.json({ vulnerabilityType: result.rows[0] });
  } catch (error) {
    logger.error('Error fetching vulnerability type:', error);
    res.status(500).json({ error: 'Failed to fetch vulnerability type' });
  }
};

// Submit feedback for a scan report
const submitFeedback = async (req, res) => {
  try {
    const { scan_id, rating, comment } = req.body;
    const userId = req.userId;

    if (!scan_id || !rating) {
      return res.status(400).json({ error: 'scan_id and rating are required' });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'rating must be between 1 and 5' });
    }

    // Check if scan exists and belongs to user
    const scanCheck = await db.query(
      'SELECT id FROM scan_jobs WHERE id = $1 AND user_id = $2',
      [scan_id, userId]
    );

    if (scanCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Scan not found or does not belong to user' });
    }

    // Check if user already submitted feedback for this scan
    const existingFeedback = await db.query(
      'SELECT id FROM feedback WHERE scan_id = $1 AND user_id = $2',
      [scan_id, userId]
    );

    if (existingFeedback.rows.length > 0) {
      // Update existing feedback
      const updateQuery = `
        UPDATE feedback
        SET rating = $1, comment = $2
        WHERE scan_id = $3 AND user_id = $4
        RETURNING *
      `;
      const result = await db.query(updateQuery, [rating, comment || null, scan_id, userId]);
      return res.json({ feedback: result.rows[0] });
    }

    // Insert new feedback
    const insertQuery = `
      INSERT INTO feedback (scan_id, user_id, rating, comment)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const result = await db.query(insertQuery, [scan_id, userId, rating, comment || null]);

    res.status(201).json({ feedback: result.rows[0] });
  } catch (error) {
    logger.error('Error submitting feedback:', error);
    res.status(500).json({ error: 'Failed to submit feedback' });
  }
};

module.exports = {
  getRelatedGroups,
  getVulnerabilityType,
  submitFeedback,
};
