const express = require('express');
const router = express.Router();
const pointsController = require('../controllers/pointsController');
const leaderboardController = require('../controllers/leaderboardController');
const { authMiddleware, optionalAuth, serviceAuthMiddleware } = require('xueqi-shared');

// Points
router.get('/points', authMiddleware, pointsController.getPoints);
router.get('/points/log', authMiddleware, pointsController.getPointsLog);

// Internal: other microservices call this to award points
router.post('/points/award', serviceAuthMiddleware, pointsController.awardPoints);

// Internal: update checkin streak (called by study-service on session start)
router.post('/points/checkin', serviceAuthMiddleware, pointsController.updateCheckinStreak);

// Leaderboard
router.get('/leaderboard', optionalAuth, leaderboardController.getPointsLeaderboard);
router.get('/leaderboard/weekly', optionalAuth, leaderboardController.getWeeklyLeaderboard);
router.get('/leaderboard/monthly', optionalAuth, leaderboardController.getMonthlyLeaderboard);
router.get('/leaderboard/study', optionalAuth, leaderboardController.getStudyLeaderboard);
router.get('/leaderboard/streak', optionalAuth, leaderboardController.getStreakLeaderboard);
router.get('/leaderboard/my-rank', authMiddleware, leaderboardController.getMyRank);

module.exports = router;
