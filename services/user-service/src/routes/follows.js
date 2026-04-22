const express = require('express');
const router = express.Router();
const followController = require('../controllers/followController');
const { authMiddleware, optionalAuth } = require('xueqi-shared');

router.post('/follows/:userId', authMiddleware, followController.toggleFollow);
router.get('/follows/:userId/check', authMiddleware, followController.checkFollowing);
router.get('/follows/:userId/followers', optionalAuth, followController.getFollowers);
router.get('/follows/:userId/following', optionalAuth, followController.getFollowing);

module.exports = router;
