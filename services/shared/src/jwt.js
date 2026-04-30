const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is not set. Refusing to start.');
  process.exit(1);
}
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
const ADMIN_ACCESS_EXPIRY = '5m';
const ADMIN_REFRESH_EXPIRY = '1d';

function isAdmin(roleName) {
  return roleName === 'admin' || roleName === 'super_admin';
}

/**
 * Generate access token (shorter expiry for admins)
 */
function generateToken(payload) {
  const expiresIn = isAdmin(payload.roleName) ? ADMIN_ACCESS_EXPIRY : JWT_EXPIRES_IN;
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

/**
 * Generate refresh token (shorter expiry for admins)
 */
function generateRefreshToken(payload) {
  const expiresIn = isAdmin(payload.roleName) ? ADMIN_REFRESH_EXPIRY : JWT_REFRESH_EXPIRES_IN;
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

/**
 * Verify token, returns decoded payload or null
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

module.exports = {
  generateToken,
  generateRefreshToken,
  verifyToken,
  JWT_EXPIRES_IN,
  JWT_REFRESH_EXPIRES_IN
};
