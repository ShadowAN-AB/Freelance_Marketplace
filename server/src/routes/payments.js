const express = require('express');
const { myPayments } = require('../controllers/contractController');
const { myCheckoutMode } = require('../controllers/paymentController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();
router.get('/me', protect, authorize('client', 'freelancer'), myPayments);
router.get('/mode', protect, myCheckoutMode);

module.exports = router;
