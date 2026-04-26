const notificationService = require('../services/notificationService');

async function getNotifications(req, res, next) {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const pageSize = parseInt(req.query.pageSize, 10) || 20;
    const { data, total } = await notificationService.getNotifications(req.user.userId, page, pageSize);
    res.paginate(data, total, page, pageSize);
  } catch (err) {
    next(err);
  }
}

async function getUnreadCount(req, res, next) {
  try {
    const count = await notificationService.getUnreadCount(req.user.userId);
    res.success({ count });
  } catch (err) {
    next(err);
  }
}

async function markAsRead(req, res, next) {
  try {
    const ok = await notificationService.markAsRead(req.user.userId, parseInt(req.params.id, 10));
    if (!ok) {
      return res.error('通知不存在', 404);
    }
    res.success(null, '已标记为已读');
  } catch (err) {
    next(err);
  }
}

async function markAllAsRead(req, res, next) {
  try {
    const count = await notificationService.markAllAsRead(req.user.userId);
    res.success({ count }, `已将 ${count} 条通知标记为已读`);
  } catch (err) {
    next(err);
  }
}

async function createNotification(req, res, next) {
  try {
    const { userId, type, title, content, relatedId, relatedType } = req.body;
    if (!userId || !type || !title) {
      return res.error('缺少必填参数：用户ID、类型、标题', 400);
    }
    const id = await notificationService.createNotification({ userId, type, title, content, relatedId, relatedType });
    res.success({ id }, '通知已创建', 201);
  } catch (err) { next(err); }
}

module.exports = { getNotifications, getUnreadCount, markAsRead, markAllAsRead, createNotification };
