/* const express = require('express');
const categoryController = require('../controllers/categoryController');
const { protect, restrictTo } = require('../middlewares/authMiddleware'); // adjust path

const router = express.Router();

// Public
router.route('/').get(categoryController.getAllCategories);
router.route('/:id').get(categoryController.getCategory);

// Protected - admin or shop managers can create/update/delete
router.use(protect);
router.post('/', restrictTo('admin'), categoryController.createCategory);
router.patch('/:id', restrictTo('admin'), categoryController.updateCategory);
router.delete('/:id', restrictTo('admin'), categoryController.deleteCategory);

module.exports = router; */

const express = require('express');
const categoryController = require('../controllers/categoryController');
const { protect, restrictTo } = require('../middlewares/authMiddleware');
const { validate } = require('../middlewares/validationMiddleware');
const categoryValidation = require('../validators/categoryValidation');
const categoryMiddleware = require('../middlewares/categoryMiddleware');
const { apiLimiter } = require('../middlewares/rateLimiter');

const router = express.Router();

// Public routes
router.get('/', 
  categoryValidation.searchCategories, 
  validate, 
  apiLimiter, 
  categoryController.getAllCategories
);

router.get('/search', 
  categoryValidation.searchCategories, 
  validate, 
  apiLimiter, 
  categoryController.searchCategories
);

router.get('/hierarchy', 
  categoryController.getCategoryHierarchy
);

router.get('/popular', 
  categoryController.getPopularCategories
);

router.get('/trending', 
  categoryController.getTrendingCategories
);

router.get('/recommendations', 
  categoryValidation.getCategoryRecommendations, 
  validate, 
  categoryController.getCategoryRecommendations
);

router.get('/analytics', 
  categoryValidation.getCategoryAnalytics, 
  validate, 
  categoryMiddleware.validateAnalyticsPermissions, 
  categoryController.getCategoryAnalytics
);

router.get('/export', 
  categoryValidation.exportCategories, 
  validate, 
  categoryMiddleware.validateExportParameters, 
  categoryController.exportCategories
);

router.get('/templates', 
  categoryController.getCategoryTemplates
);

router.get('/:id', 
  categoryValidation.categoryIdParam, 
  validate, 
  categoryMiddleware.checkCategoryExists, 
  categoryController.getCategory
);

router.get('/:id/children', 
  categoryValidation.categoryIdParam, 
  validate, 
  categoryMiddleware.checkCategoryExists, 
  categoryController.getCategoryChildren
);

router.get('/:id/analytics', 
  categoryValidation.categoryIdParam, 
  categoryValidation.getCategoryAnalytics, 
  validate, 
  categoryMiddleware.checkCategoryExists, 
  categoryMiddleware.validateAnalyticsPermissions, 
  categoryController.getCategoryAnalytics
);

// Protected routes
router.use(protect);

// Category CRUD
router.post('/', 
  categoryValidation.createCategory, 
  validate, 
  categoryMiddleware.validateNameUniqueness, 
  categoryMiddleware.validateSlugUniqueness, 
  categoryMiddleware.validateParentCategory, 
  categoryController.createCategory
);

router.patch('/:id', 
  categoryValidation.categoryIdParam, 
  categoryValidation.updateCategory, 
  validate, 
  categoryMiddleware.checkCategoryExists, 
  categoryMiddleware.checkCategoryPermissions, 
  categoryMiddleware.validateNameUniqueness, 
  categoryMiddleware.validateSlugUniqueness, 
  categoryMiddleware.validateParentCategory, 
  categoryController.updateCategory
);

router.delete('/:id', 
  categoryValidation.categoryIdParam, 
  validate, 
  categoryMiddleware.checkCategoryExists, 
  categoryMiddleware.checkCategoryPermissions, 
  categoryMiddleware.checkCategoryDependencies, 
  categoryMiddleware.preventDeletionWithDependencies, 
  categoryController.deleteCategory
);

// Category management
router.patch('/:id/archive', 
  categoryValidation.categoryIdParam, 
  validate, 
  categoryMiddleware.checkCategoryExists, 
  categoryMiddleware.checkCategoryPermissions, 
  categoryMiddleware.validateStatusTransition, 
  categoryController.archiveCategory
);

router.patch('/:id/unarchive', 
  categoryValidation.categoryIdParam, 
  validate, 
  categoryMiddleware.checkCategoryExists, 
  categoryMiddleware.checkCategoryPermissions, 
  categoryController.unarchiveCategory
);

router.patch('/:id/hierarchy', 
  categoryValidation.updateCategoryHierarchy, 
  validate, 
  categoryMiddleware.checkCategoryExists, 
  categoryMiddleware.checkCategoryPermissions, 
  categoryMiddleware.validateHierarchyOperation, 
  categoryController.updateCategoryHierarchy
);

// Bulk operations
router.post('/bulk', 
  categoryValidation.bulkCategoryOperations, 
  validate, 
  categoryMiddleware.validateBulkPermissions, 
  categoryController.bulkOperations
);

// Import/Export
router.post('/import', 
  categoryValidation.importCategories, 
  validate, 
  categoryMiddleware.validateImportData, 
  categoryController.importCategories
);

// Templates
router.post('/templates', 
  categoryValidation.createCategoryTemplate, 
  validate, 
  categoryMiddleware.validateTemplateCreation, 
  categoryController.createCategoryTemplate
);

// Admin only routes
router.use(restrictTo('admin', 'moderator'));

router.post('/merge', 
  categoryValidation.mergeCategories, 
  validate, 
  categoryMiddleware.validateMergeOperation, 
  categoryController.bulkOperations
);

module.exports = router;

