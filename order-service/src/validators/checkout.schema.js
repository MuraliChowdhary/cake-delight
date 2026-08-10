const { z } = require('zod');

const checkoutSchema = z.object({
  body: z.object({
    customerEmail: z.string().email('A valid email is required for order confirmation'),
  }),
});

const orderIdParamsSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid order ID format'),
  }),
});

module.exports = { checkoutSchema, orderIdParamsSchema };
