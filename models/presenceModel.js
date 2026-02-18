const mongoose = require('mongoose');

const presenceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['online', 'offline', 'away', 'busy'],
    default: 'offline'
  },
  lastSeen: {
    type: Date,
    default: Date.now
  },
  deviceInfo: [{
    socketId: String,
    userAgent: String,
    lastActive: Date
  }]
}, {
  timestamps: true
});

// Index for quick lookups
presenceSchema.index({ userId: 1 }, { unique: true });
presenceSchema.index({ status: 1 });
presenceSchema.index({ 'deviceInfo.socketId': 1 });

module.exports = mongoose.model('Presence', presenceSchema);