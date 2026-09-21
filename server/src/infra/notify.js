const Notification = require('../models/Notification');

async function notify({ userId, type, title, body, link = '' }) {
  return Notification.create({ userId, type, title, body, link, read: false });
}

module.exports = { notify };
