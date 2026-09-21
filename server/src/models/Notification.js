const mongoose = require('mongoose');

const TYPES = [
  'proposal_received',
  'proposal_accepted',
  'proposal_rejected',
  'message',
  'work_submitted',
  'contract_completed',
  'review_received',
  'report_update',
  'revision_requested',
  'contract_cancelled',
  'project_invite',
  'milestone_released',
  'time_approved',
];

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: TYPES, required: true },
    title: { type: String, required: true, maxlength: 140 },
    body: { type: String, required: true, maxlength: 400 },
    link: { type: String, default: '' },
    read: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.models.Notification || mongoose.model('Notification', notificationSchema);
