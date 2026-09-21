const { ApiError } = require('../utils/apiError');

function validate(schema) {
  return (req, _res, next) => {
    const result = schema.safeParse({
      body: req.body,
      params: req.params,
      query: req.query,
    });
    if (!result.success) {
      const issues = result.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      }));
      const error = new ApiError(400, issues[0]?.message || 'Validation failed');
      error.errors = issues;
      return next(error);
    }
    req.validated = result.data;
    if (result.data.body) req.body = result.data.body;
    next();
  };
}

module.exports = { validate };
