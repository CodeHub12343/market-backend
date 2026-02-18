const Category = require('../models/categoryModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const APIFeatures = require('../utils/apiFeatures');

// Create category
exports.createCategory = catchAsync(async (req, res, next) => {
  const categoryData = {
    ...req.body,
    metadata: {
      createdBy: req.user._id,
      lastModifiedBy: req.user._id
    }
  };
  
  const category = await Category.create(categoryData);
  res.status(201).json({ 
    status: 'success', 
    data: { category } 
  });
});

// Get all categories with advanced filtering
exports.getAllCategories = catchAsync(async (req, res, next) => {
  const { search, status, parent, hasChildren, sortBy, sortOrder } = req.query;
  
  let filter = { archived: false };
  
  // Search filter
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { tags: { $in: [new RegExp(search, 'i')] } }
    ];
  }
  
  // Status filter
  if (status) filter.status = status;
  
  // Parent filter
  if (parent) filter.parent = parent;
  
  // Has children filter
  if (hasChildren === 'true') filter.childrenCount = { $gt: 0 };
  if (hasChildren === 'false') filter.childrenCount = 0;
  
  // Build query
  let query = Category.find(filter);
  
  // Apply API features
  const features = new APIFeatures(query, req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate();
  
  const categories = await features.query;
  
  res.status(200).json({
    status: 'success',
    results: categories.length,
    data: { categories }
  });
});

// Get single category
exports.getCategory = catchAsync(async (req, res, next) => {
  const category = await Category.findById(req.params.id)
    .populate('parent', 'name slug')
    .populate('path', 'name slug');
  
  if (!category) return next(new AppError('Category not found', 404));
  
  // Increment views
  await category.incrementViews();
  
  res.status(200).json({ 
    status: 'success', 
    data: { category } 
  });
});

// Update category
exports.updateCategory = catchAsync(async (req, res, next) => {
  const updateData = {
    ...req.body,
    'metadata.lastModifiedBy': req.user._id
  };
  
  const category = await Category.findByIdAndUpdate(
    req.params.id, 
    updateData, 
    { new: true, runValidators: true }
  );
  
  if (!category) return next(new AppError('Category not found', 404));
  
  res.status(200).json({ 
    status: 'success', 
    data: { category } 
  });
});

// Delete category
exports.deleteCategory = catchAsync(async (req, res, next) => {
  const category = await Category.findById(req.params.id);
  if (!category) return next(new AppError('Category not found', 404));
  
  // Check for dependencies
  const dependencies = await Promise.all([
    Category.db.collection('products').countDocuments({ category: category._id }),
    Category.db.collection('services').countDocuments({ category: category._id }),
    Category.db.collection('events').countDocuments({ category: category._id }),
    Category.db.collection('documents').countDocuments({ category: category._id }),
    Category.db.collection('requests').countDocuments({ category: category._id })
  ]);
  
  const totalDependencies = dependencies.reduce((sum, count) => sum + count, 0);
  
  if (totalDependencies > 0) {
    return next(new AppError(
      `Cannot delete category. It is being used by ${totalDependencies} items.`,
      400
    ));
  }
  
  await Category.findByIdAndDelete(req.params.id);
  res.status(204).json({ status: 'success', data: null });
});

// Search categories
exports.searchCategories = catchAsync(async (req, res, next) => {
  const { q, limit = 10 } = req.query;
  
  if (!q) {
    return next(new AppError('Search query is required', 400));
  }
  
  const categories = await Category.searchCategories(q, { archived: false })
    .limit(parseInt(limit));
  
  res.status(200).json({
    status: 'success',
    results: categories.length,
    data: { categories }
  });
});

// Get category hierarchy
exports.getCategoryHierarchy = catchAsync(async (req, res, next) => {
  const categories = await Category.getCategoryTree();
  
  res.status(200).json({
    status: 'success',
    results: categories.length,
    data: { categories }
  });
});

// Get category children
exports.getCategoryChildren = catchAsync(async (req, res, next) => {
  const children = await Category.getChildren(req.params.id);
  
  res.status(200).json({
    status: 'success',
    results: children.length,
    data: { categories: children }
  });
});

// Get popular categories
exports.getPopularCategories = catchAsync(async (req, res, next) => {
  const limit = parseInt(req.query.limit) || 10;
  const categories = await Category.getPopular(limit);
  
  res.status(200).json({
    status: 'success',
    results: categories.length,
    data: { categories }
  });
});

// Get trending categories
exports.getTrendingCategories = catchAsync(async (req, res, next) => {
  const limit = parseInt(req.query.limit) || 10;
  const categories = await Category.getTrending(limit);
  
  res.status(200).json({
    status: 'success',
    results: categories.length,
    data: { categories }
  });
});

// Get category analytics
exports.getCategoryAnalytics = catchAsync(async (req, res, next) => {
  const { startDate, endDate, period } = req.query;
  const categoryId = req.params.id;
  
  let analytics;
  
  if (categoryId) {
    // Single category analytics
    const category = await Category.findById(categoryId);
    if (!category) return next(new AppError('Category not found', 404));
    
    analytics = {
      category: {
        id: category._id,
        name: category.name,
        views: category.analytics.views,
        usageCount: category.analytics.usageCount,
        popularity: category.analytics.popularity,
        lastUsed: category.analytics.lastUsed,
        usageByModel: category.usageByModel,
        totalUsage: category.totalUsage
      }
    };
  } else {
    // Global analytics
    const [globalStats, usageStats] = await Promise.all([
      Category.getAnalytics(startDate, endDate),
      Category.getUsageStats()
    ]);
    
    analytics = {
      global: globalStats[0] || {},
      usage: usageStats[0] || {}
    };
  }
  
  res.status(200).json({
    status: 'success',
    data: analytics
  });
});

// Bulk operations
exports.bulkOperations = catchAsync(async (req, res, next) => {
  const { operation, categoryIds, updateData, mergeTarget, newOrder } = req.body;
  
  let result;
  
  switch (operation) {
    case 'delete':
      result = await Category.deleteMany({ _id: { $in: categoryIds } });
      break;
      
    case 'archive':
      result = await Category.updateMany(
        { _id: { $in: categoryIds } },
        { 
          $set: { 
            archived: true, 
            archivedAt: new Date(),
            archivedBy: req.user._id
          } 
        }
      );
      break;
      
    case 'unarchive':
      result = await Category.updateMany(
        { _id: { $in: categoryIds } },
        { 
          $set: { 
            archived: false, 
            archivedAt: null,
            archivedBy: null
          } 
        }
      );
      break;
      
    case 'activate':
      result = await Category.updateMany(
        { _id: { $in: categoryIds } },
        { $set: { status: 'active' } }
      );
      break;
      
    case 'deactivate':
      result = await Category.updateMany(
        { _id: { $in: categoryIds } },
        { $set: { status: 'inactive' } }
      );
      break;
      
    case 'update':
      result = await Category.updateMany(
        { _id: { $in: categoryIds } },
        { $set: updateData || {} }
      );
      break;
      
    case 'reorder':
      const updatePromises = newOrder.map((item, index) => 
        Category.findByIdAndUpdate(
          typeof item === 'string' ? item : item.id,
          { sortOrder: index }
        )
      );
      await Promise.all(updatePromises);
      result = { modifiedCount: newOrder.length };
      break;
      
    case 'merge':
      const sourceCategory = await Category.findById(categoryIds[0]);
      const targetCategory = await Category.findById(mergeTarget);
      
      if (!sourceCategory || !targetCategory) {
        return next(new AppError('Source or target category not found', 404));
      }
      
      // Update references in other collections
      await Promise.all([
        Category.db.collection('products').updateMany(
          { category: sourceCategory._id },
          { $set: { category: targetCategory._id } }
        ),
        Category.db.collection('services').updateMany(
          { category: sourceCategory._id },
          { $set: { category: targetCategory._id } }
        ),
        Category.db.collection('events').updateMany(
          { category: sourceCategory._id },
          { $set: { category: targetCategory._id } }
        ),
        Category.db.collection('documents').updateMany(
          { category: sourceCategory._id },
          { $set: { category: targetCategory._id } }
        ),
        Category.db.collection('requests').updateMany(
          { category: sourceCategory._id },
          { $set: { category: targetCategory._id } }
        )
      ]);
      
      // Delete source category
      await Category.findByIdAndDelete(sourceCategory._id);
      result = { modifiedCount: 1 };
      break;
      
    default:
      return next(new AppError('Invalid bulk operation', 400));
  }
  
  res.status(200).json({
    status: 'success',
    data: result
  });
});

// Update category hierarchy
exports.updateCategoryHierarchy = catchAsync(async (req, res, next) => {
  const { categoryId, newParent, newSortOrder } = req.body;
  
  const category = await Category.findById(categoryId);
  if (!category) return next(new AppError('Category not found', 404));
  
  await category.updateHierarchy(newParent, newSortOrder);
  
  res.status(200).json({
    status: 'success',
    data: { category }
  });
});

// Archive category
exports.archiveCategory = catchAsync(async (req, res, next) => {
  const category = await Category.findById(req.params.id);
  if (!category) return next(new AppError('Category not found', 404));
  
  await category.archive(req.user._id);
  
  res.status(200).json({
    status: 'success',
    data: { category }
  });
});

// Unarchive category
exports.unarchiveCategory = catchAsync(async (req, res, next) => {
  const category = await Category.findById(req.params.id);
  if (!category) return next(new AppError('Category not found', 404));
  
  await category.unarchive();
  
  res.status(200).json({
    status: 'success',
    data: { category }
  });
});

// Import categories
exports.importCategories = catchAsync(async (req, res, next) => {
  const { categories, overwriteExisting } = req.body;
  
  const results = {
    created: 0,
    updated: 0,
    errors: []
  };
  
  for (let i = 0; i < categories.length; i++) {
    try {
      const categoryData = categories[i];
      
      if (overwriteExisting) {
        const existing = await Category.findOne({ name: categoryData.name });
        if (existing) {
          await Category.findByIdAndUpdate(existing._id, categoryData);
          results.updated++;
        } else {
          await Category.create(categoryData);
          results.created++;
        }
      } else {
        await Category.create(categoryData);
        results.created++;
      }
    } catch (error) {
      results.errors.push({
        index: i,
        error: error.message
      });
    }
  }
  
  res.status(200).json({
    status: 'success',
    data: results
  });
});

// Export categories
exports.exportCategories = catchAsync(async (req, res, next) => {
  const { format, status, includeHierarchy, includeAnalytics } = req.query;
  
  let filter = { archived: false };
  if (status && status !== 'all') filter.status = status;
  
  const categories = await Category.find(filter).sort({ sortOrder: 1, name: 1 });
  
  if (format === 'csv') {
    const csv = generateCSV(categories, includeHierarchy === 'true', includeAnalytics === 'true');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="categories.csv"');
    return res.send(csv);
  } else if (format === 'xml') {
    const xml = generateXML(categories, includeHierarchy === 'true', includeAnalytics === 'true');
    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Content-Disposition', 'attachment; filename="categories.xml"');
    return res.send(xml);
  } else {
    // JSON format
    res.status(200).json({
      status: 'success',
      results: categories.length,
      data: { categories }
    });
  }
});

// Get category recommendations
exports.getCategoryRecommendations = catchAsync(async (req, res, next) => {
  const { limit = 10, type = 'popular', categoryId } = req.query;
  
  let categories;
  
  switch (type) {
    case 'popular':
      categories = await Category.getPopular(parseInt(limit));
      break;
      
    case 'trending':
      categories = await Category.getTrending(parseInt(limit));
      break;
      
    case 'similar':
      if (!categoryId) {
        return next(new AppError('Category ID is required for similar recommendations', 400));
      }
      const category = await Category.findById(categoryId);
      if (!category) return next(new AppError('Category not found', 404));
      
      // Find categories with similar tags or in same parent
      categories = await Category.find({
        _id: { $ne: categoryId },
        $or: [
          { tags: { $in: category.tags } },
          { parent: category.parent }
        ],
        archived: false
      }).limit(parseInt(limit));
      break;
      
    case 'related':
      if (!categoryId) {
        return next(new AppError('Category ID is required for related recommendations', 400));
      }
      const relatedCategory = await Category.findById(categoryId);
      if (!relatedCategory) return next(new AppError('Category not found', 404));
      
      // Find categories in same hierarchy
      categories = await Category.find({
        _id: { $ne: categoryId },
        $or: [
          { parent: relatedCategory.parent },
          { path: relatedCategory._id }
        ],
        archived: false
      }).limit(parseInt(limit));
      break;
      
    default:
      return next(new AppError('Invalid recommendation type', 400));
  }
  
  res.status(200).json({
    status: 'success',
    results: categories.length,
    data: { categories }
  });
});

// Create category template
exports.createCategoryTemplate = catchAsync(async (req, res, next) => {
  const { name, description, templateData, isPublic } = req.body;
  
  const template = await Category.db.collection('categoryTemplates').insertOne({
    name,
    description,
    templateData,
    isPublic: isPublic || false,
    createdBy: req.user._id,
    createdAt: new Date(),
    updatedAt: new Date()
  });
  
  res.status(201).json({
    status: 'success',
    data: { 
      id: template.insertedId, 
      name, 
      description, 
      templateData, 
      isPublic 
    }
  });
});

// Get category templates
exports.getCategoryTemplates = catchAsync(async (req, res, next) => {
  const templates = await Category.db.collection('categoryTemplates').find({
    $or: [
      { createdBy: req.user._id },
      { isPublic: true }
    ]
  }).sort({ createdAt: -1 }).toArray();
  
  res.status(200).json({
    status: 'success',
    results: templates.length,
    data: { templates }
  });
});

// Helper functions
function generateCSV(categories, includeHierarchy, includeAnalytics) {
  const headers = ['Name', 'Slug', 'Description', 'Status', 'Parent', 'Sort Order'];
  
  if (includeHierarchy) {
    headers.push('Level', 'Path');
  }
  
  if (includeAnalytics) {
    headers.push('Views', 'Usage Count', 'Popularity', 'Last Used');
  }
  
  const rows = categories.map(category => {
    const row = [
      category.name,
      category.slug,
      category.description,
      category.status,
      category.parent ? category.parent.name : '',
      category.sortOrder
    ];
    
    if (includeHierarchy) {
      row.push(category.level, category.path.map(p => p.name).join(' > '));
    }
    
    if (includeAnalytics) {
      row.push(
        category.analytics.views,
        category.analytics.usageCount,
        category.analytics.popularity,
        category.analytics.lastUsed
      );
    }
    
    return row;
  });
  
  return [headers, ...rows].map(row => 
    row.map(field => `"${field || ''}"`).join(',')
  ).join('\n');
}

function generateXML(categories, includeHierarchy, includeAnalytics) {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<categories>\n';
  
  categories.forEach(category => {
    xml += '  <category>\n';
    xml += `    <name>${category.name}</name>\n`;
    xml += `    <slug>${category.slug}</slug>\n`;
    xml += `    <description>${category.description || ''}</description>\n`;
    xml += `    <status>${category.status}</status>\n`;
    xml += `    <sortOrder>${category.sortOrder}</sortOrder>\n`;
    
    if (includeHierarchy) {
      xml += `    <level>${category.level}</level>\n`;
      xml += `    <path>${category.path.map(p => p.name).join(' > ')}</path>\n`;
    }
    
    if (includeAnalytics) {
      xml += '    <analytics>\n';
      xml += `      <views>${category.analytics.views}</views>\n`;
      xml += `      <usageCount>${category.analytics.usageCount}</usageCount>\n`;
      xml += `      <popularity>${category.analytics.popularity}</popularity>\n`;
      xml += `      <lastUsed>${category.analytics.lastUsed}</lastUsed>\n`;
      xml += '    </analytics>\n';
    }
    
    xml += '  </category>\n';
  });
  
  xml += '</categories>';
  return xml;
}

