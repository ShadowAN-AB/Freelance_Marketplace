const express = require('express');
const {
  createProposal,
  listProjectProposals,
  myProposals,
  acceptProposal,
  rejectProposal,
  withdrawProposal,
  toggleShortlist,
  createSchema,
} = require('./controller');
const { protect, authorize, requireVerified } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');

const projectRouter = express.Router({ mergeParams: true });
projectRouter.post('/', protect, authorize('freelancer'), requireVerified, validate(createSchema), createProposal);
projectRouter.get('/', protect, authorize('client', 'admin'), listProjectProposals);

const router = express.Router();
router.get('/me', protect, authorize('freelancer'), myProposals);
router.post('/:id/accept', protect, authorize('client'), requireVerified, acceptProposal);
router.post('/:id/reject', protect, authorize('client'), requireVerified, rejectProposal);
router.post('/:id/withdraw', protect, authorize('freelancer'), requireVerified, withdrawProposal);
router.post('/:id/shortlist', protect, authorize('client'), requireVerified, toggleShortlist);

module.exports = { router, projectRouter };
