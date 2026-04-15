const proposalService = require('../services/proposalService');

async function createProposal(req, res, next) {
  try {
    const { postId, title, description, content } = req.body;
    if (!postId || !title || !content) {
      return res.error('postId、标题和内容不能为空', 400);
    }
    const result = await proposalService.createProposal(
      parseInt(postId), req.user.userId, { title, description, content }
    );
    res.success(result, '提案已提交');
  } catch (err) { next(err); }
}

async function getProposals(req, res, next) {
  try {
    const { postId, status, page, pageSize } = req.query;
    const result = await proposalService.getProposals({
      postId, status,
      page: parseInt(page) || 1,
      pageSize: parseInt(pageSize) || 20
    });
    res.json({ success: true, message: 'Success', data: result.data, total: result.total });
  } catch (err) { next(err); }
}

async function getProposalById(req, res, next) {
  try {
    const proposal = await proposalService.getProposalById(req.params.id);
    res.success(proposal);
  } catch (err) { next(err); }
}

async function mergeProposal(req, res, next) {
  try {
    const result = await proposalService.mergeProposal(req.params.id, req.user.userId);
    res.success(result, '提案已合并');
  } catch (err) { next(err); }
}

async function rejectProposal(req, res, next) {
  try {
    const { comment } = req.body;
    const result = await proposalService.rejectProposal(req.params.id, req.user.userId, comment);
    res.success(result, '提案已拒绝');
  } catch (err) { next(err); }
}

async function closeProposal(req, res, next) {
  try {
    const result = await proposalService.closeProposal(req.params.id, req.user.userId);
    res.success(result, '提案已关闭');
  } catch (err) { next(err); }
}

async function getMyProposals(req, res, next) {
  try {
    const { status, page, pageSize } = req.query;
    const result = await proposalService.getMyProposals(req.user.userId, {
      status,
      page: parseInt(page) || 1,
      pageSize: parseInt(pageSize) || 20
    });
    res.json({ success: true, message: 'Success', data: result.data, total: result.total });
  } catch (err) { next(err); }
}

module.exports = {
  createProposal,
  getProposals,
  getProposalById,
  mergeProposal,
  rejectProposal,
  closeProposal,
  getMyProposals
};
