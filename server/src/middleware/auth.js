const User = require('../models/User');
const { verifyToken, readAccessToken } = require('../common/tokens');
const { ApiError } = require('../common/apiError');
const { asyncHandler } = require('../common/asyncHandler');

const protect = asyncHandler(async (req, _res, next) => {
  const token = readAccessToken(req);
  if (!token) throw new ApiError(401, 'Authentication required');
  const payload = verifyToken(token);
  const user = await User.findById(payload.id);
  if (!user) throw new ApiError(401, 'Account no longer exists');
  if (user.isBlocked) throw new ApiError(403, 'This account has been blocked');
  req.user = user;
  next();
});

const authorize =
  (...roles) =>
  (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw new ApiError(403, 'You do not have permission to do that');
    }
    next();
  };

const requireVerified = (req, _res, next) => {
  if (process.env.SKIP_EMAIL_VERIFY === 'true' || process.env.NODE_ENV === 'test') return next();
  if (req.user && !req.user.emailVerified) {
    throw new ApiError(403, 'Verify your email to continue');
  }
  next();
};

const optionalAuth = asyncHandler(async (req, _res, next) => {
  const token = readAccessToken(req);
  if (!token) return next();
  try {
    const payload = verifyToken(token);
    const user = await User.findById(payload.id);
    if (user && !user.isBlocked) req.user = user;
  } catch {
    // ignore invalid optional tokens
  }
  next();
});

module.exports = { protect, authorize, optionalAuth, requireVerified };
