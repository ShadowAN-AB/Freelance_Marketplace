const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const http = require('http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { connectDb } = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const { attachSocket } = require('./services/socket');
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

const app = express();
const PORT = process.env.PORT || 5000;

app.disable('x-powered-by');
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  })
);
app.use(express.json({ limit: '1mb' }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'freelancehub-api' });
});

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

async function start() {
  await connectDb();
  const server = http.createServer(app);
  attachSocket(server, app);
  server.listen(PORT, () => {
    console.log(`FreelanceHub API listening on ${PORT}`);
  });
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});

module.exports = { app };
