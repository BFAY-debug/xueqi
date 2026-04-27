const pool = require('./db');
const redis = require('./redis');
const { generateToken, generateRefreshToken, verifyToken } = require('./jwt');
const logger = require('./logger');
const responseHandler = require('./responseHandler');
const errorHandler = require('./errorHandler');
const { authMiddleware, optionalAuth, requireRole, serviceAuthMiddleware } = require('./auth');
const sensitiveFilter = require('./sensitiveFilter');
const rateLimiter = require('./rateLimiter');
const captcha = require('./captcha');

module.exports = {
  db: pool,
  redis,
  jwt: { generateToken, generateRefreshToken, verifyToken },
  logger,
  responseHandler,
  errorHandler,
  authMiddleware,
  optionalAuth,
  requireRole,
  serviceAuthMiddleware,
  sensitiveFilter,
  rateLimiter,
  captcha
};
