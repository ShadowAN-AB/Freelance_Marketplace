const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { isProd } = require('../config/env');

function signToken(user, expiresIn = process.env.JWT_EXPIRES_IN || '7d') {
  return jwt.sign(
    { id: user._id.toString(), role: user.role },
    process.env.JWT_SECRET,
    { expiresIn }
  );
}

function signRefreshToken(user) {
  return jwt.sign(
    { id: user._id.toString(), typ: 'refresh' },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' }
  );
}

function verifyToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}

function randomToken() {
  return crypto.randomBytes(32).toString('hex');
}

function hashToken(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function cookieOpts(maxAgeMs) {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd(),
    path: '/',
    maxAge: maxAgeMs,
  };
}

function setAuthCookies(res, { access, refresh }) {
  res.cookie('fh_access', access, cookieOpts(7 * 24 * 60 * 60 * 1000));
  res.cookie('fh_refresh', refresh, cookieOpts(30 * 24 * 60 * 60 * 1000));
}

function clearAuthCookies(res) {
  res.clearCookie('fh_access', { path: '/' });
  res.clearCookie('fh_refresh', { path: '/' });
}

function readAccessToken(req) {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7);
  if (req.cookies?.fh_access) return req.cookies.fh_access;
  return null;
}

module.exports = {
  signToken,
  signRefreshToken,
  verifyToken,
  randomToken,
  hashToken,
  setAuthCookies,
  clearAuthCookies,
  readAccessToken,
};
