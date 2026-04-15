const express = require('express');
const router = express.Router();
const { authMiddleware } = require('xueqi-shared');
const proposalController = require('../controllers/proposalController');

// Public: list proposals
router.get('/', proposalController.getProposals);

// Public: get proposal detail
router.get('/:id', proposalController.getProposalById);

// Auth required
router.use(authMiddleware);

// Create proposal
router.post('/', proposalController.createProposal);

// Merge proposal (post author)
router.put('/:id/merge', proposalController.mergeProposal);

// Reject proposal (post author)
router.put('/:id/reject', proposalController.rejectProposal);

// Close own proposal
router.delete('/:id', proposalController.closeProposal);

module.exports = router;
