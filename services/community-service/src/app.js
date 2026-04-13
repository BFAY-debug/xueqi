require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { responseHandler, errorHandler, logger } = require('xueqi-shared');

const postRoutes = require('./routes/posts');
const commentRoutes = require('./routes/comments');
const tagRoutes = require('./routes/tags');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.COMMUNITY_SERVICE_PORT || 3003;

app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());

app.use(responseHandler);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'community-service' });
});

app.use('/api/community', postRoutes);
app.use('/api/community', commentRoutes);
app.use('/api/community', tagRoutes);
app.use('/api/community/admin', adminRoutes);

app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`Community service running on port ${PORT}`);
});

module.exports = app;
