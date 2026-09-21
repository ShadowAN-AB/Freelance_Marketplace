const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const { notify } = require('./notify');
const { USER_PUBLIC_FIELDS } = require('../common/publicUser');
const { clientUrl } = require('../config/env');
const { logger } = require('./logger');

const onlineUsers = new Map();

function addSocket(userId, socketId) {
  const set = onlineUsers.get(userId) || new Set();
  set.add(socketId);
  onlineUsers.set(userId, set);
}

function removeSocket(userId, socketId) {
  const set = onlineUsers.get(userId);
  if (!set) return true;
  set.delete(socketId);
  if (set.size === 0) {
    onlineUsers.delete(userId);
    return true;
  }
  return false;
}

function isOnline(userId) {
  const set = onlineUsers.get(String(userId));
  return Boolean(set && set.size);
}

function parseCookieToken(header) {
  if (!header) return null;
  const parts = String(header).split(';');
  for (const part of parts) {
    const [k, ...rest] = part.trim().split('=');
    if (k === 'fh_access') return decodeURIComponent(rest.join('='));
  }
  return null;
}

async function attachRedis(io) {
  if (!process.env.REDIS_URL) return;
  try {
    const { createAdapter } = require('@socket.io/redis-adapter');
    const { Redis } = require('ioredis');
    const pub = new Redis(process.env.REDIS_URL);
    const sub = pub.duplicate();
    io.adapter(createAdapter(pub, sub));
    logger.info({ redis: true }, 'socket redis adapter attached');
  } catch (err) {
    logger.warn({ err: err.message }, 'redis adapter unavailable, using in-memory');
  }
}

function attachSocket(httpServer, app) {
  const io = new Server(httpServer, {
    cors: {
      origin: clientUrl(),
      credentials: true,
    },
  });
  app.set('io', io);
  attachRedis(io);

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || parseCookieToken(socket.handshake.headers.cookie);
      if (!token) return next(new Error('Authentication required'));
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(payload.id);
      if (!user || user.isBlocked) return next(new Error('Unauthorized'));
      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user._id.toString();
    addSocket(userId, socket.id);
    socket.join(`user:${userId}`);
    io.emit('presence:update', { userId, online: true });
    for (const id of onlineUsers.keys()) {
      socket.emit('presence:update', { userId: id, online: true });
    }

    socket.on('conversation:join', async (conversationId) => {
      try {
        const conversation = await Conversation.findById(conversationId);
        if (!conversation) return;
        const ids = conversation.participants.map((id) => id.toString());
        if (!ids.includes(userId)) return;
        socket.join(`conversation:${conversationId}`);
      } catch (err) {
        logger.warn({ err: err.message }, 'conversation join failed');
      }
    });

    socket.on('typing', async (payload) => {
      try {
        const conversationId = payload?.conversationId;
        const conversation = await Conversation.findById(conversationId);
        if (!conversation) return;
        const ids = conversation.participants.map((id) => id.toString());
        if (!ids.includes(userId)) return;
        socket.to(`conversation:${conversationId}`).emit('typing', {
          conversationId,
          userId,
          name: socket.user.name,
          typing: Boolean(payload?.typing),
        });
      } catch {
        // ignore
      }
    });

    socket.on('message:send', async (payload, cb) => {
      try {
        const { conversationId, text } = payload || {};
        const conversation = await Conversation.findById(conversationId);
        if (!conversation) throw new Error('Conversation not found');
        const ids = conversation.participants.map((id) => id.toString());
        if (!ids.includes(userId)) throw new Error('Not in this conversation');
        const trimmed = String(text || '').trim();
        if (!trimmed) throw new Error('Message text is required');
        const message = await Message.create({
          conversationId,
          senderId: socket.user._id,
          text: trimmed.slice(0, 2000),
          readBy: [socket.user._id],
        });
        conversation.lastMessageAt = new Date();
        conversation.lastMessagePreview = trimmed.slice(0, 200);
        await conversation.save();
        const populated = await message.populate({ path: 'senderId', select: USER_PUBLIC_FIELDS });
        io.to(`conversation:${conversationId}`).emit('message:new', populated);
        const other = ids.find((id) => id !== userId);
        if (other && !isOnline(other)) {
          await notify({
            userId: other,
            type: 'message',
            title: `Message from ${socket.user.name}`,
            body: trimmed.slice(0, 120),
            link: `/app/messages/${conversationId}`,
          });
          io.to(`user:${other}`).emit('notification:new', { type: 'message' });
        }
        if (cb) cb({ ok: true, message: populated });
      } catch (err) {
        if (cb) cb({ ok: false, message: err.message });
      }
    });

    socket.on('disconnect', () => {
      const wentOffline = removeSocket(userId, socket.id);
      if (wentOffline) io.emit('presence:update', { userId, online: false });
    });
  });

  return io;
}

module.exports = { attachSocket, onlineUsers, isOnline };
