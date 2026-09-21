const Notification = require('../models/Notification');
const { asyncHandler } = require('../utils/asyncHandler');

const listNotifications = asyncHandler(async (req, res) => {
  const notifications = await Notification.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(50);
  const unread = notifications.filter((n) => !n.read).length;
  res.json({ data: notifications, unread });
});

const markNotificationsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ userId: req.user._id, read: false }, { read: true });
  res.json({ ok: true });
});

module.exports = { listNotifications, markNotificationsRead };
