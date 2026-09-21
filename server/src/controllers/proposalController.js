const { z } = require('zod');
const Proposal = require('../models/Proposal');
const Project = require('../models/Project');
const Contract = require('../models/Contract');
const Payment = require('../models/Payment');
const Conversation = require('../models/Conversation');
const { asyncHandler } = require('../utils/asyncHandler');
const { ApiError } = require('../utils/apiError');
const { notify } = require('../services/notify');
const { USER_PUBLIC_FIELDS } = require('../utils/publicUser');

const createSchema = z.object({
  body: z.object({
    coverLetter: z.string().min(20).max(4000),
    bidAmount: z.number().min(0),
    estimatedDays: z.number().int().min(1).max(365),
  }),
});

const createProposal = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) throw new ApiError(404, 'Project not found');
  if (project.status !== 'open') throw new ApiError(400, 'This project is not accepting proposals');
  if (project.clientId.toString() === req.user._id.toString()) {
    throw new ApiError(400, 'You cannot propose on your own project');
  }
  const proposal = await Proposal.create({
    projectId: project._id,
    freelancerId: req.user._id,
    coverLetter: req.body.coverLetter,
    bidAmount: req.body.bidAmount,
    estimatedDays: req.body.estimatedDays,
  });
  await notify({
    userId: project.clientId,
    type: 'proposal_received',
    title: 'New proposal',
    body: `${req.user.name} proposed ₹${req.body.bidAmount.toLocaleString('en-IN')} on ${project.title}`,
    link: `/app/projects/${project._id}/proposals`,
  });
  res.status(201).json({ proposal });
});

const listProjectProposals = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) throw new ApiError(404, 'Project not found');
  const isOwner = project.clientId.toString() === req.user._id.toString();
  if (!isOwner && req.user.role !== 'admin') throw new ApiError(403, 'Only the client can view all proposals');
  const proposals = await Proposal.find({ projectId: project._id })
    .populate({ path: 'freelancerId', select: USER_PUBLIC_FIELDS })
    .sort({ createdAt: -1 });
  res.json({ data: proposals });
});

const myProposals = asyncHandler(async (req, res) => {
  const proposals = await Proposal.find({ freelancerId: req.user._id })
    .populate({ path: 'projectId', populate: { path: 'clientId', select: USER_PUBLIC_FIELDS } })
    .sort({ createdAt: -1 });
  res.json({ data: proposals });
});

const acceptProposal = asyncHandler(async (req, res) => {
  const proposal = await Proposal.findById(req.params.id).populate('projectId');
  if (!proposal) throw new ApiError(404, 'Proposal not found');
  const project = proposal.projectId;
  if (project.clientId.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'Only the client can accept a proposal');
  }
  if (proposal.status !== 'pending') throw new ApiError(400, 'Proposal is no longer pending');
  if (project.status !== 'open') throw new ApiError(400, 'Project is not open');

  proposal.status = 'accepted';
  await proposal.save();
  await Proposal.updateMany(
    { projectId: project._id, _id: { $ne: proposal._id }, status: 'pending' },
    { status: 'rejected' }
  );

  const contract = await Contract.create({
    projectId: project._id,
    clientId: project.clientId,
    freelancerId: proposal.freelancerId,
    proposalId: proposal._id,
    amount: proposal.bidAmount,
    status: 'active',
    startDate: new Date(),
  });
  const payment = await Payment.create({
    contractId: contract._id,
    clientId: project.clientId,
    freelancerId: proposal.freelancerId,
    amount: proposal.bidAmount,
    status: 'held',
  });

  project.status = 'in_progress';
  project.hiredProposalId = proposal._id;
  project.hiredFreelancerId = proposal.freelancerId;
  await project.save();

  const participantKey = Conversation.participantKey([project.clientId, proposal.freelancerId]);
  await Conversation.findOneAndUpdate(
    { projectId: project._id, participantKey },
    {
      $setOnInsert: {
        participants: [project.clientId, proposal.freelancerId],
        participantKey,
        projectId: project._id,
        lastMessagePreview: 'Contract started',
        lastMessageAt: new Date(),
      },
    },
    { upsert: true, new: true }
  );

  const rejected = await Proposal.find({ projectId: project._id, status: 'rejected' });
  await notify({
    userId: proposal.freelancerId,
    type: 'proposal_accepted',
    title: 'Proposal accepted',
    body: `You were hired for ${project.title}`,
    link: `/app/work`,
  });
  await Promise.all(
    rejected.map((p) =>
      notify({
        userId: p.freelancerId,
        type: 'proposal_rejected',
        title: 'Proposal not selected',
        body: `Another freelancer was hired for ${project.title}`,
        link: `/projects/${project._id}`,
      })
    )
  );

  res.json({ proposal, contract, payment });
});

const rejectProposal = asyncHandler(async (req, res) => {
  const proposal = await Proposal.findById(req.params.id).populate('projectId');
  if (!proposal) throw new ApiError(404, 'Proposal not found');
  if (proposal.projectId.clientId.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'Only the client can reject a proposal');
  }
  if (proposal.status !== 'pending') throw new ApiError(400, 'Proposal is no longer pending');
  proposal.status = 'rejected';
  await proposal.save();
  await notify({
    userId: proposal.freelancerId,
    type: 'proposal_rejected',
    title: 'Proposal declined',
    body: `Your proposal on ${proposal.projectId.title} was declined`,
    link: `/projects/${proposal.projectId._id}`,
  });
  res.json({ proposal });
});

const withdrawProposal = asyncHandler(async (req, res) => {
  const proposal = await Proposal.findById(req.params.id);
  if (!proposal) throw new ApiError(404, 'Proposal not found');
  if (proposal.freelancerId.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'You can only withdraw your own proposal');
  }
  if (proposal.status !== 'pending') throw new ApiError(400, 'Only pending proposals can be withdrawn');
  proposal.status = 'withdrawn';
  await proposal.save();
  res.json({ proposal });
});

module.exports = {
  createProposal,
  listProjectProposals,
  myProposals,
  acceptProposal,
  rejectProposal,
  withdrawProposal,
  createSchema,
};
