const express = require('express');
const { createReport, createReportSchema } = require('../controllers/adminController');
const { protect, requireVerified } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = express.Router();
router.post('/', protect, requireVerified, validate(createReportSchema), createReport);

module.exports = router;
