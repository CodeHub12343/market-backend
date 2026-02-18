// src/models/userModel.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: [true, 'Please provide your name'] },
    email: { type: String, required: [true, 'Please provide email'], unique: true, lowercase: true },
    password: { type: String, required: [true, 'Please provide password'], minlength: 6, select: false },
    campus: { type: mongoose.Schema.Types.ObjectId, ref: 'Campus', required: true },
    role: { type: String, enum: ['buyer', 'seller', 'service_provider', 'admin'], default: 'buyer' },
    
    // Profile Information
    avatar: {
      url: { type: String, default: 'default-avatar.jpg' },
      publicId: String
    },
    phoneNumber: { type: String, trim: true },
    bio: { type: String, maxlength: [500, 'Bio cannot be longer than 500 characters'] },
    department: { type: String },
    graduationYear: { type: Number },
    
    // Social Links
    socialLinks: {
      facebook: { type: String, trim: true },
      twitter: { type: String, trim: true },
      instagram: { type: String, trim: true },
      linkedin: { type: String, trim: true },
      whatsapp: { type: String, trim: true }
    },

    // User Preferences
    preferences: {
      emailNotifications: { type: Boolean, default: true },
      pushNotifications: { type: Boolean, default: true },
      profileVisibility: { 
        type: String, 
        enum: ['public', 'campus-only', 'private'],
        default: 'public'
      },
      language: { type: String, default: 'en' },
      currency: { type: String, default: 'NGN' }
    },

    // Account Status
    isVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    lastLogin: { type: Date },
    verificationToken: String,
    verificationExpires: Date,
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    onboardingStatus: { type: String, enum: ['pending', 'completed'], default: 'completed' }
    ,
    // OAuth / Social
    googleId: { type: String, index: { unique: true, sparse: true } },
    provider: { type: String, enum: ['local', 'google'], default: 'local' }
  },
  { timestamps: true }
);

// Hash password before save
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Instance methods
userSchema.methods.correctPassword = async function (candidatePassword, userPassword) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');
  this.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
  return resetToken;
};

userSchema.methods.createVerificationToken = function () {
  const verifyToken = crypto.randomBytes(32).toString('hex');
  this.verificationToken = crypto.createHash('sha256').update(verifyToken).digest('hex');
  this.verificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  return verifyToken;
};

const User = mongoose.model('User', userSchema);
module.exports = User;