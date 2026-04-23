const express = require('express');
const router = express.Router();
const { authMiddleware, requireRole } = require('xueqi-shared');
const feedbackController = require('../controllers/feedbackController');

// User submit feedback (requires login)
router.post('/feedback', authMiddleware, feedbackController.submit);

// Admin list feedback
router.get('/feedback', authMiddleware, requireRole('super_admin'), feedbackController.getList);

// Admin update feedback status
router.put('/feedback/:id', authMiddleware, requireRole('super_admin'), feedbackController.updateStatus);

module.exports = router;
