const { z } = require('zod');

const GROUP_CATEGORIES = ['Offensive', 'Defensive', 'Research', 'Bounty', 'Learning'];

// Create group validation schema
const createGroupSchema = z.object({
  name: z
    .string()
    .min(1, 'Group name is required')
    .max(255, 'Group name must be at most 255 characters'),
  description: z
    .string()
    .min(1, 'Description is required')
    .max(2000, 'Description must be at most 2000 characters'),
  category: z
    .enum(GROUP_CATEGORIES, {
      errorMap: () => ({ message: `Category must be one of: ${GROUP_CATEGORIES.join(', ')}` }),
    }),
});

// Create group post validation schema
const createGroupPostSchema = z.object({
  content: z
    .string()
    .min(1, 'Content is required')
    .max(5000, 'Content must be at most 5000 characters'),
});

// Create group post comment validation schema
const createGroupPostCommentSchema = z.object({
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

// Invite user to group validation schema
const inviteToGroupSchema = z.object({
  email: z
    .string()
    .email('Invalid email address'),
});

module.exports = {
  createGroupSchema,
  createGroupPostSchema,
  createGroupPostCommentSchema,
  inviteToGroupSchema,
  GROUP_CATEGORIES,
};
