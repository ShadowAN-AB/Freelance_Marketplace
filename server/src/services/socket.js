const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const { notify } = require('./notify');
const { USER_PUBLIC_FIELDS } = require('../utils/publicUser');

const onlineUsers = new Map();

function attachSocket(httpServer, app) {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      credentials: true,
    },
  });
  app.set('io', io);

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
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
    onlineUsers.set(userId, socket.id);
    socket.join(`user:${userId}`);
    io.emit('presence:update', { userId, online: true });

    socket.on('conversation:join', (conversationId) => {
      socket.join(`conversation:${conversationId}`);
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
        await notify({
          userId: other,
          type: 'message',
          title: `Message from ${socket.user.name}`,
          body: trimmed.slice(0, 120),
          link: `/app/messages/${conversationId}`,
        });
        io.to(`user:${other}`).emit('notification:new', { type: 'message' });
        if (cb) cb({ ok: true, message: populated });
      } catch (err) {
        if (cb) cb({ ok: false, message: err.message });
      }
    });

    socket.on('disconnect', () => {
      if (onlineUsers.get(userId) === socket.id) onlineUsers.delete(userId);
      io.emit('presence:update', { userId, online: false });
    });
  });

  return io;
}

module.exports = { attachSocket, onlineUsers };
