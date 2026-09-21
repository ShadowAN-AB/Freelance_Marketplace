const express = require('express');
const { myPayments, myPaymentsCsv } = require('../contracts/controller');
const { myCheckoutMode } = require('./controller');
const { protect, authorize } = require('../../middleware/auth');

const router = express.Router();
router.get('/me.csv', protect, authorize('client', 'freelancer'), myPaymentsCsv);
router.get('/me', protect, authorize('client', 'freelancer'), myPayments);
router.get('/mode', protect, myCheckoutMode);

module.exports = router;
