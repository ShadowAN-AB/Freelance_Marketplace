const express = require('express');
const { listUserReviews } = require('../controllers/contractController');

const router = express.Router({ mergeParams: true });
router.get('/', listUserReviews);

module.exports = router;
