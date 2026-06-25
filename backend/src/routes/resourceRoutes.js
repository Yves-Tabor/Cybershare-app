const express = require('express');
const router = express.Router();
const { getAllResources, getResourceById, createResource, updateResource, deleteResource } = require('../controllers/resourceController');
const authMiddleware = require('../middleware/authMiddleware');
const { createResourceSchema, updateResourceSchema } = require('../validators/resourceValidator');

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

// Public routes
router.get('/', getAllResources);
router.get('/:id', getResourceById);

// Protected routes (require authentication)
router.post('/', authMiddleware, validate(createResourceSchema), createResource);
router.patch('/:id', authMiddleware, validate(updateResourceSchema), updateResource);
router.delete('/:id', authMiddleware, deleteResource);

module.exports = router;
