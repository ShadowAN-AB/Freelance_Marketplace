const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoose = require('mongoose');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const { parseCookies } = require('./middleware/cookies');
const { csrfProtect } = require('./middleware/csrf');
const { requestId } = require('./infra/logger');
const { clientUrl } = require('./config/env');
const { handleStripeWebhook } = require('./modules/payments/controller');
const { mountApi, includes } = require('./modules');

function resolveService(options = {}) {
  return options.service || process.env.SERVICE || 'all';
}

function serviceLabel(service) {
  if (service === 'auth') return 'freelancehub-auth';
  if (service === 'marketplace') return 'freelancehub-marketplace';
  if (service === 'realtime') return 'freelancehub-realtime';
  return 'freelancehub-api';
}

function createApp(options = {}) {
  const service = resolveService(options);
  const origin = clientUrl();
  const app = express();
  app.disable('x-powered-by');
  app.use(requestId());
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cors({ origin, credentials: true }));
  app.use(parseCookies);
  app.use(csrfProtect);
  if (includes(service, 'marketplace')) {
    app.post(
      '/api/payments/webhook',
      express.raw({ type: 'application/json' }),
      (req, res, next) => {
        handleStripeWebhook(req, res).catch(next);
      }
    );
  }
  app.use(express.json({ limit: '1mb' }));
  if (includes(service, 'marketplace') || includes(service, 'realtime')) {
    app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
  }

  app.get('/health', (_req, res) => {
    const mongo = mongoose.connection.readyState === 1;
    res.status(mongo ? 200 : 503).json({
      ok: mongo,
      service: serviceLabel(service),
      mongo,
      env: process.env.NODE_ENV || 'development',
    });
  });

  mountApi(app, service);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}

module.exports = { createApp, resolveService, includes, serviceLabel };
