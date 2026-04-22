const sessionService = require('../services/sessionService');

async function startSession(req, res, next) {
  try {
    const { roomId, sessionType } = req.body;
    const validTypes = ['free', 'pomodoro'];
    if (sessionType && !validTypes.includes(sessionType)) {
      return res.error('无效的学习类型', 400);
    }
    const result = await sessionService.startSession(req.user.userId, {
      roomId: roomId ? parseInt(roomId, 10) || null : null,
      sessionType
    });
    res.success(result, '学习会话已开始', 201);
  } catch (err) {
    next(err);
  }
}

async function endSession(req, res, next) {
  try {
    const result = await sessionService.endSession(parseInt(req.params.id, 10), req.user.userId);
    res.success(result, '学习会话已结束');
  } catch (err) {
    next(err);
  }
}

async function getMySessions(req, res, next) {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const pageSize = parseInt(req.query.pageSize, 10) || 20;
    const { data, total } = await sessionService.getMySessions(req.user.userId, page, pageSize);
    res.paginate(data, total, page, pageSize);
  } catch (err) {
    next(err);
  }
}

async function getActiveSession(req, res, next) {
  try {
    const session = await sessionService.getActiveSession(req.user.userId);
    res.success(session);
  } catch (err) {
    next(err);
  }
}

async function abandonActiveSession(req, res, next) {
  try {
    await sessionService.abandonActiveSession(req.user.userId);
    res.success(null, '已关闭过期会话');
  } catch (err) {
    next(err);
  }
}

module.exports = { startSession, endSession, getMySessions, getActiveSession, abandonActiveSession };
