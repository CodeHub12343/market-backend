const multer = require('multer');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const Hostel = require('../models/hostelModel');
const RoomateListing = require('../models/roommateListingModel');

// ✅ Multer configuration for hostel images
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB per image
    files: 20 // Max 20 images
  },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new AppError('Only image files are allowed', 400), false);
    }
    cb(null, true);
  }
});

// Upload hostel images - accept any fields (text + file)
exports.uploadHostelImages = upload.any();

// Upload roommate listing images
exports.uploadRoommateImages = upload.array('images', 10);

// Process and upload hostel images to Cloudinary
exports.processHostelImages = catchAsync(async (req, res, next) => {
  // Handle files from .any() - they'll be in req.files array
  if (!req.files || req.files.length === 0) {
    return next();
  }

  try {
    const cloudinary = require('../config/cloudinary');
    const { uploadBuffer } = require('../utils/cloudinaryUpload');
    
    const uploadedImages = [];
    const folder = process.env.CLOUDINARY_HOSTEL_FOLDER || 'hostels';

    // Process all uploaded files (should only be images)
    for (const file of req.files) {
      const result = await uploadBuffer(file.buffer, {
        folder,
        resource_type: 'auto',
        public_id: `${folder}/${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      });

      uploadedImages.push({
        url: result.secure_url,
        public_id: result.public_id
      });
    }

    req.hostelImages = uploadedImages;
    next();
  } catch (err) {
    return next(new AppError(`Image upload failed: ${err.message}`, 500));
  }
});

// Process and upload roommate listing images
exports.processRoommateImages = catchAsync(async (req, res, next) => {
  if (!req.files || req.files.length === 0) {
    req.roommateImages = [];
    return next();
  }

  try {
    const { uploadBuffer } = require('../utils/cloudinaryUpload');
    
    const folder = process.env.CLOUDINARY_ROOMMATE_FOLDER || 'roommate-listings';

    console.log(`📸 Starting upload of ${req.files.length} roommate images...`);

    // Upload images in parallel instead of sequentially
    const uploadPromises = req.files.map((file, idx) =>
      uploadBuffer(file.buffer, {
        folder,
        resource_type: 'auto',
        public_id: `${folder}/${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      })
        .then(result => {
          console.log(`✅ Image ${idx + 1} uploaded successfully`);
          return {
            url: result.secure_url,
            public_id: result.public_id
          };
        })
        .catch(err => {
          console.error(`⚠️ Image ${idx + 1} upload failed:`, err.message);
          // Return null for failed uploads, we'll filter them out
          return null;
        })
    );

    const uploadedImages = await Promise.all(uploadPromises);
    
    // Filter out null values (failed uploads) but keep successful ones
    const successfulImages = uploadedImages.filter(img => img !== null);
    
    console.log(`📊 Upload complete: ${successfulImages.length}/${req.files.length} images uploaded successfully`);

    // Allow creation even if some/all images failed to upload
    // Images are optional for roommate listings
    req.roommateImages = successfulImages;
    
    // Warn if some images failed but don't block the request
    if (successfulImages.length < req.files.length) {
      console.warn(`⚠️ ${req.files.length - successfulImages.length} image(s) failed to upload, but listing creation will proceed`);
      req.imageUploadWarning = `${req.files.length - successfulImages.length} image(s) failed to upload`;
    }
    
    next();
  } catch (err) {
    console.error('❌ Image upload error in middleware:', err.message);
    // Even if there's a catastrophic error, allow creation without images
    req.roommateImages = [];
    req.imageUploadError = err.message;
    next();
  }
});

// ✅ Validate hostel ownership
exports.validateHostelOwnership = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const hostel = await Hostel.findById(id);

  if (!hostel) {
    return next(new AppError('Hostel not found', 404));
  }

  // Check if user is the owner or an admin/moderator
  if (hostel.owner.toString() !== req.user.id && !['admin', 'moderator'].includes(req.user.role)) {
    return next(new AppError('You do not have permission to modify this hostel', 403));
  }

  req.hostel = hostel;
  next();
});

// ✅ Validate roommate listing ownership
exports.validateRoommateOwnership = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const listing = await RoomateListing.findById(id).populate('poster', '_id fullName email');

  if (!listing) {
    return next(new AppError('Roommate listing not found', 404));
  }

  console.log('🔐 validateRoommateOwnership DEBUG:');
  console.log('   listing.poster:', listing.poster);
  console.log('   listing.poster._id:', listing.poster?._id);
  console.log('   listing.poster._id.toString():', listing.poster?._id?.toString());
  console.log('   req.user._id:', req.user._id);
  console.log('   req.user._id.toString():', req.user._id?.toString());
  
  const posterId = listing.poster?._id?.toString() || listing.poster?.toString();
  const userId = req.user._id?.toString();
  
  console.log('   Comparing: posterId =', posterId);
  console.log('   Comparing: userId =', userId);
  console.log('   Are they equal?', posterId === userId);

  // Check if user is the poster or an admin/moderator
  if (posterId !== userId && !['admin', 'moderator'].includes(req.user.role)) {
    console.log('❌ Authorization failed. User role:', req.user.role);
    return next(new AppError('You do not have permission to modify this listing', 403));
  }

  console.log('✅ Authorization passed');
  req.roomateListing = listing;
  next();
});

// ✅ Check hostel ownership for deletion (with image cleanup)
exports.checkHostelDeletion = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const hostel = await Hostel.findById(id);

  if (!hostel) {
    return next(new AppError('Hostel not found', 404));
  }

  // Authorization
  if (hostel.owner.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(new AppError('You can only delete your own hostels', 403));
  }

  req.hostel = hostel;
  next();
});

// ✅ Validate hostel data and map frontend format to backend schema
exports.validateHostelData = catchAsync(async (req, res, next) => {
  const { name, description, price, roomType, capacity, address, campus, amenities, phoneNumber, category, type, contact, location, roomTypes } = req.body;

  // === FRONTEND FORMAT (new) - map to backend schema ===
  if (name && address && campus) {
    // Get phoneNumber from either top-level or nested in contact
    const finalPhoneNumber = phoneNumber || contact?.phoneNumber;
    
    // Validate required fields
    if (!name || !address || !campus || !price || !roomType || !finalPhoneNumber) {
      return next(new AppError('Missing required fields: name, address, campus, price, roomType, phoneNumber', 400));
    }

    // Look up campus by name to get ObjectId
    const Campus = require('../models/campusModel');
    const campusDoc = await Campus.findOne({ name: new RegExp(campus, 'i') }); // Case-insensitive search
    
    if (!campusDoc) {
      return next(new AppError(`Campus "${campus}" not found. Please select a valid campus.`, 400));
    }

    // Map frontend fields to backend schema structure
    const amenitiesMap = {
      'wifi': 'WiFi',
      'wifi/internet': 'WiFi',
      'internet': 'WiFi',
      'power': 'Power Supply',
      'power supply': 'Power Supply',
      'electricity': 'Power Supply',
      'laundry': 'Laundry Service',
      'laundry service': 'Laundry Service',
      'kitchen': 'Kitchen',
      'tv': 'TV',
      'television': 'TV',
      'ac': 'AC',
      'air conditioning': 'AC',
      'fan': 'Fan',
      'parking': 'Parking',
      'water': 'Water Supply',
      'water supply': 'Water Supply',
      'cctv': 'CCTV',
      'security': 'Security Gate',
      'security gate': 'Security Gate',
      'common area': 'Common Area',
      'social area': 'Common Area',
      'social': 'Common Area',
      'study room': 'Study Room',
      'study': 'Study Room',
      'gym': 'Gym',
      'fitness': 'Gym',
      'library': 'Library',
      'cafeteria': 'Cafeteria',
      'cafe': 'Cafeteria',
      'generator': 'Generator',
      'solar': 'Solar Power',
      'solar power': 'Solar Power',
      'balcony': 'Balcony',
      'shared bathroom': 'Shared Bathroom',
      'bathroom': 'Shared Bathroom',
      'private bathroom': 'Private Bathroom',
      'ensuite': 'Private Bathroom'
    };

    // Map amenities to correct enum values
    const mappedAmenities = amenities 
      ? amenities.map(a => amenitiesMap[a.toLowerCase()] || a)
      : [];

    // Map roomType to correct enum value
    const roomTypeMap = {
      'single': 'single',
      'double': 'double',
      'triple': 'triple',
      'quad': 'quad',
      'dormitory': 'dormitory',
      'dorm': 'dormitory'
    };

    const mappedRoomType = roomTypeMap[roomType?.toLowerCase()] || roomType;

    // Transform frontend format to backend schema format
    // Build location object without coordinates (they're optional and cause geo index errors if empty)
    const locationData = {
      address,
      campus: campusDoc._id, // Use the ObjectId from campus lookup
      city: req.body.city || '',
      state: req.body.state || ''
    };

    req.body = {
      name,
      description: description || '',
      type: type || 'mixed', // Default to mixed if not specified - REQUIRED by schema
      location: locationData,
      contact: {
        phoneNumber,
        email: req.body.email || '',
        website: req.body.website || ''
      },
      amenities: mappedAmenities,
      roomTypes: [
        {
          type: mappedRoomType,
          price: parseInt(price),
          currency: 'NGN',
          pricingPeriod: 'per-month',
          occupancy: parseInt(capacity) || 1,
          availableRooms: parseInt(capacity) || 1,
          description: description || ''
        }
      ],
      hostelClass: req.body.hostelClass || 'standard',
      ownerType: req.body.ownerType || 'individual',
      rules: req.body.rules || '',
      verificationStatus: 'pending',
      category: category || null
    };

    console.log('📋 validateHostelData - Transformed req.body:', {
      category: req.body.category,
      categoryType: typeof req.body.category,
      allBodyKeys: Object.keys(req.body)
    });

    // Add hostel images if they exist
    if (req.hostelImages && req.hostelImages.length > 0) {
      req.body.images = req.hostelImages;
    }

    return next();
  }

  // === BACKEND FORMAT (old) - for backward compatibility ===
  if (type && contact && location && roomTypes) {
    if (!type || !contact?.phoneNumber || !location?.address || !location?.campus || !roomTypes?.length) {
      return next(new AppError('Missing required fields', 400));
    }

    // Validate old room types format
    for (const room of roomTypes) {
      if (!room.type || !room.price || !room.occupancy) {
        return next(new AppError('Each room type must have type, price, and occupancy', 400));
      }
    }

    return next();
  }

  // If neither format matches
  return next(new AppError('Invalid hostel data format. Please check required fields.', 400));
});

// ✅ Validate roommate listing data
exports.validateRoommateData = catchAsync(async (req, res, next) => {
  const { title, description, roomType, location, rent, rentPrice, amenities, availableFrom } = req.body;
  const rentAmount = rent || rentPrice

  // Check basic required fields
  if (!title || !description || !roomType || !location || !rentAmount) {
    return next(new AppError('Missing required fields: title, description, roomType, location, rentPrice', 400));
  }

  // Validate title length
  if (title.length > 100) {
    return next(new AppError('Title cannot exceed 100 characters', 400));
  }

  // Validate description length
  if (description.length > 2000) {
    return next(new AppError('Description cannot exceed 2000 characters', 400));
  }

  // Validate location is not empty
  if (typeof location === 'string' && location.trim().length === 0) {
    return next(new AppError('Location cannot be empty', 400));
  }

  // Validate rent is a positive number
  if (isNaN(rentAmount) || Number(rentAmount) <= 0) {
    return next(new AppError('Rent must be a positive number', 400));
  }

  // Transform amenities if it's a string
  if (typeof req.body.amenities === 'string') {
    try {
      req.body.amenities = JSON.parse(req.body.amenities);
    } catch (e) {
      req.body.amenities = req.body.amenities.split(',').map(a => a.trim());
    }
  }

  // Transform boolean fields
  if (typeof req.body.isAvailable === 'string') {
    req.body.isAvailable = req.body.isAvailable === 'true';
  }

  // Transform numeric fields
  req.body.rent = Number(rent);
  if (req.body.roommates) {
    req.body.roommates = Number(req.body.roommates);
  }
  if (req.body.deposit) {
    req.body.deposit = Number(req.body.deposit);
  }

  next();
});

module.exports = exports;
