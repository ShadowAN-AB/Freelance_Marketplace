const mongoose = require('mongoose');

const CATEGORIES = [
  'Web Development',
  'Mobile',
  'UI/UX',
  'Data',
  'Writing',
  'Marketing',
  'Other',
];

const STATUSES = ['open', 'in_progress', 'completed', 'cancelled', 'closed'];

const projectSchema = new mongoose.Schema(
  {
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 140 },
    description: { type: String, required: true, maxlength: 8000 },
    category: { type: String, enum: CATEGORIES, required: true, index: true },
    skills: [{ type: String, trim: true }],
    budgetMin: { type: Number, required: true, min: 0 },
    budgetMax: { type: Number, required: true, min: 0 },
    deadline: { type: Date, required: true },
    status: { type: String, enum: STATUSES, default: 'open', index: true },
    hiredProposalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Proposal' },
    hiredFreelancerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

projectSchema.index({ title: 'text', description: 'text' });
projectSchema.index({ createdAt: -1 });
projectSchema.statics.CATEGORIES = CATEGORIES;

module.exports = mongoose.models.Project || mongoose.model('Project', projectSchema);
