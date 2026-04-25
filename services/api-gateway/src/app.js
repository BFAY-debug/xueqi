const path = require('path');
const rootDir = path.resolve(__dirname, '../../../');
require('dotenv').config({ path: path.join(rootDir, '.env.local') });
require('dotenv').config({ path: path.join(rootDir, '.env') });
const express = require('express');
const http = require('http');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { logger } = require('xueqi-shared');

const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');
const PORT = process.env.GATEWAY_PORT || 3000;

// Service URLs
const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:3001';
const STUDY_SERVICE_URL = process.env.STUDY_SERVICE_URL || 'http://localhost:3002';
const COMMUNITY_SERVICE_URL = process.env.COMMUNITY_SERVICE_URL || 'http://localhost:3003';

// Middleware
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost').split(',');
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) cb(null, true);
    else cb(new Error('CORS not allowed'));
  },
  credentials: true
}));

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: { success: false, message: '请求过于频繁，请稍后再试' },
  standardHeaders: true,
  legacyHeaders: false
});
app.use(limiter);

// Stricter rate limit for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: { success: false, message: '登录尝试过多，请稍后再试' }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'api-gateway' });
});

// Auth rate limiting (before proxy)
app.use('/api/user/register', authLimiter);
app.use('/api/user/login', authLimiter);

// ── Proxy to User Service ─────────────────────────────
app.use('/api/user', createProxyMiddleware({
  target: USER_SERVICE_URL,
  changeOrigin: true,
  timeout: 30000,
  proxyTimeout: 30000,
  pathRewrite: (path) => path,
  on: {
    proxyReq: (proxyReq, req) => {
      proxyReq.path = req.originalUrl;
    },
    proxyRes: (proxyRes) => {
      const ct = proxyRes.headers['content-type'];
      if (ct && ct.includes('application/json') && !ct.includes('charset')) {
        proxyRes.headers['content-type'] = ct + '; charset=utf-8';
      }
    },
    error: (err, req, res) => {
      logger.error(`User service proxy error: ${err.message}`);
      res.status(503).json({ success: false, message: '用户服务暂时不可用' });
    }
  }
}));

// ── Proxy to Study Service ────────────────────────────
app.use('/api/study', createProxyMiddleware({
  target: STUDY_SERVICE_URL,
  changeOrigin: true,
  timeout: 30000,
  proxyTimeout: 30000,
  ws: true,
  pathRewrite: (path) => path,
  on: {
    proxyReq: (proxyReq, req) => {
      proxyReq.path = req.originalUrl;
    },
    proxyRes: (proxyRes) => {
      const ct = proxyRes.headers['content-type'];
      if (ct && ct.includes('application/json') && !ct.includes('charset')) {
        proxyRes.headers['content-type'] = ct + '; charset=utf-8';
      }
    },
    error: (err, req, res) => {
      logger.error(`Study service proxy error: ${err.message}`);
      res.status(503).json({ success: false, message: '学习服务暂时不可用' });
    }
  }
}));

// ── Proxy to Community Service ────────────────────────
app.use('/api/community', createProxyMiddleware({
  target: COMMUNITY_SERVICE_URL,
  changeOrigin: true,
  timeout: 30000,
  proxyTimeout: 30000,
  pathRewrite: (path) => path,
  on: {
    proxyReq: (proxyReq, req) => {
      proxyReq.path = req.originalUrl;
    },
    proxyRes: (proxyRes) => {
      const ct = proxyRes.headers['content-type'];
      if (ct && ct.includes('application/json') && !ct.includes('charset')) {
        proxyRes.headers['content-type'] = ct + '; charset=utf-8';
      }
    },
    error: (err, req, res) => {
      logger.error(`Community service proxy error: ${err.message}`);
      res.status(503).json({ success: false, message: '社区服务暂时不可用' });
    }
  }
}));

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'API 路径不存在' });
});

const server = http.createServer(app);
server.listen(PORT, () => {
  logger.info(`API Gateway running on port ${PORT}`);
  logger.info(`  → User service:     ${USER_SERVICE_URL}`);
  logger.info(`  → Study service:    ${STUDY_SERVICE_URL}`);
  logger.info(`  → Community service:${COMMUNITY_SERVICE_URL}`);
});

module.exports = { app, server };
