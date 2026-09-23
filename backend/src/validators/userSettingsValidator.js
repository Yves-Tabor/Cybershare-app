const { z } = require('zod');

// Display name validation
const updateDisplayNameSchema = z.object({
  displayName: z.string()
    .min(1, 'Display name must be at least 1 character')
    .max(50, 'Display name must be at most 50 characters'),
});

// Avatar color validation
const updateAvatarColorSchema = z.object({
  avatarColor: z.string()
    .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid hex color format'),
});

// Password change validation
const changePasswordSchema = z.object({
  currentPassword: z.string().optional(),
  newPassword: z.string()
    .min(8, 'New password must be at least 8 characters')
    .regex(/[A-Z]/, 'New password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'New password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'New password must contain at least one number')
    .regex(/[!@#$%^&*(),.?":{}|<>]/, 'New password must contain at least one special character'),
});

// Notification preferences validation (partial update)
const updateNotificationPreferencesSchema = z.object({
  email_marketing: z.boolean().optional(),
  email_activity: z.boolean().optional(),
  push_messages: z.boolean().optional(),
  push_mentions: z.boolean().optional(),
  notif_scanner: z.boolean().optional(),
  notif_group_invite: z.boolean().optional(),
  notif_group_messages: z.boolean().optional(),
  notif_group_created: z.boolean().optional(),
  notif_post_activity: z.boolean().optional(),
  notif_events: z.boolean().optional(),
}).refine(data => {
  // At least one field must be provided
  return Object.keys(data).length > 0;
}, {
  message: 'At least one notification preference must be provided',
});

// Delete account validation
const deleteAccountSchema = z.object({
  password: z.string()
    .min(1, 'Password confirmation is required'),
});

module.exports = {
  updateDisplayNameSchema,
  updateAvatarColorSchema,
  changePasswordSchema,
  updateNotificationPreferencesSchema,
  deleteAccountSchema,
};
