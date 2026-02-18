const mongoose = require('mongoose');
const Hostel = require('../models/hostelModel');
const HostelCategory = require('../models/hostelCategoryModel');
const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const APIFeatures = require('../utils/apiFeatures');
const cloudinary = require('../config/cloudinary');

const CLOUD_FOLDER = process.env.CLOUDINARY_HOSTEL_FOLDER || 'hostels';

// ✅ Create Hostel with images
exports.createHostel = catchAsync(async (req, res, next) => {
  console.log('🏨 Creating hostel with data:', {
    name: req.body.name,
    category: req.body.category,
    categoryType: typeof req.body.category,
    categoryIsEmpty: req.body.category === '' || req.body.category === null || req.body.category === undefined,
    allBodyKeys: Object.keys(req.body)
  });

  const hostelData = {
    ...req.body,
    owner: req.user._id,
    campus: req.user.campus
  };

  // Convert category to ObjectId if it's a non-empty string
  if (hostelData.category && hostelData.category.trim && hostelData.category.trim() !== '' && typeof hostelData.category === 'string') {
    try {
      hostelData.category = new mongoose.Types.ObjectId(hostelData.category);
      console.log('✅ Category converted to ObjectId:', hostelData.category);
    } catch (err) {
      console.warn('⚠️ Invalid category ObjectId:', hostelData.category);
      hostelData.category = null;
    }
  } else if (!hostelData.category || (typeof hostelData.category === 'string' && hostelData.category.trim() === '')) {
    console.warn('⚠️ Empty category received, setting to null');
    hostelData.category = null;
  }

  // Any authenticated user can create a hostel

  // Handle image uploads
  const images = [];
  if (req.hostelImages?.length > 0) {
    req.hostelImages.forEach(img => {
      images.push({ url: img.url, public_id: img.public_id });
    });
  }

  // Add images to hostel data
  hostelData.images = images.map(i => i.url);
  hostelData.images_meta = images;
  if (images.length > 0) {
    hostelData.thumbnail = images[0].url; // First image as thumbnail
  }

  const hostel = await Hostel.create(hostelData);

  console.log('✅ Hostel created with category:', hostel.category);

  // Notify campus users about new hostel (best-effort)
  (async () => {
    try {
      const Notification = require('../models/notificationModel');
      const campusUsers = await User.find({
        campus: req.user.campus,
        role: { $in: ['buyer', 'both'] },
        _id: { $ne: req.user.id }
      }).limit(100);

      if (campusUsers && campusUsers.length) {
        const notifications = campusUsers.map(user => ({
          user: user._id,
          title: 'New Hostel Available',
          message: `${req.user.fullName || 'A hostel owner'} listed: ${hostelData.name}`,
          type: 'accommodation',
          category: 'info',
          priority: 'normal',
          data: { hostelId: hostel._id, ownerId: req.user.id },
          channels: ['in_app', 'push']
        }));

        await Notification.insertMany(notifications).catch(err => 
          console.error('Failed to insert hostel notifications:', err.message)
        );
      }
    } catch (err) {
      console.error('Hostel notification workflow error:', err.message);
    }
  })();

  res.status(201).json({
    status: 'success',
    data: { hostel }
  });
});

// ✅ Get all hostels with filtering and search
exports.getAllHostels = catchAsync(async (req, res, next) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 12;

  // Build campus filter: ALWAYS filter to user's campus UNLESS they explicitly request allCampuses
  const campusFilter = {};
  
  // Only show all campuses if user explicitly passes allCampuses=true AND is authenticated
  if (req.query.allCampuses === 'true' && req.user) {
    // User explicitly requested all campuses - no campus filter applied
    if (req.query.campus) campusFilter['location.campus'] = req.query.campus; // If specific campus provided, use it
  } else if (req.user?.campus) {
    // DEFAULT: Always restrict to user's campus for security
    // Handle both populated campus object and campus ID
    const campusId = req.user.campus._id || req.user.campus;
    campusFilter['location.campus'] = campusId;
  }

  // Build advanced filters for search
  const advancedFilters = { ...campusFilter };

  // Category filter - convert string to ObjectId
  if (req.query.category) {
    try {
      advancedFilters.category = new mongoose.Types.ObjectId(req.query.category);
    } catch (err) {
      // Invalid ObjectId - skip the filter
      console.warn('Invalid category ObjectId:', req.query.category);
    }
  }

  // Map frontend parameter names to schema field names
  if (req.query.hostelType) {
    advancedFilters.type = req.query.hostelType;
  }

  // Price range filtering (minPrice and maxPrice for rooms)
  if (req.query.minPrice || req.query.maxPrice) {
    advancedFilters['roomTypes.price'] = {};
    if (req.query.minPrice) {
      advancedFilters['roomTypes.price'].$gte = Number(req.query.minPrice);
    }
    if (req.query.maxPrice) {
      advancedFilters['roomTypes.price'].$lte = Number(req.query.maxPrice);
    }
  }

  // Minimum rating filter
  if (req.query.minRating) {
    advancedFilters.ratingsAverage = { $gte: Number(req.query.minRating) };
  }

  // Amenities filter (comma-separated list)
  if (req.query.amenities) {
    const amenitiesArray = req.query.amenities.split(',').map(a => a.trim());
    advancedFilters.amenities = { $in: amenitiesArray };
  }

  // Room types filter (comma-separated list)
  if (req.query.roomTypes) {
    const roomTypesArray = req.query.roomTypes.split(',').map(rt => rt.trim());
    advancedFilters['roomTypes.type'] = { $in: roomTypesArray };
  }

  // Occupancy filter (comma-separated list) - convert strings to numbers
  if (req.query.occupancy) {
    const occupancyArray = req.query.occupancy.split(',').map(o => {
      const trimmed = o.trim();
      // Convert text values to numbers: '1 person' -> 1, '4+ people' -> 4
      if (trimmed === '4+ people') return 4;
      const num = parseInt(trimmed);
      return isNaN(num) ? null : num;
    }).filter(o => o !== null);
    
    if (occupancyArray.length > 0) {
      advancedFilters['roomTypes.occupancy'] = { $in: occupancyArray };
    }
  }

  // Room price range filtering
  if (req.query.roomMinPrice || req.query.roomMaxPrice) {
    if (!advancedFilters['roomTypes.price']) {
      advancedFilters['roomTypes.price'] = {};
    }
    if (req.query.roomMinPrice) {
      advancedFilters['roomTypes.price'].$gte = Number(req.query.roomMinPrice);
    }
    if (req.query.roomMaxPrice) {
      advancedFilters['roomTypes.price'].$lte = Number(req.query.roomMaxPrice);
    }
  }

  console.log('🔍 Hostel Advanced Filters:', advancedFilters);

  let baseQuery = Hostel.find(advancedFilters)
    .populate('category', 'name slug');
  
  const features = new APIFeatures(baseQuery, req.query)
    .filter()
    .search()
    .sort()
    .paginate();

  const hostels = await features.query;
  
  // Get total count for pagination
  let countQuery = Hostel.find(advancedFilters);
  const countFeatures = new APIFeatures(countQuery, req.query)
    .search();
  const total = await countFeatures.query.countDocuments();

  res.status(200).json({
    status: 'success',
    results: hostels.length,
    total,
    page,
    pages: Math.ceil(total / limit),
    data: { hostels }
  });
});

// ✅ Search hostels with advanced filters
exports.searchHostels = catchAsync(async (req, res, next) => {
  const {
    campus,
    type,
    minPrice,
    maxPrice,
    amenities,
    searchText,
    sortBy = '-createdAt',
    page = 1,
    limit = 10
  } = req.query;

  let query = { status: 'active', isVerified: true };

  // Filter by campus
  if (campus) {
    query['location.campus'] = campus;
  }

  // Filter by hostel type
  if (type) {
    query.type = type;
  }

  // Filter by price range (minPrice of room types)
  if (minPrice || maxPrice) {
    query['roomTypes.price'] = {};
    if (minPrice) query['roomTypes.price'].$gte = Number(minPrice);
    if (maxPrice) query['roomTypes.price'].$lte = Number(maxPrice);
  }

  // Filter by amenities
  if (amenities) {
    const amenitiesArray = Array.isArray(amenities) ? amenities : amenities.split(',');
    query.amenities = { $in: amenitiesArray };
  }

  // Text search
  if (searchText) {
    query.$text = { $search: searchText };
  }

  const skip = (page - 1) * limit;
  const hostels = await Hostel.find(query)
    .populate('category', 'name slug')
    .populate('owner', 'fullName email')
    .sort(sortBy)
    .skip(skip)
    .limit(Number(limit));

  const total = await Hostel.countDocuments(query);

  res.status(200).json({
    status: 'success',
    results: hostels.length,
    total,
    page: Number(page),
    pages: Math.ceil(total / limit),
    data: { hostels }
  });
});

// ✅ Get single hostel
exports.getHostel = catchAsync(async (req, res, next) => {
  const hostel = await Hostel.findById(req.params.id)
    .populate('category', 'name slug')
    .populate('owner', 'fullName email');

  if (!hostel) {
    return next(new AppError('Hostel not found', 404));
  }

  // Increment views
  hostel.analytics.views += 1;
  hostel.analytics.lastViewed = new Date();
  await hostel.save({ validateBeforeSave: false });

  res.status(200).json({
    status: 'success',
    data: { hostel }
  });
});

// ✅ Get hostels by owner
exports.getMyHostels = catchAsync(async (req, res, next) => {
  const hostels = await Hostel.find({ owner: req.user._id })
    .populate('category', 'name slug')
    .sort('-createdAt');

  res.status(200).json({
    status: 'success',
    results: hostels.length,
    data: { hostels }
  });
});

// ✅ Update hostel
exports.updateHostel = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  let hostel = await Hostel.findById(id);

  if (!hostel) {
    return next(new AppError('Hostel not found', 404));
  }

  // Verify ownership
  if (hostel.owner.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(new AppError('You can only update your own hostels', 403));
  }

  // Update allowed fields (prevent owner/campus change)
  const allowedFields = [
    'name', 'description', 'type', 'hostelClass', 'category',
    'amenities', 'roomTypes', 'contact', 'policies',
    'location', 'availabilityStatus', 'tags',
    'phoneNumber', 'whatsappNumber', 'website', 'rules'
  ];

  Object.keys(req.body).forEach(key => {
    if (allowedFields.includes(key)) {
      if (key === 'phoneNumber' || key === 'whatsappNumber') {
        // Update nested contact field
        hostel.contact = hostel.contact || {};
        hostel.contact[key] = req.body[key];
      } else if (key === 'category') {
        // Convert category to ObjectId if it's a non-empty string
        if (req.body[key] && typeof req.body[key] === 'string' && req.body[key].trim() !== '') {
          try {
            hostel[key] = new mongoose.Types.ObjectId(req.body[key]);
            console.log('✅ Category converted to ObjectId:', hostel[key]);
          } catch (err) {
            console.warn('⚠️ Invalid category ObjectId:', req.body[key]);
            hostel[key] = null;
          }
        } else {
          hostel[key] = req.body[key];
        }
      } else {
        hostel[key] = req.body[key];
      }
    }
  });

  // Handle new image uploads
  if (req.hostelImages?.length > 0) {
    // Delete old images from Cloudinary
    if (hostel.images_meta?.length > 0) {
      for (const meta of hostel.images_meta) {
        await cloudinary.uploader.destroy(meta.public_id).catch(err =>
          console.error('Failed to delete old image:', err.message)
        );
      }
    }

    // Add new images
    const images = [];
    req.hostelImages.forEach(img => {
      images.push({ url: img.url, public_id: img.public_id });
    });
    hostel.images = images.map(i => i.url);
    hostel.images_meta = images;
    hostel.thumbnail = images[0].url;
  }

  hostel.lastModifiedBy = req.user._id;
  await hostel.save();

  res.status(200).json({
    status: 'success',
    message: 'Hostel updated successfully',
    data: { hostel }
  });
});

// ✅ Add images to existing hostel
exports.addHostelImages = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  let hostel = await Hostel.findById(id);

  if (!hostel) {
    return next(new AppError('Hostel not found', 404));
  }

  // Verify ownership
  if (hostel.owner.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(new AppError('You can only modify your own hostels', 403));
  }

  if (!req.hostelImages?.length) {
    return next(new AppError('No images provided', 400));
  }

  // Max 20 images total
  const currentCount = hostel.images_meta?.length || 0;
  if (currentCount + req.hostelImages.length > 20) {
    return next(new AppError('Cannot exceed 20 images total', 400));
  }

  // Add new images
  req.hostelImages.forEach(img => {
    hostel.images.push(img.url);
    hostel.images_meta.push({
      url: img.url,
      public_id: img.public_id,
      uploadedAt: new Date()
    });
  });

  await hostel.save();

  res.status(200).json({
    status: 'success',
    message: 'Images added successfully',
    data: { hostel }
  });
});

// ✅ Delete hostel
exports.deleteHostel = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const hostel = await Hostel.findById(id);

  if (!hostel) {
    return next(new AppError('Hostel not found', 404));
  }

  // Verify ownership
  if (hostel.owner.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(new AppError('You can only delete your own hostels', 403));
  }

  // Delete images from Cloudinary (best-effort)
  if (hostel.images_meta?.length > 0) {
    for (const meta of hostel.images_meta) {
      await cloudinary.uploader.destroy(meta.public_id).catch(err =>
        console.error('Failed to delete image:', err.message)
      );
    }
  }

  await Hostel.findByIdAndDelete(id);

  res.status(204).json({
    status: 'success',
    data: null
  });
});

// ✅ Get hostel reviews and ratings
exports.getHostelRatings = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { page = 1, limit = 10 } = req.query;

  const hostel = await Hostel.findById(id);
  if (!hostel) {
    return next(new AppError('Hostel not found', 404));
  }

  const skip = (page - 1) * limit;
  const ratings = hostel.ratings
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(skip, skip + Number(limit));

  res.status(200).json({
    status: 'success',
    results: ratings.length,
    total: hostel.ratings.length,
    data: {
      averageRating: hostel.ratingsAverage,
      totalRatings: hostel.ratingsQuantity,
      ratings
    }
  });
});

// ✅ Add rating to hostel
exports.addHostelRating = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { rating, review } = req.body;

  if (!rating || rating < 1 || rating > 5) {
    return next(new AppError('Rating must be between 1 and 5', 400));
  }

  let hostel = await Hostel.findById(id);
  if (!hostel) {
    return next(new AppError('Hostel not found', 404));
  }

  // Add rating
  hostel.ratings.push({
    rating,
    review,
    reviewer: req.user._id,
    createdAt: new Date()
  });

  // Recalculate average
  const totalRating = hostel.ratings.reduce((sum, r) => sum + r.rating, 0);
  hostel.ratingsAverage = Math.round((totalRating / hostel.ratings.length) * 10) / 10;
  hostel.ratingsQuantity = hostel.ratings.length;

  await hostel.save();

  res.status(201).json({
    status: 'success',
    data: { hostel }
  });
});

// ✅ Get nearby hostels (geolocation-based)
exports.getNearbyHostels = catchAsync(async (req, res, next) => {
  const { lng, lat, maxDistance = 5000 } = req.query; // maxDistance in meters

  if (!lng || !lat) {
    return next(new AppError('Longitude and latitude are required', 400));
  }

  const hostels = await Hostel.find({
    status: 'active',
    'location.coordinates': {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [Number(lng), Number(lat)]
        },
        $maxDistance: Number(maxDistance)
      }
    }
  }).limit(20);

  res.status(200).json({
    status: 'success',
    results: hostels.length,
    data: { hostels }
  });
});

// ✅ Verify hostel (admin only)
exports.verifyHostel = catchAsync(async (req, res, next) => {
  if (req.user.role !== 'admin') {
    return next(new AppError('Only admins can verify hostels', 403));
  }

  const { id } = req.params;
  const hostel = await Hostel.findByIdAndUpdate(
    id,
    {
      isVerified: true,
      verifiedAt: new Date(),
      verifiedBy: req.user._id,
      status: 'active'
    },
    { new: true, runValidators: true }
  );

  if (!hostel) {
    return next(new AppError('Hostel not found', 404));
  }

  res.status(200).json({
    status: 'success',
    message: 'Hostel verified successfully',
    data: { hostel }
  });
});

// ✅ Get search suggestions for autocomplete
exports.getHostelSearchSuggestions = catchAsync(async (req, res, next) => {
  const { q: query, limit = 5 } = req.query;

  if (!query || query.length < 2) {
    return res.status(200).json({
      status: 'success',
      results: 0,
      data: { suggestions: [] }
    });
  }

  // First try: Search with status filters
  let suggestions = await Hostel.find({
    status: 'active',
    $or: [
      { name: { $regex: query, $options: 'i' } },
      { description: { $regex: query, $options: 'i' } },
      { hostelClass: { $regex: query, $options: 'i' } }
    ]
  })
    .select('_id name hostelClass location.address location.campus minPrice')
    .limit(Math.min(parseInt(limit, 10) || 5, 20));

  // If no results, try without strict filters
  if (suggestions.length === 0) {
    suggestions = await Hostel.find({
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
        { hostelClass: { $regex: query, $options: 'i' } }
      ]
    })
      .select('_id name hostelClass location.address location.campus minPrice')
      .limit(Math.min(parseInt(limit, 10) || 5, 20));
  }

  // Extract unique suggestions
  const uniqueSuggestions = new Map();
  
  suggestions.forEach(hostel => {
    if (hostel.name && !uniqueSuggestions.has(hostel.name.toLowerCase())) {
      uniqueSuggestions.set(hostel.name.toLowerCase(), {
        id: hostel._id,
        title: hostel.name,
        location: hostel.location?.address || 'Not specified',
        price: hostel.minPrice,
        type: hostel.hostelClass
      });
    }
  });

  const suggestionsList = Array.from(uniqueSuggestions.values()).slice(0, limit);

  res.status(200).json({
    status: 'success',
    results: suggestionsList.length,
    data: { suggestions: suggestionsList }
  });
});

// ✅ Get search history for user
exports.getHostelSearchHistory = catchAsync(async (req, res, next) => {
  const { limit = 10 } = req.query;
  const userId = req.user?._id || req.user?.id;

  if (!userId) {
    return res.status(200).json({
      status: 'success',
      results: 0,
      data: { history: [] }
    });
  }

  // For now, return empty history (can be implemented with a SearchHistory model if needed)
  res.status(200).json({
    status: 'success',
    results: 0,
    data: { history: [] }
  });
});

// ✅ Get popular hostels
exports.getPopularHostels = catchAsync(async (req, res, next) => {
  const { limit = 10 } = req.query;

  const hostels = await Hostel.find({
    status: 'active'
  })
    .select('_id name hostelClass location.address location.campus minPrice analytics.views')
    .sort({ 'analytics.views': -1 })
    .limit(Math.min(parseInt(limit, 10) || 10, 50));

  // Format for frontend compatibility
  const formattedHostels = hostels.map(hostel => ({
    id: hostel._id,
    title: hostel.name,
    query: hostel.name,
    location: hostel.location?.address || 'Not specified',
    price: hostel.minPrice,
    type: hostel.hostelClass,
    count: hostel.analytics?.views || 0
  }));

  res.status(200).json({
    status: 'success',
    results: formattedHostels.length,
    data: { searches: formattedHostels }
  });
});

// ✅ Get hostel reviews
exports.getHostelReviews = catchAsync(async (req, res, next) => {
  const HostelReview = require('../models/hostelReviewModel');
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skip = (page - 1) * limit;
  const sort = req.query.sort || '-createdAt';

  const reviews = await HostelReview.find({ hostel: req.params.id })
    .populate('user', 'fullName role campus')
    .sort(sort)
    .skip(skip)
    .limit(limit);

  const total = await HostelReview.countDocuments({ hostel: req.params.id });

  res.status(200).json({
    status: 'success',
    results: reviews.length,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    },
    data: { reviews }
  });
});

// ✅ Add hostel review
exports.addHostelReview = catchAsync(async (req, res, next) => {
  const HostelReview = require('../models/hostelReviewModel');
  const { rating, title, content } = req.body;

  if (!rating) {
    return next(new AppError('Please provide a rating', 400));
  }

  // Check if hostel exists
  const hostel = await Hostel.findById(req.params.id);
  if (!hostel) {
    return next(new AppError('Hostel not found', 404));
  }

  // Check if user already reviewed this hostel
  const existingReview = await HostelReview.findOne({
    hostel: req.params.id,
    user: req.user._id
  });

  if (existingReview) {
    return next(new AppError('You have already reviewed this hostel', 400));
  }

  const review = await HostelReview.create({
    hostel: req.params.id,
    user: req.user._id,
    rating,
    title,
    content
  });

  // Populate before sending
  await review.populate('user', 'fullName role campus');

  res.status(201).json({
    status: 'success',
    data: { review }
  });
});

// ✅ Get hostel rating statistics
exports.getHostelRatingStats = catchAsync(async (req, res, next) => {
  const HostelReview = require('../models/hostelReviewModel');
  const mongoose = require('mongoose');

  const stats = await HostelReview.aggregate([
    { $match: { hostel: new mongoose.Types.ObjectId(req.params.id) } },
    {
      $group: {
        _id: '$hostel',
        avgRating: { $avg: '$rating' },
        totalReviews: { $sum: 1 },
        ratingDistribution: {
          $push: '$rating'
        }
      }
    }
  ]);

  const distribution = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0
  };

  let averageRating = 0;
  let totalReviews = 0;

  if (stats.length > 0) {
    averageRating = stats[0].avgRating || 0;
    totalReviews = stats[0].totalReviews || 0;
    stats[0].ratingDistribution.forEach(rating => {
      distribution[rating]++;
    });
  }

  res.status(200).json({
    status: 'success',
    data: {
      averageRating,
      totalReviews,
      distribution
    }
  });
});

// ✅ Update hostel review
exports.updateHostelReview = catchAsync(async (req, res, next) => {
  const HostelReview = require('../models/hostelReviewModel');
  const { rating, title, content } = req.body;

  const review = await HostelReview.findById(req.params.id);
  if (!review) {
    return next(new AppError('Review not found', 404));
  }

  // Check if user is the review author or admin
  const isAuthor = review.user.toString() === req.user._id.toString();
  const isAdmin = req.user.role === 'admin';
  
  if (!isAuthor && !isAdmin) {
    return next(new AppError('You can only update your own reviews', 403));
  }

  // Update allowed fields
  if (rating) review.rating = rating;
  if (title) review.title = title;
  if (content) review.content = content;

  await review.save();
  await review.populate('user', 'fullName role campus');

  res.status(200).json({
    status: 'success',
    message: 'Review updated successfully',
    data: { review }
  });
});

// ✅ Delete hostel review
exports.deleteHostelReview = catchAsync(async (req, res, next) => {
  const HostelReview = require('../models/hostelReviewModel');

  const review = await HostelReview.findById(req.params.id);
  if (!review) {
    return next(new AppError('Review not found', 404));
  }

  // Check if user is the review author or admin
  const isAuthor = review.user.toString() === req.user._id.toString();
  const isAdmin = req.user.role === 'admin';
  
  if (!isAuthor && !isAdmin) {
    return next(new AppError('You can only delete your own reviews', 403));
  }

  await HostelReview.findByIdAndDelete(req.params.id);

  res.status(200).json({
    status: 'success',
    message: 'Review deleted successfully',
    data: null
  });
});

// ✅ Mark review as helpful
exports.markReviewHelpful = catchAsync(async (req, res, next) => {
  const HostelReview = require('../models/hostelReviewModel');

  const review = await HostelReview.findById(req.params.id);
  if (!review) {
    return next(new AppError('Review not found', 404));
  }

  // Check if user already marked as helpful
  const userIdStr = req.user._id.toString();
  const alreadyMarked = review.helpfulUsers.some(id => id.toString() === userIdStr);
  
  if (alreadyMarked) {
    return next(new AppError('You have already marked this review as helpful', 400));
  }

  review.helpfulUsers.push(req.user._id);
  review.helpfulCount = (review.helpfulCount || 0) + 1;
  await review.save();

  res.status(200).json({
    status: 'success',
    message: 'Review marked as helpful',
    data: { review }
  });
});

// ✅ Get Hostel Types
exports.getHostelTypes = catchAsync(async (req, res, next) => {
  // Get all unique hostel types from the database
  const types = await Hostel.distinct('type');
  
  // Fallback to default types if none found
  const defaultTypes = ['Boys', 'Girls', 'Mixed', 'Family'];
  const allTypes = types.length > 0 ? types : defaultTypes;

  res.status(200).json({
    status: 'success',
    data: {
      types: allTypes
    }
  });
});

// ✅ Get Amenities
exports.getHostelAmenities = catchAsync(async (req, res, next) => {
  // Get all unique amenities from hostels
  const hostelsWithAmenities = await Hostel.find({}, 'amenities');
  
  const amenitiesSet = new Set();
  hostelsWithAmenities.forEach(hostel => {
    if (hostel.amenities && Array.isArray(hostel.amenities)) {
      hostel.amenities.forEach(amenity => amenitiesSet.add(amenity));
    }
  });

  // Fallback to default amenities if none found
  const defaultAmenities = ['WiFi', 'Power Supply', 'AC', 'Security Gate', 'CCTV', 'Generator', 'Laundry Service', 'TV', 'Fan', 'Solar Power'];
  const amenities = amenitiesSet.size > 0 ? Array.from(amenitiesSet) : defaultAmenities;

  res.status(200).json({
    status: 'success',
    data: {
      amenities: amenities
    }
  });
});

// ✅ Get Price Range
exports.getPriceRange = catchAsync(async (req, res, next) => {
  const priceStats = await Hostel.aggregate([
    {
      $group: {
        _id: null,
        min: { $min: '$pricePerBed' },
        max: { $max: '$pricePerBed' },
        avg: { $avg: '$pricePerBed' }
      }
    }
  ]);

  const rangeData = priceStats.length > 0 
    ? {
        min: priceStats[0].min || 0,
        max: priceStats[0].max || 500000,
        avg: Math.round(priceStats[0].avg) || 50000
      }
    : { min: 0, max: 500000, avg: 50000 };

  res.status(200).json({
    status: 'success',
    data: rangeData
  });
});

module.exports = exports;
