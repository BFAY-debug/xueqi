const express = require('express');
const router = express.Router();
const seatController = require('../controllers/seatController');
const { authMiddleware, optionalAuth, requireRole } = require('xueqi-shared');

// Public: list locations
router.get('/', optionalAuth, seatController.listLocations);

// Admin: CRUD locations
router.post('/', authMiddleware, requireRole('admin', 'super_admin'), seatController.createLocation);
router.put('/:id', authMiddleware, requireRole('admin', 'super_admin'), seatController.updateLocation);
router.delete('/:id', authMiddleware, requireRole('admin', 'super_admin'), seatController.deleteLocation);

// Public: get seats for a location
router.get('/:id/seats', optionalAuth, seatController.getSeats);
router.get('/:id', optionalAuth, seatController.getLocation);

// Admin: batch create seats
router.post('/:id/seats', authMiddleware, requireRole('admin', 'super_admin'), seatController.batchCreateSeats);

module.exports = router;
