const express = require('express');
const { myPayments } = require('../controllers/contractController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();
router.get('/me', protect, authorize('client', 'freelancer'), myPayments);

module.exports = router;
