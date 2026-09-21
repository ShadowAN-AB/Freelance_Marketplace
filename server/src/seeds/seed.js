const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const { connectDb } = require('../config/db');
const User = require('../models/User');
const Project = require('../models/Project');
const Proposal = require('../models/Proposal');
const Contract = require('../models/Contract');
const Payment = require('../models/Payment');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Review = require('../models/Review');
const Notification = require('../models/Notification');
const Report = require('../models/Report');

const PASSWORD = 'Password123!';

async function reset() {
  await Promise.all([
    User.deleteMany({}),
    Project.deleteMany({}),
    Proposal.deleteMany({}),
    Contract.deleteMany({}),
    Payment.deleteMany({}),
    Conversation.deleteMany({}),
    Message.deleteMany({}),
    Review.deleteMany({}),
    Notification.deleteMany({}),
    Report.deleteMany({}),
  ]);
}

async function seed() {
  await connectDb();
  await reset();
  const password = await bcrypt.hash(PASSWORD, 12);

  const [admin, priya, arjun, aisha, kabir, meera, leo] = await User.create([
    {
      name: 'Platform Admin',
      email: 'admin@freelancehub.dev',
      password,
      role: 'admin',
      bio: 'Keeps the marketplace honest.',
      location: 'Bengaluru',
    },
    {
      name: 'Priya Sharma',
      email: 'priya@freelancehub.dev',
      password,
      role: 'client',
      bio: 'Ops lead at a logistics startup. Hires for product and brand work.',
      location: 'Mumbai',
      clientProfile: { companyName: 'Northline Logistics' },
    },
    {
      name: 'Arjun Mehta',
      email: 'arjun@freelancehub.dev',
      password,
      role: 'client',
      bio: 'Founder building a quiet content studio.',
      location: 'Bengaluru',
      clientProfile: { companyName: 'Mehta Media' },
    },
    {
      name: 'Aisha Khan',
      email: 'aisha@freelancehub.dev',
      password,
      role: 'freelancer',
      bio: 'Full-stack engineer. React, Node, and calm production deploys.',
      location: 'Hyderabad',
      freelancerProfile: {
        title: 'Full-stack engineer',
        skills: ['react', 'node.js', 'mongodb', 'express', 'javascript'],
        hourlyRate: 1800,
        availability: 'available',
        portfolio: [
          { title: 'Fleet dashboard', url: 'https://example.com', imageUrl: '' },
          { title: 'Checkout API', url: 'https://example.com', imageUrl: '' },
        ],
      },
      avgRating: 4.9,
      reviewCount: 1,
    },
    {
      name: 'Kabir Rao',
      email: 'kabir@freelancehub.dev',
      password,
      role: 'freelancer',
      bio: 'Product designer who ships Figma files that developers actually enjoy.',
      location: 'Pune',
      freelancerProfile: {
        title: 'Product designer',
        skills: ['ui/ux', 'figma', 'prototyping', 'design systems'],
        hourlyRate: 1600,
        availability: 'available',
        portfolio: [{ title: 'Banking app redesign', url: 'https://example.com', imageUrl: '' }],
      },
    },
    {
      name: 'Meera Iyer',
      email: 'meera@freelancehub.dev',
      password,
      role: 'freelancer',
      bio: 'Python + ML for messy operational data.',
      location: 'Chennai',
      freelancerProfile: {
        title: 'ML engineer',
        skills: ['python', 'machine learning', 'pandas', 'data'],
        hourlyRate: 2200,
        availability: 'busy',
        portfolio: [{ title: 'Demand forecast model', url: 'https://example.com', imageUrl: '' }],
      },
    },
    {
      name: 'Leo Fernandes',
      email: 'leo@freelancehub.dev',
      password,
      role: 'freelancer',
      bio: 'Writer for B2B products. Clear, specific, no fluff.',
      location: 'Goa',
      freelancerProfile: {
        title: 'Content strategist',
        skills: ['writing', 'seo', 'content strategy', 'editing'],
        hourlyRate: 900,
        availability: 'available',
        portfolio: [{ title: 'SaaS blog engine', url: 'https://example.com', imageUrl: '' }],
      },
      avgRating: 5,
      reviewCount: 1,
    },
  ]);

  const deadline = (days) => new Date(Date.now() + days * 86400000);

  const [dash, landing, inventory, seo] = await Project.create([
    {
      clientId: priya._id,
      title: 'React dashboard for logistics ops',
      description:
        'We need a React dashboard that shows live truck status, delayed shipments, and a simple exception queue. Node API already exists. Prefer someone who has shipped ops tools, not marketing sites.',
      category: 'Web Development',
      skills: ['react', 'node.js', 'mongodb'],
      budgetMin: 40000,
      budgetMax: 70000,
      deadline: deadline(28),
      status: 'open',
    },
    {
      clientId: priya._id,
      title: 'Brand landing page for Northline',
      description:
        'A sharp one-page site for a Series A logistics company. Strong typography, restrained motion, and a hiring desk feel rather than generic SaaS purple.',
      category: 'UI/UX',
      skills: ['ui/ux', 'figma', 'prototyping'],
      budgetMin: 25000,
      budgetMax: 40000,
      deadline: deadline(18),
      status: 'open',
    },
    {
      clientId: priya._id,
      title: 'Mobile inventory companion app',
      description:
        'React Native (or well-justified Flutter) app for warehouse staff: scan SKUs, mark exceptions, sync when back online. Hired and in progress.',
      category: 'Mobile',
      skills: ['react', 'javascript', 'node.js'],
      budgetMin: 80000,
      budgetMax: 120000,
      deadline: deadline(45),
      status: 'in_progress',
    },
    {
      clientId: arjun._id,
      title: 'SEO blog series for a design studio',
      description:
        'Eight long-form articles on hiring independent designers in India. Research, outlines, drafts, and meta. Completed.',
      category: 'Writing',
      skills: ['writing', 'seo', 'content strategy'],
      budgetMin: 18000,
      budgetMax: 24000,
      deadline: deadline(-10),
      status: 'completed',
    },
  ]);

  const pDashAisha = await Proposal.create({
    projectId: dash._id,
    freelancerId: aisha._id,
    coverLetter:
      'I shipped a similar exception queue for a 3PL last year. I would start with the delayed-shipment table and a websocket status strip, then layer filters.',
    bidAmount: 58000,
    estimatedDays: 21,
    status: 'pending',
  });
  await Proposal.create({
    projectId: dash._id,
    freelancerId: meera._id,
    coverLetter: 'I can add a small prediction model for delay risk on top of the dashboard if useful.',
    bidAmount: 64000,
    estimatedDays: 24,
    status: 'pending',
  });
  await Proposal.create({
    projectId: landing._id,
    freelancerId: kabir._id,
    coverLetter: 'I would treat this as an editorial landing page: paper background, ink type, one teal accent. Two design directions in week one.',
    bidAmount: 32000,
    estimatedDays: 14,
    status: 'pending',
  });

  const inventoryProposal = await Proposal.create({
    projectId: inventory._id,
    freelancerId: aisha._id,
    coverLetter: 'I can deliver an offline-first scan flow with a simple Node sync endpoint.',
    bidAmount: 96000,
    estimatedDays: 40,
    status: 'accepted',
  });
  const seoProposal = await Proposal.create({
    projectId: seo._id,
    freelancerId: leo._id,
    coverLetter: 'Eight articles, one voice, no keyword stuffing. Drafts weekly.',
    bidAmount: 20000,
    estimatedDays: 21,
    status: 'accepted',
  });

  inventory.hiredProposalId = inventoryProposal._id;
  inventory.hiredFreelancerId = aisha._id;
  await inventory.save();
  seo.hiredProposalId = seoProposal._id;
  seo.hiredFreelancerId = leo._id;
  await seo.save();

  const inventoryContract = await Contract.create({
    projectId: inventory._id,
    clientId: priya._id,
    freelancerId: aisha._id,
    proposalId: inventoryProposal._id,
    amount: 96000,
    status: 'active',
    startDate: new Date(Date.now() - 12 * 86400000),
  });
  const seoContract = await Contract.create({
    projectId: seo._id,
    clientId: arjun._id,
    freelancerId: leo._id,
    proposalId: seoProposal._id,
    amount: 20000,
    status: 'completed',
    startDate: new Date(Date.now() - 40 * 86400000),
    workSubmittedAt: new Date(Date.now() - 12 * 86400000),
    completedAt: new Date(Date.now() - 8 * 86400000),
  });

  await Payment.create([
    {
      contractId: inventoryContract._id,
      clientId: priya._id,
      freelancerId: aisha._id,
      amount: 96000,
      status: 'held',
    },
    {
      contractId: seoContract._id,
      clientId: arjun._id,
      freelancerId: leo._id,
      amount: 20000,
      status: 'released',
      releasedAt: new Date(Date.now() - 8 * 86400000),
    },
  ]);

  const invKey = Conversation.participantKey([priya._id, aisha._id]);
  const seoKey = Conversation.participantKey([arjun._id, leo._id]);
  const invChat = await Conversation.create({
    participants: [priya._id, aisha._id],
    participantKey: invKey,
    projectId: inventory._id,
    lastMessageAt: new Date(),
    lastMessagePreview: 'Scanning flow is in review.',
  });
  const seoChat = await Conversation.create({
    participants: [arjun._id, leo._id],
    participantKey: seoKey,
    projectId: seo._id,
    lastMessageAt: new Date(Date.now() - 8 * 86400000),
    lastMessagePreview: 'Payment released. Thank you.',
  });

  const invMessages = [
    [priya, 'Kickoff notes are in the brief. Warehouse wifi is unreliable, so offline matters.'],
    [aisha, 'Understood. I will queue scans locally and flush when the device is back online.'],
    [priya, 'Can supervisors see exception photos?'],
    [aisha, 'Yes — thumbnail in the queue, full image on tap. Compressing on device first.'],
    [aisha, 'Scanning flow is in review.'],
    [priya, 'Looks good. Flag low-confidence barcodes in amber, not red.'],
    [aisha, 'Done. I will submit a build tomorrow.'],
    [priya, 'Perfect. Thanks Aisha.'],
  ];
  let t = Date.now() - 6 * 86400000;
  for (const [sender, text] of invMessages) {
    await Message.create({
      conversationId: invChat._id,
      senderId: sender._id,
      text,
      readBy: [priya._id, aisha._id],
      createdAt: new Date(t),
    });
    t += 8 * 3600000;
  }

  await Message.create({
    conversationId: seoChat._id,
    senderId: arjun._id,
    text: 'Payment released. Thank you.',
    readBy: [arjun._id, leo._id],
  });

  await Review.create([
    {
      contractId: seoContract._id,
      projectId: seo._id,
      reviewerId: arjun._id,
      revieweeId: leo._id,
      rating: 5,
      comment: 'On time, specific, and the articles actually ranked. Would hire again.',
    },
    {
      contractId: seoContract._id,
      projectId: seo._id,
      reviewerId: leo._id,
      revieweeId: arjun._id,
      rating: 5,
      comment: 'Clear brief, fast feedback, paid on completion. Ideal client.',
    },
  ]);

  await Notification.create([
    {
      userId: priya._id,
      type: 'proposal_received',
      title: 'New proposal',
      body: 'Aisha Khan proposed ₹58,000 on React dashboard for logistics ops',
      link: `/app/projects/${dash._id}/proposals`,
    },
    {
      userId: aisha._id,
      type: 'proposal_accepted',
      title: 'Proposal accepted',
      body: 'You were hired for Mobile inventory companion app',
      link: '/app/work',
    },
  ]);

  await Report.create({
    reporterId: kabir._id,
    targetType: 'project',
    targetId: dash._id,
    reason: 'Unclear scope',
    details: 'Budget range is wide and API access is not documented.',
    status: 'open',
  });

  console.log('Seeded FreelanceHub demo data.');
  console.log('Password for all accounts: Password123!');
  console.log('Admin  admin@freelancehub.dev');
  console.log('Client priya@freelancehub.dev  arjun@freelancehub.dev');
  console.log('Talent aisha@freelancehub.dev  kabir@freelancehub.dev  meera@freelancehub.dev  leo@freelancehub.dev');
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
