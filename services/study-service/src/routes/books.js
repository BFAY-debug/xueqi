const express = require('express');
const router = express.Router();
const bookController = require('../controllers/bookController');
const { authMiddleware, optionalAuth, requireRole } = require('xueqi-shared');

// Public
router.get('/', optionalAuth, bookController.listBooks);
router.get('/recommend', authMiddleware, bookController.getRecommendations);
router.get('/collections', authMiddleware, bookController.getMyCollections);
router.get('/:id', optionalAuth, bookController.getBook);

// User actions
router.post('/submit', authMiddleware, bookController.upload.single('cover'), bookController.submitBook);
router.post('/:id/rate', authMiddleware, bookController.rateBook);
router.post('/:id/collect', authMiddleware, bookController.toggleCollection);
router.delete('/:id/collect', authMiddleware, bookController.toggleCollection);

// Admin: CRUD
router.post('/', authMiddleware, requireRole('admin', 'super_admin'), bookController.upload.single('cover'), bookController.addBook);
router.put('/:id', authMiddleware, requireRole('admin', 'super_admin'), bookController.updateBook);
router.delete('/:id', authMiddleware, requireRole('admin', 'super_admin'), bookController.deleteBook);

// Admin: review
router.get('/pending', authMiddleware, requireRole('admin', 'super_admin'), bookController.getPendingBooks);
router.put('/:id/review', authMiddleware, requireRole('admin', 'super_admin'), bookController.reviewBook);

module.exports = router;
