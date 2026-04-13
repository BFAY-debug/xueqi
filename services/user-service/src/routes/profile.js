const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const { authMiddleware, optionalAuth } = require('xueqi-shared');

// Self profile
router.get('/profile', authMiddleware, profileController.getMyProfile);
router.put('/profile', authMiddleware, profileController.updateMyProfile);

// Public profile
router.get('/:id', optionalAuth, profileController.getUserById);
router.get('/:id/stats', optionalAuth, profileController.getUserStats);

module.exports = router;
