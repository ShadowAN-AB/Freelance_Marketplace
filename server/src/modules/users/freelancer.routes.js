const express = require('express');
const { listFreelancers } = require('./controller');

const router = express.Router();
router.get('/', listFreelancers);

module.exports = router;
