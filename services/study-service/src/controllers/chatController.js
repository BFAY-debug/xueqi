const path = require('path');
const fs = require('fs');
const chatService = require('../services/chatService');

async function getMessages(req, res, next) {
  try {
    const roomId = parseInt(req.params.id, 10);
    const limit = parseInt(req.query.limit, 10) || 50;
    const messages = await chatService.getRecentMessages(roomId, limit, req.user.userId);
    res.success(messages);
  } catch (err) {
    next(err);
  }
}

async function getMyRooms(req, res, next) {
  try {
    const rooms = await chatService.getUserChatRooms(req.user.userId);
    res.success(rooms);
  } catch (err) {
    next(err);
  }
}

async function uploadImage(req, res, next) {
  try {
    if (!req.file) {
      return res.error('No file uploaded', 400);
    }
    // Return the URL path to the uploaded file
    const imageUrl = `/uploads/chat/${req.file.filename}`;
    res.success({ imageUrl });
  } catch (err) {
    next(err);
  }
}

async function markRead(req, res, next) {
  try {
    const { roomId } = req.body;
    if (!roomId) return res.error('roomId required', 400);
    const count = await chatService.markMessagesRead(roomId, req.user.userId);
    res.success({ marked: count });
  } catch (err) {
    next(err);
  }
}

async function getRooms(req, res, next) {
  try {
    const rooms = await chatService.getAvailableRooms();
    res.success(rooms);
  } catch (err) {
    next(err);
  }
}

module.exports = { getMessages, getMyRooms, uploadImage, markRead, getRooms };
