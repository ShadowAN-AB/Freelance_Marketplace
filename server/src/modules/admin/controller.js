const { z } = require('zod');
const User = require('../../models/User');
const Project = require('../../models/Project');
const Proposal = require('../../models/Proposal');
const Contract = require('../../models/Contract');
const Payment = require('../../models/Payment');
const Report = require('../../models/Report');
const AuditLog = require('../../models/AuditLog');
const { audit } = require('../../infra/audit');
const { asyncHandler } = require('../../common/asyncHandler');
const { ApiError } = require('../../common/apiError');
const { notify } = require('../../infra/notify');
const { paginateQuery, paginateResult } = require('../../common/paginate');
const { USER_PUBLIC_FIELDS } = require('../../common/publicUser');

const stats = asyncHandler(async (_req, res) => {
  const [users, projects, proposals, contracts, payments, reports] = await Promise.all([
    User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
    Project.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Proposal.countDocuments(),
    Contract.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Payment.aggregate([{ $group: { _id: '$status', total: { $sum: '$amount' }, count: { $sum: 1 } } }]),
    Report.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
  ]);
  const toMap = (rows) => Object.fromEntries(rows.map((r) => [r._id, r.count ?? r.total]));
  res.json({
    users: toMap(users),
    projects: toMap(projects),
    applications: proposals,
    contracts: toMap(contracts),
    payments: payments,
    reports: toMap(reports),
    userCount: await User.countDocuments(),
    projectCount: await Project.countDocuments(),
  });
});

const listUsers = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginateQuery(req.query);
  const filter = {};
  if (req.query.role) filter.role = req.query.role;
  if (req.query.q) filter.$or = [{ name: new RegExp(req.query.q, 'i') }, { email: new RegExp(req.query.q, 'i') }];
  const [data, total] = await Promise.all([
    User.find(filter).select(USER_PUBLIC_FIELDS).sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);
  res.json(paginateResult({ data, total, page, limit }));
});

const blockUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found');
  if (user.role === 'admin') throw new ApiError(400, 'Cannot block an admin');
  user.isBlocked = req.body.blocked !== false;
  await user.save();
  await audit({
    actorId: req.user._id,
    action: user.isBlocked ? 'user_block' : 'user_unblock',
    targetType: 'user',
    targetId: user._id,
  });
  res.json({ user });
});

const closeProjectSchema = z.object({
  body: z.object({
    blocked: z.boolean().optional(),
  }),
});

const listAdminProjects = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginateQuery(req.query);
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  const [data, total] = await Promise.all([
    Project.find(filter).populate({ path: 'clientId', select: USER_PUBLIC_FIELDS }).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Project.countDocuments(filter),
  ]);
  res.json(paginateResult({ data, total, page, limit }));
});

const listAdminContracts = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginateQuery(req.query);
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  const [data, total] = await Promise.all([
    Contract.find(filter)
      .populate({ path: 'projectId', select: 'title status' })
      .populate({ path: 'clientId', select: USER_PUBLIC_FIELDS })
      .populate({ path: 'freelancerId', select: USER_PUBLIC_FIELDS })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Contract.countDocuments(filter),
  ]);
  const ids = data.map((c) => c._id);
  const payments = await Payment.find({ contractId: { $in: ids } });
  const byContract = Object.fromEntries(payments.map((p) => [p.contractId.toString(), p]));
  res.json(
    paginateResult({
      data: data.map((c) => ({ ...c.toObject(), payment: byContract[c._id.toString()] || null })),
      total,
      page,
      limit,
    })
  );
});

const listAudit = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginateQuery(req.query);
  const filter = {};
  if (req.query.action) filter.action = req.query.action;
  const [data, total] = await Promise.all([
    AuditLog.find(filter)
      .populate({ path: 'actorId', select: USER_PUBLIC_FIELDS })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    AuditLog.countDocuments(filter),
  ]);
  res.json(paginateResult({ data, total, page, limit }));
});

const verifySkillsSchema = z.object({
  body: z.object({
    skills: z.array(z.string().max(40)).max(30),
  }),
});

const verifySkills = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found');
  if (user.role !== 'freelancer') throw new ApiError(400, 'Only freelancers have verified skills');
  user.freelancerProfile = {
    ...(user.freelancerProfile.toObject?.() || user.freelancerProfile || {}),
    verifiedSkills: req.body.skills,
  };
  await user.save();
  await audit({
    actorId: req.user._id,
    action: 'verify_skills',
    targetType: 'user',
    targetId: user._id,
    meta: { skills: req.body.skills },
  });
  res.json({ user });
});

const createReportSchema = z.object({
  body: z.object({
    targetType: z.enum(['user', 'project']),
    targetId: z.string().min(1),
    reason: z.string().min(3).max(80),
    details: z.string().max(2000).optional().default(''),
  }),
});

const createReport = asyncHandler(async (req, res) => {
  const report = await Report.create({
    reporterId: req.user._id,
    ...req.body,
  });
  res.status(201).json({ report });
});

const listReports = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginateQuery(req.query);
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  const [data, total] = await Promise.all([
    Report.find(filter)
      .populate({ path: 'reporterId', select: USER_PUBLIC_FIELDS })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Report.countDocuments(filter),
  ]);
  res.json(paginateResult({ data, total, page, limit }));
});

const updateReportSchema = z.object({
  body: z.object({
    status: z.enum(['open', 'reviewed', 'dismissed']),
  }),
});

const updateReport = asyncHandler(async (req, res) => {
  const report = await Report.findById(req.params.id);
  if (!report) throw new ApiError(404, 'Report not found');
  report.status = req.body.status;
  await report.save();
  await audit({
    actorId: req.user._id,
    action: 'report_update',
    targetType: 'report',
    targetId: report._id,
    meta: { status: report.status },
  });
  await notify({
    userId: report.reporterId,
    type: 'report_update',
    title: 'Report updated',
    body: `Your report was marked ${report.status}`,
    link: '/app/dashboard',
  });
  res.json({ report });
});

module.exports = {
  stats,
  listUsers,
  blockUser,
  listAdminProjects,
  listAdminContracts,
  listAudit,
  verifySkills,
  createReport,
  listReports,
  updateReport,
  createReportSchema,
  updateReportSchema,
  verifySkillsSchema,
  closeProjectSchema,
};
