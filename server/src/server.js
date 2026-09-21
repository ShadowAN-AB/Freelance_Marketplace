const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const http = require('http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { connectDb } = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const authRoutes = require('./routes/auth');

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

app.use(notFound);
app.use(errorHandler);

async function start() {
  await connectDb();
  const server = http.createServer(app);
  server.listen(PORT, () => {
    console.log(`FreelanceHub API listening on ${PORT}`);
  });
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});

module.exports = { app };
