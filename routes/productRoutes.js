const express = require('express');
const productController = require('../controllers/productController');
const { protect } = require('../middlewares/authMiddleware'); // adjust path
const upload = require('../middlewares/uploadMiddleware'); // if you kept this
const reviewRouter = require('./reviewRoutes');

const router = express.Router();
router.use('/:productId/reviews', reviewRouter);

// DEBUG: Diagnostic endpoint to check database state (REMOVE IN PRODUCTION)
router.get('/debug/status', async (req, res) => {
  try {
    const Product = require('../models/productModel');
    const totalProducts = await Product.countDocuments();
    const activeProducts = await Product.countDocuments({ status: 'active' });
    const availableProducts = await Product.countDocuments({ isAvailable: true });
    const sampleProducts = await Product.find().limit(5);
    
    res.json({
      debug: true,
      totalProducts,
      activeProducts,
      availableProducts,
      sample: sampleProducts.map(p => ({
        _id: p._id,
        name: p.name,
        status: p.status,
        isAvailable: p.isAvailable,
        shop: p.shop
      }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Advanced search endpoint (before /:id routes to avoid conflicts)
// PROTECTED - requires authentication for campus filtering
router.get('/search/advanced', protect, productController.advancedSearchProducts);
router.get('/search/suggestions', productController.getProductSearchSuggestions);
router.get('/search/popular', productController.getPopularProductSearches);
router.get('/search/locations', productController.getProductLocations);
router.get('/top-rated', productController.getTopRatedProducts);

// Protected search history endpoints
router.get('/search/history', protect, productController.getProductSearchHistory);
router.post('/search/history', protect, productController.saveProductSearchHistory);
router.delete('/search/history', protect, productController.clearProductSearchHistory);
router.delete('/search/history/:id', protect, productController.deleteProductSearchHistoryItem);

// ✅ Main product endpoints - ALL REQUIRE AUTHENTICATION FOR CAMPUS FILTERING
router.get('/', protect, productController.getAllProducts);

router.post(
  '/',
  protect,
  upload.uploadMultiple('images', 6),
  upload.cleanupOnError,
  productController.createProduct
);

// Single product endpoints
router.get('/:id', protect, productController.getProduct);

router.patch(
  '/:id',
  protect,
  upload.uploadMultiple('images', 6),
  upload.cleanupOnError,
  productController.updateProduct
);

router.delete('/:id', protect, productController.deleteProduct);

module.exports = router;

