const express = require('express');
const router = express.Router();
const { authMiddleware } = require('xueqi-shared');
const bookmarkController = require('../controllers/bookmarkController');
const proposalController = require('../controllers/proposalController');

router.use(authMiddleware);

// Bookmarks
router.post('/bookmarks/:postId', bookmarkController.toggleBookmark);
router.get('/my/bookmarks', bookmarkController.getMyBookmarks);

// My proposals
router.get('/my/proposals', proposalController.getMyProposals);

module.exports = router;
