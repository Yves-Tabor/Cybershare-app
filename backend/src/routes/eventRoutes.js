const express = require('express');
const router = express.Router();
const {
  getAllEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
  registerForEvent,
  unregisterFromEvent,
  getEventAttendees,
} = require('../controllers/eventController');
const authMiddleware = require('../middleware/authMiddleware');
const { createEventSchema, updateEventSchema } = require('../validators/eventValidator');

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

// Public routes (no auth required)
router.get('/', authMiddleware.optionalAuth, getAllEvents);
router.get('/:id', getEventById);

// Protected routes (require authentication)
router.post('/', authMiddleware, validate(createEventSchema), createEvent);
router.patch('/:id', authMiddleware, validate(updateEventSchema), updateEvent);
router.delete('/:id', authMiddleware, deleteEvent);

// Event registration routes
router.post('/:id/register', authMiddleware, registerForEvent);
router.delete('/:id/register', authMiddleware, unregisterFromEvent);

// Event attendees (admin/moderator only)
router.get('/:id/attendees', authMiddleware, getEventAttendees);

module.exports = router;
