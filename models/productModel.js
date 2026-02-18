const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: { 
      type: String, 
      required: [true, 'A product must have a name'], 
      trim: true,
      maxlength: [100, 'Product name cannot exceed 100 characters']
    },
    description: { 
      type: String, 
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters']
    },
    price: { 
      type: Number, 
      required: [true, 'A product must have a price'],
      min: [0, 'Price must be positive']
    },
    
    // Image Management
    images: [String],
    images_meta: [
      {
        url: String,
        public_id: String
      }
    ],
    
    // Relationships
    shop: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductCategory', default: null },
    campus: { type: mongoose.Schema.Types.ObjectId, ref: 'Campus', required: false },
    
    // Inventory Management
    stock: { type: Number, default: 1, min: [0, 'Stock cannot be negative'] },
    quantity: { type: Number, default: 1, min: [0, 'Quantity cannot be negative'] },
    isAvailable: { type: Boolean, default: true },
    
    // Product Details
    condition: { 
      type: String, 
      enum: ['new', 'like-new', 'good', 'fair', 'poor'], 
      default: 'good' 
    },
    tags: [{
      type: String,
      trim: true,
      maxlength: [20, 'Tag cannot exceed 20 characters']
    }],
    
    // Location Information
    location: {
      coordinates: { 
        type: [Number], 
        index: '2dsphere',
        validate: {
          validator: function(v) {
            return !v || (v.length === 2 && v[0] >= -180 && v[0] <= 180 && v[1] >= -90 && v[1] <= 90);
          },
          message: 'Invalid coordinates'
        }
      },
      address: {
        type: String,
        trim: true,
        maxlength: [200, 'Address cannot exceed 200 characters']
      }
    },
    
    // Product Status
    status: {
      type: String,
      enum: ['active', 'inactive', 'sold', 'out-of-stock'],
      default: 'active'
    },
    
    // Analytics and Performance
    analytics: {
      views: { type: Number, default: 0 },
      favorites: { type: Number, default: 0 },
      lastViewed: { type: Date },
      popularInCategory: { type: Boolean, default: false }
    },
    
    // Ratings and Reviews
    ratingsAverage: {
      type: Number,
      default: 4.5,
      min: [1, 'Rating must be above 1.0'],
      max: [5, 'Rating must be below 5.0'],
      set: (val) => Math.round(val * 10) / 10,
    },
    ratingsQuantity: {
      type: Number,
      default: 0,
    },
    
    // Product Settings
    settings: {
      allowOffers: { type: Boolean, default: true },
      allowDirectMessages: { type: Boolean, default: true },
      autoAcceptOrders: { type: Boolean, default: false },
      requireApproval: { type: Boolean, default: false }
    }
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual fields
productSchema.virtual('isActive').get(function() {
  return this.status === 'active';
});

productSchema.virtual('isInStock').get(function() {
  return this.stock > 0 && this.isAvailable;
});

productSchema.virtual('hasImages').get(function() {
  return this.images && this.images.length > 0;
});

productSchema.virtual('isPopular').get(function() {
  return this.analytics.views > 100 || this.analytics.favorites > 10;
});

// Indexes for better performance
productSchema.index({ name: 'text', description: 'text', tags: 'text' });
productSchema.index({ price: 1 });
productSchema.index({ category: 1 });
productSchema.index({ shop: 1 });
productSchema.index({ campus: 1 });
productSchema.index({ status: 1 });
productSchema.index({ condition: 1 });
productSchema.index({ 'analytics.views': -1 });
productSchema.index({ 'analytics.favorites': -1 });
productSchema.index({ ratingsAverage: -1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ 'location.coordinates': '2dsphere' });

// Pre-save middleware
productSchema.pre('save', function(next) {
  // Update last viewed when views change
  if (this.isModified('analytics.views')) {
    this.analytics.lastViewed = new Date();
  }
  
  // Auto-update status based on stock
  if (this.stock === 0 && this.status === 'active') {
    this.status = 'out-of-stock';
  } else if (this.stock > 0 && this.status === 'out-of-stock') {
    this.status = 'active';
  }
  
  next();
});

// Pre-find middleware
productSchema.pre(/^find/, function (next) {
  this.populate('category', 'name slug')
      .populate('shop', 'name campus owner whatsappNumber logo')
      .populate('campus', 'name shortCode');
  next();
});

// Static methods
productSchema.statics.getTopRated = function(limit = 10) {
  return this.find({ 
    status: 'active', 
    ratingsQuantity: { $gte: 1 } 
  })
    .sort({ ratingsAverage: -1, ratingsQuantity: -1 })
    .limit(limit)
    .populate('shop', 'name campus')
    .populate('category', 'name');
};

productSchema.statics.getMostViewed = function(limit = 10) {
  return this.find({ status: 'active' })
    .sort({ 'analytics.views': -1 })
    .limit(limit)
    .populate('shop', 'name campus')
    .populate('category', 'name');
};

productSchema.statics.getByCategory = function(categoryId, limit = 20) {
  return this.find({ 
    status: 'active', 
    category: categoryId 
  })
    .sort({ ratingsAverage: -1 })
    .limit(limit)
    .populate('shop', 'name campus')
    .populate('category', 'name');
};

productSchema.statics.getByCampus = function(campusId, limit = 20) {
  return this.find({ 
    status: 'active', 
    campus: campusId 
  })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('shop', 'name campus')
    .populate('category', 'name');
};

productSchema.statics.searchProducts = function(searchTerm, filters = {}) {
  let query = this.find({ status: 'active' });
  
  if (searchTerm) {
    query = query.where({
      $or: [
        { name: { $regex: searchTerm, $options: 'i' } },
        { description: { $regex: searchTerm, $options: 'i' } },
        { tags: { $in: [new RegExp(searchTerm, 'i')] } }
      ]
    });
  }
  
  // Apply filters
  if (filters.category) query = query.where('category').equals(filters.category);
  if (filters.campus) query = query.where('campus').equals(filters.campus);
  if (filters.shop) query = query.where('shop').equals(filters.shop);
  if (filters.condition) query = query.where('condition').equals(filters.condition);
  if (filters.minPrice) query = query.where('price').gte(filters.minPrice);
  if (filters.maxPrice) query = query.where('price').lte(filters.maxPrice);
  
  return query.populate('shop', 'name campus')
              .populate('category', 'name');
};

// Instance methods
productSchema.methods.incrementViews = function() {
  this.analytics.views += 1;
  this.analytics.lastViewed = new Date();
  return this.save();
};

productSchema.methods.incrementFavorites = function() {
  this.analytics.favorites += 1;
  return this.save();
};

productSchema.methods.decrementFavorites = function() {
  this.analytics.favorites = Math.max(0, this.analytics.favorites - 1);
  return this.save();
};

productSchema.methods.updateStatus = function(status) {
  this.status = status;
  return this.save();
};

productSchema.methods.updateStock = function(quantity) {
  this.stock = quantity;
  if (quantity === 0) {
    this.status = 'out-of-stock';
  } else if (this.status === 'out-of-stock') {
    this.status = 'active';
  }
  return this.save();
};

module.exports = mongoose.model('Product', productSchema);



