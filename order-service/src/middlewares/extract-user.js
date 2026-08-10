const { z } = require('zod');

const userIdSchema = z.string().uuid();

function extractUser(req, res, next) {
  const userId = req.headers['x-user-id'];
  const result = userIdSchema.safeParse(userId);

  if (!result.success) {
    return res.status(400).json({
      error: { message: 'Missing or invalid X-User-Id header', status: 400 },
    });
  }

  req.userId = result.data;
  next();
}

module.exports = extractUser;
