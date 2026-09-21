const express = require('express');
const { listUserReviews } = require('./controller');

const router = express.Router({ mergeParams: true });
router.get('/', listUserReviews);

module.exports = router;
