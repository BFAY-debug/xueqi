const path = require('path');
const rootDir = path.resolve(__dirname, '../../../');
require('dotenv').config({ path: path.join(rootDir, '.env.local') });
require('dotenv').config({ path: path.join(rootDir, '.env') });
const express = require('express');
const cors = require('cors');
const { responseHandler, errorHandler, logger } = require('xueqi-shared');

const roomRoutes = require('./routes/rooms');
const sessionRoutes = require('./routes/sessions');
const locationRoutes = require('./routes/locations');
const seatRoutes = require('./routes/seats');
const volunteerRoutes = require('./routes/volunteer');
const bookRoutes = require('./routes/books');

const app = express();
const PORT = process.env.STUDY_SERVICE_PORT || 3002;

// Middleware
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

app.use(responseHandler);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'study-service' });
});

// Routes
app.use('/api/study/rooms', roomRoutes);
app.use('/api/study/sessions', sessionRoutes);
app.use('/api/study/locations', locationRoutes);
app.use('/api/study/seats', seatRoutes);
app.use('/api/study/reservations', seatRoutes); // reservation-specific routes
app.use('/api/study/volunteer', volunteerRoutes);
app.use('/api/study/admin/volunteer', volunteerRoutes);
app.use('/api/study/books', bookRoutes);
app.use('/api/study/admin/books', bookRoutes);

// Error handler
app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`Study service running on port ${PORT}`);
});

module.exports = app;
