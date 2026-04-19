const express = require('express');
const router = express.Router();
const { authMiddleware } = require('xueqi-shared');
const ctrl = require('../controllers/privateChatController');

router.get('/conversations', authMiddleware, ctrl.getConversations);
router.post('/conversations', authMiddleware, ctrl.createConversation);
router.get('/conversations/:id/messages', authMiddleware, ctrl.getMessages);
router.put('/conversations/:id/read', authMiddleware, ctrl.markRead);
router.get('/unread-count', authMiddleware, ctrl.getUnreadCount);
router.get('/users/:userId/status', authMiddleware, ctrl.getUserStatus);
router.get('/online-users', authMiddleware, ctrl.getOnlineUsersList);

module.exports = router;
