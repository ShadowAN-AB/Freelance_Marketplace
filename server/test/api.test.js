process.env.NODE_ENV = 'test';
process.env.CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5178';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-please-use-32-chars';
process.env.MONGO_URI = process.env.MONGO_URI_TEST || 'mongodb://127.0.0.1:27017/freelancehub_test';
process.env.LOG_LEVEL = 'silent';
process.env.SKIP_EMAIL_VERIFY = 'true';

const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const request = require('supertest');
const { connectDb } = require('../src/config/db');
const { createApp } = require('../src/server');

let app;

async function register(role, email) {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ name: email.split('@')[0], email, password: 'Password123!', role })
    .expect(201);
  return res;
}

describe('FreelanceHub API', () => {
  before(async () => {
    await connectDb();
    app = createApp();
  });

  beforeEach(async () => {
    await mongoose.connection.db.dropDatabase();
  });

  after(async () => {
    await mongoose.disconnect();
  });

  it('registers and logs in', async () => {
    const created = await register('client', 'priya@test.dev');
    assert.ok(created.body.token);
    assert.equal(created.body.user.role, 'client');
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'priya@test.dev', password: 'Password123!' })
      .expect(200);
    assert.ok(login.body.token);
  });

  it('enforces one proposal per project and allows rebid after withdraw', async () => {
    const client = await register('client', 'client@test.dev');
    const freelancer = await register('freelancer', 'free@test.dev');
    const project = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${client.body.token}`)
      .send({
        title: 'Build a dashboard app',
        description: 'Need a React dashboard with auth, charts, and a Node API.',
        category: 'Web Development',
        skills: ['react', 'node.js'],
        budgetMin: 10000,
        budgetMax: 20000,
        deadline: new Date(Date.now() + 14 * 86400000).toISOString(),
      })
      .expect(201);

    const body = {
      coverLetter: 'I have shipped similar ops dashboards and can start this week.',
      bidAmount: 15000,
      estimatedDays: 12,
    };
    const first = await request(app)
      .post(`/api/projects/${project.body.project._id}/proposals`)
      .set('Authorization', `Bearer ${freelancer.body.token}`)
      .send(body)
      .expect(201);
    await request(app)
      .post(`/api/projects/${project.body.project._id}/proposals`)
      .set('Authorization', `Bearer ${freelancer.body.token}`)
      .send(body)
      .expect(409);

    await request(app)
      .post(`/api/proposals/${first.body.proposal._id}/withdraw`)
      .set('Authorization', `Bearer ${freelancer.body.token}`)
      .expect(200);

    const rebid = await request(app)
      .post(`/api/projects/${project.body.project._id}/proposals`)
      .set('Authorization', `Bearer ${freelancer.body.token}`)
      .send({ ...body, bidAmount: 14000 })
      .expect(201);
    assert.equal(rebid.body.proposal.status, 'pending');
    assert.equal(rebid.body.proposal.bidAmount, 14000);
  });

  it('hire loop: accept creates contract+held payment, revision clears submission, complete releases', async () => {
    const client = await register('client', 'hire-client@test.dev');
    const freelancer = await register('freelancer', 'hire-free@test.dev');
    const outsider = await register('freelancer', 'outsider@test.dev');
    const project = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${client.body.token}`)
      .send({
        title: 'Mobile inventory companion app',
        description: 'A small companion app that syncs inventory counts with our Node API.',
        category: 'Mobile',
        skills: ['react native'],
        budgetMin: 20000,
        budgetMax: 40000,
        deadline: new Date(Date.now() + 21 * 86400000).toISOString(),
      })
      .expect(201);

    const proposal = await request(app)
      .post(`/api/projects/${project.body.project._id}/proposals`)
      .set('Authorization', `Bearer ${freelancer.body.token}`)
      .send({
        coverLetter: 'I have shipped similar inventory tools for warehouses.',
        bidAmount: 25000,
        estimatedDays: 18,
      })
      .expect(201);

    const hired = await request(app)
      .post(`/api/proposals/${proposal.body.proposal._id}/accept`)
      .set('Authorization', `Bearer ${client.body.token}`)
      .expect(200);
    assert.equal(hired.body.contract.status, 'active');
    assert.equal(hired.body.payment.status, 'held');

    const contractId = hired.body.contract._id;
    await request(app)
      .post(`/api/contracts/${contractId}/complete`)
      .set('Authorization', `Bearer ${client.body.token}`)
      .expect(400);

    await request(app)
      .post(`/api/contracts/${contractId}/submit-work`)
      .set('Authorization', `Bearer ${freelancer.body.token}`)
      .expect(200);

    const revised = await request(app)
      .post(`/api/contracts/${contractId}/request-revision`)
      .set('Authorization', `Bearer ${client.body.token}`)
      .send({ note: 'Please add CSV export on the counts screen.' })
      .expect(200);
    assert.equal(revised.body.contract.workSubmittedAt, null);

    await request(app)
      .post(`/api/contracts/${contractId}/submit-work`)
      .set('Authorization', `Bearer ${freelancer.body.token}`)
      .expect(200);

    const done = await request(app)
      .post(`/api/contracts/${contractId}/complete`)
      .set('Authorization', `Bearer ${client.body.token}`)
      .expect(200);
    assert.equal(done.body.contract.status, 'completed');

    const pay = await request(app)
      .get('/api/payments/me')
      .set('Authorization', `Bearer ${freelancer.body.token}`)
      .expect(200);
    assert.equal(pay.body.data[0].status, 'released');

    const conv = await request(app)
      .get('/api/conversations')
      .set('Authorization', `Bearer ${freelancer.body.token}`)
      .expect(200);
    assert.ok(conv.body.data.length >= 1);
    const conversationId = conv.body.data[0]._id;
    await request(app)
      .post(`/api/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${outsider.body.token}`)
      .send({ text: 'hello from a stranger' })
      .expect(403);

    const page = await request(app)
      .get('/api/contracts/me')
      .query({ page: 1, limit: 1 })
      .set('Authorization', `Bearer ${client.body.token}`)
      .expect(200);
    assert.equal(page.body.page, 1);
    assert.ok(page.body.pages >= 1);
  });

  it('cancels an active contract and refunds escrow', async () => {
    const client = await register('client', 'cancel-client@test.dev');
    const freelancer = await register('freelancer', 'cancel-free@test.dev');
    const project = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${client.body.token}`)
      .send({
        title: 'Landing page refresh project',
        description: 'Marketing landing page with a simple CMS and analytics events.',
        category: 'UI/UX',
        skills: ['figma'],
        budgetMin: 8000,
        budgetMax: 12000,
        deadline: new Date(Date.now() + 10 * 86400000).toISOString(),
      })
      .expect(201);
    const proposal = await request(app)
      .post(`/api/projects/${project.body.project._id}/proposals`)
      .set('Authorization', `Bearer ${freelancer.body.token}`)
      .send({
        coverLetter: 'I can redesign this landing page with a clear visual system.',
        bidAmount: 9000,
        estimatedDays: 8,
      })
      .expect(201);
    const hired = await request(app)
      .post(`/api/proposals/${proposal.body.proposal._id}/accept`)
      .set('Authorization', `Bearer ${client.body.token}`)
      .expect(200);

    const cancelled = await request(app)
      .post(`/api/contracts/${hired.body.contract._id}/cancel`)
      .set('Authorization', `Bearer ${client.body.token}`)
      .send({ reason: 'Scope changed and we no longer need this work.' })
      .expect(200);
    assert.equal(cancelled.body.contract.status, 'cancelled');

    const pay = await request(app)
      .get('/api/payments/me')
      .set('Authorization', `Bearer ${client.body.token}`)
      .expect(200);
    assert.equal(pay.body.data[0].status, 'refunded');
  });

  it('returns myProposal on project details for the bidding freelancer', async () => {
    const client = await register('client', 'detail-client@test.dev');
    const freelancer = await register('freelancer', 'detail-free@test.dev');
    const project = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${client.body.token}`)
      .send({
        title: 'SEO article pack for a blog',
        description: 'Ten long-form articles with briefs, outlines, and two rounds of edits.',
        category: 'Writing',
        skills: ['writing'],
        budgetMin: 5000,
        budgetMax: 9000,
        deadline: new Date(Date.now() + 20 * 86400000).toISOString(),
      })
      .expect(201);
    await request(app)
      .post(`/api/projects/${project.body.project._id}/proposals`)
      .set('Authorization', `Bearer ${freelancer.body.token}`)
      .send({
        coverLetter: 'I write B2B articles that rank and stay on-brief.',
        bidAmount: 7000,
        estimatedDays: 10,
      })
      .expect(201);
    const details = await request(app)
      .get(`/api/projects/${project.body.project._id}`)
      .set('Authorization', `Bearer ${freelancer.body.token}`)
      .expect(200);
    assert.ok(details.body.myProposal);
    assert.equal(details.body.myProposal.status, 'pending');
  });
});
