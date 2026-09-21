const express = require('express');
const { listNotifications, markNotificationsRead } = require('../controllers/notificationController');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.get('/', protect, listNotifications);
router.patch('/read', protect, markNotificationsRead);

module.exports = router;
