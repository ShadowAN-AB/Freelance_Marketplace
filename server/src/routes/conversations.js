const express = require('express');
const {
  listConversations,
  openConversation,
  listMessages,
  sendMessageHttp,
  markRead,
  openSchema,
} = require('../controllers/chatController');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { z } = require('zod');

const sendSchema = z.object({
  body: z.object({ text: z.string().min(1).max(2000) }),
});

const router = express.Router();
router.get('/', protect, listConversations);
router.post('/', protect, validate(openSchema), openConversation);
router.get('/:id/messages', protect, listMessages);
router.post('/:id/messages', protect, validate(sendSchema), sendMessageHttp);
router.post('/:id/read', protect, markRead);

module.exports = router;
