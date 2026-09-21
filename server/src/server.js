const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const http = require('http');
const { connectDb } = require('./config/db');
const { attachSocket } = require('./infra/socket');
const { logger } = require('./infra/logger');
const { clientUrl, requireEnv, isProd } = require('./config/env');
const { ensureUploadDir } = require('./infra/storage');
const { createApp, resolveService, includes } = require('./app');

async function start() {
  requireEnv('CLIENT_URL');
  requireEnv('JWT_SECRET');
  requireEnv('MONGO_URI');
  if (isProd() && process.env.JWT_SECRET === 'freelancehub-dev-secret-change-me-please-32chars') {
    throw new Error('Set a unique JWT_SECRET before running in production');
  }
  const service = resolveService();
  if (includes(service, 'marketplace') || includes(service, 'realtime')) {
    ensureUploadDir();
  }
  await connectDb();
  const app = createApp({ service });
  const httpServer = http.createServer(app);
  if (includes(service, 'realtime')) {
    attachSocket(httpServer, app);
  }
  const PORT = process.env.PORT || 5000;
  await new Promise((resolve) => httpServer.listen(PORT, resolve));
  logger.info({ port: PORT, service, client: clientUrl() }, 'FreelanceHub API listening');
  return httpServer;
}

if (require.main === module) {
  start().catch((err) => {
    logger.error({ err: err.message }, 'failed to start');
    process.exit(1);
  });
}

module.exports = { createApp, start, resolveService };
