const express = require('express');
const { listFreelancers } = require('../controllers/userController');

const router = express.Router();
router.get('/', listFreelancers);

module.exports = router;
