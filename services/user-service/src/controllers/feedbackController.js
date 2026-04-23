const feedbackService = require('../services/feedbackService');

async function submit(req, res, next) {
  try {
    const { type, content } = req.body;
    if (!content || !content.trim()) {
      return res.error('反馈内容不能为空', 400);
    }
    const result = await feedbackService.submitFeedback(req.user.userId, type, content);
    res.success(result, '反馈提交成功', 201);
  } catch (err) {
    next(err);
  }
}

async function getList(req, res, next) {
  try {
    const { page, pageSize, status } = req.query;
    const result = await feedbackService.getFeedbackList(page, pageSize, status);
    res.paginate(result.data, result.total, parseInt(page, 10) || 1, parseInt(pageSize, 10) || 20);
  } catch (err) {
    next(err);
  }
}

async function updateStatus(req, res, next) {
  try {
    const { status, adminReply } = req.body;
    if (!['resolved', 'ignored'].includes(status)) {
      return res.error('无效的状态', 400);
    }
    const result = await feedbackService.updateFeedbackStatus(
      parseInt(req.params.id, 10), status, adminReply
    );
    res.success(result, '状态更新成功');
  } catch (err) {
    next(err);
  }
}

module.exports = { submit, getList, updateStatus };
