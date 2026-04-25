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
const chatRoutes = require('./routes/chat');
const privateChatRoutes = require('./routes/privateChat');
const seatService = require('./services/seatService');

const http = require('http');
const { initSocket, broadcastParticipants, broadcastSeatUpdate } = require('./socket');

const app = express();
const PORT = process.env.STUDY_SERVICE_PORT || 3002;

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

// Serve uploaded files (use UPLOAD_DIR env var in Docker, fallback to relative path in dev)
const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads');
app.use('/uploads', express.static(uploadDir));

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
app.use('/api/study/private-chat', privateChatRoutes);
app.use('/api/study', chatRoutes);

// Error handler
app.use(errorHandler);

const server = http.createServer(app);
initSocket(server);

server.listen(PORT, () => {
  logger.info(`Study service running on port ${PORT}`);
  // Start automatic no-show checker
  seatService.startNoShowChecker();
});

// Expose broadcast functions for use in controllers/services
app.set('broadcastParticipants', broadcastParticipants);
app.set('broadcastSeatUpdate', broadcastSeatUpdate);

module.exports = { app, server };
