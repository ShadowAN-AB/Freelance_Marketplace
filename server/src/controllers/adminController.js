const { z } = require('zod');
const User = require('../models/User');
const Project = require('../models/Project');
const Proposal = require('../models/Proposal');
const Contract = require('../models/Contract');
const Payment = require('../models/Payment');
const Report = require('../models/Report');
const { asyncHandler } = require('../utils/asyncHandler');
const { ApiError } = require('../utils/apiError');
const { notify } = require('../services/notify');
const { paginateQuery, paginateResult } = require('../utils/paginate');
const { USER_PUBLIC_FIELDS } = require('../utils/publicUser');

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
  createReport,
  listReports,
  updateReport,
  createReportSchema,
  updateReportSchema,
  closeProjectSchema,
};
