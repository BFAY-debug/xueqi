const privateChatService = require('../services/privateChatService');
const onlineStatusService = require('../services/onlineStatusService');
const { logger } = require('xueqi-shared');

async function getConversations(req, res) {
  try {
    const userId = req.user.userId;
    const conversations = await privateChatService.getUserConversations(userId);
    res.success(conversations);
  } catch (err) {
    logger.error(`Get conversations failed: ${err.message}`);
    res.error('获取会话列表失败', 500);
  }
}

async function createConversation(req, res) {
  try {
    const userId = req.user.userId;
    const { toUserId } = req.body;
    if (!toUserId || toUserId === userId) {
      return res.error('无效的用户ID', 400);
    }
    const conv = await privateChatService.getOrCreateConversation(userId, toUserId);
    res.success(conv);
  } catch (err) {
    logger.error(`Create conversation failed: ${err.message}`);
    res.error('创建会话失败', 500);
  }
}

async function getMessages(req, res) {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const beforeId = req.query.beforeId ? parseInt(req.query.beforeId, 10) : null;
    const messages = await privateChatService.getConversationMessages(id, userId, limit, beforeId);
    res.success(messages);
  } catch (err) {
    logger.error(`Get messages failed: ${err.message}`);
    res.error('获取消息失败', 500);
  }
}

async function markRead(req, res) {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const count = await privateChatService.markConversationRead(id, userId);
    res.success({ marked: count });
  } catch (err) {
    logger.error(`Mark read failed: ${err.message}`);
    res.error('标记已读失败', 500);
  }
}

async function getUnreadCount(req, res) {
  try {
    const userId = req.user.userId;
    const count = await privateChatService.getTotalUnreadCount(userId);
    res.success({ count });
  } catch (err) {
    logger.error(`Get unread count failed: ${err.message}`);
    res.error('获取未读数失败', 500);
  }
}

async function getUserStatus(req, res) {
  try {
    const { userId } = req.params;
    const online = await onlineStatusService.isOnline(userId);
    res.success({ userId: parseInt(userId, 10), online: !!online });
  } catch (err) {
    logger.error(`Get user status failed: ${err.message}`);
    res.error('获取用户状态失败', 500);
  }
}

async function getOnlineUsersList(req, res) {
  try {
    const users = await onlineStatusService.getOnlineUsers();
    res.success(users);
  } catch (err) {
    logger.error(`Get online users failed: ${err.message}`);
    res.error('获取在线用户失败', 500);
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
