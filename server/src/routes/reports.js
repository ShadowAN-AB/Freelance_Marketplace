const express = require('express');
const { createReport, createReportSchema } = require('../controllers/adminController');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = express.Router();
router.post('/', protect, validate(createReportSchema), createReport);

module.exports = router;
