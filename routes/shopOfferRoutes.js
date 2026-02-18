const express = require('express');
const shopOfferController = require('../controllers/shopOfferController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// Public routes
router.get('/', shopOfferController.getAllShopOffers);
router.get('/trending', shopOfferController.getTrendingShopOffers);
router.get('/search', shopOfferController.searchShopOffers);
router.get('/:id', shopOfferController.getShopOffer);

// Protected routes
router.use(authMiddleware.protect); // All routes below require authentication

router.post('/', shopOfferController.createShopOffer);
router.get('/my-offers', shopOfferController.getMyShopOffers);

router.patch('/:id', shopOfferController.updateShopOffer);
router.delete('/:id', shopOfferController.deleteShopOffer);

router.post('/:id/claim', shopOfferController.claimShopOffer);
router.post('/:id/unclaim', shopOfferController.unclaimShopOffer);
router.post('/:id/favorite', shopOfferController.toggleFavoriteShopOffer);

module.exports = router;
