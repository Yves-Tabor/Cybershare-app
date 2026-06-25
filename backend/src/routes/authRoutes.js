const express = require('express');
const router = express.Router();
const { register, login, me, logout } = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');
const { registerSchema, loginSchema } = require('../validators/authValidator');

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

// Routes
router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.get('/me', authMiddleware, me);
router.post('/logout', logout);

module.exports = router;
