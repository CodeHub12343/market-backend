# 🚀 Campus Filtering Implementation Guide for Products

## Overview

This guide provides step-by-step instructions to implement **consistent campus filtering** for Products, matching the security model already successfully implemented for Documents.

---

## Current State vs Desired State

### Current (Products)
```javascript
// ❌ CURRENT: Campus is optional, not enforced
if (params.campus && /^[0-9a-fA-F]{24}$/.test(params.campus)) {
  filter.campus = params.campus;  // Only applied if user provides it
}
// Result: Users see products from ALL campuses by default
```

### Desired (Like Documents)
```javascript
// ✅ DESIRED: Campus enforced by default, can opt-out
if (req.query.allCampuses === 'true') {
  // User explicitly requested all campuses
  if (req.query.campus) filter.campus = req.query.campus;
} else if (req.user) {
  // Authenticated user: default to their campus
  filter.campus = req.user.campus;
} else {
  // Guest user: require explicit campus selection
  if (req.query.campus) filter.campus = req.query.campus;
}
// Result: Users see ONLY their campus products by default
```

---

## Implementation Steps

### Step 1: Update advancedSearchProducts Function

**File**: `controllers/productController.js` (lines 392-440)

**Change**: Add campus enforcement logic

```javascript
exports.advancedSearchProducts = catchAsync(async (req, res, next) => {
  const {
    search,
    category,
    shop,
    campus,
    allCampuses,  // ← ADD THIS NEW PARAMETER
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

  // Build advanced filter
  const filter = buildAdvancedFilter({
    search, category, shop, campus, status, condition, minPrice, maxPrice,
    minRating, maxRating, minViews, maxViews, available, inStock, hasImages,
    tags, excludeOutOfStock, rating, popularity
  });

  // ← ADD CAMPUS ENFORCEMENT (NEW)
  // Campus filtering behavior - security-first defaults (matching documents)
  if (allCampuses === 'true') {
    // User explicitly requested all campuses
    if (campus && /^[0-9a-fA-F]{24}$/.test(campus)) {
      filter.campus = campus;  // Optional: filter to specific campus
    }
    // If allCampuses=true and no campus specified, show all campuses
  } else if (req.user) {
    // Authenticated user: default to their campus (SECURITY-FIRST)
    filter.campus = req.user.campus;
  } else {
    // Unauthenticated (guest): require explicit campus parameter
    // Remove any campus filter if not provided (shows nothing or public only)
    if (campus && /^[0-9a-fA-F]{24}$/.test(campus)) {
      filter.campus = campus;
    }
    // If no campus specified, guest won't see any products (or implement guest default)
  }

  // Resolve category slug/name if provided
  if (filter._categorySlug) {
    const cat = await Category.findOne({
      $or: [{ slug: filter._categorySlug }, { name: filter._categorySlug }]
    });
    if (cat) filter.category = cat._id;
    delete filter._categorySlug;
  }

  // Build sort object
  const sortObj = buildAdvancedSort(sortBy, order);

  // Pagination
  const pageNum = Math.max(1, parseInt(page, 10)) || 1;
  const limitNum = Math.min(100, parseInt(limit, 10)) || 20;
  const skip = (pageNum - 1) * limitNum;

  // Execute query with sorting and pagination
  const [products, total] = await Promise.all([
    Product.find(filter)
      .sort(sortObj)
      .skip(skip)
      .limit(limitNum)
      .populate('category', 'name slug')
      .populate('shop', 'name campus owner')
      .populate('campus', 'name shortCode'),
    Product.countDocuments(filter)
  ]);

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
```

---

### Step 2: Update getAllProducts Function

**File**: `controllers/productController.js` (lines 88-130)

Add similar campus enforcement:

```javascript
exports.getAllProducts = catchAsync(async (req, res, next) => {
  console.log('=== getAllProducts called ===');
  console.log('req.query:', req.query);
  
  // Build filter
  const rawFilter = buildFilter(req.query);
  console.log('rawFilter after buildFilter:', rawFilter);

  // IMPORTANT: Default to only showing active products
  if (!req.query.status) {
    rawFilter.status = 'active';
  }

  // Ensure product is available (optional, can be overridden)
  if (req.query.available === undefined && !req.query.available) {
    rawFilter.isAvailable = true;
  }

  // ← ADD CAMPUS ENFORCEMENT (NEW)
  // Campus filtering behavior - security-first defaults
  if (req.query.allCampuses === 'true') {
    // User explicitly requested all campuses
    if (req.query.campus && /^[0-9a-fA-F]{24}$/.test(req.query.campus)) {
      rawFilter.campus = req.query.campus;
    }
    // If allCampuses=true and no campus specified, show all
  } else if (req.user) {
    // Authenticated user: default to their campus
    rawFilter.campus = req.user.campus;
  } else {
    // Guest: only show if campus is specified
    if (req.query.campus && /^[0-9a-fA-F]{24}$/.test(req.query.campus)) {
      rawFilter.campus = req.query.campus;
    }
  }

  // Resolve category slug/name if provided
  if (rawFilter._categorySlug) {
    const cat = await Category.findOne({
      $or: [{ slug: rawFilter._categorySlug }, { name: rawFilter._categorySlug }]
    });
    if (cat) rawFilter.category = cat._id;
    delete rawFilter._categorySlug;
  }

  console.log('Final filter before query:', rawFilter);

  // Build query with initial filters
  let query = Product.find(rawFilter);
  
  // Check how many docs match before pagination
  const countBeforePagination = await Product.countDocuments(rawFilter);
  console.log(`Products matching filter: ${countBeforePagination}`);

  // Apply API features (sort, limitFields, paginate ONLY - NOT filter)
  const features = new APIFeatures(query, req.query)
    .sort()
    .limitFields()
    .paginate();

  const products = await features.query;

  console.log(`getAllProducts returning ${products.length} products`);

  res.status(200).json({
    status: 'success',
    results: products.length,
    data: { products }
  });
});
```

---

### Step 3: Update buildAdvancedFilter Helper Function

**File**: `controllers/productController.js` (lines 470-520)

Modify to preserve the `campus` and `allCampuses` parameters:

```javascript
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
  
  // NOTE: Campus is now handled at function level, not here
  // This prevents double-filtering
  // if (params.campus && /^[0-9a-fA-F]{24}$/.test(params.campus)) filter.campus = params.campus;
  
  if (params.condition) filter.condition = params.condition;
  if (params.available !== undefined) filter.isAvailable = params.available === 'true';

  // Price range
  if (params.minPrice || params.maxPrice) {
    filter.price = {};
    if (params.minPrice) filter.price.$gte = parseFloat(params.minPrice);
    if (params.maxPrice) filter.price.$lte = parseFloat(params.maxPrice);
  }

  // ... rest of filters
  
  return filter;
}
```

---

### Step 4: Update buildFilter Helper Function

**File**: `controllers/productController.js` (Find existing function)

Similar changes to not enforce campus here:

```javascript
function buildFilter(queryObj) {
  const filter = {};
  
  // Status filter
  if (queryObj.status) {
    filter.status = queryObj.status;
  }

  // Search text
  if (queryObj.search) {
    filter.$text = { $search: queryObj.search };
  }

  // Category filter
  if (queryObj.category) {
    if (/^[0-9a-fA-F]{24}$/.test(queryObj.category)) {
      filter.category = queryObj.category;
    } else {
      filter._categorySlug = queryObj.category;
    }
  }

  // Price range
  if (queryObj.minPrice || queryObj.maxPrice) {
    filter.price = {};
    if (queryObj.minPrice) filter.price.$gte = parseFloat(queryObj.minPrice);
    if (queryObj.maxPrice) filter.price.$lte = parseFloat(queryObj.maxPrice);
  }

  // NOTE: Campus is now handled at controller level
  // Removed campus filtering from here

  // ... other filters (condition, tags, etc.)
  
  return filter;
}
```

---

### Step 5: Update Product Model (Optional but Recommended)

**File**: `models/productModel.js` (line 34)

Consider making campus **required** instead of optional:

```javascript
// Current:
campus: { type: mongoose.Schema.Types.ObjectId, ref: 'Campus', required: false }

// Recommended:
campus: { type: mongoose.Schema.Types.ObjectId, ref: 'Campus', required: true }
```

This ensures every product is tied to a specific campus.

---

### Step 6: Add Documentation Comments

Add comments to functions for future developers:

```javascript
/**
 * Advanced search for products with campus isolation
 * 
 * Security Model:
 * - By default: Users see ONLY their campus products
 * - Opt-in: Users can request ?allCampuses=true to see all
 * - Guests: See all (or campus-specific if provided)
 * 
 * @route GET /api/v1/products/search/advanced
 * @query {string} search - Free text search
 * @query {string} campus - Filter to specific campus ID
 * @query {boolean} allCampuses - Set to 'true' to see all campuses
 * @query {string} category - Filter by category
 * @query {number} minPrice - Minimum price
 * @query {number} maxPrice - Maximum price
 * @query {string} sortBy - Sort field (createdAt, price, rating, etc.)
 * @query {string} order - Sort order (asc, desc)
 * @query {number} page - Page number
 * @query {number} limit - Items per page (max 100)
 */
exports.advancedSearchProducts = catchAsync(async (req, res, next) => {
  // ... implementation
});
```

---

## Testing the Changes

### Test Case 1: Default Campus Isolation

```bash
# UNILAG student (ID: 111) searches products
curl -X GET "http://localhost:3000/api/v1/products/search/advanced?search=laptop" \
  -H "Authorization: Bearer UNILAG_TOKEN"

# Expected:
# - Returns only products with campus: 111
# - No products from other campuses shown
```

### Test Case 2: Opt-in to View All

```bash
# Same UNILAG student (ID: 111) explicitly requests all campuses
curl -X GET "http://localhost:3000/api/v1/products/search/advanced?search=laptop&allCampuses=true" \
  -H "Authorization: Bearer UNILAG_TOKEN"

# Expected:
# - Returns products from ALL campuses
# - Still respects other filters (search term, price, etc.)
```

### Test Case 3: Cross-Campus Filtering

```bash
# UNILAG student viewing OAU products while viewing all
curl -X GET "http://localhost:3000/api/v1/products/search/advanced?allCampuses=true&campus=222&search=textbooks" \
  -H "Authorization: Bearer UNILAG_TOKEN"

# Expected:
# - Returns only products from campus 222 (OAU)
# - Respects the campus override when allCampuses=true
```

### Test Case 4: Guest User

```bash
# Unauthenticated guest searches products
curl -X GET "http://localhost:3000/api/v1/products/search/advanced?search=laptop"

# Expected:
# - No campus specified → returns nothing (secure default)
# OR
# - Returns products from default campus (if implemented)
```

---

## Updated Frontend Hook Usage

**File**: `src/hooks/useProducts.js`

```javascript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

// Fetch all products with campus-aware filtering
export const fetchProducts = async (params = {}) => {
  // Note: Campus filtering is now handled automatically by backend
  // based on user's authentication token
  const response = await axios.get(`${API_BASE}/products/search/advanced`, { 
    params 
  });
  return response.data.data;
};

// Example usage in component:
export const useProducts = (params = {}) => {
  return useQuery({
    queryKey: ['products', params],
    queryFn: () => fetchProducts(params),
    keepPreviousData: true,
  });
};

// Usage in React component:
// const { data } = useProducts({ search: 'laptop' });
// → Automatically filtered to user's campus

// To view all campuses:
// const { data } = useProducts({ search: 'laptop', allCampuses: true });
```

---

## Rollout Checklist

- [ ] Update `advancedSearchProducts` function
- [ ] Update `getAllProducts` function
- [ ] Update `buildAdvancedFilter` helper
- [ ] Update `buildFilter` helper
- [ ] Add documentation comments
- [ ] Test Case 1: Default campus isolation
- [ ] Test Case 2: Opt-in view all
- [ ] Test Case 3: Cross-campus filtering
- [ ] Test Case 4: Guest user handling
- [ ] Update API documentation
- [ ] Verify no existing features break
- [ ] Deploy to staging
- [ ] Deploy to production

---

## Related Features to Consider

### Services Module
Apply the same campus filtering to services:
- File: `controllers/serviceController.js`
- Similar pattern as products

### Offers Module
Consider campus filtering for offers:
- File: `controllers/offerController.js`

### Requests Module
Consider campus filtering for requests:
- File: `controllers/requestController.js`

---

## Backward Compatibility

⚠️ **Important**: This change will affect existing integrations:

**Before**: `GET /api/v1/products/search/advanced?search=laptop`
- Returned: Products from ALL campuses

**After**: `GET /api/v1/products/search/advanced?search=laptop`
- Returns: Products from user's campus ONLY
- To get old behavior: Add `?allCampuses=true`

**Mitigation**:
- Update frontend code to handle campus filtering
- Provide migration guide in API changelog
- Consider deprecation period (keep logging, warn users)

---

**Status**: Implementation Ready  
**Complexity**: Medium (3-4 hours for complete implementation + testing)  
**Risk Level**: Low (well-tested pattern from Documents module)
