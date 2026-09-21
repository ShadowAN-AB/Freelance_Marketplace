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

  it('returns public marketplace stats', async () => {
    const stats = await request(app).get('/api/stats').expect(200);
    assert.equal(typeof stats.body.openProjects, 'number');
    assert.equal(typeof stats.body.freelancers, 'number');
    assert.equal(typeof stats.body.completedContracts, 'number');
    assert.equal(typeof stats.body.escrowHeld, 'number');
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

  it('releases milestone amounts incrementally', async () => {
    const client = await register('client', 'ms-client@test.dev');
    const freelancer = await register('freelancer', 'ms-free@test.dev');
    const project = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${client.body.token}`)
      .send({
        title: 'Two-slice brand website',
        description: 'A brochure site with discovery and a build slice that must ship together.',
        category: 'Web Development',
        skills: ['react'],
        budgetMin: 10000,
        budgetMax: 20000,
        deadline: new Date(Date.now() + 20 * 86400000).toISOString(),
        pricingType: 'fixed',
        milestones: [
          { title: 'Discovery', amount: 8000 },
          { title: 'Build', amount: 12000 },
        ],
      })
      .expect(201);
    const proposal = await request(app)
      .post(`/api/projects/${project.body.project._id}/proposals`)
      .set('Authorization', `Bearer ${freelancer.body.token}`)
      .send({
        coverLetter: 'I can deliver this in two clear slices with weekly check-ins.',
        bidAmount: 20000,
        estimatedDays: 16,
      })
      .expect(201);
    const hired = await request(app)
      .post(`/api/proposals/${proposal.body.proposal._id}/accept`)
      .set('Authorization', `Bearer ${client.body.token}`)
      .expect(200);
    assert.equal(hired.body.contract.milestones.length, 2);
    const contractId = hired.body.contract._id;
    const first = hired.body.contract.milestones[0];
    await request(app)
      .post(`/api/contracts/${contractId}/milestones/${first._id}/submit-work`)
      .set('Authorization', `Bearer ${freelancer.body.token}`)
      .expect(200);
    const released = await request(app)
      .post(`/api/contracts/${contractId}/milestones/${first._id}/release`)
      .set('Authorization', `Bearer ${client.body.token}`)
      .expect(200);
    assert.equal(released.body.payment.releasedAmount, 8000);
    assert.equal(released.body.payment.status, 'held');
  });

  it('approves hourly time against the escrow cap', async () => {
    const client = await register('client', 'hr-client@test.dev');
    const freelancer = await register('freelancer', 'hr-free@test.dev');
    await request(app)
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${freelancer.body.token}`)
      .send({ freelancerProfile: { hourlyRate: 1000, title: 'Engineer', skills: ['node.js'] } })
      .expect(200);
    const project = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${client.body.token}`)
      .send({
        title: 'Hourly API pairing sprint',
        description: 'Need pairing on a Node API for one week with a hard escrow cap.',
        category: 'Web Development',
        skills: ['node.js'],
        budgetMin: 2000,
        budgetMax: 5000,
        deadline: new Date(Date.now() + 10 * 86400000).toISOString(),
        pricingType: 'hourly',
      })
      .expect(201);
    const proposal = await request(app)
      .post(`/api/projects/${project.body.project._id}/proposals`)
      .set('Authorization', `Bearer ${freelancer.body.token}`)
      .send({
        coverLetter: 'I pair well on Node APIs and can start immediately this sprint.',
        bidAmount: 5000,
        estimatedDays: 5,
      })
      .expect(201);
    const hired = await request(app)
      .post(`/api/proposals/${proposal.body.proposal._id}/accept`)
      .set('Authorization', `Bearer ${client.body.token}`)
      .expect(200);
    assert.equal(hired.body.contract.pricingType, 'hourly');
    assert.equal(hired.body.payment.amount, 5000);
    const contractId = hired.body.contract._id;
    const logged = await request(app)
      .post(`/api/contracts/${contractId}/time-entries`)
      .set('Authorization', `Bearer ${freelancer.body.token}`)
      .send({ hours: 2, note: 'API pairing', date: new Date().toISOString() })
      .expect(201);
    const entry = logged.body.contract.timeEntries[0];
    const approved = await request(app)
      .post(`/api/contracts/${contractId}/time-entries/${entry._id}/approve`)
      .set('Authorization', `Bearer ${client.body.token}`)
      .expect(200);
    const pay = await request(app)
      .get(`/api/contracts/${contractId}`)
      .set('Authorization', `Bearer ${client.body.token}`)
      .expect(200);
    assert.equal(pay.body.payment.releasedAmount, 2000);
    assert.equal(approved.body.contract.timeEntries[0].status, 'approved');
  });

  it('accepts a chat attachment over HTTP', async () => {
    const client = await register('client', 'chat-client@test.dev');
    const freelancer = await register('freelancer', 'chat-free@test.dev');
    const project = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${client.body.token}`)
      .send({
        title: 'Chat file handshake project',
        description: 'A small project used only to open a conversation for attachment tests.',
        category: 'Writing',
        skills: ['writing'],
        budgetMin: 4000,
        budgetMax: 6000,
        deadline: new Date(Date.now() + 12 * 86400000).toISOString(),
      })
      .expect(201);
    const proposal = await request(app)
      .post(`/api/projects/${project.body.project._id}/proposals`)
      .set('Authorization', `Bearer ${freelancer.body.token}`)
      .send({
        coverLetter: 'Happy to share a sample document in chat after we connect.',
        bidAmount: 5000,
        estimatedDays: 6,
      })
      .expect(201);
    await request(app)
      .post(`/api/proposals/${proposal.body.proposal._id}/accept`)
      .set('Authorization', `Bearer ${client.body.token}`)
      .expect(200);
    const conv = await request(app)
      .get('/api/conversations')
      .set('Authorization', `Bearer ${client.body.token}`)
      .expect(200);
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64'
    );
    const sent = await request(app)
      .post(`/api/conversations/${conv.body.data[0]._id}/messages`)
      .set('Authorization', `Bearer ${client.body.token}`)
      .attach('file', png, { filename: 'dot.png', contentType: 'image/png' })
      .expect(201);
    assert.ok(sent.body.message.attachment.url);
    assert.equal(sent.body.message.attachment.originalName, 'dot.png');
  });

  it('skips CSRF when a Bearer token is present', async () => {
    const client = await register('client', 'csrf-client@test.dev');
    await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${client.body.token}`)
      .send({
        title: 'Bearer skip CSRF project',
        description: 'This listing is created with a Bearer token and no CSRF header.',
        category: 'Data',
        skills: ['sql'],
        budgetMin: 3000,
        budgetMax: 7000,
        deadline: new Date(Date.now() + 9 * 86400000).toISOString(),
      })
      .expect(201);

    const agent = request.agent(app);
    const cookieUser = await agent
      .post('/api/auth/register')
      .send({ name: 'Cookie Client', email: 'csrf-cookie@test.dev', password: 'Password123!', role: 'client' })
      .expect(201);
    const setCookie = cookieUser.headers['set-cookie'] || [];
    const csrfRow = setCookie.find((c) => c.startsWith('fh_csrf='));
    const csrf = csrfRow ? csrfRow.split(';')[0].split('=')[1] : '';
    await agent
      .post('/api/projects')
      .send({
        title: 'Missing CSRF project name',
        description: 'Cookie-only mutating requests must send a matching CSRF header.',
        category: 'Data',
        skills: ['sql'],
        budgetMin: 3000,
        budgetMax: 7000,
        deadline: new Date(Date.now() + 9 * 86400000).toISOString(),
      })
      .expect(403);
    await agent
      .post('/api/projects')
      .set('X-CSRF-Token', csrf)
      .send({
        title: 'Valid CSRF cookie project',
        description: 'Cookie-only mutating requests succeed when the CSRF header matches.',
        category: 'Data',
        skills: ['sql'],
        budgetMin: 3000,
        budgetMax: 7000,
        deadline: new Date(Date.now() + 9 * 86400000).toISOString(),
      })
      .expect(201);
  });

  it('forbids invite-to-bid from a non-owner', async () => {
    const client = await register('client', 'inv-client@test.dev');
    const other = await register('client', 'inv-other@test.dev');
    const freelancer = await register('freelancer', 'inv-free@test.dev');
    const project = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${client.body.token}`)
      .send({
        title: 'Invite only research brief',
        description: 'A research brief that should only accept invites from its owner.',
        category: 'Writing',
        skills: ['research'],
        budgetMin: 4000,
        budgetMax: 8000,
        deadline: new Date(Date.now() + 11 * 86400000).toISOString(),
      })
      .expect(201);
    await request(app)
      .post(`/api/projects/${project.body.project._id}/invites`)
      .set('Authorization', `Bearer ${other.body.token}`)
      .send({ freelancerId: freelancer.body.user._id })
      .expect(403);
    await request(app)
      .post(`/api/projects/${project.body.project._id}/invites`)
      .set('Authorization', `Bearer ${client.body.token}`)
      .send({ freelancerId: freelancer.body.user._id })
      .expect(201);
  });

  it('filters open projects by pricing type', async () => {
    const client = await register('client', 'price-client@test.dev');
    const base = {
      description: 'Need a React dashboard with auth, charts, and a Node API.',
      category: 'Web Development',
      skills: ['react'],
      budgetMin: 10000,
      budgetMax: 20000,
      deadline: new Date(Date.now() + 14 * 86400000).toISOString(),
    };
    await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${client.body.token}`)
      .send({ ...base, title: 'Fixed price listing for filter', pricingType: 'fixed' })
      .expect(201);
    await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${client.body.token}`)
      .send({ ...base, title: 'Hourly pairing listing for filter', pricingType: 'hourly' })
      .expect(201);
    const hourly = await request(app).get('/api/projects').query({ pricingType: 'hourly', status: 'open' }).expect(200);
    assert.equal(hourly.body.data.length, 1);
    assert.ok(hourly.body.data.every((p) => p.pricingType === 'hourly'));
    const fixed = await request(app).get('/api/projects').query({ pricingType: 'fixed', status: 'open' }).expect(200);
    assert.equal(fixed.body.data.length, 1);
    assert.ok(fixed.body.data.every((p) => p.pricingType === 'fixed'));
  });

  it('sorts open projects by max budget', async () => {
    const client = await register('client', 'sort-client@test.dev');
    const base = {
      description: 'Need a React dashboard with auth, charts, and a Node API.',
      category: 'Web Development',
      skills: ['react'],
      budgetMin: 5000,
      deadline: new Date(Date.now() + 14 * 86400000).toISOString(),
    };
    await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${client.body.token}`)
      .send({ ...base, title: 'Small budget listing for sort', budgetMax: 12000 })
      .expect(201);
    await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${client.body.token}`)
      .send({ ...base, title: 'Large budget listing for sort', budgetMax: 48000 })
      .expect(201);
    const ranked = await request(app).get('/api/projects').query({ sort: 'budget', status: 'open' }).expect(200);
    assert.equal(ranked.body.data[0].budgetMax, 48000);
    assert.equal(ranked.body.data[1].budgetMax, 12000);
  });

  it('counts pending proposals and returns similar open projects', async () => {
    const client = await register('client', 'count-client@test.dev');
    const other = await register('client', 'count-other@test.dev');
    const freelancer = await register('freelancer', 'count-free@test.dev');
    const base = {
      description: 'Need a React dashboard with auth, charts, and a Node API.',
      category: 'Web Development',
      skills: ['react', 'node.js'],
      budgetMin: 10000,
      budgetMax: 20000,
      deadline: new Date(Date.now() + 14 * 86400000).toISOString(),
    };
    const project = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${client.body.token}`)
      .send({ ...base, title: 'Count bids on this dashboard' })
      .expect(201);
    const similar = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${other.body.token}`)
      .send({ ...base, title: 'Nearby React ops desk listing' })
      .expect(201);
    await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${other.body.token}`)
      .send({
        ...base,
        title: 'Write a product case study pack',
        category: 'Writing',
        skills: ['copywriting'],
      })
      .expect(201);
    await request(app)
      .post(`/api/projects/${project.body.project._id}/proposals`)
      .set('Authorization', `Bearer ${freelancer.body.token}`)
      .send({
        coverLetter: 'I have shipped similar ops dashboards and can start this week.',
        bidAmount: 15000,
        estimatedDays: 12,
      })
      .expect(201);

    const mine = await request(app)
      .get('/api/projects')
      .query({ mine: 'true' })
      .set('Authorization', `Bearer ${client.body.token}`)
      .expect(200);
    assert.equal(mine.body.data[0].proposalCount, 1);

    const nearby = await request(app).get(`/api/projects/${project.body.project._id}/similar`).expect(200);
    assert.ok(nearby.body.data.some((p) => p._id === similar.body.project._id));
    assert.ok(nearby.body.data.every((p) => p.title !== 'Write a product case study pack'));
  });

  it('exports an empty payment ledger as csv', async () => {
    const client = await register('client', 'csv-client@test.dev');
    const csv = await request(app)
      .get('/api/payments/me.csv')
      .set('Authorization', `Bearer ${client.body.token}`)
      .expect(200);
    assert.match(csv.headers['content-type'], /text\/csv/);
    assert.match(csv.text, /title,status,amount,released,held/);
  });

  it('duplicates an owned project as a fresh open listing', async () => {
    const client = await register('client', 'dup-client@test.dev');
    const other = await register('client', 'dup-other@test.dev');
    const created = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${client.body.token}`)
      .send({
        title: 'Brand site for a cafe group',
        description: 'Need a React brochure site with a menu, locations, and a booking form.',
        category: 'Web Development',
        skills: ['react'],
        budgetMin: 10000,
        budgetMax: 20000,
        deadline: new Date(Date.now() + 14 * 86400000).toISOString(),
      })
      .expect(201);
    await request(app)
      .post(`/api/projects/${created.body.project._id}/duplicate`)
      .set('Authorization', `Bearer ${other.body.token}`)
      .expect(403);
    const copy = await request(app)
      .post(`/api/projects/${created.body.project._id}/duplicate`)
      .set('Authorization', `Bearer ${client.body.token}`)
      .expect(201);
    assert.match(copy.body.project.title, /^Copy of /);
    assert.equal(copy.body.project.status, 'open');
    assert.notEqual(copy.body.project._id, created.body.project._id);
  });
});
