const Shop = require('../models/shopModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const APIFeatures = require('../utils/apiFeatures');

// Create a shop with optional logo upload
exports.createShop = catchAsync(async (req, res, next) => {
  console.log('createShop controller - req.file:', req.file ? { name: req.file.filename, size: req.file.size } : 'undefined');
  console.log('createShop controller - req.body.fileUrl:', req.body.fileUrl);
  console.log('createShop controller - req.body.logo:', req.body.logo);
  
  const shopData = {
    ...req.body,
    owner: req.user.id
  };

  // Filter out empty logo objects from FormData
  if (shopData.logo && typeof shopData.logo === 'object' && Object.keys(shopData.logo).length === 0) {
    console.log('Removing empty logo object');
    delete shopData.logo;
  }

  // If a file was uploaded, add the fileUrl to shop data
  if (req.file && req.body.fileUrl) {
    console.log('Setting logo to fileUrl:', req.body.fileUrl);
    shopData.logo = req.body.fileUrl; // fileUrl is set by fileToUrl middleware
  } else if (req.file) {
    console.warn('File was uploaded but fileUrl is not set!');
  }

  console.log('Creating shop with shopData.logo:', shopData.logo);
  const shop = await Shop.create(shopData);
  console.log('Shop created successfully:', shop._id, 'with logo:', shop.logo);

  res.status(201).json({ 
    status: 'success', 
    data: { shop } 
  });
});

// Get all shops with advanced filtering and search
exports.getAllShops = catchAsync(async (req, res, next) => {
  // Build query with campus filtering: DEFAULT to user's campus, UNLESS they explicitly request allCampuses
  const filter = {};
  
  if (req.query.allCampuses === 'true') {
    // User explicitly requested all campuses
    if (req.query.campus) filter.campus = req.query.campus; // If specific campus provided, use it
  } else {
    // DEFAULT: Show only user's campus
    if (req.query.campus) {
      filter.campus = req.query.campus;
    } else if (req.user?.campus) {
      filter.campus = req.user.campus;
    }
  }
  
  let query = Shop.find(filter);
  
  // Apply filters
  if (req.query.status) {
    query = query.where('status').equals(req.query.status);
  }

  if (req.query.category) {
    query = query.where('categories').in([req.query.category]);
  }
  
  if (req.query.minRating) {
    query = query.where('ratingsAverage').gte(req.query.minRating);
  }
  
  if (req.query.maxRating) {
    query = query.where('ratingsAverage').lte(req.query.maxRating);
  }
  
  // Text search
  if (req.query.search) {
    query = query.where({
      $or: [
        { name: { $regex: req.query.search, $options: 'i' } },
        { description: { $regex: req.query.search, $options: 'i' } },
        { tags: { $in: [new RegExp(req.query.search, 'i')] } }
      ]
    });
  }

  // Execute query with features
  const features = new APIFeatures(query, req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const shops = await features.query
    .populate('owner', 'fullName email avatar')
    .populate('campus', 'name shortCode');

  res.status(200).json({ 
    status: 'success', 
    results: shops.length, 
    data: { shops } 
  });
});

// Get single shop with view tracking
exports.getShop = catchAsync(async (req, res, next) => {
  const shop = await Shop.findById(req.params.id)
    .populate('owner', 'fullName email avatar phoneNumber')
    .populate('campus', 'name shortCode');
    
  if (!shop) {
    return next(new AppError('Shop not found', 404));
  }

  // Increment view count
  await shop.incrementViews();

  res.status(200).json({ 
    status: 'success', 
    data: { shop } 
  });
});

// Update shop (only owner)
exports.updateShop = catchAsync(async (req, res, next) => {
  const shop = await Shop.findOneAndUpdate(
    { _id: req.params.id, owner: req.user.id },
    req.body,
    { new: true, runValidators: true }
  );

  if (!shop) {
    return next(new AppError('Shop not found or not authorized', 404));
  }

  res.status(200).json({ 
    status: 'success', 
    data: { shop } 
  });
});

// Delete shop (only owner)
exports.deleteShop = catchAsync(async (req, res, next) => {
  const shop = await Shop.findOneAndDelete({ 
    _id: req.params.id, 
    owner: req.user.id 
  });
  
  if (!shop) {
    return next(new AppError('Shop not found or not authorized', 404));
  }

  res.status(204).json({ 
    status: 'success', 
    data: null 
  });
});

// Upload shop logo
exports.uploadShopLogo = catchAsync(async (req, res, next) => {
  const shop = await Shop.findOneAndUpdate(
    { _id: req.params.id, owner: req.user.id },
    { logo: req.body.logo },
    { new: true, runValidators: true }
  );

  if (!shop) {
    return next(new AppError('Shop not found or not authorized', 404));
  }

  res.status(200).json({ 
    status: 'success', 
    data: { shop } 
  });
});

// Delete shop logo
exports.deleteShopLogo = catchAsync(async (req, res, next) => {
  const shop = await Shop.findOne({ 
    _id: req.params.id, 
    owner: req.user.id 
  });

  if (!shop) {
    return next(new AppError('Shop not found or not authorized', 404));
  }

  // Delete from Cloudinary if exists
  if (shop.logo && shop.logo.publicId) {
    const { deleteShopLogo } = require('../middlewares/shopMiddleware');
    await deleteShopLogo(shop.logo.publicId);
  }

  shop.logo = { url: null, publicId: null };
  await shop.save();

  res.status(200).json({ 
    status: 'success', 
    message: 'Logo deleted successfully' 
  });
});

// Get shop analytics
exports.getShopAnalytics = catchAsync(async (req, res, next) => {
  const shop = await Shop.findOne({ 
    _id: req.params.id, 
    owner: req.user.id 
  });

  if (!shop) {
    return next(new AppError('Shop not found or not authorized', 404));
  }

  res.status(200).json({ 
    status: 'success', 
    data: { 
      analytics: shop.analytics,
      views: shop.analytics.views,
      totalSales: shop.analytics.totalSales,
      totalRevenue: shop.analytics.totalRevenue,
      lastViewed: shop.analytics.lastViewed
    } 
  });
});

// Update shop status
exports.updateShopStatus = catchAsync(async (req, res, next) => {
  const { status } = req.body;
  
  if (!['active', 'suspended', 'closed'].includes(status)) {
    return next(new AppError('Invalid status. Must be active, suspended, or closed', 400));
  }

  const shop = await Shop.findOneAndUpdate(
    { _id: req.params.id, owner: req.user.id },
    { status },
    { new: true, runValidators: true }
  );

  if (!shop) {
    return next(new AppError('Shop not found or not authorized', 404));
  }

  res.status(200).json({ 
    status: 'success', 
    data: { shop } 
  });
});

// Get top rated shops
exports.getTopRatedShops = catchAsync(async (req, res, next) => {
  const limit = parseInt(req.query.limit) || 10;
  const shops = await Shop.getTopRated(limit);

  res.status(200).json({ 
    status: 'success', 
    results: shops.length, 
    data: { shops } 
  });
});

// Get most viewed shops
exports.getMostViewedShops = catchAsync(async (req, res, next) => {
  const limit = parseInt(req.query.limit) || 10;
  const shops = await Shop.getMostViewed(limit);

  res.status(200).json({ 
    status: 'success', 
    results: shops.length, 
    data: { shops } 
  });
});

// Get shops by category
exports.getShopsByCategory = catchAsync(async (req, res, next) => {
  const { category } = req.params;
  const limit = parseInt(req.query.limit) || 20;
  
  const shops = await Shop.getByCategory(category, limit);

  res.status(200).json({ 
    status: 'success', 
    results: shops.length, 
    data: { shops } 
  });
});

// Search shops
exports.searchShops = catchAsync(async (req, res, next) => {
  const { q, campus, category, minRating, maxRating, sort, order } = req.query;
  
  let query = Shop.find({ status: 'active' });
  
  // Text search
  if (q) {
    query = query.where({
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { tags: { $in: [new RegExp(q, 'i')] } }
      ]
    });
  }
  
  // Filters
  if (campus) query = query.where('campus').equals(campus);
  if (category) query = query.where('categories').in([category]);
  if (minRating) query = query.where('ratingsAverage').gte(minRating);
  if (maxRating) query = query.where('ratingsAverage').lte(maxRating);
  
  // Sorting
  const sortField = sort || 'ratingsAverage';
  const sortOrder = order === 'asc' ? 1 : -1;
  query = query.sort({ [sortField]: sortOrder });

  const shops = await query
    .populate('owner', 'fullName email avatar')
    .populate('campus', 'name shortCode');

  res.status(200).json({ 
    status: 'success', 
    results: shops.length, 
    data: { shops } 
  });
});

// Get my shops
exports.getMyShops = catchAsync(async (req, res, next) => {
  const shops = await Shop.find({ owner: req.user.id })
    .populate('campus', 'name shortCode')
    .sort({ createdAt: -1 });

  res.status(200).json({ 
    status: 'success', 
    results: shops.length, 
    data: { shops } 
  });
});
