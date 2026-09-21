const { z } = require('zod');
const User = require('../models/User');
const { asyncHandler } = require('../utils/asyncHandler');
const { ApiError } = require('../utils/apiError');
const { publicUser, USER_PUBLIC_FIELDS } = require('../utils/publicUser');
const { paginateQuery, paginateResult } = require('../utils/paginate');
const { normalizeSkills } = require('../utils/skills');

const updateMeSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(80).optional(),
    bio: z.string().max(1000).optional(),
    location: z.string().max(120).optional(),
    freelancerProfile: z
      .object({
        title: z.string().max(120).optional(),
        skills: z.array(z.string().max(40)).max(30).optional(),
        hourlyRate: z.number().min(0).max(1000000).optional(),
        availability: z.enum(['available', 'busy', 'unavailable']).optional(),
        portfolio: z
          .array(
            z.object({
              title: z.string().min(1).max(120),
              url: z.string().max(400).optional().default(''),
              imageUrl: z.string().max(400).optional().default(''),
            })
          )
          .max(12)
          .optional(),
      })
      .optional(),
    clientProfile: z
      .object({
        companyName: z.string().max(120).optional(),
      })
      .optional(),
  }),
});

const getUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select(USER_PUBLIC_FIELDS);
  if (!user) throw new ApiError(404, 'User not found');
  res.json({ user: publicUser(user) });
});

const updateMe = asyncHandler(async (req, res) => {
  const body = req.body;
  if (body.name) req.user.name = body.name;
  if (body.bio !== undefined) req.user.bio = body.bio;
  if (body.location !== undefined) req.user.location = body.location;
  if (body.freelancerProfile && req.user.role === 'freelancer') {
    const next = { ...req.user.freelancerProfile.toObject?.() || req.user.freelancerProfile, ...body.freelancerProfile };
    if (body.freelancerProfile.skills) next.skills = normalizeSkills(body.freelancerProfile.skills);
    req.user.freelancerProfile = next;
  }
  if (body.clientProfile && req.user.role === 'client') {
    req.user.clientProfile = {
      ...(req.user.clientProfile.toObject?.() || req.user.clientProfile),
      ...body.clientProfile,
    };
  }
  await req.user.save();
  res.json({ user: publicUser(req.user) });
});

const uploadAvatar = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'Avatar image is required');
  req.user.avatarUrl = `/uploads/${req.file.filename}`;
  await req.user.save();
  res.json({ user: publicUser(req.user) });
});

const listFreelancers = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginateQuery(req.query);
  const filter = { role: 'freelancer', isBlocked: false };
  if (req.query.q) {
    filter.$or = [
      { name: new RegExp(req.query.q, 'i') },
      { 'freelancerProfile.title': new RegExp(req.query.q, 'i') },
      { 'freelancerProfile.skills': new RegExp(req.query.q, 'i') },
    ];
  }
  if (req.query.skill) {
    filter['freelancerProfile.skills'] = new RegExp(req.query.skill, 'i');
  }
  const [data, total] = await Promise.all([
    User.find(filter).select(USER_PUBLIC_FIELDS).sort({ avgRating: -1, createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);
  res.json(paginateResult({ data: data.map(publicUser), total, page, limit }));
});

module.exports = { getUser, updateMe, uploadAvatar, listFreelancers, updateMeSchema };
