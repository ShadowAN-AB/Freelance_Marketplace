const express = require('express');
const {
  stats,
  listUsers,
  blockUser,
  listAdminProjects,
  listAdminContracts,
  listAudit,
  verifySkills,
  listReports,
  updateReport,
  updateReportSchema,
  verifySkillsSchema,
} = require('./controller');
const { protect, authorize } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const { z } = require('zod');

const blockSchema = z.object({
  body: z.object({ blocked: z.boolean() }),
});

const router = express.Router();
router.use(protect, authorize('admin'));
router.get('/stats', stats);
router.get('/users', listUsers);
router.patch('/users/:id/block', validate(blockSchema), blockUser);
router.patch('/users/:id/verify-skills', validate(verifySkillsSchema), verifySkills);
router.get('/projects', listAdminProjects);
router.get('/contracts', listAdminContracts);
router.get('/audit', listAudit);
router.get('/reports', listReports);
router.patch('/reports/:id', validate(updateReportSchema), updateReport);

module.exports = router;
