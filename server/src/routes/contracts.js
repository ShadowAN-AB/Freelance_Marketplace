const express = require('express');
const {
  myContracts,
  getContract,
  submitWork,
  completeContract,
  createReview,
  reviewSchema,
} = require('../controllers/contractController');
const { protect, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = express.Router();
router.get('/me', protect, authorize('client', 'freelancer', 'admin'), myContracts);
router.get('/:id', protect, getContract);
router.post('/:id/submit-work', protect, authorize('freelancer'), submitWork);
router.post('/:id/complete', protect, authorize('client'), completeContract);
router.post('/:id/reviews', protect, authorize('client', 'freelancer'), validate(reviewSchema), createReview);

module.exports = router;
