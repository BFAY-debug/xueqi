/**
 * Socket.IO server for real-time updates.
 * Handles study room participants, seat status, chat messages, and status sync.
 */
const { Server } = require('socket.io');
const { logger, jwt: { verifyToken } } = require('xueqi-shared');
const chatService = require('./services/chatService');

let io = null;

// Track typing users per room: Map<roomId, Map<socketId, { userId, nickname }>>
const typingUsers = new Map();

// Track user status per room: Map<roomId, Map<userId, status>>
const roomStatuses = new Map();

/**
 * Initialize Socket.IO server on the given HTTP server.
 */
function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    },
    path: '/socket.io'
  });

  // Socket authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      // Allow unauthenticated connections for backward compatibility
      socket.user = null;
      return next();
    }
    try {
      const decoded = verifyToken(token);
      socket.user = decoded;
      next();
    } catch (err) {
      socket.user = null;
      next();
    }
  });

  io.on('connection', (socket) => {
    const user = socket.user;
    const userId = user?.userId || null;
    const nickname = user?.username || '未知';

    logger.info(`Socket connected: ${socket.id} user=${userId || 'anonymous'}`);

    // Track which rooms this socket has joined
    const joinedRooms = new Set();

    // ── Room channel management ──────────────────────────

    socket.on('room:join', async (roomId) => {
      socket.join(`room:${roomId}`);
      joinedRooms.add(roomId);
      logger.debug(`Socket ${socket.id} joined room:${roomId}`);

      // Broadcast system message: user joined
      if (userId) {
        try {
          const msg = await chatService.createSystemMessage(roomId, `${nickname} 加入了书院`);
          io.to(`room:${roomId}`).emit('chat:message', formatMessage(msg));
        } catch (err) {
          logger.warn(`Failed to create join message: ${err.message}`);
        }
      }
    });

    socket.on('room:leave', async (roomId) => {
      socket.leave(`room:${roomId}`);
      joinedRooms.delete(roomId);

      // Broadcast system message: user left
      if (userId) {
        try {
          const msg = await chatService.createSystemMessage(roomId, `${nickname} 离开了书院`);
          io.to(`room:${roomId}`).emit('chat:message', formatMessage(msg));
        } catch (err) {
          logger.warn(`Failed to create leave message: ${err.message}`);
        }
      }

      // Clean up typing status
      removeTypingUser(roomId, socket.id);
    });

    // ── Seat channel management ──────────────────────────

    socket.on('seat:join', (locationId) => {
      socket.join(`seats:${locationId}`);
      logger.debug(`Socket ${socket.id} joined seats:${locationId}`);
    });

    socket.on('seat:leave', (locationId) => {
      socket.leave(`seats:${locationId}`);
      logger.debug(`Socket ${socket.id} left seats:${locationId}`);
    });

    // ── Chat messages ────────────────────────────────────

    socket.on('chat:message', async (data) => {
      if (!userId || !data.roomId || !data.content?.trim()) return;

      try {
        const msg = await chatService.createMessage(data.roomId, userId, data.content.trim());
        io.to(`room:${data.roomId}`).emit('chat:message', formatMessage(msg));

        // Clear typing status for this user
        removeTypingUser(data.roomId, socket.id);
      } catch (err) {
        logger.warn(`Failed to save chat message: ${err.message}`);
      }
    });

    socket.on('chat:typing', (roomId) => {
      if (!userId) return;
      addTypingUser(roomId, socket.id, { userId, nickname });
      socket.to(`room:${roomId}`).emit('chat:typing', { userId, nickname });
    });

    socket.on('chat:stopTyping', (roomId) => {
      if (!userId) return;
      removeTypingUser(roomId, socket.id);
      socket.to(`room:${roomId}`).emit('chat:stopTyping', { userId });
    });

    // ── Status sync ──────────────────────────────────────

    socket.on('status:update', (data) => {
      if (!userId || !data.roomId || !data.status) return;

      // Track status
      if (!roomStatuses.has(data.roomId)) {
        roomStatuses.set(data.roomId, new Map());
      }
      roomStatuses.get(data.roomId).set(userId, data.status);

      io.to(`room:${data.roomId}`).emit('status:update', {
        userId,
        nickname,
        status: data.status,
        elapsedSeconds: data.elapsedSeconds || 0
      });
    });

    // ── Disconnect ───────────────────────────────────────

    socket.on('disconnect', () => {
      logger.debug(`Socket disconnected: ${socket.id}`);

      // Clean up typing status for all rooms
      for (const roomId of joinedRooms) {
        removeTypingUser(roomId, socket.id);
      }
      joinedRooms.clear();
    });
  });

  logger.info('Socket.IO server initialized');
  return io;
}

// ── Helper functions ─────────────────────────────────────

function formatMessage(msg) {
  if (!msg) return null;
  return {
    id: msg.id,
    roomId: msg.room_id,
    userId: msg.user_id,
    nickname: msg.nickname || msg.username || '系统',
    avatarUrl: msg.avatar_url,
    content: msg.content,
    type: msg.type,
    createdAt: msg.created_at
  };
}

function addTypingUser(roomId, socketId, user) {
  if (!typingUsers.has(roomId)) {
    typingUsers.set(roomId, new Map());
  }
  typingUsers.get(roomId).set(socketId, user);
}

function removeTypingUser(roomId, socketId) {
  const roomTypers = typingUsers.get(roomId);
  if (roomTypers) {
    const removed = roomTypers.get(socketId);
    roomTypers.delete(socketId);
    if (roomTypers.size === 0) {
      typingUsers.delete(roomId);
    }
    // Notify room that this user stopped typing
    if (removed && io) {
      io.to(`room:${roomId}`).emit('chat:stopTyping', { userId: removed.userId });
    }
  }
}

// ── Broadcast functions ──────────────────────────────────

/**
 * Broadcast participant update to a room channel.
 */
function broadcastParticipants(roomId, data) {
  if (io) {
    io.to(`room:${roomId}`).emit('room:participants', data);
  }
}

/**
 * Broadcast seat status update to a location channel.
 */
function broadcastSeatUpdate(locationId, data) {
  if (io) {
    io.to(`seats:${locationId}`).emit('seat:update', data);
  }
}

function getIO() {
  return io;
}

module.exports = {
  initSocket,
  broadcastParticipants,
  broadcastSeatUpdate,
  getIO
};
