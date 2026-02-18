// src/models/chatModel.js
const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema(
  {
    // members: an array of user ObjectIds (2 for 1:1 chat, more for group)
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      }
    ],
    name: {
      type: String, // optional for group chats
      trim: true,
      maxlength: 100
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500
    },
    lastMessage: {
      type: String,
      default: ''
    },
    lastMessageAt: {
      type: Date,
      default: Date.now
    },
    // Chat creator (for group chats)
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    // Chat admins (for group chats)
    admins: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    // Chat status
    status: {
      type: String,
      enum: ['active', 'archived', 'deleted'],
      default: 'active'
    },
    // Chat type
    type: {
      type: String,
      enum: ['one-to-one', 'group'],
      default: 'one-to-one'
    },
    // Chat settings
    settings: {
      allowInvites: {
        type: Boolean,
        default: true
      },
      allowMemberMessages: {
        type: Boolean,
        default: true
      },
      allowFileUploads: {
        type: Boolean,
        default: true
      },
      muteNotifications: {
        type: Boolean,
        default: false
      },
      autoDeleteMessages: {
        type: Boolean,
        default: false
      },
      messageRetentionDays: {
        type: Number,
        default: 30,
        min: 1,
        max: 365
      }
    },
    // Muted users
    mutedUsers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    // User-specific settings
    userSettings: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      muted: {
        type: Boolean,
        default: false
      },
      muteUntil: Date,
      archived: {
        type: Boolean,
        default: false
      },
      lastReadAt: Date,
      notificationSettings: {
        mute: {
          type: Boolean,
          default: false
        },
        sound: {
          type: Boolean,
          default: true
        },
        desktop: {
          type: Boolean,
          default: true
        }
      }
    }],
    // Analytics
    analytics: {
      totalMessages: {
        type: Number,
        default: 0
      },
      totalAttachments: {
        type: Number,
        default: 0
      },
      activeMembers: {
        type: Number,
        default: 0
      },
      lastActivity: Date,
      messageCounts: {
        daily: [{
          date: Date,
          count: Number
        }],
        weekly: [{
          week: String,
          count: Number
        }],
        monthly: [{
          month: String,
          count: Number
        }]
      }
    },
    // Chat tags
    tags: [{
      type: String,
      trim: true,
      maxlength: 20
    }],
    // Chat avatar
    avatar: {
      url: String,
      public_id: String
    },
    // optional reference to an offer/request/product that started this chat
    meta: {
      type: mongoose.Schema.Types.Mixed
    }
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes
chatSchema.index({ members: 1, status: 1 });
chatSchema.index({ createdBy: 1 });
chatSchema.index({ lastMessageAt: -1 });
chatSchema.index({ type: 1, status: 1 });
chatSchema.index({ 'userSettings.user': 1 });
chatSchema.index({ tags: 1 });

// Virtual for member count
chatSchema.virtual('memberCount').get(function() {
  return this.members.length;
});

// Virtual for is group chat
chatSchema.virtual('isGroupChat').get(function() {
  return this.type === 'group';
});

// Virtual for is one-to-one chat
chatSchema.virtual('isOneToOne').get(function() {
  return this.type === 'one-to-one';
});

// Virtual for has avatar
chatSchema.virtual('hasAvatar').get(function() {
  return !!(this.avatar && this.avatar.url);
});

// Virtual for is active
chatSchema.virtual('isActive').get(function() {
  return this.status === 'active';
});

// Virtual for is archived
chatSchema.virtual('isArchived').get(function() {
  return this.status === 'archived';
});

// Virtual for is deleted
chatSchema.virtual('isDeleted').get(function() {
  return this.status === 'deleted';
});

// Pre-save middleware
chatSchema.pre('save', function(next) {
  // Set type based on member count
  if (this.members.length > 2) {
    this.type = 'group';
  } else if (this.members.length === 2) {
    this.type = 'one-to-one';
  }
  
  // Set createdBy if not set
  if (!this.createdBy && this.members.length > 0) {
    this.createdBy = this.members[0];
  }
  
  next();
});

// Static methods
chatSchema.statics.getUserChats = function(userId, options = {}) {
  const {
    type,
    status = 'active',
    archived = false,
    muted = false,
    search,
    page = 1,
    limit = 20
  } = options;

  const query = { members: userId, status };
  
  if (type) query.type = type;
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ];
  }

  return this.find(query)
    .sort({ lastMessageAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('members', 'fullName email photo campus')
    .populate('lastMessage', 'text sender createdAt');
};

chatSchema.statics.getChatAnalytics = function(chatId, period = 'month') {
  const now = new Date();
  let startDate;

  switch (period) {
    case 'day':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case 'week':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'year':
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
    default:
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  return this.aggregate([
    { $match: { _id: new mongoose.Types.ObjectId(chatId) } },
    {
      $lookup: {
        from: 'messages',
        localField: '_id',
        foreignField: 'chat',
        as: 'messages'
      }
    },
    {
      $project: {
        totalMessages: { $size: '$messages' },
        recentMessages: {
          $size: {
            $filter: {
              input: '$messages',
              cond: { $gte: ['$$this.createdAt', startDate] }
            }
          }
        },
        memberCount: { $size: '$members' },
        lastActivity: '$lastMessageAt'
      }
    }
  ]);
};

// Instance methods
chatSchema.methods.addMember = function(userId) {
  if (!this.members.includes(userId)) {
    this.members.push(userId);
    this.analytics.activeMembers = this.members.length;
  }
  return this.save();
};

chatSchema.methods.removeMember = function(userId) {
  this.members = this.members.filter(member => member.toString() !== userId);
  this.analytics.activeMembers = this.members.length;
  return this.save();
};

chatSchema.methods.addAdmin = function(userId) {
  if (!this.admins.includes(userId)) {
    this.admins.push(userId);
  }
  return this.save();
};

chatSchema.methods.removeAdmin = function(userId) {
  this.admins = this.admins.filter(admin => admin.toString() !== userId);
  return this.save();
};

chatSchema.methods.muteUser = function(userId, muteUntil = null) {
  if (!this.mutedUsers.includes(userId)) {
    this.mutedUsers.push(userId);
  }
  return this.save();
};

chatSchema.methods.unmuteUser = function(userId) {
  this.mutedUsers = this.mutedUsers.filter(user => user.toString() !== userId);
  return this.save();
};

chatSchema.methods.updateUserSettings = function(userId, settings) {
  const userSetting = this.userSettings.find(us => us.user.toString() === userId);
  if (userSetting) {
    Object.assign(userSetting, settings);
  } else {
    this.userSettings.push({ user: userId, ...settings });
  }
  return this.save();
};

chatSchema.methods.incrementMessageCount = function() {
  this.analytics.totalMessages += 1;
  this.analytics.lastActivity = new Date();
  return this.save();
};

chatSchema.methods.incrementAttachmentCount = function() {
  this.analytics.totalAttachments += 1;
  return this.save();
};

chatSchema.methods.archive = function() {
  this.status = 'archived';
  return this.save();
};

chatSchema.methods.unarchive = function() {
  this.status = 'active';
  return this.save();
};

chatSchema.methods.softDelete = function() {
  this.status = 'deleted';
  return this.save();
};

// populate members on find
chatSchema.pre(/^find/, function (next) {
  this.populate({ path: 'members', select: 'fullName email photo campus role' });
  next();
});

const Chat = mongoose.model('Chat', chatSchema);
module.exports = Chat;
