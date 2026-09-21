const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    contractId: { type: mongoose.Schema.Types.ObjectId, ref: 'Contract', required: true, unique: true },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    freelancerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    amount: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ['held', 'released', 'refunded'], default: 'held', index: true },
    releasedAt: { type: Date },
    refundedAt: { type: Date },
    provider: { type: String, enum: ['simulated', 'stripe'], default: 'simulated' },
    providerRef: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Payment || mongoose.model('Payment', paymentSchema);
