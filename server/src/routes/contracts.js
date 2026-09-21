const express = require('express');
const {
  myContracts,
  getContract,
  submitWork,
  completeContract,
  requestRevision,
  createReview,
  reviewSchema,
  revisionSchema,
} = require('../controllers/contractController');
const { protect, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { uploadDeliverables } = require('../middleware/upload');

const router = express.Router();
router.get('/me', protect, authorize('client', 'freelancer', 'admin'), myContracts);
router.get('/:id', protect, getContract);
router.post(
  '/:id/submit-work',
  protect,
  authorize('freelancer'),
  uploadDeliverables.array('files', 8),
  submitWork
);
router.post('/:id/request-revision', protect, authorize('client'), validate(revisionSchema), requestRevision);
router.post('/:id/complete', protect, authorize('client'), completeContract);
router.post('/:id/reviews', protect, authorize('client', 'freelancer'), validate(reviewSchema), createReview);

module.exports = router;
