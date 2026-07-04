const { z } = require('zod');

// Create scan validation schema
const createScanSchema = z.object({
  target_url: z
    .string()
    .url('Invalid URL format')
    .refine((url) => {
      try {
        const parsed = new URL(url);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
      } catch {
        return false;
      }
    }, 'URL must use HTTP or HTTPS protocol'),
});

module.exports = {
  createScanSchema,
};
