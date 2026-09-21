const { z } = require('zod');

// Create resource validation schema
const createResourceSchema = z.object({
  title: z
    .string({ required_error: 'Title is required' })
    .trim()
    .min(1, 'Title is required')
    .max(255, 'Title must be at most 255 characters'),
  description: z
    .string()
    .max(2000, 'Description must be at most 2000 characters')
    .optional()
    .or(z.literal('')),
  url: z
    .string()
    .max(500, 'URL must be at most 500 characters')
    .optional()
    .or(z.literal('')),
  category: z
    .string({ required_error: 'Category is required' })
    .trim()
    .min(1, 'Category is required')
    .max(50, 'Category must be at most 50 characters'),
});

// Update resource validation schema
const updateResourceSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Title is required')
    .max(255, 'Title must be at most 255 characters')
    .optional(),
  description: z
    .string()
    .max(2000, 'Description must be at most 2000 characters')
    .optional()
    .or(z.literal('')),
  url: z
    .string()
    .max(500, 'URL must be at most 500 characters')
    .optional()
    .or(z.literal('')),
  category: z
    .string()
    .trim()
    .min(1, 'Category is required')
    .max(50, 'Category must be at most 50 characters')
    .optional(),
});

module.exports = {
  createResourceSchema,
  updateResourceSchema,
};
