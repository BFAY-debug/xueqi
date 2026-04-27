const reportService = require('../services/reportService');

async function reportPost(req, res, next) {
  try {
    const { reason, description } = req.body;
    const result = await reportService.submitReport(
      req.user.userId, 'post', parseInt(req.params.id, 10), reason, description
    );
    res.success(result, '举报已提交', 201);
  } catch (err) { next(err); }
}

async function reportComment(req, res, next) {
  try {
    const { reason, description } = req.body;
    const result = await reportService.submitReport(
      req.user.userId, 'comment', parseInt(req.params.id, 10), reason, description
    );
    res.success(result, '举报已提交', 201);
  } catch (err) { next(err); }
}

module.exports = { reportPost, reportComment };
