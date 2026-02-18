/**
 * @fileoverview Temporary Google Authentication Model
 * Stores incomplete Google sign-ups while user selects campus
 * @module models/tempGoogleAuthModel
 */

const mongoose = require('mongoose');

const tempGoogleAuthSchema = new mongoose.Schema(
  {
    // Google account data
    googleId: {
      type: String,
      required: [true, 'Google ID required'],
      unique: true,
      sparse: true
    },
    email: {
      type: String,
      required: [true, 'Email required'],
      lowercase: true
    },
    fullName: {
      type: String,
      required: [true, 'Full name required']
    },
    picture: {
      type: String,
      default: null
    },

    // Temporary token
    tempToken: {
      type: String,
      required: true,
      unique: true,
      index: true
    },

    // Expiry (15 minutes to select campus)
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
      index: { expires: 0 } // Auto-delete after expiry
    }
  },
  { timestamps: true }
);

// Auto-delete expired temp records
tempGoogleAuthSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('TempGoogleAuth', tempGoogleAuthSchema);
