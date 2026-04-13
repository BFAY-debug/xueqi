const express = require('express');
const router = express.Router();
const volunteerController = require('../controllers/volunteerController');
const { authMiddleware, requireRole } = require('xueqi-shared');

// Public: list tasks
router.get('/tasks', authMiddleware, volunteerController.getTasks);

// User: apply
router.post('/apply/:task_id', authMiddleware, volunteerController.applyTask);

// Admin: pending list
router.get('/pending', authMiddleware, requireRole('admin', 'super_admin'), volunteerController.getPendingRecords);

// Admin: confirm/reject
router.put('/:id/confirm', authMiddleware, requireRole('admin', 'super_admin'), volunteerController.confirmRecord);
router.put('/:id/reject', authMiddleware, requireRole('admin', 'super_admin'), volunteerController.rejectRecord);

module.exports = router;
