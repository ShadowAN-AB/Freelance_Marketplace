const mongoose = require('mongoose');

const proposalSchema = new mongoose.Schema(
  {
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    freelancerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    coverLetter: { type: String, required: true, maxlength: 4000 },
    bidAmount: { type: Number, required: true, min: 0 },
    estimatedDays: { type: Number, required: true, min: 1, max: 365 },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'withdrawn'],
      default: 'pending',
      index: true,
    },
    shortlisted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

proposalSchema.index({ projectId: 1, freelancerId: 1 }, { unique: true });
proposalSchema.index({ freelancerId: 1, createdAt: -1 });

module.exports = mongoose.models.Proposal || mongoose.model('Proposal', proposalSchema);
