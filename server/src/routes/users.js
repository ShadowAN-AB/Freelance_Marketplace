const express = require('express');
const { getUser, updateMe, uploadAvatar, updateMeSchema } = require('../controllers/userController');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { upload } = require('../middleware/upload');

const router = express.Router();

router.patch('/me', protect, validate(updateMeSchema), updateMe);
router.post('/me/avatar', protect, upload.single('avatar'), uploadAvatar);
router.get('/:id', getUser);

module.exports = router;
