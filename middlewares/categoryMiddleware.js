const Category = require('../models/categoryModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

// Validate category existence and permissions
exports.checkCategoryExists = catchAsync(async (req, res, next) => {
  const category = await Category.findById(req.params.id);
  if (!category) {
    return next(new AppError('Category not found', 404));
  }
  req.category = category;
  next();
});

// Validate category ownership/permissions
exports.checkCategoryPermissions = catchAsync(async (req, res, next) => {
  const category = req.category;
  const user = req.user;
  
  // Admin can do anything
  if (user.role === 'admin') {
    return next();
  }
  
  // Check if user created the category
  if (category.metadata && category.metadata.createdBy && 
      category.metadata.createdBy.toString() === user._id.toString()) {
    return next();
  }
  
  // For public categories, allow read operations
  if (req.method === 'GET' && category.isPublic) {
    return next();
  }
  
  return next(new AppError('You do not have permission to perform this action', 403));
});

// Validate category hierarchy operations
exports.validateHierarchyOperation = catchAsync(async (req, res, next) => {
  const { categoryId, newParent } = req.body;
  const currentCategory = await Category.findById(categoryId);
  
  if (!currentCategory) {
    return next(new AppError('Category not found', 404));
  }
  
  // Prevent setting parent to self
  if (newParent && newParent === categoryId) {
    return next(new AppError('Category cannot be its own parent', 400));
  }
  
  // Prevent circular references
  if (newParent) {
    const parentCategory = await Category.findById(newParent);
    if (!parentCategory) {
      return next(new AppError('Parent category not found', 404));
    }
    
    // Check if new parent is a descendant of current category
    const descendants = await currentCategory.getDescendants();
    const isDescendant = descendants.some(desc => 
      desc._id.toString() === newParent
    );
    
    if (isDescendant) {
      return next(new AppError('Cannot set parent to a descendant category', 400));
    }
  }
  
  next();
});

// Validate category merge operation
exports.validateMergeOperation = catchAsync(async (req, res, next) => {
  const { sourceCategoryId, targetCategoryId } = req.body;
  
  if (sourceCategoryId === targetCategoryId) {
    return next(new AppError('Cannot merge category with itself', 400));
  }
  
  const [sourceCategory, targetCategory] = await Promise.all([
    Category.findById(sourceCategoryId),
    Category.findById(targetCategoryId)
  ]);
  
  if (!sourceCategory || !targetCategory) {
    return next(new AppError('One or both categories not found', 404));
  }
  
  // Check if source category has children
  if (sourceCategory.childrenCount > 0) {
    return next(new AppError('Cannot merge category with children. Move children first.', 400));
  }
  
  req.sourceCategory = sourceCategory;
  req.targetCategory = targetCategory;
  next();
});

// Validate bulk operations permissions
exports.validateBulkPermissions = catchAsync(async (req, res, next) => {
  const { categoryIds } = req.body;
  const user = req.user;
  
  // Admin can perform any bulk operation
  if (user.role === 'admin') {
    return next();
  }
  
  // Check if user owns all categories
  const categories = await Category.find({ _id: { $in: categoryIds } });
  const userOwnedCategories = categories.filter(cat => 
    cat.metadata && cat.metadata.createdBy && 
    cat.metadata.createdBy.toString() === user._id.toString()
  );
  
  if (userOwnedCategories.length !== categories.length) {
    return next(new AppError('You can only perform bulk operations on your own categories', 403));
  }
  
  next();
});

// Validate category status transitions
exports.validateStatusTransition = catchAsync(async (req, res, next) => {
  const { status } = req.body;
  const category = req.category;
  const currentStatus = category.status;
  
  // Define valid transitions
  const validTransitions = {
    'active': ['inactive', 'archived'],
    'inactive': ['active', 'archived'],
    'archived': ['active', 'inactive']
  };
  
  if (!validTransitions[currentStatus] || !validTransitions[currentStatus].includes(status)) {
    return next(new AppError(`Invalid status transition from ${currentStatus} to ${status}`, 400));
  }
  
  // Special validation for archiving
  if (status === 'archived' && category.childrenCount > 0) {
    return next(new AppError('Cannot archive category with children. Archive children first.', 400));
  }
  
  next();
});

// Validate category dependencies
exports.checkCategoryDependencies = catchAsync(async (req, res, next) => {
  const category = req.category;
  
  // Check if category is used by other models
  const dependencies = await Promise.all([
    Category.db.collection('products').countDocuments({ category: category._id }),
    Category.db.collection('services').countDocuments({ category: category._id }),
    Category.db.collection('events').countDocuments({ category: category._id }),
    Category.db.collection('documents').countDocuments({ category: category._id }),
    Category.db.collection('requests').countDocuments({ category: category._id })
  ]);
  
  const totalDependencies = dependencies.reduce((sum, count) => sum + count, 0);
  
  if (totalDependencies > 0) {
    req.categoryDependencies = {
      products: dependencies[0],
      services: dependencies[1],
      events: dependencies[2],
      documents: dependencies[3],
      requests: dependencies[4],
      total: totalDependencies
    };
  }
  
  next();
});

// Prevent deletion of categories with dependencies
exports.preventDeletionWithDependencies = catchAsync(async (req, res, next) => {
  if (req.categoryDependencies && req.categoryDependencies.total > 0) {
    return next(new AppError(
      `Cannot delete category. It is being used by ${req.categoryDependencies.total} items. ` +
      `Products: ${req.categoryDependencies.products}, Services: ${req.categoryDependencies.services}, ` +
      `Events: ${req.categoryDependencies.events}, Documents: ${req.categoryDependencies.documents}, ` +
      `Requests: ${req.categoryDependencies.requests}`,
      400
    ));
  }
  
  next();
});

// Validate category slug uniqueness
exports.validateSlugUniqueness = catchAsync(async (req, res, next) => {
  const { slug } = req.body;
  const categoryId = req.params.id;
  
  if (slug) {
    const existingCategory = await Category.findOne({ 
      slug, 
      _id: { $ne: categoryId } 
    });
    
    if (existingCategory) {
      return next(new AppError('Category slug already exists', 400));
    }
  }
  
  next();
});

// Validate category name uniqueness
exports.validateNameUniqueness = catchAsync(async (req, res, next) => {
  const { name } = req.body;
  const categoryId = req.params.id;
  
  if (name) {
    const existingCategory = await Category.findOne({ 
      name, 
      _id: { $ne: categoryId } 
    });
    
    if (existingCategory) {
      return next(new AppError('Category name already exists', 400));
    }
  }
  
  next();
});

// Validate parent category exists and is active
exports.validateParentCategory = catchAsync(async (req, res, next) => {
  const { parent } = req.body;
  
  if (parent) {
    const parentCategory = await Category.findById(parent);
    
    if (!parentCategory) {
      return next(new AppError('Parent category not found', 404));
    }
    
    if (parentCategory.status !== 'active') {
      return next(new AppError('Parent category must be active', 400));
    }
    
    if (parentCategory.archived) {
      return next(new AppError('Parent category is archived', 400));
    }
  }
  
  next();
});

// Validate category import data
exports.validateImportData = catchAsync(async (req, res, next) => {
  const { categories } = req.body;
  
  if (!Array.isArray(categories) || categories.length === 0) {
    return next(new AppError('Categories must be a non-empty array', 400));
  }
  
  if (categories.length > 1000) {
    return next(new AppError('Cannot import more than 1000 categories at once', 400));
  }
  
  // Validate each category
  for (let i = 0; i < categories.length; i++) {
    const category = categories[i];
    
    if (!category.name || typeof category.name !== 'string') {
      return next(new AppError(`Category ${i + 1}: Name is required and must be a string`, 400));
    }
    
    if (category.name.length < 2 || category.name.length > 50) {
      return next(new AppError(`Category ${i + 1}: Name must be between 2 and 50 characters`, 400));
    }
    
    if (category.parent && typeof category.parent !== 'string') {
      return next(new AppError(`Category ${i + 1}: Parent must be a valid ID string`, 400));
    }
  }
  
  next();
});

// Validate category export parameters
exports.validateExportParameters = catchAsync(async (req, res, next) => {
  const { format, status, includeHierarchy, includeAnalytics } = req.query;
  
  if (format && !['json', 'csv', 'xml'].includes(format)) {
    return next(new AppError('Export format must be json, csv, or xml', 400));
  }
  
  if (status && !['active', 'inactive', 'archived', 'all'].includes(status)) {
    return next(new AppError('Status filter must be active, inactive, archived, or all', 400));
  }
  
  if (includeHierarchy && !['true', 'false'].includes(includeHierarchy)) {
    return next(new AppError('includeHierarchy must be true or false', 400));
  }
  
  if (includeAnalytics && !['true', 'false'].includes(includeAnalytics)) {
    return next(new AppError('includeAnalytics must be true or false', 400));
  }
  
  next();
});

// Validate category template creation
exports.validateTemplateCreation = catchAsync(async (req, res, next) => {
  const { name, templateData } = req.body;
  
  if (!name || typeof name !== 'string') {
    return next(new AppError('Template name is required and must be a string', 400));
  }
  
  if (!templateData || typeof templateData !== 'object') {
    return next(new AppError('Template data is required and must be an object', 400));
  }
  
  // Check if template name already exists
  const existingTemplate = await Category.db.collection('categoryTemplates').findOne({ name });
  if (existingTemplate) {
    return next(new AppError('Template name already exists', 400));
  }
  
  next();
});

// Validate category recommendations parameters
exports.validateRecommendationsParameters = catchAsync(async (req, res, next) => {
  const { limit, type, categoryId } = req.query;
  
  if (limit && (isNaN(limit) || limit < 1 || limit > 50)) {
    return next(new AppError('Limit must be between 1 and 50', 400));
  }
  
  if (type && !['popular', 'trending', 'similar', 'related'].includes(type)) {
    return next(new AppError('Recommendation type must be popular, trending, similar, or related', 400));
  }
  
  if (categoryId) {
    const category = await Category.findById(categoryId);
    if (!category) {
      return next(new AppError('Category not found', 404));
    }
  }
  
  next();
});

// Rate limiting for category operations
exports.rateLimitCategoryOperations = (req, res, next) => {
  // Implement rate limiting based on operation type
  const operation = req.method + req.route.path;
  
  // Different rate limits for different operations
  const rateLimits = {
    'POST/categories': 10, // 10 creations per hour
    'PUT/categories': 20, // 20 updates per hour
    'DELETE/categories': 5, // 5 deletions per hour
    'POST/categories/bulk': 3, // 3 bulk operations per hour
    'POST/categories/import': 1 // 1 import per hour
  };
  
  const limit = rateLimits[operation] || 100; // Default limit
  
  // This would integrate with your rate limiting system
  // For now, just pass through
  next();
};

// Validate category analytics permissions
exports.validateAnalyticsPermissions = catchAsync(async (req, res, next) => {
  const user = req.user;
  
  // Only admins and moderators can access analytics
  if (!['admin', 'moderator'].includes(user.role)) {
    return next(new AppError('Insufficient permissions to access analytics', 403));
  }
  
  next();
});

// Validate category search parameters
exports.validateSearchParameters = catchAsync(async (req, res, next) => {
  const { search, status, parent, hasChildren, sortBy, sortOrder } = req.query;
  
  if (search && search.length > 100) {
    return next(new AppError('Search query cannot exceed 100 characters', 400));
  }
  
  if (status && !['active', 'inactive', 'archived'].includes(status)) {
    return next(new AppError('Invalid status filter', 400));
  }
  
  if (parent && !/^[0-9a-fA-F]{24}$/.test(parent)) {
    return next(new AppError('Invalid parent category ID', 400));
  }
  
  if (hasChildren && !['true', 'false'].includes(hasChildren)) {
    return next(new AppError('hasChildren must be true or false', 400));
  }
  
  if (sortBy && !['name', 'createdAt', 'updatedAt', 'sortOrder', 'usageCount', 'popularity'].includes(sortBy)) {
    return next(new AppError('Invalid sort field', 400));
  }
  
  if (sortOrder && !['asc', 'desc'].includes(sortOrder)) {
    return next(new AppError('Sort order must be asc or desc', 400));
  }
  
  next();
});

// Validate category reordering
exports.validateReordering = catchAsync(async (req, res, next) => {
  const { newOrder } = req.body;
  
  if (!Array.isArray(newOrder)) {
    return next(new AppError('New order must be an array', 400));
  }
  
  if (newOrder.length === 0) {
    return next(new AppError('New order cannot be empty', 400));
  }
  
  // Validate that all IDs are valid
  const categoryIds = newOrder.map(item => 
    typeof item === 'string' ? item : item.id
  );
  
  const categories = await Category.find({ _id: { $in: categoryIds } });
  
  if (categories.length !== categoryIds.length) {
    return next(new AppError('One or more category IDs are invalid', 400));
  }
  
  next();
});

// All functions are already exported using exports.functionName above
// No need for additional module.exports