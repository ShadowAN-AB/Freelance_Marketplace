const express = require('express');
const rateLimit = require('express-rate-limit');
const { register, login, me, registerSchema, loginSchema } = require('../controllers/authController');
const { validate } = require('../middleware/validate');
const { protect } = require('../middleware/auth');

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many auth attempts, try again later' },
});

router.post('/register', authLimiter, validate(registerSchema), register);
router.post('/login', authLimiter, validate(loginSchema), login);
router.get('/me', protect, me);

module.exports = router;
