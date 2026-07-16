const express = require('express');
const router = express.Router();
const {
  getAllResources,
  getResourceById,
  createResource,
  uploadFile,
  downloadFile,
  updateResource,
  deleteResource,
} = require('../controllers/resourceController');
const authMiddleware = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');
const { createResourceSchema, updateResourceSchema } = require('../validators/resourceValidator');

// Validation middleware
const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      error: 'Validation failed',
      details: result.error.errors,
    });
  }
  next();
};

// Public routes
router.get('/', getAllResources);

// File download — must be before /:id so 'files' isn't captured as a resource id
router.get('/files/:fileId/download', authMiddleware, downloadFile);

router.get('/:id', getResourceById);

// Protected routes (require authentication)
router.post('/', authMiddleware, validate(createResourceSchema), createResource);
router.post('/:id/files', authMiddleware, upload.single('file'), uploadFile);
router.patch('/:id', authMiddleware, validate(updateResourceSchema), updateResource);
router.delete('/:id', authMiddleware, deleteResource);

module.exports = router;
