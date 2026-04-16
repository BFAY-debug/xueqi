const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { authMiddleware } = require('xueqi-shared');

router.get('/rooms/:id/messages', authMiddleware, chatController.getMessages);

module.exports = router;
