const path = require('path');
const rootDir = path.resolve(__dirname, '../../../');
require('dotenv').config({ path: path.join(rootDir, '.env.local') });
require('dotenv').config({ path: path.join(rootDir, '.env') });
const express = require('express');
const cors = require('cors');
const { responseHandler, errorHandler, logger, db, sensitiveFilter } = require('xueqi-shared');

const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const pointsRoutes = require('./routes/points');
const notificationRoutes = require('./routes/notifications');
const uploadRoutes = require('./routes/upload');
const adminRoutes = require('./routes/admin');
const friendRoutes = require('./routes/friends');
const followRoutes = require('./routes/follows');
const feedbackRoutes = require('./routes/feedback');

const app = express();
const PORT = process.env.USER_SERVICE_PORT || 3001;

// Middleware
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

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

// Response handler
app.use(responseHandler);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'user-service' });
});

// Routes (specific routes before profile's /:id wildcard)
app.use('/api/user', authRoutes);
app.use('/api/user', pointsRoutes);
app.use('/api/user', notificationRoutes);
app.use('/api/user', uploadRoutes);
app.use('/api/user/admin', adminRoutes);
app.use('/api/user', friendRoutes);
app.use('/api/user', followRoutes);
app.use('/api/user', feedbackRoutes);
app.use('/api/user', profileRoutes);

// Error handler
app.use(errorHandler);

app.listen(PORT, async () => {
  logger.info(`User service running on port ${PORT}`);
  // Load sensitive words into memory
  try {
    await sensitiveFilter.loadFromDB(db);
    logger.info('Sensitive word filter loaded');
  } catch (err) {
    logger.warn(`Failed to load sensitive words: ${err.message}`);
  }
});

module.exports = app;
