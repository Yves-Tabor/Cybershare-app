const express = require('express');
const router = express.Router();
const {
  updateDisplayName,
  updateAvatarColor,
  changePassword,
  getSessions,
  deleteSession,
  deleteAllSessions,
  getNotificationPreferences,
  updateNotificationPreferences,
  deleteAccount,
} = require('../controllers/userSettingsController');
const authMiddleware = require('../middleware/authMiddleware');
const {
  updateDisplayNameSchema,
  updateAvatarColorSchema,
  changePasswordSchema,
  updateNotificationPreferencesSchema,
  deleteAccountSchema,
} = require('../validators/userSettingsValidator');

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

// All routes require authentication
router.use(authMiddleware);

// Profile settings
router.patch('/display-name', validate(updateDisplayNameSchema), updateDisplayName);
router.patch('/avatar-color', validate(updateAvatarColorSchema), updateAvatarColor);

// Security settings
router.patch('/password', validate(changePasswordSchema), changePassword);
router.get('/sessions', getSessions);
router.delete('/sessions/:sessionId', deleteSession);
router.delete('/sessions', deleteAllSessions);

// Notification preferences
router.get('/notifications', getNotificationPreferences);
router.patch('/notifications', validate(updateNotificationPreferencesSchema), updateNotificationPreferences);

// Danger zone
router.delete('/account', validate(deleteAccountSchema), deleteAccount);

module.exports = router;
