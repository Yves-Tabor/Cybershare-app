const express = require('express');
const router = express.Router();
const {
  getRelatedGroups,
  getVulnerabilityType,
  submitFeedback,
} = require('../controllers/cascadeController');
const { authenticateToken } = require('../middleware/authMiddleware');

// Get related groups for a finding
router.get('/findings/:resultId/related-groups', authenticateToken, getRelatedGroups);

// Get vulnerability type by slug
router.get('/vulnerability-types/:typeSlug', authenticateToken, getVulnerabilityType);

// Submit feedback for a scan report
router.post('/feedback', authenticateToken, submitFeedback);

module.exports = router;
