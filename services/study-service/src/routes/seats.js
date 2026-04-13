const express = require('express');
const router = express.Router();
const seatController = require('../controllers/seatController');
const { authMiddleware } = require('xueqi-shared');

// Reserve a seat
router.post('/:id/reserve', authMiddleware, seatController.reserveSeat);

// Checkin
router.put('/:id/checkin', authMiddleware, seatController.checkinReservation);

// Cancel
router.put('/:id/cancel', authMiddleware, seatController.cancelReservation);

// My reservations
router.get('/my', authMiddleware, seatController.getMyReservations);

// My penalty status
router.get('/my/penalty', authMiddleware, seatController.getMyPenalty);

module.exports = router;
