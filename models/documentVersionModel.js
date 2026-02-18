const mongoose = require('mongoose');

const documentVersionSchema = new mongoose.Schema(
  {
    document: {
      type: mongoose.Schema.ObjectId,
      ref: 'Document',
      required: true,
    },
    versionNumber: {
      type: Number,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    cloudinaryUrl: {
      type: String,
      required: true,
    },
    cloudinaryId: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number,
    },
    mimeType: {
      type: String,
    },
    uploadedBy: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: true,
    },
    changeLog: {
      type: String,
      trim: true,
    },
    isCurrentVersion: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Index for fast queries
documentVersionSchema.index({ document: 1, versionNumber: 1 }, { unique: true });
documentVersionSchema.index({ document: 1 });
documentVersionSchema.index({ uploadedBy: 1 });

module.exports = mongoose.model('DocumentVersion', documentVersionSchema);
