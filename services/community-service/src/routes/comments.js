const express = require('express');
const router = express.Router();
const commentController = require('../controllers/commentController');
const { authMiddleware, optionalAuth } = require('xueqi-shared');

// Public
router.get('/posts/:postId/comments', optionalAuth, commentController.getComments);

// Auth required
router.post('/posts/:postId/comments', authMiddleware, commentController.createComment);
router.delete('/comments/:id', authMiddleware, commentController.deleteComment);
router.post('/comments/:id/like', authMiddleware, commentController.likeComment);
router.get('/my/comments', authMiddleware, commentController.getMyComments);

module.exports = router;
