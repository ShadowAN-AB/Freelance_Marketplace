const { ApiError } = require('../utils/apiError');

const SKIP_PATHS = new Set([
  '/api/payments/webhook',
  '/api/auth/register',
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/auth/verify-email',
]);

function csrfProtect(req, _res, next) {
  const method = String(req.method || 'GET').toUpperCase();
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) return next();
  if (SKIP_PATHS.has(req.path)) return next();
  const auth = req.headers.authorization || '';
  if (auth.startsWith('Bearer ')) return next();
  const cookie = req.cookies?.fh_csrf;
  const header = req.headers['x-csrf-token'];
  if (!cookie || !header || cookie !== header) {
    throw new ApiError(403, 'Invalid CSRF token');
  }
  next();
}

module.exports = { csrfProtect };
