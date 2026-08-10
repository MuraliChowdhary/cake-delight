const { z } = require('zod');

const addItemSchema = z.object({
  body: z.object({
    cakeId: z.string().uuid('Invalid cake ID format'),
    quantity: z.number().int().positive('Quantity must be at least 1').default(1),
  }),
});

const updateItemSchema = z.object({
  params: z.object({
    cakeId: z.string().uuid('Invalid cake ID format'),
  }),
  body: z.object({
    quantity: z.number().int().positive('Quantity must be at least 1'),
  }),
});

const removeItemSchema = z.object({
  params: z.object({
    cakeId: z.string().uuid('Invalid cake ID format'),
  }),
});

module.exports = { addItemSchema, updateItemSchema, removeItemSchema };
