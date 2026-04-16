const pool = require('./db');
const redis = require('./redis');
const { generateToken, generateRefreshToken, verifyToken, JWT_SECRET } = require('./jwt');
const logger = require('./logger');
const responseHandler = require('./responseHandler');
const errorHandler = require('./errorHandler');
const { authMiddleware, optionalAuth, requireRole, serviceAuthMiddleware } = require('./auth');

module.exports = {
  db: pool,
  redis,
  jwt: { generateToken, generateRefreshToken, verifyToken, JWT_SECRET },
  logger,
  responseHandler,
  errorHandler,
  authMiddleware,
  optionalAuth,
  requireRole,
  serviceAuthMiddleware
};
