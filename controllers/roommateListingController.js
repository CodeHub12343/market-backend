const RoomateListing = require('../models/roommateListingModel');
const RoommateCategory = require('../models/roommateCategoryModel');
const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const APIFeatures = require('../utils/apiFeatures');
const cloudinary = require('../config/cloudinary');

const CLOUD_FOLDER = process.env.CLOUDINARY_ROOMMATE_FOLDER || 'roommate-listings';

// ✅ Create roommate listing
exports.createRoomateListing = catchAsync(async (req, res, next) => {
  // Get rent from either 'rent' or 'rentPrice' field
  const rentAmount = req.body.rent || req.body.rentPrice

  // Transform form data to match schema
  const listingData = {
    title: req.body.title,
    description: req.body.description,
    poster: req.user._id,
    roomType: req.body.roomType || 'shared',
    location: {
      address: req.body.location,
      city: req.body.city || 'Unknown',
      campus: req.user.campus || req.body.campus
      // Note: Only include coordinates if both longitude and latitude are provided
      // Otherwise MongoDB geospatial index will fail
    },
    accommodation: req.body.accommodation || 'apartment',
    numberOfRooms: req.body.roommates ? Number(req.body.roommates) : 1,
    budget: {
      minPrice: rentAmount ? Number(rentAmount) : 0,
      maxPrice: rentAmount ? Number(rentAmount) : 0,
      currency: 'NGN',
      pricingPeriod: 'per-month'
    },
    preferences: {
      genderPreference: req.body.genderPreference || 'any'
    },
    contact: {
      phoneNumber: req.body.phoneNumber || req.user.phoneNumber || '+234',
      email: req.body.email || req.user.email,
      whatsapp: req.body.whatsapp,
      preferredContactMethod: req.body.preferredContactMethod || 'whatsapp'
    },
    amenities: Array.isArray(req.body.amenities) ? req.body.amenities : [],
    availableFrom: req.body.availableFrom || new Date(),
    status: 'active',
    isAvailable: req.body.isAvailable !== 'false'
  }

  // Handle images from multer
  const images = []
  if (req.roommateImages?.length > 0) {
    req.roommateImages.forEach(img => {
      images.push(img.url)
    })
  }

  if (images.length > 0) {
    listingData.images = images
  }

  const listing = await RoomateListing.create(listingData)

  res.status(201).json({
    status: 'success',
    data: { listing }
  })
});

// ✅ Get all roommate listings with filters
exports.getAllRoommateListings = catchAsync(async (req, res, next) => {
  console.log('\n📋 getAllRoommateListings called with query:', JSON.stringify(req.query));
  console.log('   🔐 req.user:', req.user ? `${req.user.fullName} (${req.user.email})` : '❌ NOT AUTHENTICATED');
  console.log('   🏫 req.user.campus._id:', req.user?.campus?._id?.toString());
  console.log('   Search term:', req.query.search);
  console.log('   Page:', req.query.page);
  console.log('   Limit:', req.query.limit);
  
  // Build campus filter: DEFAULT to user's campus, UNLESS they explicitly request allCampuses
  const campusFilter = {};
  if (req.query.allCampuses === 'true') {
    // User explicitly requested all campuses - don't filter by campus
    if (req.query.campus) campusFilter['location.campus'] = req.query.campus;
    console.log('   ✅ allCampuses=true → showing all campuses');
  } else {
    // DEFAULT: Show only user's campus
    if (req.user?.campus) {
      campusFilter['location.campus'] = req.user.campus._id || req.user.campus;
      console.log('   ✅ DEFAULT: Filtering by user campus:', campusFilter['location.campus']?.toString());
    } else {
      console.log('   ⚠️ NO USER OR CAMPUS → NO FILTER APPLIED');
    }
  }

  const initialFilter = { status: 'active', ...campusFilter };
  console.log('   🔍 Initial Mongoose filter:', JSON.stringify(initialFilter, null, 2));
  
  const features = new APIFeatures(
    RoomateListing.find(initialFilter),
    req.query
  )
    .filter()
    .search()
    .sort()
    .paginate();

  const listings = await features.query
    .populate('category', 'name slug')
    .populate('poster', 'fullName email');
  
  console.log('✅ Found listings:', listings.length);
  if (listings.length > 0) {
    console.log('📊 Sample listing:', {
      title: listings[0].title,
      lifestyle: listings[0].preferences?.lifestyleCompatibility,
      amenities: listings[0].amenities
    });
  } else {
    console.log('❌ No listings found for search:', req.query.search);
    // Check if there are ANY active listings
    const totalActive = await RoomateListing.countDocuments({ status: 'active' });
    console.log('📊 Total active listings in DB:', totalActive);
  }

  res.status(200).json({
    status: 'success',
    results: listings.length,
    data: { listings }
  });
});

// ✅ Search roommate listings with advanced filters
exports.searchRoommateListings = catchAsync(async (req, res, next) => {
  const {
    campus,
    gender,
    genderPreference,
    roomType,
    minPrice,
    maxPrice,
    accommodation,
    amenities,
    lifestyleCompatibility,
    searchText,
    sortBy = '-createdAt',
    page = 1,
    limit = 10
  } = req.query;

  let query = { status: 'active' };

  // Filter by campus
  if (campus) {
    query['location.campus'] = campus;
  }

  // Filter by gender preference (accept both 'gender' and 'genderPreference' parameter names)
  const preferredGender = gender || genderPreference;
  if (preferredGender) {
    query['preferences.genderPreference'] = preferredGender;
  }

  // Filter by room type
  if (roomType) {
    query.roomType = roomType;
  }

  // Filter by budget
  if (minPrice || maxPrice) {
    query['budget.minPrice'] = query['budget.minPrice'] || {};
    query['budget.maxPrice'] = query['budget.maxPrice'] || {};
    
    if (minPrice) {
      query['budget.maxPrice'].$gte = Number(minPrice); // User's budget min should not exceed listing min
    }
    if (maxPrice) {
      query['budget.minPrice'].$lte = Number(maxPrice); // User's budget max should not be less than listing max
    }
  }

  // Filter by accommodation type
  if (accommodation) {
    query.accommodation = accommodation;
  }

  // Filter by amenities (handle both single value and array/comma-separated)
  if (amenities) {
    const amenitiesArray = Array.isArray(amenities) 
      ? amenities.filter(a => a && a.trim()) 
      : amenities.split(',').map(a => a.trim()).filter(a => a);
    if (amenitiesArray.length > 0) {
      query.requiredAmenities = { $in: amenitiesArray };
    }
  }

  // Filter by lifestyle compatibility (handle array from checkboxes)
  if (lifestyleCompatibility) {
    const lifestyleArray = Array.isArray(lifestyleCompatibility)
      ? lifestyleCompatibility.filter(l => l && l.trim())
      : lifestyleCompatibility.split(',').map(l => l.trim()).filter(l => l);
    if (lifestyleArray.length > 0) {
      // Match listings that have ANY of the selected lifestyle traits
      query['preferences.lifestyleCompatibility'] = { $in: lifestyleArray };
    }
  }

  // Text search
  if (searchText) {
    query.$text = { $search: searchText };
  }

  const skip = (page - 1) * limit;
  const listings = await RoomateListing.find(query)
    .populate('category', 'name slug')
    .populate('poster', 'fullName email')
    .sort(sortBy)
    .skip(skip)
    .limit(Number(limit));

  const total = await RoomateListing.countDocuments(query);

  res.status(200).json({
    status: 'success',
    results: listings.length,
    total,
    page: Number(page),
    pages: Math.ceil(total / limit),
    data: { listings }
  });
});

// ✅ Get single roommate listing
exports.getRoomateListing = catchAsync(async (req, res, next) => {
  console.log('🔍 getRoomateListing called with ID:', req.params.id);
  console.log('👤 Current user:', req.user);
  console.log('🔐 Auth header:', req.headers.authorization);
  
  const listing = await RoomateListing.findById(req.params.id)
    .populate('poster', '_id fullName email')
    .populate('category', 'name slug');

  if (!listing) {
    console.log('⚠️ Listing not found for ID:', req.params.id);
    return next(new AppError('Roommate listing not found', 404));
  }

  console.log('✅ Found listing:', listing._id, listing.title);
  console.log('📍 Poster ID:', listing.poster._id);

  // Increment views
  listing.analytics.views += 1;
  listing.analytics.lastViewed = new Date();
  await listing.save({ validateBeforeSave: false });

  // Convert to plain object and add isOwner property
  const listingObj = listing.toObject();
  const isOwner = req.user && listing.poster && listing.poster._id.toString() === req.user._id.toString();
  console.log('🔑 isOwner calculation:', { hasUser: !!req.user, hasPoster: !!listing.poster, isOwner });
  listingObj.isOwner = isOwner;

  res.status(200).json({
    status: 'success',
    data: { listing: listingObj }
  });
});

// ✅ Get my roommate listings
exports.getMyRoommateListings = catchAsync(async (req, res, next) => {
  const listings = await RoomateListing.find({ poster: req.user._id })
    .populate('category', 'name slug')
    .sort('-createdAt');

  res.status(200).json({
    status: 'success',
    results: listings.length,
    data: { listings }
  });
});

// ✅ Update roommate listing
exports.updateRoomateListing = catchAsync(async (req, res, next) => {
  const { id } = req.params
  let listing = await RoomateListing.findById(id)

  if (!listing) {
    return next(new AppError('Roommate listing not found', 404))
  }

  // Verify ownership
  if (listing.poster.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return next(new AppError('You can only update your own listings', 403))
  }

  // Transform form data to match schema
  if (req.body.title) listing.title = req.body.title
  if (req.body.description) listing.description = req.body.description
  if (req.body.location) {
    listing.location = {
      ...listing.location,
      address: req.body.location,
      city: req.body.city || listing.location?.city || 'Unknown'
    }
  }
  if (req.body.roomType) listing.roomType = req.body.roomType
  if (req.body.roommates) listing.numberOfRooms = Number(req.body.roommates)
  
  // Handle rent from either 'rent' or 'rentPrice' field
  const rentAmount = req.body.rent || req.body.rentPrice
  if (rentAmount) {
    listing.budget = {
      ...listing.budget,
      minPrice: Number(rentAmount),
      maxPrice: Number(rentAmount)
    }
  }
  
  if (req.body.amenities) {
    listing.amenities = Array.isArray(req.body.amenities) ? req.body.amenities : []
  }
  if (req.body.availableFrom) listing.availableFrom = req.body.availableFrom
  if (req.body.isAvailable !== undefined) {
    listing.isAvailable = req.body.isAvailable !== 'false'
  }

  // Handle new image uploads
  if (req.roommateImages?.length > 0) {
    const images = []
    req.roommateImages.forEach(img => {
      images.push(img.url)
    })
    listing.images = images
  }

  await listing.save()

  res.status(200).json({
    status: 'success',
    data: { listing }
  })
})

// ✅ Add images to roommate listing
exports.addRoommateImages = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  let listing = await RoomateListing.findById(id);

  if (!listing) {
    return next(new AppError('Roommate listing not found', 404));
  }

  // Verify ownership
  if (listing.poster.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(new AppError('You can only modify your own listings', 403));
  }

  if (!req.roommateImages?.length) {
    return next(new AppError('No images provided', 400));
  }

  // Max 10 images total
  const currentCount = listing.images_meta?.length || 0;
  if (currentCount + req.roommateImages.length > 10) {
    return next(new AppError('Cannot exceed 10 images total', 400));
  }

  // Add new images
  req.roommateImages.forEach(img => {
    listing.images.push(img.url);
    listing.images_meta.push({
      url: img.url,
      public_id: img.public_id,
      uploadedAt: new Date()
    });
  });

  await listing.save();

  res.status(200).json({
    status: 'success',
    message: 'Images added successfully',
    data: { listing }
  });
});

// ✅ Close roommate listing
exports.closeRoomateListing = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { reason } = req.body;

  let listing = await RoomateListing.findById(id);
  if (!listing) {
    return next(new AppError('Roommate listing not found', 404));
  }

  // Verify ownership
  if (listing.poster.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(new AppError('You can only close your own listings', 403));
  }

  listing.status = 'closed';
  listing.closedAt = new Date();
  listing.closedReason = reason || 'manual-close';

  await listing.save();

  res.status(200).json({
    status: 'success',
    message: 'Listing closed successfully',
    data: { listing }
  });
});

// ✅ Delete roommate listing
exports.deleteRoomateListing = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const listing = await RoomateListing.findById(id);

  if (!listing) {
    return next(new AppError('Roommate listing not found', 404));
  }

  console.log('🔐 deleteRoomateListing called');
  console.log('   req.headers.authorization:', req.headers.authorization);
  console.log('   req.user (from protect):', req.user ? { id: req.user._id, role: req.user.role, email: req.user.email } : null);
  console.log('   listing.poster (raw):', listing.poster);
  console.log('   listing.poster.toString():', listing.poster?.toString ? listing.poster.toString() : listing.poster);

  // Verify ownership
  const posterId = listing.poster?._id?.toString() || (listing.poster?.toString && listing.poster.toString());
  const userId = req.user._id?.toString();
  console.log('   posterId computed:', posterId);
  console.log('   userId computed:', userId);
  if (posterId !== userId && req.user.role !== 'admin') {
    return next(new AppError('You can only delete your own listings', 403));
  }

  // Delete images (best-effort)
  if (listing.images_meta?.length > 0) {
    for (const meta of listing.images_meta) {
      await cloudinary.uploader.destroy(meta.public_id).catch(err =>
        console.error('Failed to delete image:', err.message)
      );
    }
  }

  await RoomateListing.findByIdAndDelete(id);

  res.status(204).json({
    status: 'success',
    data: null
  });
});

// ✅ Register inquiry for roommate listing (track interest)
exports.registerInquiry = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  let listing = await RoomateListing.findById(id);
  if (!listing) {
    return next(new AppError('Roommate listing not found', 404));
  }

  listing.analytics.inquiries += 1;
  await listing.save({ validateBeforeSave: false });

  res.status(200).json({
    status: 'success',
    message: 'Inquiry registered',
    data: { inquiryCount: listing.analytics.inquiries }
  });
});

// ✅ Get nearby roommate listings (geolocation)
exports.getNearbyRoommateListings = catchAsync(async (req, res, next) => {
  const { lng, lat, maxDistance = 5000 } = req.query; // maxDistance in meters

  if (!lng || !lat) {
    return next(new AppError('Longitude and latitude are required', 400));
  }

  const listings = await RoomateListing.find({
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
  })
    .populate('category', 'name slug')
    .populate('poster', 'fullName email')
    .limit(20);

  res.status(200).json({
    status: 'success',
    results: listings.length,
    data: { listings }
  });
});

// ✅ Get matching roommate listings based on user profile
exports.getMatchingListings = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  if (!user) {
    return next(new AppError('User not found', 404));
  }

  const { page = 1, limit = 10 } = req.query;

  // Build query based on user profile
  let query = {
    status: 'active',
    'location.campus': user.campus
  };

  // Try to match gender preference
  if (user.gender) {
    query['preferences.genderPreference'] = { $in: [user.gender, 'any'] };
  }

  // Try to match department if available
  if (user.department) {
    query['preferences.departments'] = { $in: [user.department, ''] };
  }

  const skip = (page - 1) * limit;
  const listings = await RoomateListing.find(query)
    .sort('-createdAt')
    .skip(skip)
    .limit(Number(limit));

  const total = await RoomateListing.countDocuments(query);

  res.status(200).json({
    status: 'success',
    results: listings.length,
    total,
    page: Number(page),
    pages: Math.ceil(total / limit),
    data: { listings }
  });
});

module.exports = exports;
