const { z } = require('zod');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Proposal = require('../models/Proposal');
const { asyncHandler } = require('../utils/asyncHandler');
const { ApiError } = require('../utils/apiError');
const { notify } = require('../services/notify');
const { USER_PUBLIC_FIELDS } = require('../utils/publicUser');
const { isOnline } = require('../services/socket');
const { paginateQuery, paginateResult } = require('../utils/paginate');

const openSchema = z.object({
  body: z.object({
    projectId: z.string().min(1),
    userId: z.string().min(1),
  }),
});

function assertParticipant(conversation, userId) {
  const ids = conversation.participants.map((p) => p._id?.toString?.() || p.toString());
  if (!ids.includes(userId.toString())) throw new ApiError(403, 'Not in this conversation');
}

const listConversations = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginateQuery(req.query);
  const filter = { participants: req.user._id };
  const [data, total] = await Promise.all([
    Conversation.find(filter)
      .populate({ path: 'participants', select: USER_PUBLIC_FIELDS })
      .populate({ path: 'projectId', select: 'title status' })
      .sort({ lastMessageAt: -1 })
      .skip(skip)
      .limit(limit),
    Conversation.countDocuments(filter),
  ]);
  res.json(paginateResult({ data, total, page, limit }));
});

const openConversation = asyncHandler(async (req, res) => {
  const { projectId, userId } = req.body;
  const otherId = userId;
  const proposal = await Proposal.findOne({
    projectId,
    $or: [
      { freelancerId: req.user._id, projectId },
      { freelancerId: otherId, projectId },
    ],
    status: { $in: ['pending', 'accepted'] },
  }).populate('projectId');
  if (!proposal) throw new ApiError(403, 'Chat opens after a proposal exists on this project');

  const clientId = proposal.projectId.clientId.toString();
  const freelancerId = proposal.freelancerId.toString();
  const me = req.user._id.toString();
  const allowed = me === clientId || me === freelancerId;
  const other = me === clientId ? freelancerId : clientId;
  if (!allowed || other !== otherId) throw new ApiError(403, 'You can only chat with the other party');

  const participantKey = Conversation.participantKey([clientId, freelancerId]);
  const conversation = await Conversation.findOneAndUpdate(
    { projectId, participantKey },
    {
      $setOnInsert: {
        participants: [clientId, freelancerId],
        participantKey,
        projectId,
        lastMessageAt: new Date(),
        lastMessagePreview: '',
      },
    },
    { upsert: true, new: true }
  )
    .populate({ path: 'participants', select: USER_PUBLIC_FIELDS })
    .populate({ path: 'projectId', select: 'title status' });
  res.status(201).json({ conversation });
});

const listMessages = asyncHandler(async (req, res) => {
  const conversation = await Conversation.findById(req.params.id);
  if (!conversation) throw new ApiError(404, 'Conversation not found');
  assertParticipant(conversation, req.user._id);
  const { page, limit, skip } = paginateQuery({ ...req.query, limit: req.query.limit || 50 });
  const [data, total] = await Promise.all([
    Message.find({ conversationId: conversation._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({ path: 'senderId', select: USER_PUBLIC_FIELDS }),
    Message.countDocuments({ conversationId: conversation._id }),
  ]);
  res.json(paginateResult({ data: data.reverse(), total, page, limit }));
});

const sendMessageHttp = asyncHandler(async (req, res) => {
  const conversation = await Conversation.findById(req.params.id);
  if (!conversation) throw new ApiError(404, 'Conversation not found');
  assertParticipant(conversation, req.user._id);
  const text = String(req.body.text || '').trim();
  if (!text) throw new ApiError(400, 'Message text is required');
  if (text.length > 2000) throw new ApiError(400, 'Message is too long');
  const message = await Message.create({
    conversationId: conversation._id,
    senderId: req.user._id,
    text,
    readBy: [req.user._id],
  });
  conversation.lastMessageAt = new Date();
  conversation.lastMessagePreview = text.slice(0, 200);
  await conversation.save();
  const other = conversation.participants.find((id) => id.toString() !== req.user._id.toString());
  if (other && !isOnline(other)) {
    await notify({
      userId: other,
      type: 'message',
      title: `Message from ${req.user.name}`,
      body: text.slice(0, 120),
      link: `/app/messages/${conversation._id}`,
    });
  }
  const populated = await message.populate({ path: 'senderId', select: USER_PUBLIC_FIELDS });
  const io = req.app.get('io');
  if (io) io.to(`conversation:${conversation._id}`).emit('message:new', populated);
  res.status(201).json({ message: populated });
});

const unreadCount = asyncHandler(async (req, res) => {
  const conversations = await Conversation.find({ participants: req.user._id }).select('_id');
  if (!conversations.length) return res.json({ unread: 0 });
  const ids = conversations.map((c) => c._id);
  const latest = await Message.aggregate([
    { $match: { conversationId: { $in: ids } } },
    { $sort: { createdAt: -1 } },
    { $group: { _id: '$conversationId', latest: { $first: '$$ROOT' } } },
    {
      $match: {
        $expr: { $not: { $in: [req.user._id, '$latest.readBy'] } },
      },
    },
    { $count: 'unread' },
  ]);
  res.json({ unread: latest[0]?.unread || 0 });
});

const markRead = asyncHandler(async (req, res) => {
  const conversation = await Conversation.findById(req.params.id);
  if (!conversation) throw new ApiError(404, 'Conversation not found');
  assertParticipant(conversation, req.user._id);
  await Message.updateMany(
    { conversationId: conversation._id, readBy: { $ne: req.user._id } },
    { $addToSet: { readBy: req.user._id } }
  );
  const io = req.app.get('io');
  if (io) io.to(`conversation:${conversation._id}`).emit('message:read', { userId: req.user._id, conversationId: conversation._id });
  res.json({ ok: true });
});

module.exports = {
  listConversations,
  openConversation,
  listMessages,
  sendMessageHttp,
  markRead,
  unreadCount,
  openSchema,
};
