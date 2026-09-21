const mongoose = require('mongoose');

const contractSchema = new mongoose.Schema(
  {
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, unique: true },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    freelancerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    proposalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Proposal', required: true },
    amount: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ['active', 'completed', 'cancelled'], default: 'active', index: true },
    startDate: { type: Date, default: Date.now },
    workSubmittedAt: { type: Date },
    completedAt: { type: Date },
    revisionNote: { type: String, default: '', maxlength: 2000 },
    revisionCount: { type: Number, default: 0, min: 0 },
    disputeReason: { type: String, default: '', maxlength: 2000 },
    cancelledAt: { type: Date },
    cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    deliverables: [
      {
        originalName: { type: String, required: true, maxlength: 240 },
        url: { type: String, required: true, maxlength: 400 },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.models.Contract || mongoose.model('Contract', contractSchema);
