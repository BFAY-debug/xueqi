const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authMiddleware, requireRole } = require('xueqi-shared');

// All admin routes require auth + admin role
router.use(authMiddleware, requireRole('admin', 'super_admin'));

// Post review
router.get('/posts/pending', adminController.getPendingPosts);
router.get('/posts/all', adminController.getAllPosts);
router.put('/posts/:id/review', adminController.reviewPost);
router.put('/posts/:id/pin', adminController.togglePin);
router.put('/posts/:id/feature', adminController.toggleFeature);
router.put('/posts/:id/hide', adminController.toggleHidePost);
router.put('/posts/:id/edit', adminController.adminEditPost);
router.delete('/posts/:id', adminController.deletePost);

// Comment review
router.get('/comments/pending', adminController.getPendingComments);
router.get('/comments/all', adminController.getAllComments);
router.put('/comments/:id/review', adminController.reviewComment);
router.delete('/comments/:id', adminController.deleteComment);

// Proposal review
router.get('/proposals/pending', adminController.getPendingProposals);
router.put('/proposals/:id/merge', adminController.adminMergeProposal);
router.put('/proposals/:id/reject', adminController.adminRejectProposal);

// Review logs
router.get('/review-logs', adminController.getReviewLogs);

module.exports = router;
