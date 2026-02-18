const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Category must have a name"],
      unique: true,
      trim: true,
      maxlength: [50, "Category name cannot exceed 50 characters"],
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: [50, "Slug cannot exceed 50 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },
    status: {
      type: String,
      enum: ["active", "inactive", "archived"],
      default: "active",
    },
    icon: {
      type: String,
      trim: true,
      maxlength: [100, "Icon cannot exceed 100 characters"],
    },
    color: {
      type: String,
      match: [/^#[0-9A-Fa-f]{6}$/, "Color must be a valid hex color code"],
      default: "#6B7280",
    },
    sortOrder: {
      type: Number,
      default: 0,
      min: [0, "Sort order must be non-negative"],
      max: [9999, "Sort order cannot exceed 9999"],
    },
    isPublic: {
      type: Boolean,
      default: true,
    },
    tags: [
      {
        type: String,
        trim: true,
        maxlength: [20, "Tag cannot exceed 20 characters"],
      },
    ],
    // Analytics and usage tracking
    analytics: {
      views: { type: Number, default: 0 },
      usageCount: { type: Number, default: 0 },
      popularity: { type: Number, default: 0 },
      lastUsed: { type: Date, default: Date.now },
      usageHistory: [
        {
          date: { type: Date, default: Date.now },
          count: { type: Number, default: 0 },
        },
      ],
    },
    // Usage tracking by model type
    usageByModel: {
      products: { type: Number, default: 0 },
      services: { type: Number, default: 0 },
      events: { type: Number, default: 0 },
      documents: { type: Number, default: 0 },
      requests: { type: Number, default: 0 },
    },
    // Hierarchy management
    level: {
      type: Number,
      default: 0,
      min: [0, "Level must be non-negative"],
    },
    path: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
      },
    ],
    childrenCount: {
      type: Number,
      default: 0,
    },
    // Template and customization
    template: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CategoryTemplate",
      default: null,
    },
    customFields: [
      {
        name: { type: String, required: true },
        type: {
          type: String,
          enum: ["string", "number", "boolean", "date", "array"],
          required: true,
        },
        value: mongoose.Schema.Types.Mixed,
        required: { type: Boolean, default: false },
      },
    ],
    // Metadata
    metadata: {
      createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      lastModifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      version: { type: Number, default: 1 },
      isTemplate: { type: Boolean, default: false },
      templateId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "CategoryTemplate",
      },
    },
    // Soft delete
    archived: {
      type: Boolean,
      default: false,
    },
    archivedAt: Date,
    archivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for performance
categorySchema.index({ name: 1 });
categorySchema.index({ slug: 1 });
categorySchema.index({ parent: 1 });
categorySchema.index({ status: 1 });
categorySchema.index({ sortOrder: 1 });
categorySchema.index({ "analytics.popularity": -1 });
categorySchema.index({ "analytics.usageCount": -1 });
categorySchema.index({ level: 1 });
categorySchema.index({ archived: 1 });
categorySchema.index({ createdAt: -1 });

// Text index for search
categorySchema.index({
  name: "text",
  description: "text",
  tags: "text",
});

// Virtual fields
categorySchema.virtual("fullPath").get(function () {
  // If path is not present or not an array, just return the name
  if (!this.path || !Array.isArray(this.path) || this.path.length === 0) {
    return this.name;
  }

  // path items may be ObjectIds (unpopulated) or populated documents with a `name`.
  // Safely access `name` when present, filter out falsy values, then join.
  const pathNames = this.path
    .map((p) => (p && typeof p === 'object' ? p.name || '' : ''))
    .filter(Boolean);

  return pathNames.length > 0 ? `${pathNames.join(' > ')} > ${this.name}` : this.name;
});

categorySchema.virtual("isLeaf").get(function () {
  return this.childrenCount === 0;
});

categorySchema.virtual("hasChildren").get(function () {
  return this.childrenCount > 0;
});

categorySchema.virtual("isRoot").get(function () {
  return !this.parent;
});

categorySchema.virtual("depth").get(function () {
  return this.level;
});

categorySchema.virtual("totalUsage").get(function () {
  return Object.values(this.usageByModel).reduce(
    (sum, count) => sum + count,
    0
  );
});

// Static methods
categorySchema.statics.getByStatus = function (status) {
  return this.find({ status, archived: false }).sort({ sortOrder: 1, name: 1 });
};

categorySchema.statics.getRootCategories = function () {
  return this.find({ parent: null, archived: false }).sort({
    sortOrder: 1,
    name: 1,
  });
};

categorySchema.statics.getChildren = function (parentId) {
  return this.find({ parent: parentId, archived: false }).sort({
    sortOrder: 1,
    name: 1,
  });
};

categorySchema.statics.getPopular = function (limit = 10) {
  return this.find({ status: "active", archived: false })
    .sort({ "analytics.popularity": -1, "analytics.usageCount": -1 })
    .limit(limit);
};

categorySchema.statics.getTrending = function (limit = 10) {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  return this.find({
    status: "active",
    archived: false,
    "analytics.lastUsed": { $gte: weekAgo },
  })
    .sort({ "analytics.usageCount": -1 })
    .limit(limit);
};

categorySchema.statics.searchCategories = function (query, filters = {}) {
  const searchQuery = {
    $text: { $search: query },
    status: "active",
    archived: false,
    ...filters,
  };

  return this.find(searchQuery, { score: { $meta: "textScore" } }).sort({
    score: { $meta: "textScore" },
  });
};

categorySchema.statics.getCategoryTree = function () {
  return this.aggregate([
    { $match: { archived: false } },
    {
      $graphLookup: {
        from: "categories",
        startWith: "$_id",
        connectFromField: "parent",
        connectToField: "_id",
        as: "children",
        maxDepth: 10,
      },
    },
    { $match: { parent: null } },
    { $sort: { sortOrder: 1, name: 1 } },
  ]);
};

categorySchema.statics.getAnalytics = function (startDate, endDate) {
  const matchStage = { archived: false };
  if (startDate || endDate) {
    matchStage.createdAt = {};
    if (startDate) matchStage.createdAt.$gte = new Date(startDate);
    if (endDate) matchStage.createdAt.$lte = new Date(endDate);
  }

  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalCategories: { $sum: 1 },
        activeCategories: {
          $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] },
        },
        inactiveCategories: {
          $sum: { $cond: [{ $eq: ["$status", "inactive"] }, 1, 0] },
        },
        totalViews: { $sum: "$analytics.views" },
        totalUsage: { $sum: "$analytics.usageCount" },
        averagePopularity: { $avg: "$analytics.popularity" },
      },
    },
  ]);
};

categorySchema.statics.getUsageStats = function () {
  return this.aggregate([
    { $match: { archived: false } },
    {
      $group: {
        _id: null,
        totalUsage: { $sum: "$analytics.usageCount" },
        usageByModel: {
          $push: {
            products: "$usageByModel.products",
            services: "$usageByModel.services",
            events: "$usageByModel.events",
            documents: "$usageByModel.documents",
            requests: "$usageByModel.requests",
          },
        },
      },
    },
  ]);
};

// Instance methods
categorySchema.methods.incrementViews = function () {
  this.analytics.views += 1;
  return this.save({ validateBeforeSave: false });
};

categorySchema.methods.incrementUsage = function (modelType) {
  this.analytics.usageCount += 1;
  this.analytics.lastUsed = new Date();

  if (this.usageByModel[modelType] !== undefined) {
    this.usageByModel[modelType] += 1;
  }

  // Update usage history
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayUsage = this.analytics.usageHistory.find(
    (entry) => entry.date.getTime() === today.getTime()
  );

  if (todayUsage) {
    todayUsage.count += 1;
  } else {
    this.analytics.usageHistory.push({ date: today, count: 1 });
  }

  return this.save({ validateBeforeSave: false });
};

categorySchema.methods.updatePopularity = function () {
  const usageWeight = this.analytics.usageCount * 0.7;
  const viewsWeight = this.analytics.views * 0.3;
  this.analytics.popularity = usageWeight + viewsWeight;
  return this.save({ validateBeforeSave: false });
};

categorySchema.methods.getChildren = function () {
  return this.constructor
    .find({ parent: this._id, archived: false })
    .sort({ sortOrder: 1, name: 1 });
};

categorySchema.methods.getSiblings = function () {
  return this.constructor
    .find({
      parent: this.parent,
      _id: { $ne: this._id },
      archived: false,
    })
    .sort({ sortOrder: 1, name: 1 });
};

categorySchema.methods.getAncestors = function () {
  return this.constructor.find({ _id: { $in: this.path } }).sort({ level: 1 });
};

categorySchema.methods.getDescendants = function () {
  return this.constructor
    .find({ path: this._id, archived: false })
    .sort({ level: 1, sortOrder: 1 });
};

categorySchema.methods.archive = function (userId) {
  this.archived = true;
  this.archivedAt = new Date();
  this.archivedBy = userId;
  return this.save();
};

categorySchema.methods.unarchive = function () {
  this.archived = false;
  this.archivedAt = undefined;
  this.archivedBy = undefined;
  return this.save();
};

categorySchema.methods.updateHierarchy = function (newParent, newSortOrder) {
  this.parent = newParent;
  this.sortOrder = newSortOrder || 0;

  // Update level and path
  if (newParent) {
    return this.constructor.findById(newParent).then((parent) => {
      this.level = parent ? parent.level + 1 : 1;
      this.path = parent ? [...parent.path, parent._id] : [];
      return this.save();
    });
  } else {
    this.level = 0;
    this.path = [];
    return this.save();
  }
};

// Pre-save middleware
categorySchema.pre("save", function (next) {
  // Generate slug if not provided
  if (!this.slug && this.name) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim("-");
  }

  // Update level and path based on parent
  if (this.parent) {
    this.constructor.findById(this.parent).then((parent) => {
      if (parent) {
        this.level = parent.level + 1;
        this.path = [...parent.path, parent._id];
      }
    });
  } else {
    this.level = 0;
    this.path = [];
  }

  next();
});

// Post-save middleware
categorySchema.post("save", function (doc) {
  // Update parent's children count
  if (doc.parent) {
    this.constructor
      .findByIdAndUpdate(doc.parent, { $inc: { childrenCount: 1 } })
      .exec();
  }
});

// Post-remove middleware
categorySchema.post("remove", function (doc) {
  // Update parent's children count
  if (doc.parent) {
    this.constructor
      .findByIdAndUpdate(doc.parent, { $inc: { childrenCount: -1 } })
      .exec();
  }
});

module.exports = mongoose.model("Category", categorySchema);
