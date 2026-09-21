const express = require('express');
const {
  listConversations,
  openConversation,
  listMessages,
  sendMessageHttp,
  markRead,
  unreadCount,
  openSchema,
} = require('../controllers/chatController');
const { protect, requireVerified } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { uploadDeliverables } = require('../middleware/upload');

const router = express.Router();
router.get('/', protect, listConversations);
router.get('/unread-count', protect, unreadCount);
router.post('/', protect, requireVerified, validate(openSchema), openConversation);
router.get('/:id/messages', protect, listMessages);
router.post(
  '/:id/messages',
  protect,
  requireVerified,
  uploadDeliverables.single('file'),
  sendMessageHttp
);
router.post('/:id/read', protect, markRead);

module.exports = router;
