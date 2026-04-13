const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');
const { authMiddleware, optionalAuth } = require('xueqi-shared');

// Public
router.get('/posts', optionalAuth, postController.listPosts);
router.get('/posts/:id', optionalAuth, postController.getPost);

// Auth required
router.post('/posts', authMiddleware, postController.createPost);
router.put('/posts/:id', authMiddleware, postController.updatePost);
router.delete('/posts/:id', authMiddleware, postController.deletePost);
router.post('/posts/:id/like', authMiddleware, postController.likePost);
router.get('/my/posts', authMiddleware, postController.getMyPosts);

module.exports = router;
