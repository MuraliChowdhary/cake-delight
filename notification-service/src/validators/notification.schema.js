const { z } = require('zod');

const orderIdParamsSchema = z.object({
  params: z.object({
    orderId: z.string().uuid('Invalid order ID format'),
  }),
});

module.exports = { orderIdParamsSchema };
