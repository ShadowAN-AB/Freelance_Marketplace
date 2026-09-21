const express = require('express');
const {
  getUser,
  updateMe,
  uploadAvatar,
  updateMeSchema,
  getSaved,
  saveProject,
  unsaveProject,
  saveTalent,
  unsaveTalent,
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { upload } = require('../middleware/upload');

const router = express.Router();

router.get('/me/saved', protect, getSaved);
router.post('/me/saved-projects/:id', protect, authorize('freelancer'), saveProject);
router.delete('/me/saved-projects/:id', protect, authorize('freelancer'), unsaveProject);
router.post('/me/saved-talent/:id', protect, authorize('client'), saveTalent);
router.delete('/me/saved-talent/:id', protect, authorize('client'), unsaveTalent);
router.patch('/me', protect, validate(updateMeSchema), updateMe);
router.post('/me/avatar', protect, upload.single('avatar'), uploadAvatar);
router.get('/:id', getUser);

module.exports = router;
