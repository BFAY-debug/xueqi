const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authMiddleware, serviceAuthMiddleware } = require('xueqi-shared');

router.get('/notifications', authMiddleware, notificationController.getNotifications);
router.get('/notifications/unread-count', authMiddleware, notificationController.getUnreadCount);
router.put('/notifications/:id/read', authMiddleware, notificationController.markAsRead);
router.put('/notifications/read-all', authMiddleware, notificationController.markAllAsRead);
router.post('/notifications/create', serviceAuthMiddleware, notificationController.createNotification);

module.exports = router;
