const { z } = require('zod');

const cakeIdSchema = z.object({
  params: z.object({
    cakeId: z.string().uuid({ message: 'Invalid Cake Id format.' }),
  }),
});

const ratingIdParamsSchema = z.object({
  params: z.object({
    cakeId: z.string().uuid({ message: 'Invalid Cake Id format.' }),
    ratingId: z.string().uuid({ message: 'Invalid Rating Id format.' }),
  }),
});

const createRatingSchema = z.object({
  params: z.object({
    cakeId: z.string().uuid({ message: 'Invalid Cake id' }),
  }),
  body: z.object({
    score: z.number().int().min(1, 'Score must be at least 1').max(5, 'Score cannot exceed 5'),
    comment: z.string().optional(),
  }),
});

const updateRatingSchema = z.object({
  params: z.object({
    cakeId: z.string().uuid({ message: 'Invalid Cake id' }),
    ratingId: z.string().uuid({ message: 'Invalid Rating id' }),
  }),
  body: z.object({
    score: z.number().int().min(1).max(5).optional(),
    comment: z.string().optional(),
  }),
});

module.exports = {
  createRatingSchema,
  cakeIdSchema,
  ratingIdParamsSchema,
  updateRatingSchema,
};
