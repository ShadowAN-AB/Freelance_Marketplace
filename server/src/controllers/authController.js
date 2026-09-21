const { z } = require('zod');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { asyncHandler } = require('../utils/asyncHandler');
const { ApiError } = require('../utils/apiError');
const {
  signToken,
  signRefreshToken,
  verifyToken,
  randomToken,
  hashToken,
  setAuthCookies,
  clearAuthCookies,
} = require('../utils/tokens');
const { publicUser } = require('../utils/publicUser');
const { sendMail } = require('../services/mailer');
const { clientUrl } = require('../config/env');
const { audit } = require('../services/audit');

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

const passwordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8).max(72),
  }),
});

const forgotSchema = z.object({
  body: z.object({ email: z.string().email() }),
});

const resetSchema = z.object({
  body: z.object({
    token: z.string().min(10),
    newPassword: z.string().min(8).max(72),
  }),
});

async function issueSession(res, user) {
  const access = signToken(user);
  const refresh = signRefreshToken(user);
  user.refreshTokenHash = hashToken(refresh);
  await user.save();
  setAuthCookies(res, { access, refresh });
  return { token: access, refreshToken: refresh, user: publicUser(user) };
}

const register = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;
  const exists = await User.findOne({ email: email.toLowerCase() });
  if (exists) throw new ApiError(409, 'An account with this email already exists');
  const hashed = await bcrypt.hash(password, 12);
  const verifyRaw = randomToken();
  const skipVerify = process.env.NODE_ENV === 'test' || process.env.SKIP_EMAIL_VERIFY === 'true';
  const user = await User.create({
    name,
    email: email.toLowerCase(),
    password: hashed,
    role,
    emailVerified: skipVerify,
    emailVerifyToken: skipVerify ? '' : hashToken(verifyRaw),
  });
  if (!skipVerify) {
    const link = `${clientUrl()}/verify-email?token=${verifyRaw}`;
    await sendMail({
      to: user.email,
      subject: 'Verify your FreelanceHub email',
      text: `Confirm your account: ${link}`,
    });
  }
  const session = await issueSession(res, user);
  res.status(201).json(session);
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  if (!user) throw new ApiError(401, 'Invalid email or password');
  if (user.isBlocked) throw new ApiError(403, 'This account has been blocked');
  const ok = await bcrypt.compare(password, user.password);
  if (!ok) throw new ApiError(401, 'Invalid email or password');
  user.lastLoginAt = new Date();
  const session = await issueSession(res, user);
  res.json(session);
});

const me = asyncHandler(async (req, res) => {
  res.json({ user: publicUser(req.user) });
});

const logout = asyncHandler(async (req, res) => {
  if (req.user) {
    req.user.refreshTokenHash = '';
    await req.user.save();
  }
  clearAuthCookies(res);
  res.json({ ok: true });
});

const refresh = asyncHandler(async (req, res) => {
  const raw = req.cookies?.fh_refresh || req.body?.refreshToken;
  if (!raw) throw new ApiError(401, 'Refresh token required');
  let payload;
  try {
    payload = verifyToken(raw);
  } catch {
    throw new ApiError(401, 'Invalid refresh token');
  }
  if (payload.typ !== 'refresh') throw new ApiError(401, 'Invalid refresh token');
  const user = await User.findById(payload.id).select('+refreshTokenHash');
  if (!user || user.isBlocked) throw new ApiError(401, 'Invalid refresh token');
  if (!user.refreshTokenHash || user.refreshTokenHash !== hashToken(raw)) {
    throw new ApiError(401, 'Invalid refresh token');
  }
  const session = await issueSession(res, user);
  res.json(session);
});

const changePassword = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('+password');
  if (!user) throw new ApiError(401, 'Account no longer exists');
  const ok = await bcrypt.compare(req.body.currentPassword, user.password);
  if (!ok) throw new ApiError(400, 'Current password is incorrect');
  user.password = await bcrypt.hash(req.body.newPassword, 12);
  await user.save();
  res.json({ ok: true });
});

const verifyEmail = asyncHandler(async (req, res) => {
  const token = req.query.token || req.body.token;
  if (!token) throw new ApiError(400, 'Token is required');
  const user = await User.findOne({ emailVerifyToken: hashToken(token) }).select('+emailVerifyToken');
  if (!user) throw new ApiError(400, 'Invalid or expired verification link');
  user.emailVerified = true;
  user.emailVerifyToken = '';
  await user.save();
  res.json({ ok: true, user: publicUser(user) });
});

const forgotPassword = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email.toLowerCase() });
  if (user) {
    const raw = randomToken();
    user.passwordResetToken = hashToken(raw);
    user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();
    await sendMail({
      to: user.email,
      subject: 'Reset your FreelanceHub password',
      text: `Reset link: ${clientUrl()}/reset-password?token=${raw}`,
    });
  }
  res.json({ ok: true });
});

const resetPassword = asyncHandler(async (req, res) => {
  const user = await User.findOne({
    passwordResetToken: hashToken(req.body.token),
    passwordResetExpires: { $gt: new Date() },
  }).select('+passwordResetToken +passwordResetExpires +password');
  if (!user) throw new ApiError(400, 'Invalid or expired reset link');
  user.password = await bcrypt.hash(req.body.newPassword, 12);
  user.passwordResetToken = '';
  user.passwordResetExpires = undefined;
  await user.save();
  await audit({ actorId: user._id, action: 'password_reset', targetType: 'user', targetId: user._id });
  res.json({ ok: true });
});

module.exports = {
  register,
  login,
  me,
  logout,
  refresh,
  changePassword,
  verifyEmail,
  forgotPassword,
  resetPassword,
  registerSchema,
  loginSchema,
  passwordSchema,
  forgotSchema,
  resetSchema,
};
