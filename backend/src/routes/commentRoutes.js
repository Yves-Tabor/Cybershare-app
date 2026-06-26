const express = require('express');
const router = express.Router();
const { getPostComments, createComment } = require('../controllers/commentController');
const authMiddleware = require('../middleware/authMiddleware');
const { createCommentSchema } = require('../validators/commentValidator');

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

// Routes nested under posts
router.get('/posts/:postId/comments', getPostComments);
router.post('/posts/:postId/comments', authMiddleware, validate(createCommentSchema), createComment);

module.exports = router;
