const mongoose = require("mongoose");

const requestCategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Request category must have a name"],
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
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    sortOrder: {
      type: Number,
      default: 0,
      min: [0, "Sort order must be non-negative"],
    },
    // Request-specific fields
    estimatedBudgetRange: {
      min: {
        type: Number,
        min: [0, "Minimum budget must be non-negative"],
      },
      max: {
        type: Number,
        min: [0, "Maximum budget must be non-negative"],
      },
    },
    urgencyLevels: [
      {
        type: String,
        enum: ["low", "medium", "high", "urgent"],
      },
    ],
    analytics: {
      usageCount: { type: Number, default: 0 },
      lastUsed: { type: Date, default: Date.now },
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("RequestCategory", requestCategorySchema);
