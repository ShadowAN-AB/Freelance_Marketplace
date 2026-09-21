const { z } = require('zod');
const Contract = require('../models/Contract');
const Payment = require('../models/Payment');
const Project = require('../models/Project');
const Review = require('../models/Review');
const User = require('../models/User');
const { asyncHandler } = require('../utils/asyncHandler');
const { ApiError } = require('../utils/apiError');
const { notify } = require('../services/notify');
const { USER_PUBLIC_FIELDS } = require('../utils/publicUser');

const populate = [
  { path: 'projectId' },
  { path: 'clientId', select: USER_PUBLIC_FIELDS },
  { path: 'freelancerId', select: USER_PUBLIC_FIELDS },
];

const myContracts = asyncHandler(async (req, res) => {
  const filter =
    req.user.role === 'client'
      ? { clientId: req.user._id }
      : req.user.role === 'freelancer'
        ? { freelancerId: req.user._id }
        : {};
  const contracts = await Contract.find(filter).populate(populate).sort({ createdAt: -1 });
  res.json({ data: contracts });
});

const getContract = asyncHandler(async (req, res) => {
  const contract = await Contract.findById(req.params.id).populate(populate);
  if (!contract) throw new ApiError(404, 'Contract not found');
  const uid = req.user._id.toString();
  const allowed =
    contract.clientId._id.toString() === uid ||
    contract.freelancerId._id.toString() === uid ||
    req.user.role === 'admin';
  if (!allowed) throw new ApiError(403, 'Not a party to this contract');
  const payment = await Payment.findOne({ contractId: contract._id });
  const reviews = await Review.find({ contractId: contract._id });
  res.json({ contract, payment, reviews });
});

const submitWork = asyncHandler(async (req, res) => {
  const contract = await Contract.findById(req.params.id).populate('projectId');
  if (!contract) throw new ApiError(404, 'Contract not found');
  if (contract.freelancerId.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'Only the hired freelancer can submit work');
  }
  if (contract.status !== 'active') throw new ApiError(400, 'Contract is not active');
  if (Array.isArray(req.files)) {
    contract.deliverables = req.files.map((file) => ({
      originalName: file.originalname,
      url: `/uploads/${file.filename}`,
      uploadedAt: new Date(),
    }));
  }
  contract.workSubmittedAt = new Date();
  contract.revisionNote = '';
  await contract.save();
  await notify({
    userId: contract.clientId,
    type: 'work_submitted',
    title: 'Work submitted',
    body: `${req.user.name} submitted work for ${contract.projectId.title}`,
    link: `/app/work`,
  });
  res.json({ contract });
});

const completeContract = asyncHandler(async (req, res) => {
  const contract = await Contract.findById(req.params.id).populate('projectId');
  if (!contract) throw new ApiError(404, 'Contract not found');
  if (contract.clientId.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'Only the client can complete the contract');
  }
  if (contract.status !== 'active') throw new ApiError(400, 'Contract is not active');
  if (!contract.workSubmittedAt) throw new ApiError(400, 'Freelancer has not submitted work yet');
  contract.status = 'completed';
  contract.completedAt = new Date();
  await contract.save();
  await Payment.findOneAndUpdate(
    { contractId: contract._id },
    { status: 'released', releasedAt: new Date() }
  );
  await Project.findByIdAndUpdate(contract.projectId._id, { status: 'completed' });
  await notify({
    userId: contract.freelancerId,
    type: 'contract_completed',
    title: 'Payment released',
    body: `₹${contract.amount.toLocaleString('en-IN')} released for ${contract.projectId.title}`,
    link: `/app/earnings`,
  });
  res.json({ contract });
});

const revisionSchema = z.object({
  body: z.object({
    note: z.string().min(8).max(2000),
  }),
});

const requestRevision = asyncHandler(async (req, res) => {
  const contract = await Contract.findById(req.params.id).populate('projectId');
  if (!contract) throw new ApiError(404, 'Contract not found');
  if (contract.clientId.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'Only the client can request a revision');
  }
  if (contract.status !== 'active') throw new ApiError(400, 'Contract is not active');
  if (!contract.workSubmittedAt) throw new ApiError(400, 'No submitted work to revise');
  contract.revisionNote = req.body.note;
  contract.revisionCount = (contract.revisionCount || 0) + 1;
  contract.workSubmittedAt = null;
  await contract.save();
  await notify({
    userId: contract.freelancerId,
    type: 'revision_requested',
    title: 'Revision requested',
    body: `${req.user.name} asked for changes on ${contract.projectId.title}`,
    link: `/app/work`,
  });
  res.json({ contract });
});

const reviewSchema = z.object({
  body: z.object({
    rating: z.number().int().min(1).max(5),
    comment: z.string().min(8).max(2000),
  }),
});

const createReview = asyncHandler(async (req, res) => {
  const contract = await Contract.findById(req.params.id);
  if (!contract) throw new ApiError(404, 'Contract not found');
  if (contract.status !== 'completed') throw new ApiError(400, 'Reviews open after completion');
  const uid = req.user._id.toString();
  const isClient = contract.clientId.toString() === uid;
  const isFreelancer = contract.freelancerId.toString() === uid;
  if (!isClient && !isFreelancer) throw new ApiError(403, 'Not a party to this contract');
  const revieweeId = isClient ? contract.freelancerId : contract.clientId;
  const review = await Review.create({
    contractId: contract._id,
    projectId: contract.projectId,
    reviewerId: req.user._id,
    revieweeId,
    rating: req.body.rating,
    comment: req.body.comment,
  });
  const stats = await Review.aggregate([
    { $match: { revieweeId } },
    { $group: { _id: '$revieweeId', avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  if (stats[0]) {
    await User.findByIdAndUpdate(revieweeId, {
      avgRating: Math.round(stats[0].avg * 10) / 10,
      reviewCount: stats[0].count,
    });
  }
  await notify({
    userId: revieweeId,
    type: 'review_received',
    title: 'New review',
    body: `${req.user.name} left a ${req.body.rating}-star review`,
    link: `/freelancers/${revieweeId}`,
  });
  res.status(201).json({ review });
});

const listUserReviews = asyncHandler(async (req, res) => {
  const reviews = await Review.find({ revieweeId: req.params.id })
    .populate({ path: 'reviewerId', select: USER_PUBLIC_FIELDS })
    .populate({ path: 'projectId', select: 'title' })
    .sort({ createdAt: -1 });
  res.json({ data: reviews });
});

const myPayments = asyncHandler(async (req, res) => {
  const filter =
    req.user.role === 'client'
      ? { clientId: req.user._id }
      : { freelancerId: req.user._id };
  const payments = await Payment.find(filter)
    .populate({ path: 'contractId', populate: { path: 'projectId', select: 'title' } })
    .sort({ createdAt: -1 });
  const totalReleased = payments.filter((p) => p.status === 'released').reduce((s, p) => s + p.amount, 0);
  const totalHeld = payments.filter((p) => p.status === 'held').reduce((s, p) => s + p.amount, 0);
  res.json({ data: payments, totalReleased, totalHeld });
});

module.exports = {
  myContracts,
  getContract,
  submitWork,
  completeContract,
  requestRevision,
  createReview,
  listUserReviews,
  myPayments,
  reviewSchema,
  revisionSchema,
};
