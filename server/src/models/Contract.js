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
  },
  { timestamps: true }
);

module.exports = mongoose.models.Contract || mongoose.model('Contract', contractSchema);
