const express = require('express');
const router = express.Router();
const { createScan, getUserScans, getScanById, deleteScan, deleteAllScans, checkScanDependencies } = require('../controllers/scanController');
const authMiddleware = require('../middleware/authMiddleware');
const { createScanSchema } = require('../validators/scanValidator');

// Validation middleware
const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ 
      error: 'Validation failed', 
      details: result.error.errors 
    });
  }
  next();
};

// Public endpoint for dependency checking (no auth required)
router.get('/dependencies/check', checkScanDependencies);

// All other routes require authentication
router.use(authMiddleware);

// Routes
router.post('/', validate(createScanSchema), createScan);
router.get('/', getUserScans);
router.delete('/', deleteAllScans);
router.get('/:id', getScanById);
router.delete('/:id', deleteScan);

module.exports = router;
