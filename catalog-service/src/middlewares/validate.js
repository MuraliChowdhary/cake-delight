const { ZodError } = require('zod');

const validate = (schema) => async (req, res, next) => {
  try {
    const parsed = await schema.parseAsync({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    req.body = parsed.body || req.body;
    req.query = parsed.query || req.query;
    req.params = parsed.params || req.params;

    next();
  } catch (err) {
    if (err instanceof ZodError) {
      return res.status(400).json({
        error: 'Validation Error',
        details: err.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
    }
    next(err);
  }
};

module.exports = validate;
