const roomService = require('../services/roomService');

async function listRooms(req, res, next) {
  try {
    const rooms = await roomService.getRooms(req.query);
    res.success(rooms);
  } catch (err) {
    next(err);
  }
}

async function getRoom(req, res, next) {
  try {
    const room = await roomService.getRoomById(parseInt(req.params.id, 10));
    res.success(room);
  } catch (err) {
    next(err);
  }
}

async function createRoom(req, res, next) {
  try {
    const room = await roomService.createRoom({
      ...req.body,
      createdBy: req.user.userId
    });
    res.success(room, '自习室创建成功', 201);
  } catch (err) {
    next(err);
  }
}

async function updateRoom(req, res, next) {
  try {
    const room = await roomService.updateRoom(parseInt(req.params.id, 10), req.body);
    res.success(room, '自习室更新成功');
  } catch (err) {
    next(err);
  }
}

async function joinRoom(req, res, next) {
  try {
    const room = await roomService.joinRoom(parseInt(req.params.id, 10), req.user.userId);
    res.success(room, '已加入自习室');
  } catch (err) {
    next(err);
  }
}

async function leaveRoom(req, res, next) {
  try {
    const result = await roomService.leaveRoom(parseInt(req.params.id, 10), req.user.userId);
    res.success(result, '已离开自习室');
  } catch (err) {
    next(err);
  }
}

async function getParticipants(req, res, next) {
  try {
    const participants = await roomService.getParticipants(parseInt(req.params.id, 10));
    res.success(participants);
  } catch (err) {
    next(err);
  }
}

module.exports = { listRooms, getRoom, createRoom, updateRoom, joinRoom, leaveRoom, getParticipants };
