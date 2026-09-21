const express = require('express');
const {
  listProjects,
  getProject,
  createProject,
  updateProject,
  cancelProject,
  projectMatches,
  recommendedProjects,
  createSchema,
  updateSchema,
} = require('../controllers/projectController');
const { protect, authorize, optionalAuth } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = express.Router();

router.get('/recommended', protect, authorize('freelancer'), recommendedProjects);
router.get('/', optionalAuth, listProjects);
router.get('/:id', getProject);
router.post('/', protect, authorize('client'), validate(createSchema), createProject);
router.patch('/:id', protect, authorize('client'), validate(updateSchema), updateProject);
router.post('/:id/cancel', protect, authorize('client'), cancelProject);
router.get('/:id/matches', protect, authorize('client', 'admin'), projectMatches);

module.exports = router;
