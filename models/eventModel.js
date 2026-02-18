const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'An event must have a title'],
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters']
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters']
    },
    date: {
      type: Date,
      required: [true, 'Please provide the event date']
    },
    endDate: {
      type: Date,
      validate: {
        validator: function(value) {
          return !value || value > this.date;
        },
        message: 'End date must be after start date'
      }
    },
    location: {
      type: String,
      required: [true, 'Event location is required']
    },
    coordinates: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number],
        default: [0, 0]
      }
    },
    campus: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Campus',
      required: [true, 'Event must belong to a campus']
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Event must have a creator']
    },
    bannerUrl: {
      type: String,
      default: ''
    },
    bannerPublicId: {
      type: String,
      default: ''
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EventCategory',
      default: null
    },
    status: {
      type: String,
      enum: ['draft', 'published', 'cancelled', 'completed'],
      default: 'published'
    },
    visibility: {
      type: String,
      enum: ['public', 'campus', 'private'],
      default: 'public'
    },
    capacity: {
      type: Number,
      min: [1, 'Capacity must be at least 1'],
      default: null
    },
    attendees: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    tags: [{
      type: String,
      trim: true,
      maxlength: [20, 'Tag cannot exceed 20 characters']
    }],
    views: {
      type: Number,
      default: 0
    },
    viewedBy: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      viewedAt: {
        type: Date,
        default: Date.now
      }
    }],
    favorites: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    ratings: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      rating: {
        type: Number,
        min: 1,
        max: 5
      },
      review: {
        type: String,
        maxlength: [500, 'Review cannot exceed 500 characters']
      },
      ratedAt: {
        type: Date,
        default: Date.now
      }
    }],
    comments: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      comment: {
        type: String,
        required: true,
        maxlength: [500, 'Comment cannot exceed 500 characters']
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
    }],
    registrationRequired: {
      type: Boolean,
      default: false
    },
    registrationDeadline: {
      type: Date,
      validate: {
        validator: function(value) {
          return !value || value < this.date;
        },
        message: 'Registration deadline must be before event date'
      }
    },
    requirements: {
      type: String,
      maxlength: [1000, 'Requirements cannot exceed 1000 characters']
    },
    contactInfo: {
      email: String,
      phone: String,
      website: String
    },
    analytics: {
      totalViews: { type: Number, default: 0 },
      uniqueViews: { type: Number, default: 0 },
      totalFavorites: { type: Number, default: 0 },
      totalRatings: { type: Number, default: 0 },
      averageRating: { type: Number, default: 0 },
      totalComments: { type: Number, default: 0 },
      attendanceRate: { type: Number, default: 0 },
      engagementScore: { type: Number, default: 0 }
    },
    history: [{
      action: {
        type: String,
        enum: ['created', 'updated', 'published', 'cancelled', 'completed', 'viewed', 'joined', 'left', 'favorited', 'rated', 'commented']
      },
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      timestamp: {
        type: Date,
        default: Date.now
      },
      details: String
    }],
    settings: {
      allowComments: { type: Boolean, default: true },
      allowRatings: { type: Boolean, default: true },
      allowSharing: { type: Boolean, default: true },
      sendReminders: { type: Boolean, default: true },
      reminderDays: { type: Number, default: 1 },
      autoArchive: { type: Boolean, default: true },
      archiveAfterDays: { type: Number, default: 30 }
    },
    timezone: {
      type: String,
      default: 'UTC'
    },
    recurrence: {
      type: {
        type: String,
        enum: ['none', 'daily', 'weekly', 'monthly', 'yearly'],
        default: 'none'
      },
      interval: {
        type: Number,
        default: 1
      },
      endDate: Date,
      daysOfWeek: [Number], // 0-6 for Sunday-Saturday
      dayOfMonth: Number // 1-31
    },
    archived: {
      type: Boolean,
      default: false
    },
    archivedAt: Date,
    archivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  { timestamps: true }
);

// Indexes for performance
eventSchema.index({ campus: 1, date: 1 });
eventSchema.index({ createdBy: 1, date: -1 });
eventSchema.index({ category: 1, date: 1 });
eventSchema.index({ status: 1, date: 1 });
eventSchema.index({ tags: 1 });
eventSchema.index({ 'coordinates.coordinates': '2dsphere' });
eventSchema.index({ title: 'text', description: 'text', tags: 'text' });
eventSchema.index({ date: 1, status: 1 });
eventSchema.index({ views: -1 });
eventSchema.index({ 'ratings.rating': -1 });

// Virtual fields
eventSchema.virtual('attendeeCount').get(function() {
  return this.attendees.length;
});

eventSchema.virtual('isFull').get(function() {
  return this.capacity && this.attendees.length >= this.capacity;
});

eventSchema.virtual('isUpcoming').get(function() {
  return this.date > new Date();
});

eventSchema.virtual('isPast').get(function() {
  return this.date < new Date();
});

eventSchema.virtual('isOngoing').get(function() {
  const now = new Date();
  return this.date <= now && (!this.endDate || this.endDate >= now);
});

eventSchema.virtual('averageRating').get(function() {
  if (this.ratings.length === 0) return 0;
  const sum = this.ratings.reduce((acc, rating) => acc + rating.rating, 0);
  return sum / this.ratings.length;
});

eventSchema.virtual('ratingCount').get(function() {
  return this.ratings.length;
});

eventSchema.virtual('commentCount').get(function() {
  return this.comments.length;
});

eventSchema.virtual('favoriteCount').get(function() {
  return this.favorites.length;
});

eventSchema.virtual('isFavorited').get(function() {
  // This will be set by middleware
  return this._isFavorited || false;
});

eventSchema.virtual('userRating').get(function() {
  // This will be set by middleware
  return this._userRating || null;
});

eventSchema.virtual('isAttending').get(function() {
  // This will be set by middleware
  return this._isAttending || false;
});

// Pre-save middleware
eventSchema.pre('save', function(next) {
  // Update analytics
  this.analytics.totalViews = this.views;
  this.analytics.uniqueViews = this.viewedBy.length;
  this.analytics.totalFavorites = this.favorites.length;
  this.analytics.totalRatings = this.ratings.length;
  this.analytics.averageRating = this.averageRating;
  this.analytics.totalComments = this.comments.length;
  
  if (this.capacity) {
    this.analytics.attendanceRate = (this.attendees.length / this.capacity) * 100;
  }
  
  // Calculate engagement score
  this.analytics.engagementScore = (
    this.views * 0.1 +
    this.favorites.length * 2 +
    this.ratings.length * 3 +
    this.comments.length * 2 +
    this.attendees.length * 1
  );

  // Auto-archive old events
  if (this.settings.autoArchive && this.isPast && !this.archived) {
    const daysSinceEvent = (new Date() - this.date) / (1000 * 60 * 60 * 24);
    if (daysSinceEvent > this.settings.archiveAfterDays) {
      this.archived = true;
      this.archivedAt = new Date();
    }
  }

  next();
});

// Static methods
eventSchema.statics.getEventsByStatus = function(status) {
  return this.find({ status }).sort('-date');
};

eventSchema.statics.getUpcomingEvents = function() {
  return this.find({ 
    date: { $gte: new Date() },
    status: 'published'
  }).sort('date');
};

eventSchema.statics.getEventsByCampus = function(campusId) {
  return this.find({ campus: campusId }).sort('-date');
};

eventSchema.statics.getEventsByCategory = function(category) {
  return this.find({ category }).sort('-date');
};

eventSchema.statics.searchEvents = function(query) {
  return this.find({
    $or: [
      { title: { $regex: query, $options: 'i' } },
      { description: { $regex: query, $options: 'i' } },
      { tags: { $in: [new RegExp(query, 'i')] } }
    ]
  }).sort('-date');
};

eventSchema.statics.getPopularEvents = function(limit = 10) {
  return this.find({ status: 'published' })
    .sort('-analytics.engagementScore')
    .limit(limit);
};

eventSchema.statics.getTrendingEvents = function(limit = 10) {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  return this.find({ 
    status: 'published',
    createdAt: { $gte: weekAgo }
  })
  .sort('-analytics.engagementScore')
  .limit(limit);
};

eventSchema.statics.getAnalytics = function(startDate, endDate) {
  const match = {};
  if (startDate) match.createdAt = { $gte: new Date(startDate) };
  if (endDate) match.createdAt = { ...match.createdAt, $lte: new Date(endDate) };

  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        totalEvents: { $sum: 1 },
        totalViews: { $sum: '$analytics.totalViews' },
        totalFavorites: { $sum: '$analytics.totalFavorites' },
        totalRatings: { $sum: '$analytics.totalRatings' },
        averageRating: { $avg: '$analytics.averageRating' },
        totalComments: { $sum: '$analytics.totalComments' },
        totalAttendees: { $sum: { $size: '$attendees' } }
      }
    }
  ]);
};

// Instance methods
eventSchema.methods.incrementViews = function() {
  this.views += 1;
  return this.save();
};

eventSchema.methods.addView = function(userId) {
  const existingView = this.viewedBy.find(view => 
    view.user.toString() === userId.toString()
  );
  
  if (!existingView) {
    this.viewedBy.push({ user: userId, viewedAt: new Date() });
    this.views += 1;
  }
  
  return this.save();
};

eventSchema.methods.toggleFavorite = function(userId) {
  const index = this.favorites.indexOf(userId);
  if (index > -1) {
    this.favorites.splice(index, 1);
    return this.save();
  } else {
    this.favorites.push(userId);
    return this.save();
  }
};

eventSchema.methods.addRating = function(userId, rating, review) {
  const existingRating = this.ratings.find(r => 
    r.user.toString() === userId.toString()
  );
  
  if (existingRating) {
    existingRating.rating = rating;
    existingRating.review = review;
    existingRating.ratedAt = new Date();
  } else {
    this.ratings.push({ user: userId, rating, review, ratedAt: new Date() });
  }
  
  return this.save();
};

eventSchema.methods.addComment = function(userId, comment) {
  this.comments.push({ user: userId, comment, createdAt: new Date() });
  return this.save();
};

eventSchema.methods.updateStatus = function(status, userId, details) {
  this.status = status;
  this.history.push({
    action: 'updated',
    user: userId,
    details: `Status changed to ${status}. ${details || ''}`
  });
  return this.save();
};

eventSchema.methods.archive = function(userId) {
  this.archived = true;
  this.archivedAt = new Date();
  this.archivedBy = userId;
  this.history.push({
    action: 'archived',
    user: userId,
    details: 'Event archived'
  });
  return this.save();
};

eventSchema.methods.unarchive = function(userId) {
  this.archived = false;
  this.archivedAt = undefined;
  this.archivedBy = undefined;
  this.history.push({
    action: 'unarchived',
    user: userId,
    details: 'Event unarchived'
  });
  return this.save();
};

// Check if event is owned by a specific user
eventSchema.methods.isOwnedBy = function(userId) {
  return this.createdBy._id.toString() === userId.toString();
};

// Auto populate references
eventSchema.pre(/^find/, function (next) {
  this.populate('createdBy', 'fullName role campus').populate('campus', 'name');
  next();
});

const Event = mongoose.model('Event', eventSchema);
module.exports = Event;

