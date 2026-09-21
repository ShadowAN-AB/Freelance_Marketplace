const Notification = require('../models/Notification');
const { asyncHandler } = require('../utils/asyncHandler');
const { ApiError } = require('../utils/apiError');

const TYPE_GROUPS = {
  hire: ['proposal_received', 'proposal_accepted', 'proposal_rejected', 'project_invite'],
  chat: ['message'],
  money: ['work_submitted', 'revision_requested', 'contract_completed', 'contract_cancelled', 'milestone_released', 'time_approved'],
};

const listNotifications = asyncHandler(async (req, res) => {
  const filter = { userId: req.user._id };
  const group = req.query.type;
  if (group && TYPE_GROUPS[group]) filter.type = { $in: TYPE_GROUPS[group] };
  else if (group === 'other') {
    const known = Object.values(TYPE_GROUPS).flat();
    filter.type = { $nin: known };
  }
  const notifications = await Notification.find(filter).sort({ createdAt: -1 }).limit(50);
  const unread = await Notification.countDocuments({ userId: req.user._id, read: false });
  res.json({ data: notifications, unread });
});

const markNotificationsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ userId: req.user._id, read: false }, { read: true });
  res.json({ ok: true });
});

const markOneRead = asyncHandler(async (req, res) => {
  const note = await Notification.findOne({ _id: req.params.id, userId: req.user._id });
  if (!note) throw new ApiError(404, 'Notification not found');
  note.read = true;
  await note.save();
  res.json({ notification: note });
});

module.exports = { listNotifications, markNotificationsRead, markOneRead };
