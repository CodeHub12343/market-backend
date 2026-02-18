// src/routes/offerRoutes.js
const express = require('express');
const offerController = require('../controllers/offerController');
const authMiddleware = require('../middlewares/authMiddleware');
const offerValidation = require('../validators/offerValidation');
const offerMiddleware = require('../middlewares/offerMiddleware');
const { validate } = require('../middlewares/validationMiddleware');

const router = express.Router();

// Public routes (with basic auth)
router.get('/', 
  authMiddleware.protect, 
  offerValidation.search,
  validate,
  offerController.getAllOffers
);

router.get('/search/advanced', 
  authMiddleware.protect,
  offerController.advancedSearchOffers
);

router.get('/search', 
  authMiddleware.protect,
  offerValidation.search,
  validate,
  offerController.searchOffers
);

router.get('/analytics', 
  authMiddleware.protect,
  offerValidation.analytics,
  validate,
  offerMiddleware.checkAnalyticsPermission,
  offerController.getOfferAnalytics
);

router.get('/expired', 
  authMiddleware.protect,
  offerController.getExpiredOffers
);

// Protected routes for sellers
router.post('/', 
  authMiddleware.protect,
  offerMiddleware.checkSellerRole,
  offerValidation.create,
  validate,
  offerMiddleware.checkRequestOpen,
  offerMiddleware.validateOfferData,
  offerMiddleware.rateLimitOfferCreation,
  offerController.createOffer
);

router.get('/my-offers', 
  authMiddleware.protect,
  offerController.getOffersBySeller
);

router.get('/seller/:sellerId', 
  authMiddleware.protect,
  offerController.getOffersBySeller
);

router.get('/request/:requestId', 
  authMiddleware.protect,
  offerController.getOffersByRequest
);

router.get('/my-received/all', 
  authMiddleware.protect,
  offerController.getOffersReceivedByMe
);

// Individual offer routes
router.route('/:id')
  .get(
    authMiddleware.protect,
    offerValidation.id,
    validate,
    offerMiddleware.populateOfferData,
    offerController.getOffer
  )
  .patch(
    authMiddleware.protect,
    offerValidation.id,
    validate,
    offerMiddleware.checkOfferOwnership,
    offerMiddleware.checkOfferStatus(['pending']),
    offerValidation.update,
    validate,
    offerMiddleware.validateOfferData,
    offerController.updateOffer
  );

// Offer actions
router.post('/:id/accept', 
  authMiddleware.protect,
  offerValidation.id,
  validate,
  offerMiddleware.checkOfferManagement,
  offerMiddleware.checkAcceptPermission,
  offerController.acceptOffer
);

router.post('/:id/reject', 
  authMiddleware.protect,
  offerValidation.id,
  validate,
  offerMiddleware.checkOfferManagement,
  offerMiddleware.checkRejectPermission,
  offerController.rejectOffer
);

router.patch('/:id/withdraw', 
  authMiddleware.protect,
  offerValidation.id,
  validate,
  offerMiddleware.checkOfferOwnership,
  offerMiddleware.checkWithdrawPermission,
  offerValidation.updateStatus,
  validate,
  offerController.withdrawOffer
);

router.post('/:id/extend', 
  authMiddleware.protect,
  offerValidation.id,
  validate,
  offerMiddleware.checkOfferOwnership,
  offerController.extendOfferExpiration
);

router.get('/:id/history', 
  authMiddleware.protect,
  offerValidation.id,
  validate,
  offerController.getOfferHistory
);

// Bulk operations
router.post('/bulk/withdraw', 
  authMiddleware.protect,
  offerMiddleware.checkSellerRole,
  offerValidation.bulkWithdraw,
  validate,
  offerMiddleware.validateBulkOperation,
  offerMiddleware.checkBulkOperationPermission,
  offerController.bulkWithdrawOffers
);

router.post('/bulk/reject', 
  authMiddleware.protect,
  offerMiddleware.checkBuyerRole,
  offerValidation.bulkReject,
  validate,
  offerMiddleware.validateBulkOperation,
  offerController.bulkRejectOffers
);

module.exports = router;
