const Project = require('../../models/Project');
const User = require('../../models/User');
const Contract = require('../../models/Contract');
const Payment = require('../../models/Payment');
const { asyncHandler } = require('../../common/asyncHandler');

const marketplaceStats = asyncHandler(async (_req, res) => {
  const [openProjects, freelancers, completedContracts, held] = await Promise.all([
    Project.countDocuments({ status: 'open' }),
    User.countDocuments({ role: 'freelancer', isBlocked: false }),
    Contract.countDocuments({ status: 'completed' }),
    Payment.aggregate([
      { $match: { status: 'held' } },
      {
        $group: {
          _id: null,
          total: { $sum: { $subtract: ['$amount', { $ifNull: ['$releasedAmount', 0] }] } },
        },
      },
    ]),
  ]);
  res.json({
    openProjects,
    freelancers,
    completedContracts,
    escrowHeld: held[0]?.total || 0,
  });
});

module.exports = { marketplaceStats };
