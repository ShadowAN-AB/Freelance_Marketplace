const { z } = require('zod');
const Contract = require('../models/Contract');
const Payment = require('../models/Payment');
const Project = require('../models/Project');
const Review = require('../models/Review');
const User = require('../models/User');
const { asyncHandler } = require('../utils/asyncHandler');
const { ApiError } = require('../utils/apiError');
const { notify } = require('../services/notify');
const { sendMail } = require('../services/mailer');
const { persistUploads } = require('../services/storage');
const { markReleased, markRefunded, releasePartial } = require('../services/payments');
const { USER_PUBLIC_FIELDS } = require('../utils/publicUser');
const { paginateQuery, paginateResult } = require('../utils/paginate');

const populate = [
  { path: 'projectId' },
  { path: 'clientId', select: USER_PUBLIC_FIELDS },
  { path: 'freelancerId', select: USER_PUBLIC_FIELDS },
];

function assertParty(contract, user) {
  const uid = user._id.toString();
  const clientId = contract.clientId._id?.toString?.() || contract.clientId.toString();
  const freelancerId = contract.freelancerId._id?.toString?.() || contract.freelancerId.toString();
  const allowed = clientId === uid || freelancerId === uid || user.role === 'admin';
  if (!allowed) throw new ApiError(403, 'Not a party to this contract');
  return { uid, clientId, freelancerId };
}

function findMilestone(contract, mid) {
  const milestone = contract.milestones.id(mid);
  if (!milestone) throw new ApiError(404, 'Milestone not found');
  return milestone;
}

function currentOpenMilestone(contract) {
  return (contract.milestones || []).find((m) => m.status !== 'released');
}

const myContracts = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginateQuery(req.query);
  const filter =
    req.user.role === 'client'
      ? { clientId: req.user._id }
      : req.user.role === 'freelancer'
        ? { freelancerId: req.user._id }
        : {};
  const [data, total] = await Promise.all([
    Contract.find(filter).populate(populate).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Contract.countDocuments(filter),
  ]);
  res.json(paginateResult({ data, total, page, limit }));
});

const getContract = asyncHandler(async (req, res) => {
  const contract = await Contract.findById(req.params.id).populate(populate);
  if (!contract) throw new ApiError(404, 'Contract not found');
  assertParty(contract, req.user);
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
  const files = Array.isArray(req.files) && req.files.length ? await persistUploads(req.files) : [];
  if (files.length) contract.deliverables = files;
  contract.workSubmittedAt = new Date();
  contract.revisionNote = '';
  const open = currentOpenMilestone(contract);
  if (open) {
    open.status = 'submitted';
    open.workSubmittedAt = contract.workSubmittedAt;
    open.revisionNote = '';
    if (files.length) open.deliverables = files;
  }
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

  const milestones = contract.milestones || [];
  const payment = await Payment.findOne({ contractId: contract._id });

  if (contract.pricingType === 'hourly') {
    if (payment) await markReleased(payment);
  } else if (milestones.length > 1) {
    const last = milestones[milestones.length - 1];
    const othersReleased = milestones.slice(0, -1).every((m) => m.status === 'released');
    const allReleased = milestones.every((m) => m.status === 'released');
    if (!allReleased && !(othersReleased && last.status === 'submitted')) {
      throw new ApiError(400, 'Release every milestone before completing');
    }
    if (last.status === 'submitted' && payment) {
      last.status = 'released';
      last.releasedAt = new Date();
      await releasePartial(payment, last.amount);
    } else if (payment) {
      await markReleased(payment);
    }
  } else {
    if (!contract.workSubmittedAt) throw new ApiError(400, 'Freelancer has not submitted work yet');
    const only = milestones[0];
    if (only && only.status !== 'released' && payment) {
      only.status = 'released';
      only.releasedAt = new Date();
    }
    if (payment) await markReleased(payment);
  }

  contract.status = 'completed';
  contract.completedAt = new Date();
  await contract.save();
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
  const open = (contract.milestones || []).find((m) => m.status === 'submitted');
  if (open) {
    open.status = 'pending';
    open.workSubmittedAt = null;
    open.revisionNote = req.body.note;
  }
  await contract.save();
  await notify({
    userId: contract.freelancerId,
    type: 'revision_requested',
    title: 'Revision requested',
    body: `${req.user.name} asked for changes on ${contract.projectId.title}`,
    link: `/app/work`,
  });
  const freelancer = await User.findById(contract.freelancerId).select('email');
  if (freelancer?.email) {
    await sendMail({
      to: freelancer.email,
      subject: `Revision requested on ${contract.projectId.title}`,
      text: req.body.note,
    });
  }
  res.json({ contract });
});

const cancelSchema = z.object({
  body: z.object({
    reason: z.string().min(8).max(2000),
  }),
});

const cancelContract = asyncHandler(async (req, res) => {
  const contract = await Contract.findById(req.params.id).populate('projectId');
  if (!contract) throw new ApiError(404, 'Contract not found');
  const { uid } = assertParty(contract, req.user);
  if (contract.status !== 'active') throw new ApiError(400, 'Only active contracts can be cancelled');
  contract.status = 'cancelled';
  contract.disputeReason = req.body.reason;
  contract.cancelledAt = new Date();
  contract.cancelledBy = req.user._id;
  await contract.save();
  const payment = await Payment.findOne({ contractId: contract._id });
  if (payment && payment.status === 'held') await markRefunded(payment);
  await Project.findByIdAndUpdate(contract.projectId._id, { status: 'cancelled' });
  const otherId = contract.clientId.toString() === uid ? contract.freelancerId : contract.clientId;
  await notify({
    userId: otherId,
    type: 'contract_cancelled',
    title: 'Contract cancelled',
    body: `${req.user.name} cancelled ${contract.projectId.title}: ${req.body.reason}`,
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
  const releasedOf = (p) => {
    if (typeof p.releasedAmount === 'number' && p.releasedAmount > 0) return p.releasedAmount;
    return p.status === 'released' ? p.amount : 0;
  };
  const totalReleased = payments.reduce((s, p) => s + releasedOf(p), 0);
  const totalHeld = payments.filter((p) => p.status === 'held').reduce((s, p) => s + Math.max(0, p.amount - (p.releasedAmount || 0)), 0);
  const totalRefunded = payments.filter((p) => p.status === 'refunded').reduce((s, p) => s + p.amount, 0);
  res.json({ data: payments, totalReleased, totalHeld, totalRefunded });
});

const submitMilestoneWork = asyncHandler(async (req, res) => {
  const contract = await Contract.findById(req.params.id).populate('projectId');
  if (!contract) throw new ApiError(404, 'Contract not found');
  if (contract.freelancerId.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'Only the hired freelancer can submit work');
  }
  if (contract.status !== 'active') throw new ApiError(400, 'Contract is not active');
  const milestone = findMilestone(contract, req.params.mid);
  if (milestone.status === 'released') throw new ApiError(400, 'This milestone is already released');
  const files = Array.isArray(req.files) && req.files.length ? await persistUploads(req.files) : [];
  if (files.length) milestone.deliverables = files;
  milestone.status = 'submitted';
  milestone.workSubmittedAt = new Date();
  milestone.revisionNote = '';
  if ((contract.milestones || []).length <= 1) {
    contract.workSubmittedAt = milestone.workSubmittedAt;
    contract.revisionNote = '';
    if (files.length) contract.deliverables = files;
  }
  await contract.save();
  await notify({
    userId: contract.clientId,
    type: 'work_submitted',
    title: 'Milestone submitted',
    body: `${req.user.name} submitted ${milestone.title} on ${contract.projectId.title}`,
    link: `/app/work`,
  });
  res.json({ contract });
});

const requestMilestoneRevision = asyncHandler(async (req, res) => {
  const contract = await Contract.findById(req.params.id).populate('projectId');
  if (!contract) throw new ApiError(404, 'Contract not found');
  if (contract.clientId.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'Only the client can request a revision');
  }
  if (contract.status !== 'active') throw new ApiError(400, 'Contract is not active');
  const milestone = findMilestone(contract, req.params.mid);
  if (milestone.status !== 'submitted') throw new ApiError(400, 'No submitted work to revise');
  milestone.status = 'pending';
  milestone.workSubmittedAt = null;
  milestone.revisionNote = req.body.note;
  contract.revisionCount = (contract.revisionCount || 0) + 1;
  if ((contract.milestones || []).length <= 1) {
    contract.workSubmittedAt = null;
    contract.revisionNote = req.body.note;
  }
  await contract.save();
  await notify({
    userId: contract.freelancerId,
    type: 'revision_requested',
    title: 'Revision requested',
    body: `${req.user.name} asked for changes on ${milestone.title}`,
    link: `/app/work`,
  });
  res.json({ contract });
});

const releaseMilestone = asyncHandler(async (req, res) => {
  const contract = await Contract.findById(req.params.id).populate('projectId');
  if (!contract) throw new ApiError(404, 'Contract not found');
  if (contract.clientId.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'Only the client can release a milestone');
  }
  if (contract.status !== 'active') throw new ApiError(400, 'Contract is not active');
  const milestone = findMilestone(contract, req.params.mid);
  if (milestone.status === 'released') throw new ApiError(400, 'Already released');
  if (milestone.status !== 'submitted') throw new ApiError(400, 'Freelancer has not submitted this slice');
  milestone.status = 'released';
  milestone.releasedAt = new Date();
  const payment = await Payment.findOne({ contractId: contract._id });
  if (payment) await releasePartial(payment, milestone.amount);
  await contract.save();
  await notify({
    userId: contract.freelancerId,
    type: 'milestone_released',
    title: 'Milestone released',
    body: `${milestone.title} · ₹${milestone.amount.toLocaleString('en-IN')} on ${contract.projectId.title}`,
    link: `/app/earnings`,
  });
  res.json({ contract, payment });
});

const timeEntrySchema = z.object({
  body: z.object({
    hours: z.number().min(0.25).max(24),
    note: z.string().max(1000).optional().default(''),
    date: z.string().or(z.date()),
  }),
});

const addTimeEntry = asyncHandler(async (req, res) => {
  const contract = await Contract.findById(req.params.id).populate('projectId');
  if (!contract) throw new ApiError(404, 'Contract not found');
  if (contract.freelancerId.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'Only the hired freelancer can log time');
  }
  if (contract.status !== 'active') throw new ApiError(400, 'Contract is not active');
  if (contract.pricingType !== 'hourly') throw new ApiError(400, 'Time entries are for hourly contracts');
  contract.timeEntries.push({
    hours: req.body.hours,
    note: req.body.note || '',
    date: req.body.date,
    status: 'pending',
  });
  await contract.save();
  res.status(201).json({ contract });
});

const reviewTimeEntry = asyncHandler(async (req, res) => {
  const contract = await Contract.findById(req.params.id).populate('projectId');
  if (!contract) throw new ApiError(404, 'Contract not found');
  if (contract.clientId.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'Only the client can review time entries');
  }
  if (contract.status !== 'active') throw new ApiError(400, 'Contract is not active');
  const entry = contract.timeEntries.id(req.params.tid);
  if (!entry) throw new ApiError(404, 'Time entry not found');
  if (entry.status !== 'pending') throw new ApiError(400, 'Time entry already reviewed');
  const approve = /\/approve\/?$/.test(req.originalUrl || req.path);
  entry.status = approve ? 'approved' : 'rejected';
  entry.reviewedAt = new Date();
  if (approve) {
    const payment = await Payment.findOne({ contractId: contract._id });
    const rate = contract.hourlyRate || 0;
    const increment = Math.min(entry.hours * rate, Math.max(0, (payment?.amount || 0) - (payment?.releasedAmount || 0)));
    if (payment) await releasePartial(payment, increment);
    await notify({
      userId: contract.freelancerId,
      type: 'time_approved',
      title: 'Hours approved',
      body: `${entry.hours}h approved on ${contract.projectId.title}`,
      link: `/app/work`,
    });
  }
  await contract.save();
  res.json({ contract });
});

const getInvoice = asyncHandler(async (req, res) => {
  const contract = await Contract.findById(req.params.id).populate(populate);
  if (!contract) throw new ApiError(404, 'Contract not found');
  assertParty(contract, req.user);
  const payment = await Payment.findOne({ contractId: contract._id });
  const lineItems = [];
  for (const m of contract.milestones || []) {
    lineItems.push({
      label: m.title,
      amount: m.amount,
      status: m.status,
    });
  }
  for (const t of contract.timeEntries || []) {
    if (t.status !== 'approved') continue;
    lineItems.push({
      label: `${t.hours}h · ${t.note || 'Time'}`.trim(),
      amount: t.hours * (contract.hourlyRate || 0),
      status: 'approved',
    });
  }
  if (!lineItems.length) {
    lineItems.push({ label: contract.projectId?.title || 'Contract', amount: contract.amount, status: payment?.status });
  }
  res.json({
    invoice: {
      projectTitle: contract.projectId?.title,
      client: contract.clientId,
      freelancer: contract.freelancerId,
      lineItems,
      amount: contract.amount,
      held: payment?.status === 'held' ? Math.max(0, payment.amount - (payment.releasedAmount || 0)) : 0,
      released: payment?.releasedAmount || (payment?.status === 'released' ? payment.amount : 0),
      refunded: payment?.status === 'refunded' ? payment.amount : 0,
      pricingType: contract.pricingType,
      startDate: contract.startDate,
      completedAt: contract.completedAt,
      cancelledAt: contract.cancelledAt,
      status: contract.status,
      paymentStatus: payment?.status,
    },
  });
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
};
