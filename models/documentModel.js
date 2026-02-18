const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Document must have a title'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    fileUrl: {
      type: String,
      required: [true, 'Document must have a file URL'],
    },
    publicId: {
      type: String,
      required: [true, 'Document must have a public ID'],
    },
    fileSize: {
      type: Number,
      required: [true, 'Document must have file size'],
    },
    fileType: {
      type: String,
      required: [true, 'Document must have file type'],
    },
    uploadedBy: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Document must have an uploader'],
    },
    campus: {
      type: mongoose.Schema.ObjectId,
      ref: 'Campus',
      required: [true, 'Document must belong to a campus'],
    },
    faculty: {
      type: mongoose.Schema.ObjectId,
      ref: 'Faculty',
      required: [true, 'Document must belong to a faculty'],
    },
    department: {
      type: mongoose.Schema.ObjectId,
      ref: 'Department',
      required: [true, 'Document must belong to a department'],
    },
    category: {
      type: String,
      enum: ['assignment', 'note', 'past-question', 'project', 'other'],
      default: 'other',
    },
    tags: [{
      type: String,
      trim: true,
      maxlength: [50, 'Tag cannot exceed 50 characters'],
    }],
    visibility: {
      type: String,
      enum: ['public', 'campus', 'faculty', 'department', 'private'],
      default: 'department',
    },
    // Advanced filtering
    academicLevel: {
      type: String,
      enum: ['100', '200', '300', '400', '500', 'postgraduate', 'general'],
      required: [true, 'Document must specify academic level'],
      default: '100',
    },
    course: {
      type: String,
      trim: true,
      maxlength: [100, 'Course cannot exceed 100 characters'],
    },
    courseCode: {
      type: String,
      trim: true,
      uppercase: true,
    },
    semester: {
      type: String,
      enum: ['first', 'second', 'summer', 'all'],
      default: 'all',
    },
    academicYear: {
      type: String,
      match: [/^\d{4}\/\d{4}$/, 'Academic year must be in format YYYY/YYYY'],
    },
    language: {
      type: String,
      enum: ['en', 'fr', 'es', 'other'],
      default: 'en',
    },
    difficulty: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced', 'all'],
      default: 'all',
    },
    uploadStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'approved',
    },
    views: { type: Number, default: 0 },
    downloads: { type: Number, default: 0 },
    viewedBy: [{ type: mongoose.Schema.ObjectId, ref: 'User' }],
    downloadedBy: [{ type: mongoose.Schema.ObjectId, ref: 'User' }],
    // Favorites and ratings
    favoritedBy: [{ type: mongoose.Schema.ObjectId, ref: 'User' }],
    favoritesCount: { type: Number, default: 0 },
    ratings: [{
      user: { type: mongoose.Schema.ObjectId, ref: 'User' },
      rating: { type: Number, min: 1, max: 5 },
      review: { type: String, maxlength: 500 },
      createdAt: { type: Date, default: Date.now },
    }],
    averageRating: { type: Number, default: 0 },
    ratingsCount: { type: Number, default: 0 },
    // Comments
    comments: [{
      user: { type: mongoose.Schema.ObjectId, ref: 'User' },
      text: { type: String, required: true, maxlength: 500 },
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now },
    }],
    commentsCount: { type: Number, default: 0 },
    allowComments: { type: Boolean, default: true },
    // Status and metadata
    archived: { type: Boolean, default: false },
    archivedAt: Date,
    archivedBy: { type: mongoose.Schema.ObjectId, ref: 'User' },
    version: { type: Number, default: 1 },
    previousVersions: [{
      fileUrl: String,
      publicId: String,
      version: Number,
      uploadedAt: { type: Date, default: Date.now },
    }],
    // Search and indexing
    searchText: String,
    lastAccessed: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Indexes for performance
documentSchema.index({ title: 'text', description: 'text', tags: 'text', searchText: 'text' });
documentSchema.index({ campus: 1, faculty: 1, department: 1, createdAt: -1 });
documentSchema.index({ faculty: 1, createdAt: -1 });
documentSchema.index({ department: 1, createdAt: -1 });
documentSchema.index({ category: 1, createdAt: -1 });
documentSchema.index({ uploadedBy: 1, createdAt: -1 });
documentSchema.index({ views: -1 });
documentSchema.index({ downloads: -1 });
documentSchema.index({ averageRating: -1 });
documentSchema.index({ favoritesCount: -1 });
documentSchema.index({ archived: 1 });
documentSchema.index({ visibility: 1 });
documentSchema.index({ tags: 1 });
documentSchema.index({ courseCode: 1 });
documentSchema.index({ academicLevel: 1 });
documentSchema.index({ semester: 1 });
documentSchema.index({ academicYear: 1 });
documentSchema.index({ uploadStatus: 1 });

// Virtual for search text
documentSchema.pre('save', function (next) {
  this.searchText = `${this.title} ${this.description} ${this.tags.join(' ')}`;
  next();
});

// Virtual for file size in MB
documentSchema.virtual('fileSizeMB').get(function () {
  return (this.fileSize / (1024 * 1024)).toFixed(2);
});

// Virtual for is favorited by current user
documentSchema.virtual('isFavorited').get(function () {
  return this.favoritedBy && this.favoritedBy.includes(this._favoritedByUser);
});

// Virtual for user's rating
documentSchema.virtual('userRating').get(function () {
  if (!this._userRating) return null;
  const rating = this.ratings.find(r => r.user.toString() === this._userRating.toString());
  return rating ? rating.rating : null;
});

// Static method to get popular documents
documentSchema.statics.getPopular = function (limit = 10, days = 30) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return this.find({
    createdAt: { $gte: since },
    archived: false
  })
    .sort({ downloads: -1, views: -1 })
    .limit(limit);
};

// Static method to get trending documents
documentSchema.statics.getTrending = function (limit = 10, days = 7) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return this.find({
    createdAt: { $gte: since },
    archived: false
  })
    .sort({ favoritesCount: -1, averageRating: -1, downloads: -1 })
    .limit(limit);
};

// Static method to search documents
documentSchema.statics.searchDocuments = function (query, options = {}) {
  const {
    campus,
    category,
    uploadedBy,
    tags,
    dateFrom,
    dateTo,
    page = 1,
    limit = 20,
    sort = '-createdAt'
  } = options;

  const filter = {
    $text: { $search: query },
    archived: false
  };

  if (campus) filter.campus = campus;
  if (category) filter.category = category;
  if (uploadedBy) filter.uploadedBy = uploadedBy;
  if (tags) filter.tags = { $in: tags };
  if (dateFrom || dateTo) {
    filter.createdAt = {};
    if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
    if (dateTo) filter.createdAt.$lte = new Date(dateTo);
  }

  const skip = (page - 1) * limit;
  return this.find(filter)
    .sort(sort)
    .skip(skip)
    .limit(limit);
};

// Instance method to add favorite
documentSchema.methods.addFavorite = function (userId) {
  if (!this.favoritedBy.includes(userId)) {
    this.favoritedBy.push(userId);
    this.favoritesCount += 1;
  }
  return this.save();
};

// Instance method to remove favorite
documentSchema.methods.removeFavorite = function (userId) {
  const index = this.favoritedBy.indexOf(userId);
  if (index > -1) {
    this.favoritedBy.splice(index, 1);
    this.favoritesCount = Math.max(0, this.favoritesCount - 1);
  }
  return this.save();
};

// Instance method to add rating
documentSchema.methods.addRating = function (userId, rating, review = '') {
  // Remove existing rating from this user
  this.ratings = this.ratings.filter(r => r.user.toString() !== userId.toString());
  
  // Add new rating
  this.ratings.push({ user: userId, rating, review });
  
  // Recalculate average rating
  const totalRating = this.ratings.reduce((sum, r) => sum + r.rating, 0);
  this.averageRating = (totalRating / this.ratings.length).toFixed(1);
  this.ratingsCount = this.ratings.length;
  
  return this.save();
};

// Instance method to add comment
documentSchema.methods.addComment = function (userId, text) {
  this.comments.push({ user: userId, text });
  this.commentsCount += 1;
  return this.save();
};

// Instance method to archive document
documentSchema.methods.archive = function (userId) {
  this.archived = true;
  this.archivedAt = new Date();
  this.archivedBy = userId;
  return this.save();
};

// Instance method to unarchive document
documentSchema.methods.unarchive = function () {
  this.archived = false;
  this.archivedAt = undefined;
  this.archivedBy = undefined;
  return this.save();
};

// Populate uploader and campus automatically on find
documentSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'uploadedBy',
    select: 'fullName email photo role',
  }).populate({
    path: 'campus',
    select: 'name',
  }).populate({
    path: 'faculty',
    select: 'name code',
  }).populate({
    path: 'department',
    select: 'name code faculty',
  });
  next();
});

const Document = mongoose.model('Document', documentSchema);
module.exports = Document;
