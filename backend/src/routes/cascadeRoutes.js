const express = require('express');
const router = express.Router();
const {
  getRelatedGroups,
  getVulnerabilityType,
  submitFeedback,
} = require('../controllers/cascadeController');
const authMiddleware = require('../middleware/authMiddleware');

// Get related groups for a finding
router.get('/findings/:resultId/related-groups', authMiddleware, getRelatedGroups);

// Get vulnerability type by slug
router.get('/vulnerability-types/:typeSlug', authMiddleware, getVulnerabilityType);

// Submit feedback for a scan report
router.post('/feedback', authMiddleware, submitFeedback);

module.exports = router;
