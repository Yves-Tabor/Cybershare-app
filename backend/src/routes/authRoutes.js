const express = require('express');
const router = express.Router();
const { register, login, me, logout, googleCallback } = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');
const { registerSchema, loginSchema } = require('../validators/authValidator');
const passport = require('../config/passport');

// Validation middleware
const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    console.log('Validation failed for body:', req.body);
    console.log('Full error object:', JSON.stringify(result.error, null, 2));
    console.log('Error issues:', result.error.issues);
    return res.status(400).json({ 
      error: 'Validation failed', 
      details: result.error.issues || result.error.errors 
    });
  }
  next();
};

// Google OAuth routes
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback', passport.authenticate('google', { session: false }), googleCallback);

// Routes
router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.get('/me', authMiddleware, me);
router.post('/logout', logout);

module.exports = router;
