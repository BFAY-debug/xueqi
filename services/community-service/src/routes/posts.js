const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');
const { authMiddleware, optionalAuth } = require('xueqi-shared');
const reportController = require('../controllers/reportController');

// Public
router.get('/posts', optionalAuth, postController.listPosts);
router.get('/posts/:id', optionalAuth, postController.getPost);
router.get('/users/:userId/posts', postController.getUserPublicPosts);
router.get('/posts/:id/versions', postController.getVersions);
router.get('/posts/:id/versions/:version', postController.getVersion);

// Auth required
router.post('/posts', authMiddleware, postController.createPost);
router.put('/posts/:id', authMiddleware, postController.updatePost);
router.delete('/posts/:id', authMiddleware, postController.deletePost);
router.post('/posts/:id/like', authMiddleware, postController.likePost);
router.post('/posts/:id/versions/:version/rollback', authMiddleware, postController.rollbackVersion);
router.get('/my/posts', authMiddleware, postController.getMyPosts);

// Report
router.post('/posts/:id/report', authMiddleware, reportController.reportPost);

module.exports = router;
