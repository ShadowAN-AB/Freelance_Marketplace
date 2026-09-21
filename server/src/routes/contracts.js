const express = require('express');
const {
  myContracts,
  getContract,
  submitWork,
  completeContract,
  requestRevision,
  createReview,
  cancelContract,
  submitMilestoneWork,
  requestMilestoneRevision,
  releaseMilestone,
  addTimeEntry,
  reviewTimeEntry,
  getInvoice,
  reviewSchema,
  revisionSchema,
  cancelSchema,
  timeEntrySchema,
} = require('../controllers/contractController');
const { protect, authorize, requireVerified } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { uploadDeliverables } = require('../middleware/upload');

const router = express.Router();
router.get('/me', protect, authorize('client', 'freelancer', 'admin'), myContracts);
router.get('/:id/invoice', protect, getInvoice);
router.get('/:id', protect, getContract);
router.post(
  '/:id/submit-work',
  protect,
  authorize('freelancer'),
  requireVerified,
  uploadDeliverables.array('files', 8),
  submitWork
);
router.post('/:id/request-revision', protect, authorize('client'), requireVerified, validate(revisionSchema), requestRevision);
router.post('/:id/complete', protect, authorize('client'), requireVerified, completeContract);
router.post('/:id/cancel', protect, authorize('client', 'freelancer'), requireVerified, validate(cancelSchema), cancelContract);
router.post('/:id/reviews', protect, authorize('client', 'freelancer'), requireVerified, validate(reviewSchema), createReview);
router.post(
  '/:id/milestones/:mid/submit-work',
  protect,
  authorize('freelancer'),
  requireVerified,
  uploadDeliverables.array('files', 8),
  submitMilestoneWork
);
router.post(
  '/:id/milestones/:mid/request-revision',
  protect,
  authorize('client'),
  requireVerified,
  validate(revisionSchema),
  requestMilestoneRevision
);
router.post('/:id/milestones/:mid/release', protect, authorize('client'), requireVerified, releaseMilestone);
router.post('/:id/time-entries', protect, authorize('freelancer'), requireVerified, validate(timeEntrySchema), addTimeEntry);
router.post('/:id/time-entries/:tid/approve', protect, authorize('client'), requireVerified, reviewTimeEntry);
router.post('/:id/time-entries/:tid/reject', protect, authorize('client'), requireVerified, reviewTimeEntry);

module.exports = router;
