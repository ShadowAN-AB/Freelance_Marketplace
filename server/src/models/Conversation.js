const mongoose = require('mongoose');

function participantKey(ids) {
  return ids.map((id) => id.toString()).sort().join(':');
}

const conversationSchema = new mongoose.Schema(
  {
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
    participantKey: { type: String, required: true },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    lastMessageAt: { type: Date, default: Date.now },
    lastMessagePreview: { type: String, default: '', maxlength: 200 },
  },
  { timestamps: true }
);

conversationSchema.index({ projectId: 1, participantKey: 1 }, { unique: true });
conversationSchema.index({ participants: 1, lastMessageAt: -1 });
conversationSchema.statics.participantKey = participantKey;

module.exports = mongoose.models.Conversation || mongoose.model('Conversation', conversationSchema);
