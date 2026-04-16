const chatService = require('../services/chatService');

async function getMessages(req, res, next) {
  try {
    const roomId = parseInt(req.params.id, 10);
    const limit = parseInt(req.query.limit, 10) || 50;
    const messages = await chatService.getRecentMessages(roomId, limit);
    res.success(messages);
  } catch (err) {
    next(err);
  }
}

module.exports = { getMessages };
