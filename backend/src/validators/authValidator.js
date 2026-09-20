const { z } = require('zod');

// Register validation schema
const registerSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must be at most 50 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores')
    .refine(
      (val) => (val.match(/[a-zA-Z]/g) || []).length >= 4,
      'Username must contain at least 4 letters'
    ),
  email: z
    .string()
    .email('Invalid email address'),
  bio: z
    .string()
    .max(500, 'Bio must be at most 500 characters')
    .optional(),
});

// Login validation schema
const loginSchema = z.object({
  email: z
    .string()
    .email('Invalid email address'),
  password: z
    .string()
    .min(1, 'Password is required'),
});

module.exports = {
  registerSchema,
  loginSchema,
};
