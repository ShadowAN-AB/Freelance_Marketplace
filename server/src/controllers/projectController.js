const { z } = require('zod');
const Project = require('../models/Project');
const User = require('../models/User');
const Proposal = require('../models/Proposal');
const { asyncHandler } = require('../utils/asyncHandler');
const { ApiError } = require('../utils/apiError');
const { paginateQuery, paginateResult } = require('../utils/paginate');
const { normalizeSkills, matchScore } = require('../utils/skills');
const { notify } = require('../services/notify');
const { USER_PUBLIC_FIELDS } = require('../utils/publicUser');

const CATEGORIES = [
  'Web Development',
  'Mobile',
  'UI/UX',
  'Data',
  'Writing',
  'Marketing',
  'Other',
];

const createSchema = z.object({
  body: z.object({
    title: z.string().min(6).max(140),
    description: z.string().min(20).max(8000),
    category: z.enum(CATEGORIES),
    skills: z.array(z.string().max(40)).min(1).max(20),
    budgetMin: z.number().min(0),
    budgetMax: z.number().min(0),
    deadline: z.string().or(z.date()),
    pricingType: z.enum(['fixed', 'hourly']).optional().default('fixed'),
    milestones: z
      .array(z.object({ title: z.string().min(1).max(120), amount: z.number().min(0) }))
      .max(3)
      .optional(),
  }).superRefine((b, ctx) => {
    if (b.budgetMax < b.budgetMin) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'budgetMax must be >= budgetMin', path: ['budgetMax'] });
    }
    const rows = (b.milestones || []).filter((m) => m.title && m.amount > 0);
    if (b.pricingType === 'hourly' && rows.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Hourly projects cannot use milestones', path: ['milestones'] });
    }
    if (rows.length && (rows.length < 2 || rows.length > 3)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Use 2 or 3 milestones', path: ['milestones'] });
    }
    if (rows.length) {
      const sum = rows.reduce((s, m) => s + m.amount, 0);
      if (sum !== b.budgetMax) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Milestone amounts must add up to the max budget', path: ['milestones'] });
      }
    }
  }),
});

const updateSchema = z.object({
  body: z.object({
    title: z.string().min(6).max(140).optional(),
    description: z.string().min(20).max(8000).optional(),
    category: z.enum(CATEGORIES).optional(),
    skills: z.array(z.string().max(40)).min(1).max(20).optional(),
    budgetMin: z.number().min(0).optional(),
    budgetMax: z.number().min(0).optional(),
    deadline: z.string().or(z.date()).optional(),
    pricingType: z.enum(['fixed', 'hourly']).optional(),
    milestones: z
      .array(z.object({ title: z.string().min(1).max(120), amount: z.number().min(0) }))
      .max(3)
      .optional(),
  }),
});

const populateClient = { path: 'clientId', select: USER_PUBLIC_FIELDS };

const listProjects = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginateQuery(req.query);
  const filter = {};
  if (req.query.status && req.query.status !== 'all') filter.status = req.query.status;
  else if (!req.query.mine && req.query.status !== 'all') filter.status = 'open';
  if (req.query.category) filter.category = req.query.category;
  if (req.query.clientId) filter.clientId = req.query.clientId;
  if (req.query.mine === 'true' && req.user) filter.clientId = req.user._id;
  if (req.query.q) filter.$text = { $search: req.query.q };
  if (req.query.skill) filter.skills = new RegExp(req.query.skill, 'i');
  if (req.query.minBudget) filter.budgetMax = { $gte: Number(req.query.minBudget) };
  if (req.query.maxBudget) filter.budgetMin = { $lte: Number(req.query.maxBudget) };
  if (req.query.pricingType === 'fixed' || req.query.pricingType === 'hourly') {
    filter.pricingType = req.query.pricingType;
  }
  if (req.query.dueSoon === 'true' || req.query.dueSoon === '1') {
    const soon = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    filter.deadline = { $gte: new Date(), $lte: soon };
  }

  const sort =
    req.query.sort === 'budget'
      ? { budgetMax: -1 }
      : req.query.sort === 'deadline'
        ? { deadline: 1 }
        : { createdAt: -1 };

  const [rows, total] = await Promise.all([
    Project.find(filter).populate(populateClient).sort(sort).skip(skip).limit(limit),
    Project.countDocuments(filter),
  ]);
  const data = await withProposalCounts(rows);
  res.json(paginateResult({ data, total, page, limit }));
});

const getProject = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id)
    .populate(populateClient)
    .populate({ path: 'hiredFreelancerId', select: USER_PUBLIC_FIELDS });
  if (!project) throw new ApiError(404, 'Project not found');
  let myProposal = null;
  if (req.user?.role === 'freelancer') {
    myProposal = await Proposal.findOne({ projectId: project._id, freelancerId: req.user._id });
  }
  res.json({ project, myProposal });
});

const similarProjects = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) throw new ApiError(404, 'Project not found');
  const data = await Project.find({
    _id: { $ne: project._id },
    status: 'open',
    $or: [{ category: project.category }, { skills: { $in: project.skills || [] } }],
  })
    .populate(populateClient)
    .sort({ createdAt: -1 })
    .limit(4);
  res.json({ data });
});

const createProject = asyncHandler(async (req, res) => {
  const body = req.body;
  const project = await Project.create({
    clientId: req.user._id,
    title: body.title,
    description: body.description,
    category: body.category,
    skills: normalizeSkills(body.skills),
    budgetMin: body.budgetMin,
    budgetMax: body.budgetMax,
    deadline: body.deadline,
    pricingType: body.pricingType || 'fixed',
    milestones: body.pricingType === 'hourly' ? [] : body.milestones || [],
  });
  res.status(201).json({ project });
});

const updateProject = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) throw new ApiError(404, 'Project not found');
  if (project.clientId.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'You can only edit your own projects');
  }
  if (project.status !== 'open') throw new ApiError(400, 'Only open projects can be edited');
  const body = req.body;
  if (body.title) project.title = body.title;
  if (body.description) project.description = body.description;
  if (body.category) project.category = body.category;
  if (body.skills) project.skills = normalizeSkills(body.skills);
  if (body.budgetMin !== undefined) project.budgetMin = body.budgetMin;
  if (body.budgetMax !== undefined) project.budgetMax = body.budgetMax;
  if (body.deadline) project.deadline = body.deadline;
  if (body.pricingType) project.pricingType = body.pricingType;
  if (body.milestones) {
    if (project.pricingType === 'hourly' && body.milestones.length) {
      throw new ApiError(400, 'Hourly projects cannot use milestones');
    }
    project.milestones = body.milestones;
  }
  if (project.budgetMax < project.budgetMin) throw new ApiError(400, 'budgetMax must be >= budgetMin');
  if (project.pricingType === 'fixed' && project.milestones?.length) {
    const rows = project.milestones.filter((m) => m.title && m.amount > 0);
    if (rows.length && (rows.length < 2 || rows.length > 3)) {
      throw new ApiError(400, 'Use 2 or 3 milestones');
    }
    if (rows.length) {
      const sum = rows.reduce((s, m) => s + m.amount, 0);
      if (sum !== project.budgetMax) throw new ApiError(400, 'Milestone amounts must add up to the max budget');
    }
  }
  await project.save();
  res.json({ project });
});

const cancelProject = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) throw new ApiError(404, 'Project not found');
  if (project.clientId.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'You can only cancel your own projects');
  }
  if (project.status !== 'open') throw new ApiError(400, 'Only open projects can be cancelled');
  project.status = 'cancelled';
  await project.save();
  res.json({ project });
});

const projectMatches = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) throw new ApiError(404, 'Project not found');
  if (project.clientId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    throw new ApiError(403, 'Only the client can view matches');
  }
  const freelancers = await User.find({ role: 'freelancer', isBlocked: false }).select(USER_PUBLIC_FIELDS);
  const ranked = freelancers
    .map((f) => ({
      freelancer: f,
      ...matchScore(project.skills, f.freelancerProfile?.skills),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 20);
  res.json({ data: ranked });
});

const recommendedProjects = asyncHandler(async (req, res) => {
  const skills = req.user.freelancerProfile?.skills || [];
  const projects = await Project.find({ status: 'open' }).populate(populateClient).sort({ createdAt: -1 }).limit(50);
  const ranked = projects
    .map((project) => ({
      project,
      ...matchScore(project.skills, skills),
    }))
    .sort((a, b) => b.score - a.score);
  res.json({ data: ranked });
});

const inviteSchema = z.object({
  body: z.object({ freelancerId: z.string().min(1) }),
});

const inviteToBid = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) throw new ApiError(404, 'Project not found');
  if (project.clientId.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'Only the client can invite talent');
  }
  if (project.status !== 'open') throw new ApiError(400, 'Only open projects can invite bids');
  const freelancer = await User.findOne({ _id: req.body.freelancerId, role: 'freelancer', isBlocked: false });
  if (!freelancer) throw new ApiError(404, 'Freelancer not found');
  const already = (project.invitedFreelancerIds || []).some((id) => id.toString() === freelancer._id.toString());
  if (already) {
    return res.json({ project, invited: true, duplicate: true });
  }
  project.invitedFreelancerIds = [...(project.invitedFreelancerIds || []), freelancer._id];
  await project.save();
  await notify({
    userId: freelancer._id,
    type: 'project_invite',
    title: 'Invited to bid',
    body: `${req.user.name} invited you to bid on ${project.title}`,
    link: `/projects/${project._id}`,
  });
  res.status(201).json({ project, invited: true });
});

async function withProposalCounts(projects) {
  const ids = projects.map((p) => p._id);
  if (!ids.length) return projects;
  const rows = await Proposal.aggregate([
    { $match: { projectId: { $in: ids }, status: 'pending' } },
    { $group: { _id: '$projectId', count: { $sum: 1 } } },
  ]);
  const counts = Object.fromEntries(rows.map((r) => [String(r._id), r.count]));
  return projects.map((p) => {
    const obj = p.toObject ? p.toObject() : p;
    obj.proposalCount = counts[String(p._id)] || 0;
    return obj;
  });
}

module.exports = {
  listProjects,
  getProject,
  similarProjects,
  createProject,
  updateProject,
  cancelProject,
  projectMatches,
  recommendedProjects,
  inviteToBid,
  createSchema,
  updateSchema,
  inviteSchema,
};
