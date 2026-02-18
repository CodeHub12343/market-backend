const Service = require('../models/serviceModel');
const ServiceCategory = require('../models/serviceCategoryModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const APIFeatures = require('../utils/apiFeatures');
const cloudinary = require('../config/cloudinary');

// Create new service with images
exports.createService = catchAsync(async (req, res, next) => {
  const serviceData = {
    ...req.body,
    provider: req.user._id,
    campus: req.user.campus
  };

  // Handle image uploads if present
  if (req.serviceImages && req.serviceImages.length > 0) {
    serviceData.images = req.serviceImages.map(img => img.url);
    serviceData.images_meta = req.serviceImages;
  }

  const service = await Service.create(serviceData);

  // Notify users about new service (best-effort; failures shouldn't block response)
  (async () => {
    try {
      const Notification = require('../models/notificationModel');
      const User = require('../models/userModel');
      
      // Get users who might be interested in this service
      const interestedUsers = await User.find({
        campus: serviceData.campus || req.user.campus,
        role: { $in: ['buyer', 'both'] },
        _id: { $ne: req.user.id }
      });
      
      if (interestedUsers && interestedUsers.length) {
        const notificationData = interestedUsers.map(user => ({
          user: user._id,
          title: 'New Service Available',
          message: `${req.user.fullName || 'A provider'} offered a new service: ${serviceData.title}`,
          type: 'service',
          category: 'info',
          priority: 'normal',
          data: { serviceId: service._id, providerId: req.user.id },
          channels: ['in_app', 'push']
        }));

        // Insert notifications (non-blocking if it fails)
        try {
          await Notification.insertMany(notificationData);
        } catch (err) {
          console.error('Failed to insert service notifications:', err && err.message ? err.message : err);
        }
      }
    } catch (err) {
      console.error('Service notification workflow error:', err && err.message ? err.message : err);
    }
  })();

  res.status(201).json({ 
    status: 'success', 
    data: { service } 
  });
});

// Get all services with advanced filtering
exports.getAllServices = catchAsync(async (req, res, next) => {
  console.log('\n📋 GET ALL SERVICES - DETAILED DEBUG');
  console.log('   🔐 req.user:', req.user ? `${req.user.fullName} (${req.user.email})` : '❌ NOT AUTHENTICATED');
  console.log('   📍 req.user._id:', req.user?._id?.toString());
  console.log('   🏫 req.user.campus._id:', req.user?.campus?._id?.toString());
  console.log('   🏫 req.user.campus.name:', req.user?.campus?.name);
  console.log('   📤 All Query params:', req.query);

  // Log specific filter parameters
  console.log('   🔎 FILTER PARAMETERS:');
  console.log(`      💰 Price: ${req.query.minPrice ? `₦${req.query.minPrice}` : 'Any'} - ${req.query.maxPrice ? `₦${req.query.maxPrice}` : 'Any'}`);
  console.log(`      ⭐ Min Rating: ${req.query.minRating || 'Any'}`);
  console.log(`      📍 Location: ${req.query.location || 'All'}`);
  console.log(`      ⏰ Availability: ${req.query.availability || 'All'}`);
  console.log(`      🔀 Sort: ${req.query.sort || '-createdAt'}`);
  console.log(`      🔍 Search: ${req.query.search || 'None'}`);
  
  // Build campus filter: DEFAULT to user's campus, UNLESS they explicitly request allCampuses
  const campusFilter = {};
  if (req.query.allCampuses === 'true') {
    // User explicitly requested all campuses - don't filter by campus
    if (req.query.campus) campusFilter.campus = req.query.campus;
    console.log('   ✅ allCampuses=true → showing all campuses');
  } else {
    // DEFAULT: Show only user's campus
    if (req.user?.campus) {
      campusFilter.campus = req.user.campus._id || req.user.campus;
      console.log('   ✅ DEFAULT: Filtering by user campus:', campusFilter.campus?.toString());
    } else {
      console.log('   ⚠️ NO USER OR CAMPUS → NO FILTER APPLIED');
    }
  }

  // Build advanced filters for price, rating, availability
  const advancedFilters = { status: 'active', active: true, ...campusFilter };
  
  // Price range filter
  if (req.query.minPrice || req.query.maxPrice) {
    advancedFilters.price = {};
    if (req.query.minPrice) {
      advancedFilters.price.$gte = parseFloat(req.query.minPrice);
      console.log(`   💰 Added price minimum: ₦${req.query.minPrice}`);
    }
    if (req.query.maxPrice) {
      advancedFilters.price.$lte = parseFloat(req.query.maxPrice);
      console.log(`   💰 Added price maximum: ₦${req.query.maxPrice}`);
    }
  }
  
  // Minimum rating filter
  if (req.query.minRating) {
    advancedFilters.rating = { $gte: parseFloat(req.query.minRating) };
    console.log(`   ⭐ Added minimum rating: ${req.query.minRating}`);
  }
  
  // Booking Type filter (how service can be booked: on-demand, available, by-appointment)
  if (req.query.availability) {
    const bookingTypes = req.query.availability.split(',').map(a => a.trim());
    advancedFilters.bookingType = { $in: bookingTypes };
    console.log(`   ⏰ Booking Type filter applied:`);
    console.log(`      Raw value: "${req.query.availability}"`);
    console.log(`      Parsed array:`, bookingTypes);
    console.log(`      MongoDB filter: { $in: [${bookingTypes.map(v => `"${v}"`).join(', ')}] }`);
  }
  
  // Location filter
  if (req.query.location) {
    advancedFilters.location = req.query.location;
    console.log(`   📍 Added location filter: ${req.query.location}`);
  }

  console.log('   🔍 Initial Mongoose filter:', JSON.stringify(advancedFilters, null, 2));
  
  const features = new APIFeatures(
    Service.find(advancedFilters)
      .populate('provider', 'fullName email role campus')
      .populate('campus', 'name'),
    req.query
  )
    .filter()
    .search()
    .sort()
    .limitFields()
    .paginate();

  // Log search parameter if provided
  if (req.query.search) {
    console.log('   🔎 SEARCH TERM PROVIDED:', req.query.search);
  } else {
    console.log('   🔎 NO SEARCH TERM');
  }

  // Get the final mongoose query
  const finalMongooseFilter = features.query.getQuery ? features.query.getQuery() : {};
  console.log('   📌 Final Mongoose query after filters:', JSON.stringify(finalMongooseFilter, null, 2));

  const services = await features.query;
  console.log('   ✅ Services found after all filters:', services.length);
  if (services.length > 0) {
    console.log('   📋 First 3 services found:');
    services.slice(0, 3).forEach((svc, idx) => {
      console.log(`      [${idx}] Title: "${svc.title}", Price: ₦${svc.price}, Rating: ${svc.rating || 'N/A'}, BookingType: "${svc.bookingType || 'NOT SET'}"`);
    });
  } else {
    console.log('   ⚠️ NO SERVICES MATCHED THE FILTERS');
    
    // Debug: Show what bookingType values exist in database
    if (req.query.availability) {
      console.log('   🔍 DEBUGGING BOOKING TYPE:');
      const Service = require('../models/serviceModel');
      const allServices = await Service.find({ campus: campusFilter.campus }).select('title bookingType').limit(5);
      console.log(`   📊 Sample services in your campus (showing bookingType field):`);
      allServices.forEach((svc, idx) => {
        console.log(`      [${idx}] "${svc.title}" → bookingType: "${svc.bookingType || 'UNDEFINED'}"`);
      });
    }
  }
  
  console.log('   📊 Query results:', {
    servicesFound: services.length,
    filtersApplied: Object.keys(req.query).filter(k => req.query[k] && !['page', 'limit', 'sort', 'allCampuses'].includes(k)).join(', ')
  });
  
  // Add booking type validation summary
  if (req.query.availability && services.length === 0) {
    console.log('\n   🔍 BOOKING TYPE FILTER INSPECTION:');
    console.log('      Expected values from frontend:', req.query.availability.split(','));
    console.log('      MongoDB filter: { $in: [...] }');
    console.log('      ❌ NO MATCHES FOUND');
    console.log('      💡 Possible causes:');
    console.log('         1. Services need to be created/updated with bookingType field');
    console.log('         2. No services have the selected booking types in this campus');
    console.log('         3. Filter query params mismatch expected values');
  }
  
  const pagination = {
    page: parseInt(req.query.page) || 1,
    limit: parseInt(req.query.limit) || 10,
    total: features.queryAll ? (await Service.countDocuments({ status: 'active', active: true })) : services.length,
    pages: Math.ceil((features.queryAll ? (await Service.countDocuments({ status: 'active', active: true })) : services.length) / (parseInt(req.query.limit) || 10))
  };

  res.status(200).json({ 
    status: 'success', 
    results: services.length, 
    data: {
      services,
      pagination
    }
  });
});

// Get a single service with view tracking
exports.getService = catchAsync(async (req, res, next) => {
  const Service = require('../models/serviceModel');
  const ServiceReview = require('../models/serviceReviewModel');
  
  const service = await Service.findById(req.params.id)
    .populate('provider', 'fullName email role campus shop')
    .populate('campus', 'name')
    .populate('category', 'name _id');
    
  if (!service) return next(new AppError('Service not found', 404));
  
  // Fetch reviews separately for this service
  const reviews = await ServiceReview.find({ service: req.params.id })
    .populate('user', 'fullName')
    .sort({ createdAt: -1 })
    .select('rating review createdAt user');
  
  // Convert to plain object and add reviews
  const serviceObj = service.toObject();
  serviceObj.reviews = reviews.map(review => ({
    rating: review.rating,
    comment: review.review,
    createdAt: review.createdAt,
    reviewerName: review.user?.fullName || 'Anonymous'
  }));
  
  res.status(200).json({ status: 'success', data: serviceObj });
});

// Update service (only owner)
exports.updateService = catchAsync(async (req, res, next) => {
  const serviceData = { ...req.body };

  // Handle image updates if present
  if (req.serviceImages && req.serviceImages.length > 0) {
    serviceData.images = req.serviceImages.map(img => img.url);
    serviceData.images_meta = req.serviceImages;
  }

  const service = await Service.findOneAndUpdate(
    { _id: req.params.id, provider: req.user._id },
    serviceData,
    { new: true, runValidators: true }
  );
  
  if (!service) return next(new AppError('Service not found or unauthorized', 404));
  
  res.status(200).json({ status: 'success', data: service });
});

// Delete service (only owner)
exports.deleteService = catchAsync(async (req, res, next) => {
  const service = await Service.findOneAndDelete({ 
    _id: req.params.id, 
    provider: req.user._id 
  });
  
  if (!service) return next(new AppError('Service not found or unauthorized', 404));
  
  // Delete Cloudinary images in the background (non-blocking)
  if (service.images_meta && service.images_meta.length > 0) {
    // Fire and forget - don't wait for Cloudinary deletions
    (async () => {
      try {
        const deletePromises = service.images_meta.map(img =>
          cloudinary.uploader.destroy(img.public_id).catch(() => null)
        );
        await Promise.all(deletePromises);
        console.log(`✓ Deleted ${service.images_meta.length} images from Cloudinary for service ${req.params.id}`);
      } catch (err) {
        console.error(`✗ Error deleting Cloudinary images for service ${req.params.id}:`, err && err.message ? err.message : err);
      }
    })();
  }
  
  res.status(204).json({ status: 'success', data: null });
});

// Search services
exports.searchServices = catchAsync(async (req, res, next) => {
  const { q, category, minPrice, maxPrice, rating, campus, sort, page = 1, limit = 20 } = req.query;
  
  let query = { status: 'active', active: true };
  
  // Text search
  if (q) {
    query.$text = { $search: q };
  }
  
  // Category filter - resolve category slug/name to ObjectId
  if (category) {
    const categoryId = await resolveCategoryId(category);
    if (categoryId) {
      query.category = categoryId;
    }
  }
  
  // Price range filter
  if (minPrice || maxPrice) {
    query.price = {};
    if (minPrice) query.price.$gte = parseFloat(minPrice);
    if (maxPrice) query.price.$lte = parseFloat(maxPrice);
  }
  
  // Rating filter
  if (rating) {
    query.ratingsAverage = { $gte: parseFloat(rating) };
  }
  
  // Campus filter
  if (campus) {
    query.campus = campus;
  }
  
  // Sort options
  let sortOption = { createdAt: -1 };
  if (sort) {
    switch (sort) {
      case 'price':
        sortOption = { price: 1 };
        break;
      case '-price':
        sortOption = { price: -1 };
        break;
      case 'rating':
        sortOption = { ratingsAverage: 1 };
        break;
      case '-rating':
        sortOption = { ratingsAverage: -1 };
        break;
      case 'title':
        sortOption = { title: 1 };
        break;
      case '-title':
        sortOption = { title: -1 };
        break;
      default:
        sortOption = { createdAt: -1 };
    }
  }
  
  const skip = (parseInt(page) - 1) * parseInt(limit);
  
  const services = await Service.find(query)
    .populate('provider', 'fullName email role campus')
    .populate('campus', 'name')
    .populate('category', 'name slug')
    .sort(sortOption)
    .skip(skip)
    .limit(parseInt(limit));
  
  const total = await Service.countDocuments(query);
  
  res.status(200).json({
    status: 'success',
    results: services.length,
    total,
    page: parseInt(page),
    pages: Math.ceil(total / parseInt(limit)),
    data: services
  });
});

// Get services by category
exports.getServicesByCategory = catchAsync(async (req, res, next) => {
  const { categoryId } = req.params;
  const { page = 1, limit = 20 } = req.query;
  
  // Resolve category to ObjectId
  const categoryObjectId = await resolveCategoryId(categoryId);
  if (!categoryObjectId) {
    return res.status(404).json({
      status: 'fail',
      message: 'Service category not found'
    });
  }
  
  const skip = (parseInt(page) - 1) * parseInt(limit);
  
  const services = await Service.find({ 
    category: categoryObjectId,
    status: 'active', 
    active: true 
  })
    .populate('provider', 'fullName email role campus')
    .populate('campus', 'name')
    .populate('category', 'name slug')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));
  
  const total = await Service.countDocuments({ 
    category: categoryObjectId,
    status: 'active', 
    active: true 
  });
  
  res.status(200).json({
    status: 'success',
    results: services.length,
    total,
    page: parseInt(page),
    pages: Math.ceil(total / parseInt(limit)),
    data: services
  });
});

// Get services by campus
exports.getServicesByCampus = catchAsync(async (req, res, next) => {
  const { campusId } = req.params;
  const { page = 1, limit = 20 } = req.query;
  
  const skip = (parseInt(page) - 1) * parseInt(limit);
  
  const services = await Service.find({ 
    campus: campusId,
    status: 'active', 
    active: true 
  })
    .populate('provider', 'fullName email role campus')
    .populate('campus', 'name')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));
  
  const total = await Service.countDocuments({ 
    campus: campusId,
    status: 'active', 
    active: true 
  });
  
  res.status(200).json({
    status: 'success',
    results: services.length,
    total,
    page: parseInt(page),
    pages: Math.ceil(total / parseInt(limit)),
    data: services
  });
});

// Get top rated services
exports.getTopRatedServices = catchAsync(async (req, res, next) => {
  const { limit = 10 } = req.query;
  
  const services = await Service.getTopRated(parseInt(limit));
  
  res.status(200).json({
    status: 'success',
    results: services.length,
    data: services
  });
});

// Get most viewed services
exports.getMostViewedServices = catchAsync(async (req, res, next) => {
  const { limit = 10 } = req.query;
  
  const services = await Service.getMostViewed(parseInt(limit));
  
  res.status(200).json({
    status: 'success',
    results: services.length,
    data: services
  });
});

// Advanced filter and sort services with comprehensive options
exports.advancedSearchServices = catchAsync(async (req, res, next) => {
  const {
    search,
    category,
    provider,
    campus,
    status = 'active',
    minPrice,
    maxPrice,
    minRating,
    maxRating,
    minDuration,
    maxDuration,
    minBookings,
    maxBookings,
    minViews,
    maxViews,
    available,
    hasImages,
    sortBy = 'createdAt',
    order = 'desc',
    page = 1,
    limit = 20,
    tags,
    allowInstantBooking,
    cancellationPolicy,
    rating,
    popularity
  } = req.query;

  // Build advanced filter
  const filter = await buildAdvancedServiceFilter({
    search, category, provider, campus, status, minPrice, maxPrice,
    minRating, maxRating, minDuration, maxDuration, minBookings, maxBookings,
    minViews, maxViews, available, hasImages, tags, allowInstantBooking,
    cancellationPolicy, rating, popularity
  });

  // Build sort object
  const sortObj = buildAdvancedServiceSort(sortBy, order);

  // Pagination
  const pageNum = Math.max(1, parseInt(page, 10)) || 1;
  const limitNum = Math.min(100, parseInt(limit, 10)) || 20;
  const skip = (pageNum - 1) * limitNum;

  // Execute query with sorting and pagination
  const [services, total] = await Promise.all([
    Service.find(filter)
      .sort(sortObj)
      .skip(skip)
      .limit(limitNum)
      .populate('provider', 'fullName email role campus')
      .populate('campus', 'name shortCode'),
    Service.countDocuments(filter)
  ]);

  // Calculate pagination info
  const pages = Math.ceil(total / limitNum);
  const hasNextPage = pageNum < pages;
  const hasPrevPage = pageNum > 1;

  res.status(200).json({
    status: 'success',
    results: services.length,
    pagination: {
      total,
      page: pageNum,
      pages,
      limit: limitNum,
      hasNextPage,
      hasPrevPage
    },
    data: { services }
  });
});

// Helper function to build advanced service filter
async function buildAdvancedServiceFilter(params) {
  const filter = { status: params.status || 'active', active: true };

  // Text search
  if (params.search) {
    filter.$text = { $search: params.search };
  }

  // Category filter
  if (params.category) {
    const categoryId = await resolveCategoryId(params.category);
    if (categoryId) {
      filter.category = categoryId;
    }
  }

  // Provider filter
  if (params.provider && /^[0-9a-fA-F]{24}$/.test(params.provider)) {
    filter.provider = params.provider;
  }

  // Campus filter
  if (params.campus && /^[0-9a-fA-F]{24}$/.test(params.campus)) {
    filter.campus = params.campus;
  }

  // Price range
  if (params.minPrice || params.maxPrice) {
    filter.price = {};
    if (params.minPrice) filter.price.$gte = Number(params.minPrice);
    if (params.maxPrice) filter.price.$lte = Number(params.maxPrice);
  }

  // Rating filters
  if (params.minRating || params.maxRating) {
    filter.ratingsAverage = {};
    if (params.minRating) filter.ratingsAverage.$gte = Number(params.minRating);
    if (params.maxRating) filter.ratingsAverage.$lte = Number(params.maxRating);
  }

  // Duration filters (in minutes)
  if (params.minDuration || params.maxDuration) {
    filter.duration = {};
    if (params.minDuration) filter.duration.$gte = Number(params.minDuration);
    if (params.maxDuration) filter.duration.$lte = Number(params.maxDuration);
  }

  // Bookings filters
  if (params.minBookings || params.maxBookings) {
    filter.currentBookings = {};
    if (params.minBookings) filter.currentBookings.$gte = Number(params.minBookings);
    if (params.maxBookings) filter.currentBookings.$lte = Number(params.maxBookings);
  }

  // Views filters
  if (params.minViews || params.maxViews) {
    filter['analytics.views'] = {};
    if (params.minViews) filter['analytics.views'].$gte = Number(params.minViews);
    if (params.maxViews) filter['analytics.views'].$lte = Number(params.maxViews);
  }

  // Availability filter
  if (params.available === 'true') {
    filter.$expr = { $lt: ['$currentBookings', '$maxBookings'] };
  }

  // Image filter
  if (params.hasImages === 'true') {
    filter.images = { $exists: true, $not: { $size: 0 } };
  }

  // Tags filter
  if (params.tags) {
    const tagsArray = Array.isArray(params.tags) ? params.tags : params.tags.split(',');
    filter.tags = { $in: tagsArray.map(t => t.trim()) };
  }

  // Settings filters
  if (params.allowInstantBooking === 'true') {
    filter['settings.allowInstantBooking'] = true;
  }

  if (params.cancellationPolicy) {
    filter['settings.cancellationPolicy'] = params.cancellationPolicy;
  }

  // Rating preset filters
  if (params.rating) {
    if (params.rating === 'topRated') {
      filter.ratingsAverage = { $gte: 4.5 };
      filter.ratingsQuantity = { $gte: 5 };
    } else if (params.rating === 'highRated') {
      filter.ratingsAverage = { $gte: 4.0 };
    } else if (params.rating === 'unrated') {
      filter.ratingsQuantity = { $eq: 0 };
    }
  }

  // Popularity preset filters
  if (params.popularity) {
    if (params.popularity === 'trending') {
      filter['analytics.views'] = { $gte: 50 };
      filter['analytics.totalBookings'] = { $gte: 5 };
    } else if (params.popularity === 'mostViewed') {
      filter['analytics.views'] = { $gte: 100 };
    } else if (params.popularity === 'mostBooked') {
      filter['analytics.totalBookings'] = { $gte: 10 };
    }
  }

  return filter;
}

// Helper function to build advanced service sort
function buildAdvancedServiceSort(sortBy, order) {
  const sortOrder = order === 'asc' ? 1 : -1;
  const sortObj = {};

  switch (sortBy) {
    case 'price':
      sortObj.price = sortOrder;
      break;
    case 'price_asc':
      sortObj.price = 1;
      break;
    case 'price_desc':
      sortObj.price = -1;
      break;
    case 'rating':
    case 'ratingsAverage':
      sortObj.ratingsAverage = sortOrder;
      sortObj.ratingsQuantity = -1;
      break;
    case 'views':
    case 'analytics.views':
      sortObj['analytics.views'] = sortOrder;
      break;
    case 'bookings':
    case 'analytics.totalBookings':
      sortObj['analytics.totalBookings'] = sortOrder;
      break;
    case 'newest':
    case 'createdAt':
      sortObj.createdAt = -1;
      break;
    case 'oldest':
      sortObj.createdAt = 1;
      break;
    case 'updated':
    case 'updatedAt':
      sortObj.updatedAt = sortOrder;
      break;
    case 'title':
      sortObj.title = sortOrder;
      break;
    case 'duration':
      sortObj.duration = sortOrder;
      break;
    case 'popularity':
      // Combined popularity score
      sortObj['analytics.views'] = -1;
      sortObj['analytics.totalBookings'] = -1;
      sortObj.ratingsAverage = -1;
      break;
    case 'trending':
      // Recent + high engagement
      sortObj.createdAt = -1;
      sortObj['analytics.views'] = -1;
      break;
    case 'revenue':
    case 'analytics.totalRevenue':
      sortObj['analytics.totalRevenue'] = sortOrder;
      break;
    case 'available':
      // Available slots (high to low)
      sortObj.currentBookings = 1;
      break;
    default:
      sortObj.createdAt = -1;
  }

  return sortObj;
}

// Helper function to build filter for searchServices (keep for backward compatibility)
async function buildServiceFilter(query) {
  const filter = { status: 'active', active: true };

  // Text search
  if (query.search) {
    filter.$text = { $search: query.search };
  }

  // Category filter
  if (query.category) {
    const categoryId = await resolveCategoryId(query.category);
    if (categoryId) {
      filter.category = categoryId;
    }
  }

  // Price range
  if (query.minPrice || query.maxPrice) {
    filter.price = {};
    if (query.minPrice) filter.price.$gte = Number(query.minPrice);
    if (query.maxPrice) filter.price.$lte = Number(query.maxPrice);
  }

  // Rating filter
  if (query.minRating) {
    filter.ratingsAverage = { $gte: Number(query.minRating) };
  }

  // Campus filter
  if (query.campus && /^[0-9a-fA-F]{24}$/.test(query.campus)) {
    filter.campus = query.campus;
  }

  return filter;
}

// Get my services (provider's own services)
exports.getMyServices = catchAsync(async (req, res, next) => {
  const { page = 1, limit = 20, status } = req.query;
  
  let query = { provider: req.user._id };
  if (status) {
    query.status = status;
  }
  
  const skip = (parseInt(page) - 1) * parseInt(limit);
  
  const services = await Service.find(query)
    .populate('campus', 'name')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));
  
  const total = await Service.countDocuments(query);
  
  res.status(200).json({
    status: 'success',
    results: services.length,
    total,
    page: parseInt(page),
    pages: Math.ceil(total / parseInt(limit)),
    data: services
  });
});

// Update service status
exports.updateServiceStatus = catchAsync(async (req, res, next) => {
  const { status } = req.body;
  const { id } = req.params;
  
  const service = await Service.findOneAndUpdate(
    { _id: id, provider: req.user._id },
    { status },
    { new: true, runValidators: true }
  );
  
  if (!service) return next(new AppError('Service not found or unauthorized', 404));
  
  res.status(200).json({ status: 'success', data: service });
});

// Get service analytics
exports.getServiceAnalytics = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  
  const service = await Service.findById(id);
  if (!service) return next(new AppError('Service not found', 404));
  
  // Check if user owns the service or is admin
  if (service.provider.toString() !== req.user._id && req.user.role !== 'admin') {
    return next(new AppError('You are not authorized to view service analytics', 403));
  }
  
  const analytics = {
    views: service.analytics.views,
    totalBookings: service.analytics.totalBookings,
    totalRevenue: service.analytics.totalRevenue,
    currentBookings: service.currentBookings,
    maxBookings: service.maxBookings,
    ratingsAverage: service.ratingsAverage,
    ratingsQuantity: service.ratingsQuantity,
    lastViewed: service.analytics.lastViewed,
    createdAt: service.createdAt,
    updatedAt: service.updatedAt
  };
  
  res.status(200).json({
    status: 'success',
    data: analytics
  });
});

// Upload service images
exports.uploadServiceImages = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  
  const service = await Service.findOne({ _id: id, provider: req.user._id });
  if (!service) return next(new AppError('Service not found or unauthorized', 404));
  
  if (req.serviceImages && req.serviceImages.length > 0) {
    // Add new images to existing ones
    const newImages = req.serviceImages.map(img => img.url);
    const newImagesMeta = req.serviceImages;
    
    service.images = [...(service.images || []), ...newImages];
    service.images_meta = [...(service.images_meta || []), ...newImagesMeta];
    
    await service.save();
  }
  
  res.status(200).json({
    status: 'success',
    data: service
  });
});

// Delete service image
exports.deleteServiceImage = catchAsync(async (req, res, next) => {
  const { id, imageId } = req.params;
  
  const service = await Service.findOne({ _id: id, provider: req.user._id });
  if (!service) return next(new AppError('Service not found or unauthorized', 404));
  
  // Find the image to delete
  const imageIndex = service.images_meta.findIndex(img => img._id.toString() === imageId);
  if (imageIndex === -1) {
    return next(new AppError('Image not found', 404));
  }
  
  const imageToDelete = service.images_meta[imageIndex];
  
  // Delete from Cloudinary
  await cloudinary.uploader.destroy(imageToDelete.public_id);
  
  // Remove from arrays
  service.images.splice(imageIndex, 1);
  service.images_meta.splice(imageIndex, 1);
  
  await service.save();
  
  res.status(200).json({
    status: 'success',
    data: service
  });
});

// Get service statistics
exports.getServiceStats = catchAsync(async (req, res, next) => {
  const service = await Service.findById(req.params.id)
    .populate('provider', 'fullName email')
    .populate('campus', 'name');
  
  if (!service) return next(new AppError('Service not found', 404));
  
  // Compile statistics
  const stats = {
    _id: service._id,
    title: service.title,
    views: service.analytics?.views || 0,
    bookings: service.currentBookings || 0,
    maxBookings: service.maxBookings || 0,
    bookingRate: service.maxBookings ? ((service.currentBookings || 0) / service.maxBookings * 100).toFixed(2) : 0,
    ratingsAverage: service.ratingsAverage || 0,
    ratingsQuantity: service.ratingsQuantity || 0,
    price: service.price,
    category: service.category,
    createdAt: service.createdAt,
    updatedAt: service.updatedAt,
    provider: service.provider,
    campus: service.campus
  };
  
  res.status(200).json({
    status: 'success',
    data: stats
  });
});

// ============================================================================
// SEARCH FUNCTIONALITY ENDPOINTS
// ============================================================================

/**
 * Get search suggestions for autocomplete
 * GET /api/v1/services/search/suggestions
 */
exports.getServiceSearchSuggestions = catchAsync(async (req, res, next) => {
  const { q: query, limit = 5 } = req.query;

  console.log('\n🔍 SERVICE SEARCH SUGGESTIONS');
  console.log('   Query:', query);
  console.log('   Limit:', limit);

  if (!query || query.length < 2) {
    console.log('   ⚠️  Query too short, returning empty');
    return res.status(200).json({
      status: 'success',
      results: 0,
      data: { suggestions: [] }
    });
  }

  // First try: Search with status and active filters
  let suggestions = await Service.find({
    status: 'active',
    active: true,
    $or: [
      { title: { $regex: query, $options: 'i' } },
      { description: { $regex: query, $options: 'i' } }
    ]
  })
    .select('_id title category price ratingsAverage status active')
    .populate('category', 'name')
    .limit(Math.min(parseInt(limit, 10) || 5, 20));

  console.log('   Found with filters:', suggestions.length);

  // If no results, try without strict filters
  if (suggestions.length === 0) {
    console.log('   ⚠️  No results with filters, trying without filters...');
    suggestions = await Service.find({
      $or: [
        { title: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } }
      ]
    })
      .select('_id title category price ratingsAverage status active')
      .populate('category', 'name')
      .limit(Math.min(parseInt(limit, 10) || 5, 20));

    console.log('   Found without filters:', suggestions.length);
  }

  if (suggestions.length > 0) {
    console.log('   ✅ First service:', {
      title: suggestions[0].title,
      status: suggestions[0].status,
      active: suggestions[0].active
    });
  }

  // Extract unique titles and categories
  const uniqueSuggestions = new Map();
  
  suggestions.forEach(service => {
    if (service.title && !uniqueSuggestions.has(service.title.toLowerCase())) {
      uniqueSuggestions.set(service.title.toLowerCase(), {
        id: service._id,
        text: service.title,
        title: service.title,
        type: 'service',
        price: service.price,
        rating: service.ratingsAverage
      });
    }
    if (service.category?.name && !uniqueSuggestions.has(service.category.name.toLowerCase())) {
      uniqueSuggestions.set(service.category.name.toLowerCase(), {
        id: service.category._id,
        text: service.category.name,
        title: service.category.name,
        type: 'category'
      });
    }
  });

  const suggestionsList = Array.from(uniqueSuggestions.values()).slice(0, Math.min(parseInt(limit, 10) || 5, 20));

  console.log('   Final suggestions:', suggestionsList.length);
  console.log('✅ SERVICE SEARCH SUGGESTIONS COMPLETE\n');

  res.status(200).json({
    status: 'success',
    results: suggestionsList.length,
    data: { suggestions: suggestionsList }
  });
});

/**
 * Get popular/trending service searches
 * GET /api/v1/services/search/popular
 */
exports.getPopularServiceSearches = catchAsync(async (req, res, next) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 10, 50);

  try {
    // Get most popular services based on bookings and ratings
    const popularServices = await Service.find({ 
      status: 'active', 
      active: true 
    })
      .select('title category price ratingsAverage ratingsQuantity')
      .populate('category', 'name')
      .limit(limit)
      .sort({ ratingsQuantity: -1, ratingsAverage: -1 });

    res.status(200).json({
      status: 'success',
      results: popularServices.length,
      data: {
        searches: popularServices.map(service => ({
          id: service._id,
          title: service.title,
          category: service.category?.name || 'Uncategorized',
          rating: service.ratingsAverage || 0,
          reviewCount: service.ratingsQuantity || 0,
          price: service.price
        }))
      }
    });
  } catch (error) {
    console.error('Popular services error:', error);
    res.status(200).json({
      status: 'success',
      results: 0,
      data: { searches: [] }
    });
  }
});

/**
 * Get available service locations (campuses with active services)
 * GET /api/v1/services/search/locations
 */
exports.getServiceLocations = catchAsync(async (req, res, next) => {
  const locations = await Service.aggregate([
    {
      $match: {
        status: 'active',
        active: true
      }
    },
    {
      $group: {
        _id: '$campus',
        count: { $sum: 1 }
      }
    },
    {
      $lookup: {
        from: 'campuses',
        localField: '_id',
        foreignField: '_id',
        as: 'campusInfo'
      }
    },
    {
      $unwind: '$campusInfo'
    },
    {
      $project: {
        _id: 1,
        campusId: '$_id',
        campusName: '$campusInfo.name',
        campusCode: '$campusInfo.shortCode',
        serviceCount: '$count'
      }
    },
    {
      $sort: { serviceCount: -1 }
    }
  ]);

  res.status(200).json({
    status: 'success',
    results: locations.length,
    data: {
      locations: locations.map(loc => ({
        id: loc.campusId,
        name: loc.campusName,
        code: loc.campusCode,
        serviceCount: loc.serviceCount
      }))
    }
  });
});

/**
 * Get user's service search history
 * GET /api/v1/services/search/history
 */
exports.getSearchHistory = catchAsync(async (req, res, next) => {
  // For authenticated users, get their search history from activity logs
  if (!req.user) {
    return res.status(200).json({
      status: 'success',
      results: 0,
      data: { history: [] }
    });
  }

  const UserBehavior = require('../models/userBehaviorModel');
  const history = await UserBehavior.find({
    user: req.user._id,
    action: 'search',
    entityType: 'service'
  })
    .select('searchQuery timestamp')
    .sort('-timestamp')
    .limit(10);

  res.status(200).json({
    status: 'success',
    results: history.length,
    data: {
      history: history.map(item => ({
        query: item.searchQuery,
        timestamp: item.timestamp
      }))
    }
  });
});

/**
 * Save service search to history
 * POST /api/v1/services/search/history
 */
exports.saveServiceSearchHistory = catchAsync(async (req, res, next) => {
  const { query } = req.body;

  if (!query || query.length < 2) {
    return next(new AppError('Search query must be at least 2 characters', 400));
  }

  // Only save for authenticated users
  if (!req.user) {
    return res.status(200).json({
      status: 'success',
      message: 'Search not saved (guest user)'
    });
  }

  const UserBehavior = require('../models/userBehaviorModel');
  
  await UserBehavior.create({
    user: req.user._id,
    action: 'search',
    entityType: 'service',
    searchQuery: query,
    timestamp: new Date()
  });

  res.status(201).json({
    status: 'success',
    message: 'Search saved to history'
  });
});

/**
 * Clear user's search history
 * DELETE /api/v1/services/search/history
 */
exports.clearServiceSearchHistory = catchAsync(async (req, res, next) => {
  if (!req.user) {
    return next(new AppError('You must be logged in to clear search history', 401));
  }

  const UserBehavior = require('../models/userBehaviorModel');
  await UserBehavior.deleteMany({
    user: req.user._id,
    action: 'search',
    entityType: 'service'
  });

  res.status(200).json({
    status: 'success',
    message: 'Search history cleared'
  });
});

/**
 * Delete specific search history item
 * DELETE /api/v1/services/search/history/:id
 */
exports.deleteServiceSearchHistoryItem = catchAsync(async (req, res, next) => {
  if (!req.user) {
    return next(new AppError('You must be logged in', 401));
  }

  const UserBehavior = require('../models/userBehaviorModel');
  const result = await UserBehavior.findByIdAndDelete(req.params.id);

  if (!result) {
    return next(new AppError('Search history item not found', 404));
  }

  res.status(200).json({
    status: 'success',
    message: 'Search history item deleted'
  });
});

/**
 * Get service reviews
 * GET /api/v1/services/:id/reviews
 */
exports.getServiceReviews = catchAsync(async (req, res, next) => {
  const ServiceReview = require('../models/serviceReviewModel');
  
  const reviews = await ServiceReview.find({ service: req.params.id })
    .populate('user', 'fullName')
    .sort({ createdAt: -1 })
    .limit(parseInt(req.query.limit) || 10);

  res.status(200).json({
    status: 'success',
    results: reviews.length,
    data: { reviews }
  });
});

/**
 * Get service review statistics
 * GET /api/v1/services/:id/reviews/stats
 */
exports.getServiceReviewStats = catchAsync(async (req, res, next) => {
  const ServiceReview = require('../models/serviceReviewModel');
  const mongoose = require('mongoose');
  
  const stats = await ServiceReview.aggregate([
    { $match: { service: new mongoose.Types.ObjectId(req.params.id) } },
    {
      $group: {
        _id: '$service',
        averageRating: { $avg: '$rating' },
        totalReviews: { $sum: 1 },
        ratingDistribution: {
          $push: '$rating'
        }
      }
    }
  ]);

  // Calculate distribution
  const statsData = stats[0] || { 
    averageRating: 0, 
    totalReviews: 0, 
    ratingDistribution: [] 
  };

  const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  statsData.ratingDistribution?.forEach((rating) => {
    const roundedRating = Math.round(rating);
    if (distribution[roundedRating] !== undefined) {
      distribution[roundedRating]++;
    }
  });

  res.status(200).json({
    status: 'success',
    data: {
      totalReviews: statsData.totalReviews || 0,
      averageRating: statsData.averageRating || 0,
      distribution
    }
  });
});

/**
 * Get related services
 * GET /api/v1/services/:id/related
 */
exports.getRelatedServices = catchAsync(async (req, res, next) => {
  const service = await Service.findById(req.params.id);
  
  if (!service) {
    return next(new AppError('Service not found', 404));
  }

  const relatedServices = await Service.find({
    category: service.category,
    _id: { $ne: service._id },
    status: 'active',
    active: true
  })
    .limit(parseInt(req.query.limit) || 6);

  res.status(200).json({
    status: 'success',
    results: relatedServices.length,
    data: { services: relatedServices }
  });
});

/**
 * Get service options
 * GET /api/v1/services/:id/options
 */
exports.getServiceOptions = catchAsync(async (req, res, next) => {
  const service = await Service.findById(req.params.id);
  
  if (!service) {
    return next(new AppError('Service not found', 404));
  }

  // Return service options/variants if they exist
  const options = service.options || [];

  res.status(200).json({
    status: 'success',
    results: options.length,
    data: { options }
  });
});

/**
 * Check if service is favorited by user
 * GET /api/v1/services/:id/is-favorited
 */
exports.checkIfServiceFavorited = catchAsync(async (req, res, next) => {
  if (!req.user) {
    return res.status(200).json({
      status: 'success',
      data: { isFavorited: false }
    });
  }

  const Favorite = require('../models/favoriteModel');
  
  const favorite = await Favorite.findOne({
    user: req.user._id,
    service: req.params.id
  });

  res.status(200).json({
    status: 'success',
    data: { isFavorited: !!favorite }
  });
});

/**
 * Get personalized service recommendations
 * GET /api/v1/services/recommendations/personalized
 */
exports.getPersonalizedServiceRecommendations = catchAsync(async (req, res, next) => {
  const limit = parseInt(req.query.limit) || 10;

  // Get services from user's favorite categories
  const UserBehavior = require('../models/userBehaviorModel');
  
  const userBehavior = await UserBehavior.findOne({ user: req.user._id });
  
  let recommendedServices = [];
  
  if (userBehavior && userBehavior.viewedServices && userBehavior.viewedServices.length > 0) {
    // Find services similar to those viewed
    const viewedServiceIds = userBehavior.viewedServices.slice(0, 5).map(s => s.serviceId);
    const viewedServices = await Service.find({ _id: { $in: viewedServiceIds } });
    const categories = viewedServices.map(s => s.category).filter(c => c);

    if (categories.length > 0) {
      recommendedServices = await Service.find({
        category: { $in: categories },
        _id: { $nin: viewedServiceIds },
        status: 'active',
        active: true
      })
        .limit(limit);
    }
  }

  // Fallback to popular services if no behavior data
  if (recommendedServices.length === 0) {
    recommendedServices = await Service.find({
      status: 'active',
      active: true
    })
      .sort({ 'analytics.views': -1 })
      .limit(limit);
  }

  res.status(200).json({
    status: 'success',
    results: recommendedServices.length,
    data: { services: recommendedServices }
  });
});

// ✅ Helper function to resolve category slug/name to ObjectId
async function resolveCategoryId(categoryInput) {
  if (!categoryInput) return null;
  
  // If already a valid ObjectId, return it
  if (mongoose.Types.ObjectId.isValid(categoryInput)) {
    return new mongoose.Types.ObjectId(categoryInput);
  }
  
  // Try to find category by slug or name
  const category = await ServiceCategory.findOne({
    $or: [
      { slug: categoryInput.toLowerCase() },
      { name: new RegExp(`^${categoryInput}$`, 'i') }
    ],
    status: 'active'
  }).select('_id');
  
  return category ? category._id : null;
}

