// src/routes/requestRoutes.js
const express = require('express');
const requestController = require('../controllers/requestController');
const authMiddleware = require('../middlewares/authMiddleware');
const requestValidation = require('../validators/requestValidation');
const requestMiddleware = require('../middlewares/requestMiddleware');
const uploadMiddleware = require('../middlewares/uploadMiddleware');
const { validate } = require('../middlewares/validationMiddleware');

const router = express.Router();

// Public routes (with basic auth)
router.get('/', 
  authMiddleware.protect, 
  requestValidation.search,
  validate,
  requestController.getAllRequests
);

// Search-specific routes (must come before /search route)
router.get('/search/suggestions', 
  authMiddleware.protect,
  requestController.getSearchSuggestions
);

router.get('/search/popular', 
  authMiddleware.protect,
  requestController.getPopularSearches
);

router.get('/search/history', 
  authMiddleware.protect,
  requestController.getSearchHistory
);

router.post('/search/history', 
  authMiddleware.protect,
  requestController.saveSearchHistory
);

router.delete('/search/history/:id', 
  authMiddleware.protect,
  requestController.deleteSearchHistoryEntry
);

router.delete('/search/history', 
  authMiddleware.protect,
  requestController.clearSearchHistory
);

router.get('/search/advanced', 
  authMiddleware.protect,
  requestController.advancedSearchRequests
);

router.get('/search', 
  authMiddleware.protect,
  requestValidation.search,
  validate,
  requestController.searchRequests
);

router.get('/analytics', 
  authMiddleware.protect,
  requestValidation.analytics,
  validate,
  requestMiddleware.checkAnalyticsPermission,
  requestController.getRequestAnalytics
);

router.get('/expired', 
  authMiddleware.protect,
  requestController.getExpiredRequests
);

router.get('/popular', 
  authMiddleware.protect,
  requestController.getPopularRequests
);

router.get('/urgent', 
  authMiddleware.protect,
  requestController.getUrgentRequests
);

// Protected routes for users
router.post('/', 
  authMiddleware.protect,
  requestMiddleware.checkUserRole,
  uploadMiddleware.uploadMultiple('images', 5), // Allow up to 5 images
  requestValidation.create,
  validate,
  requestMiddleware.validateRequestData,
  requestMiddleware.rateLimitRequestCreation,
  requestController.createRequest
);

router.get('/my-requests', 
  authMiddleware.protect,
  requestController.getRequestsByRequester
);

router.get('/requester/:requesterId', 
  authMiddleware.protect,
  requestController.getRequestsByRequester
);

router.get('/category/:categoryId', 
  authMiddleware.protect,
  requestController.getRequestsByCategory
);

router.get('/campus/:campusId', 
  authMiddleware.protect,
  requestController.getRequestsByCampus
);

// Individual request routes
router.route('/:id')
  .get(
    authMiddleware.protect,
    requestValidation.id,
    validate,
    requestMiddleware.incrementRequestViews,
    requestMiddleware.populateRequestData,
    requestController.getRequest
  )
  .patch(
    authMiddleware.protect,
    requestValidation.id,
    validate,
    requestMiddleware.checkRequestOwnership,
    requestMiddleware.checkUpdatePermission,
    requestValidation.update,
    validate,
    requestMiddleware.validateRequestData,
    requestController.updateRequest
  )
  .delete(
    authMiddleware.protect,
    requestValidation.id,
    validate,
    requestMiddleware.populateRequestData,
    requestMiddleware.checkRequestOwnership,
    requestMiddleware.checkDeletePermission,
    requestController.deleteRequest
  );

// Request actions
router.post('/:id/fulfill', 
  authMiddleware.protect,
  requestValidation.id,
  validate,
  requestMiddleware.checkRequestOwnership,
  requestMiddleware.checkFulfillPermission,
  requestController.markFulfilled
);

router.patch('/:id/status', 
  authMiddleware.protect,
  requestValidation.id,
  validate,
  requestMiddleware.checkRequestOwnership,
  requestValidation.updateStatus,
  validate,
  requestController.updateRequestStatus
);

router.post('/:id/extend', 
  authMiddleware.protect,
  requestValidation.id,
  validate,
  requestMiddleware.checkRequestOwnership,
  requestController.extendRequestExpiration
);

router.post('/:id/images', 
  authMiddleware.protect,
  requestValidation.id,
  validate,
  requestMiddleware.checkRequestOwnership,
  requestValidation.uploadImages,
  validate,
  requestMiddleware.validateImageUpload,
  requestController.uploadRequestImages
);

router.get('/:id/history', 
  authMiddleware.protect,
  requestValidation.id,
  validate,
  requestController.getRequestHistory
);

// Bulk operations
router.post('/bulk/delete', 
  authMiddleware.protect,
  requestValidation.bulkDelete,
  validate,
  requestMiddleware.validateBulkOperation,
  requestMiddleware.checkBulkOperationPermission,
  requestController.bulkDeleteRequests
);

router.post('/bulk/update-status', 
  authMiddleware.protect,
  requestValidation.bulkUpdateStatus,
  validate,
  requestMiddleware.validateBulkOperation,
  requestMiddleware.checkBulkOperationPermission,
  requestController.bulkUpdateRequestStatus
);

module.exports = router;
