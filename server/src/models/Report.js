const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema(
  {
    reporterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    targetType: { type: String, enum: ['user', 'project'], required: true },
    targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
    reason: { type: String, required: true, maxlength: 80 },
    details: { type: String, default: '', maxlength: 2000 },
    status: { type: String, enum: ['open', 'reviewed', 'dismissed'], default: 'open', index: true },
  },
  { timestamps: true }
);

reportSchema.index({ createdAt: -1 });

module.exports = mongoose.models.Report || mongoose.model('Report', reportSchema);
