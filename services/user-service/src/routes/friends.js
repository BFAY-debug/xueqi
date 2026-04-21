const express = require('express');
const router = express.Router();
const friendController = require('../controllers/friendController');
const { authMiddleware, serviceAuthMiddleware } = require('xueqi-shared');

router.post('/friends/requests', authMiddleware, friendController.sendRequest);
router.put('/friends/requests/:id/accept', authMiddleware, friendController.acceptRequest);
router.put('/friends/requests/:id/reject', authMiddleware, friendController.rejectRequest);
router.get('/friends/requests', authMiddleware, friendController.getFriendRequests);
router.get('/friends/requests/unread-count', authMiddleware, friendController.getUnreadRequestCount);
router.get('/friends/search', authMiddleware, friendController.searchUsers);
router.get('/friends', authMiddleware, friendController.getFriends);
router.delete('/friends/:userId', authMiddleware, friendController.deleteFriend);
router.get('/friends/status/:targetUserId', authMiddleware, friendController.getFriendStatus);
router.post('/friends/block', authMiddleware, friendController.blockUser);
router.delete('/friends/block/:userId', authMiddleware, friendController.unblockUser);
router.get('/friends/blocked', authMiddleware, friendController.getBlockedUsers);
router.get('/friends/internal/check', serviceAuthMiddleware, friendController.checkFriendship);

module.exports = router;
