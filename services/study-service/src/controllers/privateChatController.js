const privateChatService = require('../services/privateChatService');
const onlineStatusService = require('../services/onlineStatusService');
const { logger } = require('xueqi-shared');

async function getConversations(req, res, next) {
  try {
    const userId = req.user.userId;
    const conversations = await privateChatService.getUserConversations(userId);
    res.success(conversations);
  } catch (err) {
    logger.error(`Get conversations failed: ${err.message}`);
    next(err);
  }
}

async function createConversation(req, res, next) {
  try {
    const userId = req.user.userId;
    const { toUserId } = req.body;
    if (!toUserId || toUserId === userId) {
      return res.error('无效的用户ID', 400);
    }
    const conv = await privateChatService.getOrCreateConversation(userId, toUserId);
    if (!conv) {
      return res.error('只能与好友发起会话', 403);
    }
    res.success(conv);
  } catch (err) {
    logger.error(`Create conversation failed: ${err.message}`);
    next(err);
  }
}

async function getMessages(req, res, next) {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const beforeId = req.query.beforeId ? parseInt(req.query.beforeId, 10) : null;
    const messages = await privateChatService.getConversationMessages(id, userId, limit, beforeId);
    res.success(messages);
  } catch (err) {
    logger.error(`Get messages failed: ${err.message}`);
    next(err);
  }
}

async function markRead(req, res, next) {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const count = await privateChatService.markConversationRead(id, userId);
    res.success({ marked: count });
  } catch (err) {
    logger.error(`Mark read failed: ${err.message}`);
    next(err);
  }
}

async function getUnreadCount(req, res, next) {
  try {
    const userId = req.user.userId;
    const count = await privateChatService.getTotalUnreadCount(userId);
    res.success({ count });
  } catch (err) {
    logger.error(`Get unread count failed: ${err.message}`);
    next(err);
  }
}

async function getUserStatus(req, res, next) {
  try {
    const { userId } = req.params;
    const online = await onlineStatusService.isOnline(userId);
    res.success({ userId: parseInt(userId, 10), online: !!online });
  } catch (err) {
    logger.error(`Get user status failed: ${err.message}`);
    next(err);
  }
}

async function getOnlineUsersList(req, res, next) {
  try {
    const users = await onlineStatusService.getOnlineUsers();
    res.success(users);
  } catch (err) {
    logger.error(`Get online users failed: ${err.message}`);
    next(err);
  }
}

module.exports = {
  getConversations,
  createConversation,
  getMessages,
  markRead,
  getUnreadCount,
  getUserStatus,
  getOnlineUsersList
};
