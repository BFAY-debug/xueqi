const express = require('express');
const router = express.Router();
const roomController = require('../controllers/roomController');
const { authMiddleware, optionalAuth, requireRole } = require('xueqi-shared');

// Public
router.get('/', optionalAuth, roomController.listRooms);
router.post('/join-by-code', authMiddleware, roomController.joinByCode);
router.get('/:id', optionalAuth, roomController.getRoom);
router.get('/:id/participants', optionalAuth, roomController.getParticipants);

// Admin
router.post('/', authMiddleware, requireRole('admin', 'super_admin'), roomController.createRoom);
router.put('/:id', authMiddleware, requireRole('admin', 'super_admin'), roomController.updateRoom);

// User
router.post('/:id/join', authMiddleware, roomController.joinRoom);
router.post('/:id/leave', authMiddleware, roomController.leaveRoom);
router.delete('/:id', authMiddleware, roomController.deleteRoom);

module.exports = router;
