const RoomateListing = require('../models/roommateListingModel');
const RoommateSearchHistory = require('../models/roommateSearchHistoryModel');
const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

/**
 * GET /api/v1/roommate-listings/search/suggestions
 * Get roommate listing suggestions based on search query
 */
exports.getRoommateSearchSuggestions = catchAsync(async (req, res, next) => {
  const { q } = req.query;

  console.log('\n💡 getRoommateSearchSuggestions called');
  console.log('   Query param q:', q);
  console.log('   Query length:', q?.length);

  if (!q || q.length < 2) {
    console.log('   ⚠️ Query too short, returning empty suggestions');
    return res.status(200).json({
      status: 'success',
      data: {
        suggestions: []
      }
    });
  }

  try {
    // First, check how many active listings exist
    const totalActive = await RoomateListing.countDocuments({ status: 'active' });
    console.log('   📊 Total active listings in DB:', totalActive);

    if (totalActive === 0) {
      console.log('   ⚠️ No active listings found in database');
      return res.status(200).json({
        status: 'success',
        data: {
          suggestions: []
        }
      });
    }

    // Log a sample listing to see structure
    const sampleListing = await RoomateListing.findOne({ status: 'active' }).lean();
    if (sampleListing) {
      console.log('   📋 Sample listing structure:', {
        title: sampleListing.title,
        hasLifestyle: !!sampleListing.preferences?.lifestyleCompatibility,
        lifestyle: sampleListing.preferences?.lifestyleCompatibility,
        amenities: sampleListing.amenities?.slice(0, 3)
      });
    }

    // Search in title, location, amenities, and lifestyle preferences
    const suggestions = await RoomateListing.find({
      $or: [
        { title: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { 'location.address': { $regex: q, $options: 'i' } },
        { 'location.city': { $regex: q, $options: 'i' } },
        { amenities: { $regex: q, $options: 'i' } },
        { 'preferences.lifestyleCompatibility': { $regex: q, $options: 'i' } },
        { 'preferences.studyHabits': { $regex: q, $options: 'i' } }
      ],
      status: 'active',
      isAvailable: true
    })
      .select('title location.address location.city amenities preferences.lifestyleCompatibility')
      .limit(10)
      .lean();

    console.log('   ✅ Found suggestions:', suggestions.length);

    if (suggestions.length > 0) {
      console.log('   📋 First suggestion:', {
        title: suggestions[0].title,
        lifestyle: suggestions[0].preferences?.lifestyleCompatibility
      });
    }

    // Transform suggestions to include location and title
    const transformedSuggestions = suggestions.map((listing) => ({
      title: listing.title,
      location: listing.location?.address || listing.location?.city,
      _id: listing._id
    }));

    // Remove duplicates by title
    const uniqueSuggestions = [
      ...new Map(transformedSuggestions.map((item) => [item.title, item])).values()
    ].slice(0, 5);

    console.log('   📊 Unique suggestions:', uniqueSuggestions.length);
    console.log('   📦 Response structure: { status, data: { suggestions: [...] } }');

    res.status(200).json({
      status: 'success',
      data: {
        suggestions: uniqueSuggestions
      }
    });
  } catch (error) {
    console.error('❌ Error fetching suggestions:', error);
    res.status(200).json({
      status: 'success',
      data: {
        suggestions: []
      }
    });
  }
});

/**
 * GET /api/v1/roommate-listings/search/history
 * Get user's search history (requires authentication)
 */
exports.getRoommateSearchHistory = catchAsync(async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      status: 'fail',
      message: 'You must be logged in to view search history'
    });
  }

  const history = await RoommateSearchHistory.find({
    user: req.user._id
  })
    .select('query timestamp resultsCount')
    .sort('-timestamp')
    .limit(20)
    .lean();

  res.status(200).json({
    status: 'success',
    results: history.length,
    data: {
      history
    }
  });
});

/**
 * GET /api/v1/roommate-listings/search/popular
 * Get popular/trending roommate searches
 */
exports.getPopularRoommateSearches = catchAsync(async (req, res, next) => {
  try {
    const popular = await RoommateSearchHistory.aggregate([
      {
        $match: {
          timestamp: {
            $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
          }
        }
      },
      {
        $group: {
          _id: '$query',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 10
      },
      {
        $project: {
          _id: 0,
          query: '$_id',
          count: 1
        }
      }
    ]);

    res.status(200).json({
      status: 'success',
      results: popular.length,
      data: {
        popular
      }
    });
  } catch (error) {
    console.error('Error fetching popular searches:', error);
    res.status(200).json({
      status: 'success',
      results: 0,
      data: {
        popular: []
      }
    });
  }
});

/**
 * POST /api/v1/roommate-listings/search/save
 * Save a search to user's history (requires authentication)
 */
exports.saveRoommateSearch = catchAsync(async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      status: 'fail',
      message: 'You must be logged in to save searches'
    });
  }

  const { query, filters } = req.body;

  if (!query || query.trim().length < 1) {
    return next(new AppError('Search query is required', 400));
  }

  // Create search history entry
  const searchEntry = await RoommateSearchHistory.create({
    user: req.user._id,
    query: query.trim(),
    filters: filters || {},
    resultsCount: 0
  });

  res.status(201).json({
    status: 'success',
    data: {
      saved: true,
      searchEntry
    }
  });
});

/**
 * DELETE /api/v1/roommate-listings/search/history/:id
 * Delete a search from user's history (requires authentication)
 */
exports.deleteRoommateSearchHistory = catchAsync(async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      status: 'fail',
      message: 'You must be logged in to delete search history'
    });
  }

  const searchEntry = await RoommateSearchHistory.findById(req.params.id);

  if (!searchEntry) {
    return next(new AppError('Search history entry not found', 404));
  }

  // Check if user owns this search history entry
  if (searchEntry.user.toString() !== req.user._id.toString()) {
    return next(new AppError('You can only delete your own search history', 403));
  }

  await RoommateSearchHistory.findByIdAndDelete(req.params.id);

  res.status(200).json({
    status: 'success',
    data: {
      deleted: true
    }
  });
});

/**
 * DELETE /api/v1/roommate-listings/search/history
 * Clear all search history for user (requires authentication)
 */
exports.clearAllRoommateSearchHistory = catchAsync(async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      status: 'fail',
      message: 'You must be logged in to clear search history'
    });
  }

  const result = await RoommateSearchHistory.deleteMany({
    user: req.user._id
  });

  res.status(200).json({
    status: 'success',
    data: {
      deletedCount: result.deletedCount
    }
  });
});
