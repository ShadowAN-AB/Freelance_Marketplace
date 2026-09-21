const express = require('express');
const {
  listProjects,
  getProject,
  createProject,
  updateProject,
  cancelProject,
  projectMatches,
  recommendedProjects,
  inviteToBid,
  createSchema,
  updateSchema,
  inviteSchema,
} = require('../controllers/projectController');
const { protect, authorize, optionalAuth, requireVerified } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = express.Router();

router.get('/recommended', protect, authorize('freelancer'), recommendedProjects);
router.get('/', optionalAuth, listProjects);
router.get('/:id', optionalAuth, getProject);
router.post('/', protect, authorize('client'), requireVerified, validate(createSchema), createProject);
router.patch('/:id', protect, authorize('client'), requireVerified, validate(updateSchema), updateProject);
router.post('/:id/cancel', protect, authorize('client'), requireVerified, cancelProject);
router.post('/:id/invites', protect, authorize('client'), requireVerified, validate(inviteSchema), inviteToBid);
router.get('/:id/matches', protect, authorize('client', 'admin'), projectMatches);

module.exports = router;
