const express = require('express');
const roommateListingController = require('../controllers/roommateListingController');
const roommateSearchController = require('../controllers/roommateSearchController');
const authMiddleware = require('../middlewares/authMiddleware');
const hostelMiddleware = require('../middlewares/hostelMiddleware');

const router = express.Router();

// Search routes - must come BEFORE other specific routes
router.get('/search/suggestions', roommateSearchController.getRoommateSearchSuggestions);
router.get('/search/popular', roommateSearchController.getPopularRoommateSearches);
router.get('/search/history', authMiddleware.protect, roommateSearchController.getRoommateSearchHistory);
router.post('/search/save', authMiddleware.protect, roommateSearchController.saveRoommateSearch);
router.delete('/search/history/:id', authMiddleware.protect, roommateSearchController.deleteRoommateSearchHistory);
router.delete('/search/history', authMiddleware.protect, roommateSearchController.clearAllRoommateSearchHistory);

// Public routes - specific routes BEFORE parameterized routes
router.get('/search', roommateListingController.searchRoommateListings);
router.get('/nearby', roommateListingController.getNearbyRoommateListings);

// Public parameterized routes (optional auth: attach user if token provided)
router.get('/', authMiddleware.optionalProtect, roommateListingController.getAllRoommateListings);
router.get('/:id', authMiddleware.optionalProtect, roommateListingController.getRoomateListing);

// Protected routes (require authentication) - specific routes BEFORE parameterized routes
router.use(authMiddleware.protect);

router.get('/my-listings/list', roommateListingController.getMyRoommateListings);
router.get('/my-listings', roommateListingController.getMyRoommateListings);
router.get('/matching/suggestions', roommateListingController.getMatchingListings);

// Student routes - create
router.post(
  '/',
  hostelMiddleware.uploadRoommateImages,
  hostelMiddleware.processRoommateImages,
  hostelMiddleware.validateRoommateData,
  roommateListingController.createRoomateListing
);

// Student routes - update/delete
router.patch(
  '/:id',
  hostelMiddleware.validateRoommateOwnership,
  hostelMiddleware.uploadRoommateImages,
  hostelMiddleware.processRoommateImages,
  roommateListingController.updateRoomateListing
);

router.post(
  '/:id/images',
  hostelMiddleware.validateRoommateOwnership,
  hostelMiddleware.uploadRoommateImages,
  hostelMiddleware.processRoommateImages,
  roommateListingController.addRoommateImages
);

router.post(
  '/:id/close',
  hostelMiddleware.validateRoommateOwnership,
  roommateListingController.closeRoomateListing
);

router.delete(
  '/:id',
  hostelMiddleware.validateRoommateOwnership,
  roommateListingController.deleteRoomateListing
);

router.post(
  '/:id/inquiry',
  roommateListingController.registerInquiry
);

module.exports = router;
