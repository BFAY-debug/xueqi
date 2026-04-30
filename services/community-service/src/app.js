const path = require('path');
const rootDir = path.resolve(__dirname, '../../../');
require('dotenv').config({ path: path.join(rootDir, '.env.local') });
require('dotenv').config({ path: path.join(rootDir, '.env') });
const express = require('express');
const cors = require('cors');
const { responseHandler, errorHandler, logger, db, sensitiveFilter } = require('xueqi-shared');

const fs = require('fs');
const postRoutes = require('./routes/posts');
const commentRoutes = require('./routes/comments');
const tagRoutes = require('./routes/tags');
const adminRoutes = require('./routes/admin');
const proposalRoutes = require('./routes/proposals');
const bookmarkRoutes = require('./routes/bookmarks');
const uploadRoutes = require('./routes/upload');

const app = express();
const PORT = process.env.COMMUNITY_SERVICE_PORT || 3003;

// CORS — hostname-based (handles http/https and www/non-www)
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost').split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    try {
      const o = new URL(origin);
      const allowed = allowedOrigins.some(a => {
        const u = new URL(a.trim());
        return u.hostname.replace(/^www\./, '') === o.hostname.replace(/^www\./, '');
      });
      return cb(null, allowed);
    } catch {
      return cb(null, allowedOrigins.includes(origin));
    }
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(responseHandler);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'community-service' });
});

// Serve uploaded images
const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, '../uploads/community');
fs.mkdirSync(uploadDir, { recursive: true });
app.use('/uploads/community', express.static(uploadDir));

app.use('/api/community', postRoutes);
app.use('/api/community', commentRoutes);
app.use('/api/community', tagRoutes);
app.use('/api/community/admin', adminRoutes);
app.use('/api/community/proposals', proposalRoutes);
app.use('/api/community', bookmarkRoutes);
app.use('/api/community', uploadRoutes);

app.use(errorHandler);

app.listen(PORT, async () => {
  logger.info(`Community service running on port ${PORT}`);
  // Load sensitive words into memory
  try {
    await sensitiveFilter.loadFromDB(db);
    logger.info('Sensitive word filter loaded');
  } catch (err) {
    logger.warn(`Failed to load sensitive words: ${err.message}`);
  }
});

module.exports = app;
