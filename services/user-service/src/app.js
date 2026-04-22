const path = require('path');
const rootDir = path.resolve(__dirname, '../../../');
require('dotenv').config({ path: path.join(rootDir, '.env.local') });
require('dotenv').config({ path: path.join(rootDir, '.env') });
const express = require('express');
const cors = require('cors');
const { responseHandler, errorHandler, logger } = require('xueqi-shared');

const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const pointsRoutes = require('./routes/points');
const notificationRoutes = require('./routes/notifications');
const uploadRoutes = require('./routes/upload');
const adminRoutes = require('./routes/admin');
const friendRoutes = require('./routes/friends');
const followRoutes = require('./routes/follows');

const app = express();
const PORT = process.env.USER_SERVICE_PORT || 3001;

// Middleware
app.use(cors({
  origin: '*',
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
app.use('/api/user', profileRoutes);

// Error handler
app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`User service running on port ${PORT}`);
});

module.exports = app;
