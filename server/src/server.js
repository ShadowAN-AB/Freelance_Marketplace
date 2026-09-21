const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const http = require('http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoose = require('mongoose');
const { connectDb } = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const { parseCookies } = require('./middleware/cookies');
const { csrfProtect } = require('./middleware/csrf');
const { attachSocket } = require('./services/socket');
const { requestId, logger } = require('./services/logger');
const { clientUrl, requireEnv, isProd } = require('./config/env');
const { ensureUploadDir } = require('./services/storage');
const { handleStripeWebhook } = require('./controllers/paymentController');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const freelancerRoutes = require('./routes/freelancers');
const projectRoutes = require('./routes/projects');
const { router: proposalRoutes, projectRouter: projectProposalRoutes } = require('./routes/proposals');
const contractRoutes = require('./routes/contracts');
const paymentRoutes = require('./routes/payments');
const conversationRoutes = require('./routes/conversations');
const notificationRoutes = require('./routes/notifications');
const adminRoutes = require('./routes/admin');
const reportRoutes = require('./routes/reports');
const reviewRoutes = require('./routes/reviews');
const { marketplaceStats } = require('./controllers/statsController');

function createApp() {
  const origin = clientUrl();
  const app = express();
  app.disable('x-powered-by');
  app.use(requestId());
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cors({ origin, credentials: true }));
  app.use(parseCookies);
  app.use(csrfProtect);
  app.post(
    '/api/payments/webhook',
    express.raw({ type: 'application/json' }),
    (req, res, next) => {
      handleStripeWebhook(req, res).catch(next);
    }
  );
  app.use(express.json({ limit: '1mb' }));
  app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

  app.get('/health', (_req, res) => {
    const mongo = mongoose.connection.readyState === 1;
    res.status(mongo ? 200 : 503).json({
      ok: mongo,
      service: 'freelancehub-api',
      mongo,
      env: process.env.NODE_ENV || 'development',
    });
  });

  app.get('/api/stats', marketplaceStats);

  app.use('/api/auth', authRoutes);
  app.use('/api/freelancers', freelancerRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/users/:id/reviews', reviewRoutes);
  app.use('/api/projects/:id/proposals', projectProposalRoutes);
  app.use('/api/projects', projectRoutes);
  app.use('/api/proposals', proposalRoutes);
  app.use('/api/contracts', contractRoutes);
  app.use('/api/payments', paymentRoutes);
  app.use('/api/conversations', conversationRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/reports', reportRoutes);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}

async function start() {
  requireEnv('CLIENT_URL');
  requireEnv('JWT_SECRET');
  requireEnv('MONGO_URI');
  if (isProd() && process.env.JWT_SECRET === 'freelancehub-dev-secret-change-me-please-32chars') {
    throw new Error('Set a unique JWT_SECRET before running in production');
  }
  ensureUploadDir();
  await connectDb();
  const app = createApp();
  const server = http.createServer(app);
  attachSocket(server, app);
  const PORT = process.env.PORT || 5000;
  await new Promise((resolve) => server.listen(PORT, resolve));
  logger.info({ port: PORT, client: clientUrl() }, 'FreelanceHub API listening');
  return server;
}

if (require.main === module) {
  start().catch((err) => {
    logger.error({ err: err.message }, 'failed to start');
    process.exit(1);
  });
}

module.exports = { createApp, start };
