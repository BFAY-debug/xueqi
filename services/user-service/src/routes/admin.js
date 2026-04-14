const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authMiddleware, requireRole } = require('xueqi-shared');

// All admin routes require authentication
router.use(authMiddleware);

// User management
router.get('/users', requireRole('admin', 'super_admin'), adminController.getUsers);

// Role management (super_admin only)
router.put('/users/:id/role', requireRole('super_admin'), adminController.changeUserRole);

// Status management (admin+)
router.put('/users/:id/status', requireRole('admin', 'super_admin'), adminController.changeUserStatus);

// System stats (super_admin only)
router.get('/stats', requireRole('super_admin'), adminController.getSystemStats);

// Admin application - any logged-in user can apply
router.post('/apply', adminController.applyForAdmin);

// Admin application review (super_admin only)
router.get('/applications', requireRole('super_admin'), adminController.getPendingApplications);
router.put('/applications/:id', requireRole('super_admin'), adminController.reviewApplication);

module.exports = router;
