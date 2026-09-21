const authRoutes = require('./auth/routes');
const userRoutes = require('./users/routes');
const freelancerRoutes = require('./users/freelancer.routes');
const projectRoutes = require('./projects/routes');
const { router: proposalRoutes, projectRouter: projectProposalRoutes } = require('./proposals/routes');
const contractRoutes = require('./contracts/routes');
const reviewRoutes = require('./contracts/review.routes');
const paymentRoutes = require('./payments/routes');
const conversationRoutes = require('./chat/routes');
const notificationRoutes = require('./notifications/routes');
const adminRoutes = require('./admin/routes');
const reportRoutes = require('./admin/report.routes');
const { marketplaceStats } = require('./stats/controller');

function includes(service, name) {
  return service === 'all' || service === name;
}

function mountApi(app, service) {
  if (includes(service, 'marketplace')) {
    app.get('/api/stats', marketplaceStats);
  }
  if (includes(service, 'auth')) {
    app.use('/api/auth', authRoutes);
    app.use('/api/users', userRoutes);
  }
  if (includes(service, 'marketplace')) {
    app.use('/api/users/:id/reviews', reviewRoutes);
    app.use('/api/freelancers', freelancerRoutes);
    app.use('/api/projects/:id/proposals', projectProposalRoutes);
    app.use('/api/projects', projectRoutes);
    app.use('/api/proposals', proposalRoutes);
    app.use('/api/contracts', contractRoutes);
    app.use('/api/payments', paymentRoutes);
    app.use('/api/admin', adminRoutes);
    app.use('/api/reports', reportRoutes);
  }
  if (includes(service, 'realtime')) {
    app.use('/api/conversations', conversationRoutes);
    app.use('/api/notifications', notificationRoutes);
  }
}

module.exports = { mountApi, includes };
