const mongoose = require('mongoose');

const offlineMessageSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['chat', 'notification', 'system'],
    required: true
  },
  content: {
    title: String,
    message: String,
    data: mongoose.Schema.Types.Mixed
  },
  delivered: {
    type: Boolean,
    default: false
  },
  read: {
    type: Boolean,
    default: false
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
  }
}, {
  timestamps: true
});

// Indexes for quick lookups and TTL
offlineMessageSchema.index({ recipient: 1, delivered: 1 });
offlineMessageSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('OfflineMessage', offlineMessageSchema);