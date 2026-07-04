const { z } = require('zod');

// Create post validation schema
const createPostSchema = z.object({
  content: z
    .string()
    .min(1, 'Content is required')
    .max(5000, 'Content must be at most 5000 characters'),
});

// Update post validation schema
const updatePostSchema = z.object({
  content: z
    .string()
    .min(1, 'Content is required')
    .max(5000, 'Content must be at most 5000 characters')
    .optional(),
});

module.exports = {
  createPostSchema,
  updatePostSchema,
};
