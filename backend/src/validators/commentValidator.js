const { z } = require('zod');

// Create comment validation schema
const createCommentSchema = z.object({
  content: z
    .string()
    .min(1, 'Content is required')
    .max(2000, 'Content must be at most 2000 characters'),
  parent_comment_id: z
    .number()
    .int()
    .positive()
    .optional(),
});

module.exports = {
  createCommentSchema,
};
