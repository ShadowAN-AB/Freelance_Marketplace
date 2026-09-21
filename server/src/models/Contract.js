const mongoose = require('mongoose');

const deliverableSchema = new mongoose.Schema(
  {
    originalName: { type: String, required: true, maxlength: 240 },
    url: { type: String, required: true, maxlength: 400 },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const milestoneSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    amount: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ['pending', 'submitted', 'released'], default: 'pending' },
    workSubmittedAt: { type: Date },
    releasedAt: { type: Date },
    revisionNote: { type: String, default: '', maxlength: 2000 },
    deliverables: [deliverableSchema],
  },
  { _id: true }
);

const timeEntrySchema = new mongoose.Schema(
  {
    hours: { type: Number, required: true, min: 0.25, max: 24 },
    note: { type: String, default: '', maxlength: 1000 },
    date: { type: Date, required: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    reviewedAt: { type: Date },
  },
  { _id: true, timestamps: true }
);

const contractSchema = new mongoose.Schema(
  {
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, unique: true },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    freelancerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    proposalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Proposal', required: true },
    amount: { type: Number, required: true, min: 0 },
    pricingType: { type: String, enum: ['fixed', 'hourly'], default: 'fixed' },
    hourlyRate: { type: Number, default: 0, min: 0 },
    milestones: [milestoneSchema],
    timeEntries: [timeEntrySchema],
    status: { type: String, enum: ['active', 'completed', 'cancelled'], default: 'active', index: true },
    startDate: { type: Date, default: Date.now },
    workSubmittedAt: { type: Date },
    completedAt: { type: Date },
    revisionNote: { type: String, default: '', maxlength: 2000 },
    revisionCount: { type: Number, default: 0, min: 0 },
    disputeReason: { type: String, default: '', maxlength: 2000 },
    cancelledAt: { type: Date },
    cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    deliverables: [deliverableSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.models.Contract || mongoose.model('Contract', contractSchema);
