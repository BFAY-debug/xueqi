const express = require('express');
const router = express.Router();
const sessionController = require('../controllers/sessionController');
const { authMiddleware } = require('xueqi-shared');

router.post('/start', authMiddleware, sessionController.startSession);
router.put('/:id/end', authMiddleware, sessionController.endSession);
router.delete('/active', authMiddleware, sessionController.abandonActiveSession);
router.get('/my', authMiddleware, sessionController.getMySessions);
router.get('/active', authMiddleware, sessionController.getActiveSession);

module.exports = router;
