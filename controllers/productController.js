const mongoose = require('mongoose');
const Product = require('../models/productModel');
const Shop = require('../models/shopModel');
const ProductCategory = require('../models/productCategoryModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const APIFeatures = require('../utils/apiFeatures');
const cloudinary = require('../config/cloudinary');
const { uploadBuffer } = require('../utils/cloudinaryUpload');

const CLOUD_FOLDER = process.env.CLOUDINARY_PRODUCT_FOLDER || 'products';

// Create product with images
exports.createProduct = catchAsync(async (req, res, next) => {
  const productData = {
    ...req.body,
    shop: req.body.shop || req.user.shop // Allow shop from body or user's shop
  };

  // Verify shop ownership
  const shop = await Shop.findById(productData.shop);
  if (!shop || shop.owner.toString() !== req.user.id) {
    return next(new AppError('You can only create products for your own shop', 403));
  }

  const images = [];

  // Handle image uploads
  if (req.uploadedFiles?.length > 0) {
    req.uploadedFiles.forEach(file => {
      images.push({ url: file.url, public_id: file.public_id });
    });
  }

  // Add images to product data
  productData.images = images.map(i => i.url);
  productData.images_meta = images;

  const product = await Product.create(productData);

  // Notify followers about new product (best-effort; failures shouldn't block response)
  (async () => {
    try {
      const Notification = require('../models/notificationModel');
      const User = require('../models/userModel');
      
      // Get users who might be interested in this product
      const interestedUsers = await User.find({
        campus: productData.campus || req.user.campus,
        role: { $in: ['buyer', 'both'] },
        _id: { $ne: req.user.id }
      });
      
      if (interestedUsers && interestedUsers.length) {
        const notificationData = interestedUsers.map(user => ({
          user: user._id,
          title: 'New Product Available',
          message: `${req.user.fullName || 'A seller'} listed a new product: ${productData.name}`,
          type: 'product',
          category: 'info',
          priority: 'normal',
          data: { productId: product._id, sellerId: req.user.id },
          channels: ['in_app', 'push']
        }));

        // Insert notifications (non-blocking if it fails)
        try {
          await Notification.insertMany(notificationData);
        } catch (err) {
          console.error('Failed to insert product notifications:', err && err.message ? err.message : err);
        }
      }
    } catch (err) {
      console.error('Product notification workflow error:', err && err.message ? err.message : err);
    }
  })();

  res.status(201).json({ 
    status: 'success', 
    data: { product } 
  });
});

// Get all products with advanced filtering
exports.getAllProducts = catchAsync(async (req, res, next) => {
  console.log('\n📦 GET ALL PRODUCTS - CAMPUS FILTERING DEBUG');
  console.log('   🔐 req.user:', req.user ? `${req.user.fullName} (${req.user.email})` : '❌ NOT AUTHENTICATED');
  console.log('   🏫 req.user.campus:', req.user?.campus);
  console.log('   📤 Query params:', { allCampuses: req.query.allCampuses, campus: req.query.campus });
  console.log('   req.query:', req.query);
  
  // Build filter
  const rawFilter = buildFilter(req.query);
  console.log('rawFilter after buildFilter:', rawFilter);

  // Determine campus filter to apply
  let campusFilterId = null;
  if (req.query.allCampuses === 'true') {
    // User explicitly requested all campuses - don't filter by campus
    if (req.query.campus) campusFilterId = req.query.campus; // If specific campus provided, use it
    console.log('   ✅ allCampuses=true → showing all campuses');
  } else {
    // DEFAULT: Show only user's campus
    if (req.user?.campus) {
      // Handle both populated campus object and campus ID
      campusFilterId = req.user.campus._id || req.user.campus;
      console.log('   ✅ DEFAULT: Filtering by user campus:', campusFilterId?.toString());
    } else {
      console.log('   ⚠️ NO USER OR CAMPUS → NO FILTER APPLIED');
    }
  }
  console.log('   🔍 Final campus filter:', campusFilterId?.toString() || 'NONE');
  
  // Remove invalid campus filter from filter object (products don't have direct campus field)
  delete rawFilter.campus;

  // IMPORTANT: Default to only showing active products
  // BUT: Don't apply these filters if it's a shop-specific query
  // (shop owners should see all their products)
  if (!req.query.shop) {
    if (!req.query.status) {
      rawFilter.status = 'active';
    }

    // Also ensure product is available (optional, can be overridden)
    if (req.query.available === undefined) {
      rawFilter.isAvailable = true;
    }
  }

  // Resolve category slug/name if provided
  if (rawFilter._categorySlug) {
    const cat = await ProductCategory.findOne({
      $or: [{ slug: rawFilter._categorySlug }, { name: rawFilter._categorySlug }]
    });
    if (cat) rawFilter.category = cat._id;
    delete rawFilter._categorySlug;
  }

  console.log('Final filter before query:', rawFilter);

  // Determine sort order
  let sortObj = { createdAt: -1 }; // Default sort
  if (req.query.sort) {
    sortObj = {};
    const sortBy = req.query.sort.startsWith('-') ? req.query.sort.slice(1) : req.query.sort;
    sortObj[sortBy] = req.query.sort.startsWith('-') ? -1 : 1;
  }

  // Pagination
  const page = Math.max(1, parseInt(req.query.page, 10)) || 1;
  const limit = Math.min(100, parseInt(req.query.limit, 10)) || 10;
  const skip = (page - 1) * limit;

  // Ensure correct types for aggregation (convert shop id strings to ObjectId)
  if (rawFilter.shop && /^[0-9a-fA-F]{24}$/.test(String(rawFilter.shop))) {
    rawFilter.shop = new mongoose.Types.ObjectId(String(rawFilter.shop));
  }

  // Build aggregation pipeline for campus filtering
  const pipeline = [
    { $match: rawFilter },
    {
      $lookup: {
        from: 'shops',
        localField: 'shop',
        foreignField: '_id',
        as: 'shopData'
      }
    }
  ];

  // Add campus filter if needed (after lookup)
  if (campusFilterId) {
    pipeline.push({
      $match: {
        'shopData.campus': new mongoose.Types.ObjectId(campusFilterId)
      }
    });
  }

  // Add sorting
  pipeline.push({ $sort: sortObj });

  // Count total before pagination
  const countPipeline = [
    { $match: rawFilter },
    {
      $lookup: {
        from: 'shops',
        localField: 'shop',
        foreignField: '_id',
        as: 'shopData'
      }
    }
  ];
  if (campusFilterId) {
    countPipeline.push({
      $match: {
        'shopData.campus': new mongoose.Types.ObjectId(campusFilterId)
      }
    });
  }
  countPipeline.push({ $count: 'total' });
  
  const countResult = await Product.aggregate(countPipeline);
  const total = countResult.length > 0 ? countResult[0].total : 0;

  // Add pagination
  pipeline.push({ $skip: skip }, { $limit: limit });

  // Add lookups for nested population
  pipeline.push(
    {
      $lookup: {
        from: 'categories',
        localField: 'category',
        foreignField: '_id',
        as: 'categoryData'
      }
    },
    {
      $unwind: {
        path: '$categoryData',
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: 'shopData.owner',
        foreignField: '_id',
        as: 'shopData.ownerData'
      }
    },
    {
      $unwind: {
        path: '$shopData.ownerData',
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $lookup: {
        from: 'campuses',
        localField: 'shopData.campus',
        foreignField: '_id',
        as: 'shopData.campusData'
      }
    },
    {
      $unwind: {
        path: '$shopData.campusData',
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $project: {
        _id: 1, name: 1, description: 1, price: 1, images: 1, images_meta: 1,
        shop: {
          _id: '$shopData._id',
          name: '$shopData.name',
          owner: '$shopData.ownerData',
          campus: '$shopData.campusData'
        },
        category: '$categoryData',
        campus: 1,
        stock: 1, quantity: 1, isAvailable: 1, condition: 1, tags: 1,
        location: 1, status: 1, analytics: 1, ratingsAverage: 1, ratingsQuantity: 1,
        createdAt: 1, updatedAt: 1
      }
    }
  );

  // Execute aggregation for products
  const products = await Product.aggregate(pipeline);

  const countBeforePagination = total;
  console.log(`Products matching filter: ${countBeforePagination}`);
  console.log(`getAllProducts returning ${products.length} products`);
  
  // Debug: Log the shop filter if it was applied
  if (rawFilter.shop) {
    console.log('🔍 DEBUG: Filtering by shop ID:', rawFilter.shop);
    const productsWithThisShop = await Product.find({ shop: rawFilter.shop }).countDocuments();
    console.log(`Total products in DB for shop ${rawFilter.shop}:`, productsWithThisShop);
  }

  res.status(200).json({
    status: 'success',
    results: products.length,
    data: { products }
  });
});

// Get single product with view tracking
exports.getProduct = catchAsync(async (req, res, next) => {
  const product = await Product.findById(req.params.id)
    .populate({
      path: 'shop',
      populate: [
        {
          path: 'owner',
          select: '_id fullName email photo'
        },
        {
          path: 'campus',
          select: '_id name shortCode'
        }
      ]
    })
    .populate({
      path: 'category',
      select: 'name'
    })
    .populate({
      path: 'campus',
      select: '_id name shortCode'
    });
  
  if (!product) {
    return next(new AppError('Product not found', 404));
  }

  // Increment view count (don't wait for it)
  product.incrementViews().catch(err => 
    console.error('Error incrementing views:', err)
  );

  // Convert to plain object and add isOwner field
  const productObj = product.toObject();
  productObj.isOwner = req.user && product.shop.owner.toString() === req.user._id.toString();

  // Ensure campus is populated from shop.campus if product.campus is missing
  if (!productObj.campus && productObj.shop?.campus) {
    productObj.campus = productObj.shop.campus;
  }

  res.status(200).json({ 
    status: 'success', 
    data: { product: productObj } 
  });
});

// Update product
exports.updateProduct = catchAsync(async (req, res, next) => {
  const updates = { ...req.body };

  // Ensure we have the existing product (some middleware may not have set req.product)
  const existingProduct = req.product || await Product.findById(req.params.id);
  if (!existingProduct) return next(new AppError('Product not found', 404));

  // Handle new image uploads (only when valid files with buffers are present)
  if (req.files && req.files.length > 0) {
    const validFiles = req.files.filter((f) => f && f.buffer);
    if (validFiles.length > 0) {
      const uploadPromises = validFiles.map((file, idx) =>
        uploadBuffer(
          file.buffer,
          CLOUD_FOLDER,
          `${(existingProduct.name || 'product').replace(/\s+/g, '_')}_${Date.now()}_${idx}`
        )
      );
      const results = await Promise.all(uploadPromises);
      const urls = results.map((r) => r && r.secure_url).filter(Boolean);

      updates.images = Array.isArray(existingProduct.images)
        ? existingProduct.images.concat(urls)
        : urls;
      updates.images_meta = (existingProduct.images_meta || [])
        .concat(results.map((r) => ({ url: r.secure_url, public_id: r.public_id })));
    }
  }

  const updatedProduct = await Product.findByIdAndUpdate(
    req.params.id, 
    updates, 
    { new: true, runValidators: true }
  );

  res.status(200).json({ 
    status: 'success', 
    data: { product: updatedProduct } 
  });
});

// Delete product
exports.deleteProduct = catchAsync(async (req, res, next) => {
  // Ensure we have the product data (middleware may not have set req.product)
  const productToDelete = req.product || await Product.findById(req.params.id);
  if (!productToDelete) return next(new AppError('Product not found', 404));

  // Delete product from database immediately
  await Product.findByIdAndDelete(req.params.id);

  // Delete Cloudinary images in the background (non-blocking)
  if (productToDelete.images_meta && productToDelete.images_meta.length > 0) {
    // Fire and forget - don't wait for Cloudinary deletions
    (async () => {
      try {
        const deletePromises = productToDelete.images_meta.map(img =>
          cloudinary.uploader.destroy(img.public_id).catch(() => null)
        );
        await Promise.all(deletePromises);
        console.log(`✓ Deleted ${productToDelete.images_meta.length} images from Cloudinary for product ${req.params.id}`);
      } catch (err) {
        console.error(`✗ Error deleting Cloudinary images for product ${req.params.id}:`, err && err.message ? err.message : err);
      }
    })();
  }

  res.status(204).json({ 
    status: 'success', 
    data: null 
  });
});

// Search products
exports.searchProducts = catchAsync(async (req, res, next) => {
  const { q, category, campus, shop, condition, minPrice, maxPrice, sort, order } = req.query;
  
  const filters = {
    category,
    campus,
    shop,
    condition,
    minPrice: minPrice ? Number(minPrice) : undefined,
    maxPrice: maxPrice ? Number(maxPrice) : undefined
  };

  // Remove undefined filters
  Object.keys(filters).forEach(key => 
    filters[key] === undefined && delete filters[key]
  );

  const products = await Product.searchProducts(q, filters);

  // Apply sorting
  if (sort) {
    const sortOrder = order === 'asc' ? 1 : -1;
    products.sort((a, b) => {
      if (sort === 'price') return (a.price - b.price) * sortOrder;
      if (sort === 'rating') return (a.ratingsAverage - b.ratingsAverage) * sortOrder;
      if (sort === 'views') return (a.analytics.views - b.analytics.views) * sortOrder;
      if (sort === 'created') return (a.createdAt - b.createdAt) * sortOrder;
      return 0;
    });
  }

  res.status(200).json({ 
    status: 'success', 
    results: products.length, 
    data: { products } 
  });
});

// Get products by category
exports.getProductsByCategory = catchAsync(async (req, res, next) => {
  const { categoryId } = req.params;
  const limit = parseInt(req.query.limit) || 20;
  
  const products = await Product.getByCategory(categoryId, limit);

  res.status(200).json({ 
    status: 'success', 
    results: products.length, 
    data: { products } 
  });
});

// Get products by campus
exports.getProductsByCampus = catchAsync(async (req, res, next) => {
  const { campusId } = req.params;
  const limit = parseInt(req.query.limit) || 20;
  
  const products = await Product.getByCampus(campusId, limit);

  res.status(200).json({ 
    status: 'success', 
    results: products.length, 
    data: { products } 
  });
});

// Get top rated products
exports.getTopRatedProducts = catchAsync(async (req, res, next) => {
  const limit = parseInt(req.query.limit) || 10;
  const products = await Product.getTopRated(limit);

  res.status(200).json({ 
    status: 'success', 
    results: products.length, 
    data: { products } 
  });
});

// Get most viewed products
exports.getMostViewedProducts = catchAsync(async (req, res, next) => {
  const limit = parseInt(req.query.limit) || 10;
  const products = await Product.getMostViewed(limit);

  res.status(200).json({ 
    status: 'success', 
    results: products.length, 
    data: { products } 
  });
});

// Get my products (shop owner)
exports.getMyProducts = catchAsync(async (req, res, next) => {
  const products = await Product.find({ 'shop.owner': req.user.id })
    .populate('shop', 'name campus')
    .populate('category', 'name')
    .sort({ createdAt: -1 });

  res.status(200).json({ 
    status: 'success', 
    results: products.length, 
    data: { products } 
  });
});

// Update product status
exports.updateProductStatus = catchAsync(async (req, res, next) => {
  const { status } = req.body;
  
  if (!['active', 'inactive', 'sold', 'out-of-stock'].includes(status)) {
    return next(new AppError('Invalid status', 400));
  }

  await req.product.updateStatus(status);

  res.status(200).json({ 
    status: 'success', 
    data: { product: req.product } 
  });
});

// Update product stock
exports.updateProductStock = catchAsync(async (req, res, next) => {
  const { stock } = req.body;
  
  if (stock < 0) {
    return next(new AppError('Stock cannot be negative', 400));
  }

  await req.product.updateStock(stock);

  res.status(200).json({ 
    status: 'success', 
    data: { product: req.product } 
  });
});

// Get product analytics
exports.getProductAnalytics = catchAsync(async (req, res, next) => {
  res.status(200).json({ 
    status: 'success', 
    data: { 
      analytics: req.product.analytics,
      views: req.product.analytics.views,
      favorites: req.product.analytics.favorites,
      lastViewed: req.product.analytics.lastViewed,
      isPopular: req.product.isPopular
    } 
  });
});

// Delete product image
exports.deleteProductImage = catchAsync(async (req, res, next) => {
  const { imageIndex } = req.params;
  const index = parseInt(imageIndex);
  
  if (index < 0 || index >= req.product.images.length) {
    return next(new AppError('Invalid image index', 400));
  }

  // Delete from Cloudinary
  if (req.product.images_meta[index]) {
    await cloudinary.uploader.destroy(req.product.images_meta[index].public_id);
  }

  // Remove from arrays
  req.product.images.splice(index, 1);
  req.product.images_meta.splice(index, 1);
  
  await req.product.save();

  res.status(200).json({ 
    status: 'success', 
    message: 'Image deleted successfully' 
  });
});

// Advanced filter and sort products with comprehensive options
exports.advancedSearchProducts = catchAsync(async (req, res, next) => {
  console.log('\n📦 ADVANCED SEARCH PRODUCTS - COMPREHENSIVE DEBUG');
  console.log('   🔐 req.user:', req.user ? `${req.user.fullName} (${req.user.email})` : '❌ NOT AUTHENTICATED');
  console.log('   🏫 req.user.campus:', req.user?.campus);
  console.log('   📤 All Query params:', req.query);
  
  const {
    search,
    category,
    shop,
    campus,
    allCampuses,
    status = 'active',
    condition,
    minPrice,
    maxPrice,
    minRating,
    maxRating,
    minViews,
    maxViews,
    available,
    inStock,
    hasImages,
    sortBy = 'createdAt',
    order = 'desc',
    page = 1,
    limit = 20,
    tags,
    excludeOutOfStock,
    rating,
    popularity
  } = req.query;

  // Log individual filters
  console.log('   ✅ Parsed filters:', {
    search: search ? `"${search}"` : '❌ NONE',
    category: category ? `${category}` : '❌ NONE',
    condition: condition ? `${condition}` : '❌ NONE',
    minPrice: minPrice ? `₦${minPrice}` : '❌ NONE',
    maxPrice: maxPrice ? `₦${maxPrice}` : '❌ NONE',
    rating: rating ? `${rating}` : '❌ NONE',
    inStock: inStock ? `${inStock}` : '❌ NONE',
    hasImages: hasImages ? `${hasImages}` : '❌ NONE',
    sortBy: `${sortBy}`,
    order: `${order}`,
    page: `${page}`,
    limit: `${limit}`
  });

  // Build advanced filter
  const filter = buildAdvancedFilter({
    search, category, shop, campus, status, condition, minPrice, maxPrice,
    minRating, maxRating, minViews, maxViews, available, inStock, hasImages,
    tags, excludeOutOfStock, rating, popularity
  });

  console.log('   🔍 Built filter object:', JSON.stringify(filter, null, 2));

  // Convert category string to ObjectId if provided
  if (filter.category && typeof filter.category === 'string') {
    filter.category = new mongoose.Types.ObjectId(filter.category);
    console.log('   ✅ Converted category to ObjectId:', filter.category.toString());
  }

  // Determine campus filter to apply
  let campusFilterId = null;
  if (allCampuses === 'true') {
    // User explicitly requested all campuses
    if (campus) campusFilterId = campus; // If specific campus provided, use it
    console.log('   ✅ allCampuses=true → showing all campuses');
  } else {
    // DEFAULT: Show only user's campus
    if (campus) {
      campusFilterId = campus;
      console.log('   ✅ Filtering by provided campus:', campus);
    } else if (req.user?.campus) {
      // Handle both populated campus object and campus ID
      campusFilterId = req.user.campus._id || req.user.campus;
      console.log('   ✅ DEFAULT: Filtering by user campus:', campusFilterId?.toString());
    } else {
      console.log('   ⚠️ NO USER OR CAMPUS → NO FILTER APPLIED');
    }
  }
  console.log('   🏫 Final campus filter:', campusFilterId?.toString() || 'NONE');
  
  // Remove invalid campus filter from filter object (products don't have direct campus field)
  delete filter.campus;

  // Resolve category slug/name if provided
  if (filter._categorySlug) {
    const cat = await ProductCategory.findOne({
      $or: [{ slug: filter._categorySlug }, { name: filter._categorySlug }]
    });
    if (cat) filter.category = cat._id;
    delete filter._categorySlug;
  }

  // Build sort object
  const sortObj = buildAdvancedSort(sortBy, order);
  console.log('   📊 Sort object:', sortObj);

  // Pagination
  const pageNum = Math.max(1, parseInt(page, 10)) || 1;
  const limitNum = Math.min(100, parseInt(limit, 10)) || 20;
  const skip = (pageNum - 1) * limitNum;
  console.log('   📄 Pagination:', { page: pageNum, limit: limitNum, skip });

  // Build aggregation pipeline for campus filtering (products store campus in shop.campus)
  const pipeline = [
    { $match: filter },
    {
      $lookup: {
        from: 'shops',
        localField: 'shop',
        foreignField: '_id',
        as: 'shopData'
      }
    },
    {
      $unwind: {
        path: '$shopData',
        preserveNullAndEmptyArrays: false
      }
    }
  ];

  // Add campus filter if needed (after lookup and unwind)
  if (campusFilterId) {
    const campusObjectId = new mongoose.Types.ObjectId(campusFilterId);
    pipeline.push({
      $match: {
        'shopData.campus': campusObjectId
      }
    });
  }

  // Add sorting
  pipeline.push({ $sort: sortObj });

  // Add pagination (skip and limit)
  pipeline.push({ $skip: skip }, { $limit: limitNum });

  // Add category lookup and population
  pipeline.push({
    $lookup: {
      from: 'categories',
      localField: 'category',
      foreignField: '_id',
      as: 'categoryData'
    }
  },
  {
    $unwind: {
      path: '$categoryData',
      preserveNullAndEmptyArrays: true
    }
  },
  {
    $project: {
      _id: 1, name: 1, description: 1, price: 1, images: 1, images_meta: 1,
      shop: '$shopData', category: '$categoryData', campus: 1,
      stock: 1, quantity: 1, isAvailable: 1, condition: 1, tags: 1,
      location: 1, status: 1, analytics: 1, ratingsAverage: 1, ratingsQuantity: 1,
      createdAt: 1, updatedAt: 1
    }
  });

  // Execute aggregation for products
  const products = await Product.aggregate(pipeline);
  console.log('   📊 After aggregation, products found:', products.length);

  if (products.length === 0 && category) {
    console.log('   ⚠️ WARNING: No products found with category filter!');
    console.log('   ⚠️ Debugging information:');
    
    // Debug: Count how many products exist with this category (all campuses)
    const totalWithCategory = await Product.countDocuments({ category: filter.category });
    console.log(`   1️⃣ Total products with category "${category}" (all campuses): ${totalWithCategory}`);
    
    // Debug: Count products in user's campus
    const campusProducts = await Product.find({ shop: { $exists: true } })
      .populate('shop', 'campus')
      .then(products => products.filter(p => 
        p.shop?.campus?.toString() === campusFilterId?.toString()
      ));
    console.log(`   2️⃣ Total products in your campus: ${campusProducts.length}`);
    
    // Debug: Show sample product to check if it has category field
    if (campusProducts.length > 0) {
      const sampleProduct = campusProducts[0];
      console.log(`   3️⃣ Sample product from your campus:`, {
        _id: sampleProduct._id,
        name: sampleProduct.name,
        category: sampleProduct.category,
        categoryType: typeof sampleProduct.category
      });
    }
    
    // Debug: Count products with this specific category in user's campus
    const campusWithCategory = await Product.countDocuments({
      category: filter.category,
      shop: { $in: campusProducts.map(p => p.shop._id) }
    });
    console.log(`   4️⃣ Products with category in your campus: ${campusWithCategory}`);
    
    if (campusWithCategory === 0) {
      console.log('   ❌ REASON: No products with this category exist in your campus');
      console.log('   💡 Solution: Add products with the "Clothing" category to your shop');
    }
  }
  
  // Count total for pagination (use same pipeline without skip/limit for counting)
  const countPipeline = [
    { $match: filter },
    {
      $lookup: {
        from: 'shops',
        localField: 'shop',
        foreignField: '_id',
        as: 'shopData'
      }
    },
    {
      $unwind: {
        path: '$shopData',
        preserveNullAndEmptyArrays: false
      }
    }
  ];
  
  if (campusFilterId) {
    const campusObjectId = new mongoose.Types.ObjectId(campusFilterId);
    countPipeline.push({
      $match: {
        'shopData.campus': campusObjectId
      }
    });
    console.log(`   🔍 Applying campus filter in count: ${campusObjectId.toString()}`);
  }
  
  countPipeline.push({ $count: 'total' });
  
  const countResult = await Product.aggregate(countPipeline);
  const total = countResult.length > 0 ? countResult[0].total : 0;
  console.log('   📈 Total count after all filters:', total);

  // Calculate pagination info
  const pages = Math.ceil(total / limitNum);
  const hasNextPage = pageNum < pages;
  const hasPrevPage = pageNum > 1;

  res.status(200).json({
    status: 'success',
    results: products.length,
    pagination: {
      total,
      page: pageNum,
      pages,
      limit: limitNum,
      hasNextPage,
      hasPrevPage
    },
    data: { products }
  });
});

// Helper function to build advanced filter
function buildAdvancedFilter(params) {
  const filter = { status: params.status || 'active' };

  // Text search
  if (params.search) {
    filter.$text = { $search: params.search };
  }

  // Category filter
  if (params.category) {
    if (/^[0-9a-fA-F]{24}$/.test(params.category)) {
      filter.category = params.category;
    } else {
      filter._categorySlug = params.category;
    }
  }

  // Basic filters
  if (params.shop && /^[0-9a-fA-F]{24}$/.test(params.shop)) filter.shop = params.shop;
  if (params.campus && /^[0-9a-fA-F]{24}$/.test(params.campus)) filter.campus = params.campus;
  if (params.condition) filter.condition = params.condition;
  if (params.available !== undefined) filter.isAvailable = params.available === 'true';

  // Price range
  if (params.minPrice || params.maxPrice) {
    filter.price = {};
    if (params.minPrice) filter.price.$gte = Number(params.minPrice);
    if (params.maxPrice) filter.price.$lte = Number(params.maxPrice);
  }

  // Rating filters
  if (params.minRating || params.maxRating) {
    filter.ratingsAverage = {};
    if (params.minRating) filter.ratingsAverage.$gte = Number(params.minRating);
    if (params.maxRating) filter.ratingsAverage.$lte = Number(params.maxRating);
  }

  // Views filters
  if (params.minViews || params.maxViews) {
    filter['analytics.views'] = {};
    if (params.minViews) filter['analytics.views'].$gte = Number(params.minViews);
    if (params.maxViews) filter['analytics.views'].$lte = Number(params.maxViews);
  }

  // Stock filters
  if (params.inStock === 'true') {
    filter.stock = { $gt: 0 };
    console.log('   ✅ Applying inStock filter: stock > 0');
  } else if (params.excludeOutOfStock === 'true') {
    filter.status = { $ne: 'out-of-stock' };
    console.log('   ✅ Applying excludeOutOfStock filter');
  }

  // Image filter
  if (params.hasImages === 'true') {
    filter.images = { $exists: true, $not: { $size: 0 } };
    console.log('   ✅ Applying hasImages filter');
  }

  // Tags filter
  if (params.tags) {
    const tagsArray = Array.isArray(params.tags) ? params.tags : params.tags.split(',');
    filter.tags = { $in: tagsArray.map(t => t.trim()) };
    console.log('   ✅ Applying tags filter:', tagsArray);
  }

  // Rating preset filters
  if (params.rating) {
    if (params.rating === 'topRated') {
      filter.ratingsAverage = { $gte: 4.5 };
      filter.ratingsQuantity = { $gte: 5 };
      console.log('   ✅ Applying topRated filter: ratingsAverage >= 4.5, ratingsQuantity >= 5');
    } else if (params.rating === 'highRated') {
      filter.ratingsAverage = { $gte: 4.0 };
      console.log('   ✅ Applying highRated filter: ratingsAverage >= 4.0');
    } else if (params.rating === 'unrated') {
      filter.ratingsQuantity = { $eq: 0 };
      console.log('   ✅ Applying unrated filter: ratingsQuantity == 0');
    }
  }

  // Popularity preset filters
  if (params.popularity) {
    if (params.popularity === 'trending') {
      filter['analytics.views'] = { $gte: 50 };
      filter['analytics.favorites'] = { $gte: 5 };
      console.log('   ✅ Applying trending filter: views >= 50, favorites >= 5');
    } else if (params.popularity === 'mostViewed') {
      filter['analytics.views'] = { $gte: 100 };
      console.log('   ✅ Applying mostViewed filter: views >= 100');
    } else if (params.popularity === 'mostFavorited') {
      filter['analytics.favorites'] = { $gte: 10 };
      console.log('   ✅ Applying mostFavorited filter: favorites >= 10');
    }
  }

  return filter;
}

// Helper function to build advanced sort
function buildAdvancedSort(sortBy, order) {
  const sortOrder = order === 'asc' ? 1 : -1;
  const sortObj = {};

  switch (sortBy) {
    case 'price':
      sortObj.price = sortOrder;
      break;
    case 'price_asc':
      sortObj.price = 1;
      break;
    case 'price_desc':
      sortObj.price = -1;
      break;
    case 'rating':
    case 'ratingsAverage':
      sortObj.ratingsAverage = sortOrder;
      sortObj.ratingsQuantity = -1; // Secondary sort by quantity
      break;
    case 'views':
    case 'analytics.views':
      sortObj['analytics.views'] = sortOrder;
      break;
    case 'favorites':
    case 'analytics.favorites':
      sortObj['analytics.favorites'] = sortOrder;
      break;
    case 'newest':
    case 'createdAt':
      sortObj.createdAt = -1;
      break;
    case 'oldest':
      sortObj.createdAt = 1;
      break;
    case 'updated':
    case 'updatedAt':
      sortObj.updatedAt = sortOrder;
      break;
    case 'name':
      sortObj.name = sortOrder;
      break;
    case 'popularity':
      // Combined popularity score (weighted)
      sortObj['analytics.views'] = -1;
      sortObj['analytics.favorites'] = -1;
      sortObj.ratingsAverage = -1;
      break;
    case 'trending':
      // Trending: recent + high engagement
      sortObj.createdAt = -1;
      sortObj['analytics.views'] = -1;
      break;
    case 'stock':
      sortObj.stock = sortOrder;
      break;
    case 'condition':
      // Sort by condition quality: new > like-new > good > fair > poor
      const conditionRank = { 'new': 5, 'like-new': 4, 'good': 3, 'fair': 2, 'poor': 1 };
      // Note: This would require aggregation; for simple sort, use:
      sortObj.condition = sortOrder;
      break;
    default:
      // Default sort by creation date (newest first)
      sortObj.createdAt = -1;
  }

  return sortObj;
}

// Helper function to build filter
function buildFilter(query) {
  const filter = {};

  // Text search
  if (query.search) {
    filter.$text = { $search: query.search };
  }

  // Category filter
  if (query.category) {
    if (/^[0-9a-fA-F]{24}$/.test(query.category)) {
      filter.category = query.category;
    } else {
      filter._categorySlug = query.category;
    }
  }

  // Other filters
  if (query.shop && /^[0-9a-fA-F]{24}$/.test(query.shop)) filter.shop = query.shop;
  if (query.campus && /^[0-9a-fA-F]{24}$/.test(query.campus)) filter.campus = query.campus;
  if (query.status) filter.status = query.status;
  if (query.condition) filter.condition = query.condition;
  if (query.available) filter.isAvailable = query.available === 'true';

  // Price range
  if (query.minPrice || query.maxPrice) {
    filter.price = {};
    if (query.minPrice) filter.price.$gte = Number(query.minPrice);
    if (query.maxPrice) filter.price.$lte = Number(query.maxPrice);
  }

  return filter;
}

/**
 * Get product search suggestions
 * GET /api/v1/products/search/suggestions
 */
exports.getProductSearchSuggestions = catchAsync(async (req, res, next) => {
  const { q, limit = 5 } = req.query;

  if (!q || q.length < 2) {
    return res.status(200).json({
      status: 'success',
      data: { suggestions: [] }
    });
  }

  const suggestions = await Product.find({
    $or: [
      { name: { $regex: q, $options: 'i' } },
      { description: { $regex: q, $options: 'i' } },
      { brand: { $regex: q, $options: 'i' } }
    ],
    isAvailable: true,
    status: 'active'
  })
    .select('name brand')
    .limit(parseInt(limit));

  res.status(200).json({
    status: 'success',
    results: suggestions.length,
    data: {
      suggestions: suggestions.map(p => ({
        title: p.name,
        brand: p.brand
      }))
    }
  });
});

/**
 * Get popular/trending product searches
 * GET /api/v1/products/search/popular
 */
exports.getPopularProductSearches = catchAsync(async (req, res, next) => {
  const { limit = 10 } = req.query;

  const popular = await Product.find({
    isAvailable: true,
    status: 'active'
  })
    .select('name brand ratingsAverage ratingsQuantity price')
    .sort({ ratingsQuantity: -1, ratingsAverage: -1 })
    .limit(parseInt(limit));

  res.status(200).json({
    status: 'success',
    results: popular.length,
    data: {
      searches: popular.map(p => ({
        title: p.name,
        brand: p.brand,
        rating: p.ratingsAverage || 0,
        reviewCount: p.ratingsQuantity || 0,
        price: p.price
      }))
    }
  });
});

/**
 * Get available product locations/sellers
 * GET /api/v1/products/search/locations
 */
exports.getProductLocations = catchAsync(async (req, res, next) => {
  const locations = await Product.aggregate([
    { $match: { isAvailable: true, status: 'active' } },
    { $group: { _id: '$campus', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    {
      $lookup: {
        from: 'campuses',
        localField: '_id',
        foreignField: '_id',
        as: 'campusInfo'
      }
    }
  ]);

  res.status(200).json({
    status: 'success',
    results: locations.length,
    data: {
      locations: locations.map(loc => ({
        id: loc._id,
        name: loc.campusInfo[0]?.name || 'Unknown Campus',
        count: loc.count
      }))
    }
  });
});

/**
 * Get product search history
 * GET /api/v1/products/search/history
 */
exports.getProductSearchHistory = catchAsync(async (req, res, next) => {
  // For authenticated users, get their search history from activity logs
  if (!req.user) {
    return res.status(200).json({
      status: 'success',
      results: 0,
      data: { history: [] }
    });
  }

  const UserBehavior = require('../models/userBehaviorModel');
  const history = await UserBehavior.find({
    user: req.user._id,
    action: 'search',
    entityType: 'product'
  })
    .select('searchQuery timestamp')
    .sort('-timestamp')
    .limit(10);

  res.status(200).json({
    status: 'success',
    results: history.length,
    data: {
      history: history.map(item => ({
        query: item.searchQuery,
        timestamp: item.timestamp
      }))
    }
  });
});

/**
 * Save product search to history
 * POST /api/v1/products/search/history
 */
exports.saveProductSearchHistory = catchAsync(async (req, res, next) => {
  const { query } = req.body;

  if (!query || query.length < 2) {
    return next(new AppError('Search query must be at least 2 characters', 400));
  }

  // Only save for authenticated users
  if (!req.user) {
    return res.status(200).json({
      status: 'success',
      message: 'Search not saved (guest user)'
    });
  }

  const UserBehavior = require('../models/userBehaviorModel');

  await UserBehavior.create({
    user: req.user._id,
    action: 'search',
    entityType: 'product',
    searchQuery: query,
    campus: req.user.campus,
    timestamp: new Date()
  });

  res.status(201).json({
    status: 'success',
    message: 'Search saved to history'
  });
});

/**
 * Clear product search history
 * DELETE /api/v1/products/search/history
 */
exports.clearProductSearchHistory = catchAsync(async (req, res, next) => {
  const UserBehavior = require('../models/userBehaviorModel');

  await UserBehavior.deleteMany({
    user: req.user._id,
    action: 'search',
    entityType: 'product'
  });

  res.status(200).json({
    status: 'success',
    message: 'Search history cleared'
  });
});

/**
 * Delete a single product search history item
 * DELETE /api/v1/products/search/history/:id
 */
exports.deleteProductSearchHistoryItem = catchAsync(async (req, res, next) => {
  const UserBehavior = require('../models/userBehaviorModel');

  const entry = await UserBehavior.findById(req.params.id);

  if (!entry) {
    return next(new AppError('Search history item not found', 404));
  }

  if (entry.user.toString() !== req.user._id.toString()) {
    return next(new AppError('Unauthorized', 403));
  }

  await UserBehavior.findByIdAndDelete(req.params.id);

  res.status(200).json({
    status: 'success',
    message: 'Search history item deleted'
  });
});
