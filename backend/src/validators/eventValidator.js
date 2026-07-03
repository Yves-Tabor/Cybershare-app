const { z } = require('zod');

const EVENT_CATEGORIES = ['conference', 'workshop', 'webinar', 'ctf', 'meetup'];
const EVENT_STATUSES = ['upcoming', 'ongoing', 'completed'];

// Create event validation schema
const createEventSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(255, 'Title must be at most 255 characters'),
  description: z
    .string()
    .max(2000, 'Description must be at most 2000 characters')
    .optional(),
  location: z
    .string()
    .max(255, 'Location must be at most 255 characters')
    .optional(),
  start_date: z
    .string()
    .refine((date) => !isNaN(Date.parse(date)), 'Invalid start date'),
  end_date: z
    .string()
    .refine((date) => !isNaN(Date.parse(date)), 'Invalid end date')
    .optional(),
  image_url: z
    .string()
    .url('Invalid image URL')
    .max(500, 'Image URL must be at most 500 characters')
    .optional(),
  category: z
    .enum(EVENT_CATEGORIES, {
      errorMap: () => ({ message: `Category must be one of: ${EVENT_CATEGORIES.join(', ')}` }),
    }),
  status: z
    .enum(EVENT_STATUSES, {
      errorMap: () => ({ message: `Status must be one of: ${EVENT_STATUSES.join(', ')}` }),
    })
    .optional(),
});

// Update event validation schema
const updateEventSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(255, 'Title must be at most 255 characters')
    .optional(),
  description: z
    .string()
    .max(2000, 'Description must be at most 2000 characters')
    .optional(),
  location: z
    .string()
    .max(255, 'Location must be at most 255 characters')
    .optional(),
  start_date: z
    .string()
    .refine((date) => !isNaN(Date.parse(date)), 'Invalid start date')
    .optional(),
  end_date: z
    .string()
    .refine((date) => !isNaN(Date.parse(date)), 'Invalid end date')
    .optional(),
  image_url: z
    .string()
    .url('Invalid image URL')
    .max(500, 'Image URL must be at most 500 characters')
    .optional(),
  category: z
    .enum(EVENT_CATEGORIES, {
      errorMap: () => ({ message: `Category must be one of: ${EVENT_CATEGORIES.join(', ')}` }),
    })
    .optional(),
  status: z
    .enum(EVENT_STATUSES, {
      errorMap: () => ({ message: `Status must be one of: ${EVENT_STATUSES.join(', ')}` }),
    })
    .optional(),
});

module.exports = {
  createEventSchema,
  updateEventSchema,
  EVENT_CATEGORIES,
  EVENT_STATUSES,
};
