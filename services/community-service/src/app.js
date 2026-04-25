const path = require('path');
const rootDir = path.resolve(__dirname, '../../../');
require('dotenv').config({ path: path.join(rootDir, '.env.local') });
require('dotenv').config({ path: path.join(rootDir, '.env') });
const express = require('express');
const cors = require('cors');
const { responseHandler, errorHandler, logger } = require('xueqi-shared');

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

// CORS
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost').split(',');
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) cb(null, true);
    else cb(new Error('CORS not allowed'));
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

app.listen(PORT, () => {
  logger.info(`Community service running on port ${PORT}`);
});

module.exports = app;
