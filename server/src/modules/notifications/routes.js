const express = require('express');
const { listNotifications, markNotificationsRead, markOneRead } = require('./controller');
const { protect } = require('../../middleware/auth');

const router = express.Router();
router.get('/', protect, listNotifications);
router.patch('/read', protect, markNotificationsRead);
router.patch('/:id/read', protect, markOneRead);

module.exports = router;
