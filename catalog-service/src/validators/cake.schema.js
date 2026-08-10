const { z } = require('zod');

const createCakeSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters long.'),
    description: z.string().optional(),
    price: z.number().positive('Price must be greater than 0'),
    category: z.string().min(2, 'Category is required'),
    imageUrl: z.string().url('Invalid image URL format').optional(),
    isAvailable: z.boolean().optional(),
  }),
});

const updateCakeSchema = z.object({
  params: z.object({
    id: z.string().uuid({ message: 'Invalid UUID format' }),
  }),
  body: z.object({
    name: z.string().min(2).optional(),
    description: z.string().optional(),
    price: z.number().positive().optional(),
    category: z.string().min(2).optional(),
    imageUrl: z.string().url().optional(),
    isAvailable: z.boolean().optional(),
  }).strict()
});

const getCakesQuerySchema = z.object({
  query: z
    .object({
      category: z.string().trim().min(1, 'category cannot be empty').max(50).optional(),
      search: z.string().trim().min(1, 'search cannot be empty').max(100).optional(),
      minPrice: z.coerce
        .number({ invalid_type_error: 'minPrice must be a number' })
        .nonnegative('minPrice cannot be negative')
        .optional(),
      maxPrice: z.coerce
        .number({ invalid_type_error: 'maxPrice must be a number' })
        .nonnegative('maxPrice cannot be negative')
        .optional(),
    })
    .strict(),
});

const CakeIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid cake ID format'),
  }),
});

module.exports = {
  getCakesQuerySchema,
  CakeIdSchema,
  createCakeSchema,
  updateCakeSchema,
};
