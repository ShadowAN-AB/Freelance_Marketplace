const express = require('express');
const rateLimit = require('express-rate-limit');
const {
  register,
  login,
  me,
  logout,
  refresh,
  changePassword,
  verifyEmail,
  resendVerify,
  forgotPassword,
  resetPassword,
  registerSchema,
  loginSchema,
  passwordSchema,
  forgotSchema,
  resetSchema,
} = require('./controller');
const { validate } = require('../../middleware/validate');
const { protect, optionalAuth } = require('../../middleware/auth');

const router = express.Router();

const authLimiter =
  process.env.NODE_ENV === 'test'
    ? (_req, _res, next) => next()
    : rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 40,
        standardHeaders: true,
        legacyHeaders: false,
        message: { message: 'Too many auth attempts, try again later' },
      });

router.post('/register', authLimiter, validate(registerSchema), register);
router.post('/login', authLimiter, validate(loginSchema), login);
router.post('/refresh', refresh);
router.post('/logout', optionalAuth, logout);
router.get('/me', protect, me);
router.patch('/password', protect, validate(passwordSchema), changePassword);
router.get('/verify-email', verifyEmail);
router.post('/resend-verify', protect, resendVerify);
router.post('/forgot-password', authLimiter, validate(forgotSchema), forgotPassword);
router.post('/reset-password', authLimiter, validate(resetSchema), resetPassword);

module.exports = router;
