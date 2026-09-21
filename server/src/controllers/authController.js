const { z } = require('zod');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { asyncHandler } = require('../utils/asyncHandler');
const { ApiError } = require('../utils/apiError');
const { signToken } = require('../utils/tokens');
const { publicUser } = require('../utils/publicUser');

const registerSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(80),
    email: z.string().email(),
    password: z.string().min(8).max(72),
    role: z.enum(['freelancer', 'client']),
  }),
});

const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(1),
  }),
});

const register = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;
  const exists = await User.findOne({ email: email.toLowerCase() });
  if (exists) throw new ApiError(409, 'An account with this email already exists');
  const hashed = await bcrypt.hash(password, 12);
  const user = await User.create({ name, email: email.toLowerCase(), password: hashed, role });
  const token = signToken(user);
  res.status(201).json({ token, user: publicUser(user) });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  if (!user) throw new ApiError(401, 'Invalid email or password');
  if (user.isBlocked) throw new ApiError(403, 'This account has been blocked');
  const ok = await bcrypt.compare(password, user.password);
  if (!ok) throw new ApiError(401, 'Invalid email or password');
  user.lastLoginAt = new Date();
  await user.save();
  const token = signToken(user);
  res.json({ token, user: publicUser(user) });
});

const me = asyncHandler(async (req, res) => {
  res.json({ user: publicUser(req.user) });
});

module.exports = { register, login, me, registerSchema, loginSchema };
