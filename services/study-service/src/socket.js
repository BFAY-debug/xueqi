/**
 * Socket.IO server for real-time updates.
 * Handles study room participants, seat status, chat messages, private messaging, and online status.
 */
const { Server } = require('socket.io');
const { logger, jwt: { verifyToken }, db, redis, sensitiveFilter } = require('xueqi-shared');
const chatService = require('./services/chatService');
const privateChatService = require('./services/privateChatService');
const onlineStatusService = require('./services/onlineStatusService');

let io = null;

// Track typing users per room: Map<roomId, Map<socketId, { userId, username }>>
const typingUsers = new Map();

// Track user status per room: Map<roomId, Map<userId, status>>
const roomStatuses = new Map();

// Track online users per room: Map<roomId, Map<userId, { username, socketCount }>>
const roomOnlineUsers = new Map();

// Rate limiting: separate Maps for room chat and private messaging
const roomLastMessageTime = new Map();
const pmLastMessageTime = new Map();
const MESSAGE_COOLDOWN = 2000; // 2 seconds

// Global online users: Map<userId, { username, avatarUrl, socketCount, sockets: Set<socketId> }>
const globalOnlineUsers = new Map();

/**
 * Initialize Socket.IO server on the given HTTP server.
 */
function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: (process.env.CORS_ORIGIN || 'http://localhost').split(','),
      methods: ['GET', 'POST'],
      credentials: true
    },
    path: '/socket.io'
  });

  // Socket authentication middleware
  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      socket.user = null;
      return next();
    }
    try {
      const decoded = verifyToken(token);
      // Enrich with username and avatar from DB
      const [rows] = await db.execute(
        'SELECT username, avatar_url FROM users WHERE id = ? AND status = 1',
        [decoded.userId]
      );
      socket.user = {
        ...decoded,
        username: rows[0]?.username || decoded.username,
        avatar_url: rows[0]?.avatar_url || null
      };
      next();
    } catch (err) {
      socket.user = null;
      next();
    }
  });

  io.on('connection', (socket) => {
    const user = socket.user;
    const userId = user?.userId || null;
    const username = user?.username || '未知';

    logger.info(`Socket connected: ${socket.id} user=${userId || 'anonymous'}`);

    // Track which rooms this socket has joined
    const joinedRooms = new Set();

    // ── Global online & user room ───────────────────────

    if (userId) {
      socket.join(`user:${userId}`);
      const avatarUrl = user?.avatar_url || '';
      addGlobalOnlineUser(userId, username, avatarUrl, socket.id);
    }

    // ── Room channel management ──────────────────────────

    socket.on('room:join', async (roomId) => {
      socket.join(`room:${roomId}`);
      joinedRooms.add(roomId);
      logger.debug(`Socket ${socket.id} joined room:${roomId}`);

      // Track online user
      if (userId) {
        addOnlineUser(roomId, userId, username);
      }

      // Broadcast system message: user joined
      if (userId) {
        try {
          const msg = await chatService.createSystemMessage(roomId, `${username} 加入了书院`);
          io.to(`room:${roomId}`).emit('chat:message', formatMessage(msg));
        } catch (err) {
          logger.warn(`Failed to create join message: ${err.message}`);
        }
      }

      broadcastOnlineInfo(roomId);
    });

    socket.on('room:leave', async (roomId) => {
      socket.leave(`room:${roomId}`);
      joinedRooms.delete(roomId);

      // Track online user
      if (userId) {
        removeOnlineUser(roomId, userId);
      }

      // Broadcast system message: user left
      if (userId) {
        try {
          const msg = await chatService.createSystemMessage(roomId, `${username} 离开了书院`);
          io.to(`room:${roomId}`).emit('chat:message', formatMessage(msg));
        } catch (err) {
          logger.warn(`Failed to create leave message: ${err.message}`);
        }
      }

      // Clean up typing status
      removeTypingUser(roomId, socket.id);
      broadcastOnlineInfo(roomId);
    });

    // ── Seat channel management ──────────────────────────

    socket.on('seat:join', (locationId) => {
      socket.join(`seats:${locationId}`);
    });

    socket.on('seat:leave', (locationId) => {
      socket.leave(`seats:${locationId}`);
    });

    // ── Chat messages ────────────────────────────────────

    socket.on('chat:message', async (data) => {
      if (!userId || !data.roomId || (!data.content?.trim() && !data.imageUrl)) return;
      const content = (data.content || '').trim();
      if (content.length > 500) {
        socket.emit('chat:error', { message: '消息不能超过 500 字' });
        return;
      }

      // Rate limiting
      const now = Date.now();
      const last = roomLastMessageTime.get(userId) || 0;
      if (now - last < MESSAGE_COOLDOWN) {
        socket.emit('chat:rateLimited', { cooldown: MESSAGE_COOLDOWN - (now - last) });
        return;
      }
      roomLastMessageTime.set(userId, now);

      try {
        const msgType = data.anonymous ? 'anonymous' : 'user';
        const filteredContent = content ? sensitiveFilter.filter(content) : '[图片]';
        const msg = await chatService.createMessage(data.roomId, userId, filteredContent, msgType, data.imageUrl || null);
        const formatted = formatMessage(msg);
        io.to(`room:${data.roomId}`).emit('chat:message', formatted);

        // Clear typing status for this user
        removeTypingUser(data.roomId, socket.id);
      } catch (err) {
        logger.warn(`Failed to save chat message: ${err.message}`);
      }
    });

    socket.on('chat:typing', (roomId) => {
      if (!userId) return;
      addTypingUser(roomId, socket.id, { userId, username });
      socket.to(`room:${roomId}`).emit('chat:typing', { userId, username });
    });

    socket.on('chat:stopTyping', (roomId) => {
      if (!userId) return;
      removeTypingUser(roomId, socket.id);
      socket.to(`room:${roomId}`).emit('chat:stopTyping', { userId });
    });

    // ── Read receipts ────────────────────────────────────

    socket.on('chat:markRead', async (data) => {
      if (!userId || !data.roomId) return;
      try {
        const count = await chatService.markMessagesRead(data.roomId, userId);
        if (count > 0) {
          io.to(`room:${data.roomId}`).emit('chat:readUpdate', { roomId: data.roomId, readByUserId: userId });
        }
      } catch (err) {
        logger.warn(`Failed to mark read: ${err.message}`);
      }
    });

    // ── Status sync ──────────────────────────────────────

    socket.on('status:update', (data) => {
      if (!userId || !data.roomId || !data.status) return;

      if (!roomStatuses.has(data.roomId)) {
        roomStatuses.set(data.roomId, new Map());
      }
      roomStatuses.get(data.roomId).set(userId, data.status);

      io.to(`room:${data.roomId}`).emit('status:update', {
        userId,
        username,
        status: data.status,
        elapsedSeconds: data.elapsedSeconds || 0
      });
    });

    // ── Private messaging ────────────────────────────────

    socket.on('pm:send', async (data) => {
      if (!userId || !data.toUserId || (!data.content?.trim() && !data.imageUrl)) return;
      if (data.content && data.content.length > 500) {
        socket.emit('pm:error', { message: '消息不能超过 500 字' });
        return;
      }

      const now = Date.now();
      const last = pmLastMessageTime.get(userId) || 0;
      if (now - last < MESSAGE_COOLDOWN) {
        socket.emit('pm:rateLimited', { cooldown: MESSAGE_COOLDOWN - (now - last) });
        return;
      }
      pmLastMessageTime.set(userId, now);

      // Friend & block check via Redis
      try {
        const [isFriend, blockedByReceiver, blockedBySender] = await Promise.all([
          redis.sismember(`friends:${userId}`, data.toUserId),
          redis.sismember(`blocks:${data.toUserId}`, userId),
          redis.sismember(`blocks:${userId}`, data.toUserId)
        ]);
        if (!isFriend) {
          socket.emit('pm:error', { message: '只能给好友发消息' });
          return;
        }
        if (blockedByReceiver || blockedBySender) {
          socket.emit('pm:error', { message: '无法发送消息' });
          return;
        }
      } catch (e) {
        logger.warn(`Friend check Redis failed: ${e.message}`);
      }

      try {
        const conv = await privateChatService.getOrCreateConversation(userId, data.toUserId);
        const rawContent = (data.content || '').trim() || '[图片]';
        const content = sensitiveFilter.filter(rawContent);
        const msgId = await privateChatService.sendMessage(conv.id, userId, content, data.imageUrl || null);

        const msgData = {
          id: msgId,
          conversationId: conv.id,
          senderId: userId,
          senderName: username,
          senderAvatar: user?.avatar_url || null,
          content,
          imageUrl: data.imageUrl || null,
          createdAt: new Date().toISOString()
        };

        // Echo to sender
        socket.emit('pm:message', msgData);
        // Deliver to receiver
        io.to(`user:${data.toUserId}`).emit('pm:message', msgData);
        // Increment unread for receiver
        await privateChatService.incrementUnread(data.toUserId, conv.id);
      } catch (err) {
        logger.warn(`PM send failed: ${err.message}`);
      }
    });

    socket.on('pm:typing', (data) => {
      if (!userId || !data.toUserId) return;
      io.to(`user:${data.toUserId}`).emit('pm:typingStatus', { userId });
    });

    socket.on('pm:stopTyping', (data) => {
      if (!userId || !data.toUserId) return;
      io.to(`user:${data.toUserId}`).emit('pm:stopTypingStatus', { userId });
    });

    socket.on('pm:markRead', async (data) => {
      if (!userId || !data.conversationId) return;
      try {
        await privateChatService.markConversationRead(data.conversationId, userId);
        // Notify the other user in the conversation
        const [conv] = await db.execute(
          'SELECT user1_id, user2_id FROM conversations WHERE id = ?',
          [data.conversationId]
        );
        if (conv.length) {
          const otherId = conv[0].user1_id === userId ? conv[0].user2_id : conv[0].user1_id;
          io.to(`user:${otherId}`).emit('pm:readUpdate', { conversationId: data.conversationId, readByUserId: userId });
        }
      } catch (err) {
        logger.warn(`PM mark read failed: ${err.message}`);
      }
    });

    // ── Online status ────────────────────────────────────

    socket.on('online:heartbeat', () => {
      if (!userId) return;
      // Verify token is still valid
      const token = socket.handshake.auth.token;
      if (token) {
        try {
          verifyToken(token);
        } catch {
          socket.disconnect(true);
          return;
        }
      }
      const info = globalOnlineUsers.get(userId);
      if (info) {
        info.lastSeen = Date.now();
      }
    });

    socket.on('online:getUsers', async (callback) => {
      if (typeof callback === 'function') {
        try {
          const users = await onlineStatusService.getOnlineUsers();
          callback(users);
        } catch (e) {
          callback([]);
        }
      }
    });

    // ── Disconnect ───────────────────────────────────────

    socket.on('disconnect', () => {
      logger.debug(`Socket disconnected: ${socket.id}`);

      for (const roomId of joinedRooms) {
        if (userId) {
          removeOnlineUser(roomId, userId);
        }
        removeTypingUser(roomId, socket.id);
        broadcastOnlineInfo(roomId);
      }
      joinedRooms.clear();

      // Remove from global online tracking
      if (userId) {
        removeGlobalOnlineUser(userId, socket.id);
      }
    });
  });

  // Subscribe to friend events from user-service
  try {
    const subscriber = redis.duplicate();
    subscriber.subscribe('xueqi:friend_events');
    subscriber.on('message', (channel, message) => {
      if (channel !== 'xueqi:friend_events' || !io) return;
      try {
        const event = JSON.parse(message);
        const d = event.data || {};
        if (event.type === 'friend_request') {
          io.to(`user:${d.receiverId}`).emit('friend:request', {
            requestId: d.requestId,
            fromUserId: d.senderId,
            fromNickname: d.senderNickname || '',
            fromAvatar: d.senderAvatar || ''
          });
        } else if (event.type === 'friend_accepted') {
          // Notify the sender that their request was accepted
          io.to(`user:${d.senderId}`).emit('friend:accepted', {
            acceptedByUserId: d.receiverId,
            conversationId: d.conversationId
          });
        }
      } catch (e) {
        logger.warn(`Parse friend event failed: ${e.message}`);
      }
    });
  } catch (e) {
    logger.warn(`Redis subscribe failed: ${e.message}`);
  }

  logger.info('Socket.IO server initialized');
  return io;
}

// ── Helper functions ─────────────────────────────────────

function formatMessage(msg) {
  if (!msg) return null;
  const isAnon = msg.type === 'anonymous';
  return {
    id: msg.id,
    roomId: msg.room_id,
    userId: isAnon ? null : msg.user_id,
    username: isAnon ? '匿名学子' : (msg.username || '系统'),
    avatarUrl: isAnon ? null : msg.avatar_url,
    content: msg.content,
    imageUrl: msg.image_url || null,
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
    if (removed && io) {
      io.to(`room:${roomId}`).emit('chat:stopTyping', { userId: removed.userId });
    }
  }
}

// ── Online user tracking ──────────────────────────────────

function addOnlineUser(roomId, userId, username) {
  if (!roomOnlineUsers.has(roomId)) {
    roomOnlineUsers.set(roomId, new Map());
  }
  const roomUsers = roomOnlineUsers.get(roomId);
  const existing = roomUsers.get(userId);
  if (existing) {
    existing.socketCount++;
  } else {
    roomUsers.set(userId, { username, socketCount: 1 });
  }
}

function removeOnlineUser(roomId, userId) {
  const roomUsers = roomOnlineUsers.get(roomId);
  if (!roomUsers) return;
  const existing = roomUsers.get(userId);
  if (existing) {
    existing.socketCount--;
    if (existing.socketCount <= 0) {
      roomUsers.delete(userId);
    }
  }
  if (roomUsers.size === 0) {
    roomOnlineUsers.delete(roomId);
  }
}

function getOnlineUserList(roomId) {
  const roomUsers = roomOnlineUsers.get(roomId);
  if (!roomUsers) return [];
  const users = [];
  roomUsers.forEach((info, uid) => {
    users.push({ userId: uid, username: info.username });
  });
  return users;
}

function broadcastOnlineInfo(roomId) {
  if (!io) return;
  const users = getOnlineUserList(roomId);
  io.to(`room:${roomId}`).emit('room:onlineUsers', { roomId, users, count: users.length });
}

// ── Broadcast functions ──────────────────────────────────

function broadcastParticipants(roomId, data) {
  if (io) {
    io.to(`room:${roomId}`).emit('room:participants', data);
  }
}

function broadcastSeatUpdate(locationId, data) {
  if (io) {
    io.to(`seats:${locationId}`).emit('seat:update', data);
  }
}

function getIO() {
  return io;
}

// ── Global online user tracking ─────────────────────────

function addGlobalOnlineUser(userId, username, avatarUrl, socketId) {
  let info = globalOnlineUsers.get(userId);
  if (info) {
    info.socketCount++;
    info.sockets.add(socketId);
  } else {
    info = { username, avatarUrl, socketCount: 1, sockets: new Set([socketId]), lastSeen: Date.now() };
    globalOnlineUsers.set(userId, info);
    // New user online, persist to Redis and broadcast
    onlineStatusService.userOnline(userId, username, avatarUrl).catch(() => {});
    if (io) {
      io.emit('online:statusChange', { userId, username, avatarUrl, status: 'online' });
    }
  }
}

function removeGlobalOnlineUser(userId, socketId) {
  const info = globalOnlineUsers.get(userId);
  if (!info) return;
  info.sockets.delete(socketId);
  info.socketCount--;
  if (info.socketCount <= 0) {
    globalOnlineUsers.delete(userId);
    onlineStatusService.userOffline(userId).catch(() => {});
    if (io) {
      io.emit('online:statusChange', { userId, username: info.username, status: 'offline' });
    }
  }
}

module.exports = {
  initSocket,
  broadcastParticipants,
  broadcastSeatUpdate,
  getIO,
  getOnlineUserList
};
