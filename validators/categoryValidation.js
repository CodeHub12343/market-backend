const { body, param, query } = require('express-validator');
const commonValidations = require('./commonValidations');

// Category creation validation
const createCategory = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Category name is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Category name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z0-9\s\-&.,'"]+$/)
    .withMessage('Category name contains invalid characters'),
  
  body('slug')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Slug must be between 2 and 50 characters')
    .matches(/^[a-z0-9\-]+$/)
    .withMessage('Slug must contain only lowercase letters, numbers, and hyphens'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  
  body('parent')
    .optional()
    .isMongoId()
    .withMessage('Parent category ID must be valid'),
  
  body('icon')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Icon must be less than 100 characters'),
  
  body('color')
    .optional()
    .matches(/^#[0-9A-Fa-f]{6}$/)
    .withMessage('Color must be a valid hex color code'),
  
  body('status')
    .optional()
    .isIn(['active', 'inactive', 'archived'])
    .withMessage('Status must be active, inactive, or archived'),
  
  body('sortOrder')
    .optional()
    .isInt({ min: 0, max: 9999 })
    .withMessage('Sort order must be between 0 and 9999'),
  
  body('isPublic')
    .optional()
    .isBoolean()
    .withMessage('isPublic must be a boolean'),
  
  body('tags')
    .optional()
    .isArray({ max: 10 })
    .withMessage('Maximum 10 tags allowed'),
  
  body('tags.*')
    .optional()
    .trim()
    .isLength({ min: 1, max: 20 })
    .withMessage('Each tag must be between 1 and 20 characters')
];

// Category update validation
const updateCategory = [
  param('id')
    .isMongoId()
    .withMessage('Invalid category ID'),
  
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Category name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z0-9\s\-&.,'"]+$/)
    .withMessage('Category name contains invalid characters'),
  
  body('slug')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Slug must be between 2 and 50 characters')
    .matches(/^[a-z0-9\-]+$/)
    .withMessage('Slug must contain only lowercase letters, numbers, and hyphens'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  
  body('parent')
    .optional()
    .isMongoId()
    .withMessage('Parent category ID must be valid'),
  
  body('icon')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Icon must be less than 100 characters'),
  
  body('color')
    .optional()
    .matches(/^#[0-9A-Fa-f]{6}$/)
    .withMessage('Color must be a valid hex color code'),
  
  body('status')
    .optional()
    .isIn(['active', 'inactive', 'archived'])
    .withMessage('Status must be active, inactive, or archived'),
  
  body('sortOrder')
    .optional()
    .isInt({ min: 0, max: 9999 })
    .withMessage('Sort order must be between 0 and 9999'),
  
  body('isPublic')
    .optional()
    .isBoolean()
    .withMessage('isPublic must be a boolean')
];

// Category search validation
const searchCategories = [
  query('search')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search query must be between 1 and 100 characters'),
  
  query('status')
    .optional()
    .isIn(['active', 'inactive', 'archived'])
    .withMessage('Invalid status filter'),
  
  query('parent')
    .optional()
    .isMongoId()
    .withMessage('Invalid parent category ID'),
  
  query('hasChildren')
    .optional()
    .isBoolean()
    .withMessage('hasChildren must be a boolean'),
  
  query('sortBy')
    .optional()
    .isIn(['name', 'createdAt', 'updatedAt', 'sortOrder', 'usageCount', 'popularity'])
    .withMessage('Invalid sort field'),
  
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc'),
  
  commonValidations.page(),
  commonValidations.limit()
];

// Category ID parameter validation
const categoryIdParam = [
  param('id')
    .isMongoId()
    .withMessage('Invalid category ID')
];

// Category analytics validation
const getCategoryAnalytics = [
  param('id')
    .optional()
    .isMongoId()
    .withMessage('Invalid category ID'),
  
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid start date format'),
  
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid end date format'),
  
  query('period')
    .optional()
    .isIn(['day', 'week', 'month', 'year'])
    .withMessage('Period must be day, week, month, or year')
];

// Category bulk operations validation
const bulkCategoryOperations = [
  body('operation')
    .isIn(['delete', 'archive', 'unarchive', 'activate', 'deactivate', 'update', 'reorder', 'merge'])
    .withMessage('Invalid bulk operation'),
  
  body('categoryIds')
    .isArray({ min: 1, max: 100 })
    .withMessage('Category IDs must be an array with 1-100 items'),
  
  body('categoryIds.*')
    .isMongoId()
    .withMessage('Each category ID must be valid'),
  
  body('updateData')
    .optional()
    .isObject()
    .withMessage('Update data must be an object'),
  
  body('mergeTarget')
    .optional()
    .isMongoId()
    .withMessage('Merge target category ID must be valid'),
  
  body('newOrder')
    .optional()
    .isArray()
    .withMessage('New order must be an array')
];

// Category hierarchy validation
const updateCategoryHierarchy = [
  body('categoryId')
    .isMongoId()
    .withMessage('Category ID must be valid'),
  
  body('newParent')
    .optional()
    .isMongoId()
    .withMessage('New parent category ID must be valid'),
  
  body('newSortOrder')
    .optional()
    .isInt({ min: 0, max: 9999 })
    .withMessage('Sort order must be between 0 and 9999')
];

// Category merge validation
const mergeCategories = [
  body('sourceCategoryId')
    .isMongoId()
    .withMessage('Source category ID must be valid'),
  
  body('targetCategoryId')
    .isMongoId()
    .withMessage('Target category ID must be valid'),
  
  body('mergeStrategy')
    .isIn(['replace', 'combine', 'keep_both'])
    .withMessage('Merge strategy must be replace, combine, or keep_both'),
  
  body('updateReferences')
    .optional()
    .isBoolean()
    .withMessage('updateReferences must be a boolean')
];

// Category import validation
const importCategories = [
  body('categories')
    .isArray({ min: 1, max: 1000 })
    .withMessage('Categories must be an array with 1-1000 items'),
  
  body('categories.*.name')
    .trim()
    .notEmpty()
    .withMessage('Category name is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Category name must be between 2 and 50 characters'),
  
  body('categories.*.description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  
  body('categories.*.parent')
    .optional()
    .isMongoId()
    .withMessage('Parent category ID must be valid'),
  
  body('overwriteExisting')
    .optional()
    .isBoolean()
    .withMessage('overwriteExisting must be a boolean')
];

// Category export validation
const exportCategories = [
  query('format')
    .isIn(['json', 'csv', 'xml'])
    .withMessage('Export format must be json, csv, or xml'),
  
  query('includeHierarchy')
    .optional()
    .isBoolean()
    .withMessage('includeHierarchy must be a boolean'),
  
  query('includeAnalytics')
    .optional()
    .isBoolean()
    .withMessage('includeAnalytics must be a boolean'),
  
  query('status')
    .optional()
    .isIn(['active', 'inactive', 'archived', 'all'])
    .withMessage('Invalid status filter')
];

// Category template validation
const createCategoryTemplate = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Template name is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Template name must be between 2 and 50 characters'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  
  body('templateData')
    .isObject()
    .withMessage('Template data must be an object'),
  
  body('isPublic')
    .optional()
    .isBoolean()
    .withMessage('isPublic must be a boolean')
];

// Category recommendations validation
const getCategoryRecommendations = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50'),
  
  query('type')
    .optional()
    .isIn(['popular', 'trending', 'similar', 'related'])
    .withMessage('Recommendation type must be popular, trending, similar, or related'),
  
  query('categoryId')
    .optional()
    .isMongoId()
    .withMessage('Category ID must be valid')
];

module.exports = {
  createCategory,
  updateCategory,
  searchCategories,
  categoryIdParam,
  getCategoryAnalytics,
  bulkCategoryOperations,
  updateCategoryHierarchy,
  mergeCategories,
  importCategories,
  exportCategories,
  createCategoryTemplate,
  getCategoryRecommendations
};