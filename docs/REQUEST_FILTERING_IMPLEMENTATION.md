# Request Advanced Filtering - Implementation Details

## Overview

This document provides technical details about the implementation of advanced filtering and sorting for the Request resource.

## Architecture

### Filter Pipeline

The filtering system follows a three-stage pipeline:

```
Query String → Filter Builder → MongoDB Query → Results
```

### Key Components

1. **Query Parser**: Extracts and validates query parameters
2. **Filter Builder** (`buildAdvancedRequestFilter`): Constructs MongoDB filter object
3. **Sort Builder** (`buildAdvancedRequestSort`): Constructs MongoDB sort object
4. **Pagination Handler**: Implements offset-based pagination
5. **Response Formatter**: Structures response with metadata

## Filter Implementation

### buildAdvancedRequestFilter Function

**Location**: `controllers/requestController.js`

**Purpose**: Converts query parameters into MongoDB filter object

**Input Parameters**:
```javascript
{
  search,           // string - text search
  category,         // string/array - category IDs
  requester,        // string - user ID
  campus,           // string/array - campus IDs
  status,           // string/array - request status
  minPrice,         // number - minimum price
  maxPrice,         // number - maximum price
  minResponseTime,  // number - minimum hours
  maxResponseTime,  // number - maximum hours
  minViews,         // number - minimum view count
  maxViews,         // number - maximum view count
  minOffers,        // number - minimum offers count
  maxOffers,        // number - maximum offers count
  priority,         // string/array - priority levels
  hasImages,        // boolean - image presence
  tags,             // string/array - tags
  expiringIn,       // number - hours until expiration
  fulfilled,        // boolean - fulfillment status
  popularity        // string - high/medium
}
```

**Output**: MongoDB filter object

### Filter Logic Details

#### Text Search Filter
```javascript
if (search && search.trim()) {
  filter.$text = { $search: search.trim() };
}
```
- Uses MongoDB text index on title and description
- Requires text index created on requestModel

#### Status Filter
```javascript
if (status) {
  const statuses = Array.isArray(status) ? status : [status];
  if (statuses.length === 1) {
    filter.status = statuses[0];
  } else if (statuses.length > 1) {
    filter.status = { $in: statuses };
  }
}
```
- Accepts single or multiple status values
- Uses `$in` operator for multiple values

#### Price Range Filter
```javascript
const priceRange = {};
if (minPrice !== undefined && minPrice !== '') {
  priceRange.$gte = Math.max(0, parseFloat(minPrice));
}
if (maxPrice !== undefined && maxPrice !== '') {
  priceRange.$lte = Math.max(0, parseFloat(maxPrice));
}
if (Object.keys(priceRange).length > 0) {
  filter.desiredPrice = priceRange;
}
```
- Handles both bounds independently
- Uses `$gte` and `$lte` operators
- Ensures non-negative values

#### Analytics Filters (Views, Offers, Response Time)
```javascript
const viewsRange = {};
if (minViews !== undefined && minViews !== '') {
  viewsRange.$gte = Math.max(0, parseInt(minViews, 10));
}
if (maxViews !== undefined && maxViews !== '') {
  viewsRange.$lte = Math.max(0, parseInt(maxViews, 10));
}
if (Object.keys(viewsRange).length > 0) {
  filter['analytics.views'] = viewsRange;
}
```
- Accesses nested analytics fields using dot notation
- Converts to appropriate numeric types
- Works for views, offers count, and response time

#### Expiration Filter
```javascript
if (expiringIn && expiringIn !== '') {
  const hours = parseInt(expiringIn, 10);
  if (hours > 0) {
    const now = new Date();
    const expirationThreshold = new Date(now.getTime() + hours * 60 * 60 * 1000);
    filter.expiresAt = { $lte: expirationThreshold, $gt: now };
  }
}
```
- Calculates threshold timestamp
- Uses `$gt` for current time (active requests)
- Uses `$lte` for expiration cutoff
- Time conversion: hours * 60 * 60 * 1000

#### Image Filter
```javascript
if (hasImages === 'true' || hasImages === true) {
  filter.images = { $exists: true, $ne: [] };
} else if (hasImages === 'false' || hasImages === false) {
  filter.$or = [{ images: { $exists: false } }, { images: [] }];
}
```
- Handles both string and boolean inputs
- For true: checks existence and non-empty array
- For false: checks non-existence or empty array

#### Popularity Filter
```javascript
if (popularity === 'high') {
  filter['analytics.views'] = { $gte: 50 };
  filter['analytics.offersCount'] = { $gte: 5 };
} else if (popularity === 'medium') {
  filter['analytics.views'] = { $gte: 20, $lt: 50 };
  filter['analytics.offersCount'] = { $gte: 2, $lt: 5 };
}
```
- Combines multiple conditions
- High: 50+ views AND 5+ offers
- Medium: 20-50 views AND 2-5 offers

## Sort Implementation

### buildAdvancedRequestSort Function

**Location**: `controllers/requestController.js`

**Purpose**: Constructs MongoDB sort specification

**Input Parameters**:
- `sortBy`: string - field to sort by
- `order`: string - 'asc' or 'desc'

**Sort Options**:

| Option | Implementation |
|--------|-----------------|
| `newest` | `{ createdAt: -1 }` |
| `oldest` | `{ createdAt: 1 }` |
| `priceAsc` | `{ desiredPrice: 1 }` |
| `priceDesc` | `{ desiredPrice: -1 }` |
| `views` | `{ 'analytics.views': -1 }` |
| `offers` | `{ 'analytics.offersCount': -1 }` |
| `priority` | `{ priority: 1 }` (low to high) |
| `responseTime` | `{ 'analytics.responseTime': 1 }` |
| `expiringsoon` | `{ expiresAt: 1 }` |
| `fulfillmentRate` | `{ 'analytics.fulfillmentRate': -1 }` |
| `trending` | `{ 'analytics.views': -1, createdAt: -1 }` |
| `mostOffers` | `{ 'analytics.offersCount': -1 }` |
| `leastOffers` | `{ 'analytics.offersCount': 1 }` |

**Sort Direction**:
- Descending (-1): Most recent, highest values first (default)
- Ascending (1): Oldest, lowest values first

## Database Indexes

Required indexes for optimal performance:

```javascript
// Index for text search
db.requests.createIndex({ title: "text", description: "text" })

// Single field indexes
db.requests.createIndex({ requester: 1 })
db.requests.createIndex({ status: 1 })
db.requests.createIndex({ createdAt: -1 })
db.requests.createIndex({ category: 1 })
db.requests.createIndex({ campus: 1 })
db.requests.createIndex({ priority: 1 })
db.requests.createIndex({ expiresAt: 1 })

// Composite indexes for analytics
db.requests.createIndex({ "analytics.views": -1 })
db.requests.createIndex({ "analytics.offersCount": -1 })
db.requests.createIndex({ "analytics.responseTime": 1 })
db.requests.createIndex({ "analytics.fulfillmentRate": -1 })

// Composite index for common queries
db.requests.createIndex({ status: 1, createdAt: -1 })
db.requests.createIndex({ priority: 1, "analytics.views": -1 })
```

## Pagination Implementation

### Offset-Based Pagination

```javascript
const pageNum = Math.max(1, parseInt(page, 10)) || 1;
const limitNum = Math.min(100, parseInt(limit, 10)) || 20;
const skip = (pageNum - 1) * limitNum;
```

**Parameters**:
- `pageNum`: Current page (minimum 1)
- `limitNum`: Results per page (maximum 100)
- `skip`: Number of documents to skip

**Calculation**:
- Page 1, limit 20: skip 0, get results 1-20
- Page 2, limit 20: skip 20, get results 21-40
- Page 10, limit 50: skip 450, get results 451-500

### Pagination Metadata

```javascript
const pages = Math.ceil(total / limitNum);
const hasNextPage = pageNum < pages;
const hasPrevPage = pageNum > 1;
```

**Metadata Returned**:
- `total`: Total matching documents
- `page`: Current page number
- `pages`: Total number of pages
- `limit`: Results per page
- `hasNextPage`: Boolean indicating more pages
- `hasPrevPage`: Boolean indicating previous pages

## Query Execution

### Query Pipeline

```javascript
const [requests, total] = await Promise.all([
  Request.find(filter)
    .sort(sortObj)
    .skip(skip)
    .limit(limitNum)
    .populate('category', 'name slug')
    .populate('requester', 'fullName email')
    .populate('campus', 'name shortCode'),
  Request.countDocuments(filter)
]);
```

**Steps**:
1. Apply filter
2. Apply sort
3. Skip to page
4. Limit results
5. Populate references
6. Execute in parallel with count

**Optimization**: Uses `Promise.all()` to execute query and count in parallel

## Request Schema Indexes

From `models/requestModel.js`:

```javascript
// Text index
requestSchema.index({ title: 'text', description: 'text' });

// Single field indexes
requestSchema.index({ requester: 1 });
requestSchema.index({ status: 1 });
requestSchema.index({ createdAt: -1 });
requestSchema.index({ category: 1 });
requestSchema.index({ campus: 1 });
requestSchema.index({ priority: 1 });
requestSchema.index({ expiresAt: 1 });

// Analytics indexes
requestSchema.index({ 'analytics.views': -1 });
requestSchema.index({ 'analytics.offersCount': -1 });
requestSchema.index({ 'analytics.responseTime': 1 });
requestSchema.index({ 'analytics.fulfillmentRate': -1 });

// Compound indexes
requestSchema.index({ status: 1, createdAt: -1 });
```

## Response Structure

### Success Response

```javascript
{
  status: 'success',
  results: number,           // Number of results in this page
  pagination: {
    total: number,          // Total matching documents
    page: number,           // Current page
    pages: number,          // Total pages
    limit: number,          // Results per page
    hasNextPage: boolean,
    hasPrevPage: boolean
  },
  data: {
    requests: Array         // Array of request documents
  }
}
```

### Request Document Structure

```javascript
{
  _id: ObjectId,
  title: String,
  description: String,
  category: Reference,      // Populated
  requester: Reference,     // Populated
  campus: Reference,        // Populated
  desiredPrice: Number,
  priority: String,
  status: String,
  tags: Array,
  images: Array,
  analytics: {
    views: Number,
    offersCount: Number,
    responseTime: Number,
    fulfillmentRate: Number
  },
  expiresAt: Date,
  createdAt: Date,
  isActive: Boolean,        // Virtual field
  isExpired: Boolean,       // Virtual field
  timeRemaining: Number     // Virtual field (hours)
}
```

## Error Handling

### Invalid Parameters

```javascript
if (!Number.isFinite(minPrice)) {
  // Skip invalid price
}
```

### Empty Results

```javascript
if (results.length === 0) {
  // Return empty array with pagination info
  return {
    status: 'success',
    results: 0,
    pagination: { total: 0, ... },
    data: { requests: [] }
  };
}
```

### Database Errors

```javascript
try {
  // Query execution
} catch (error) {
  return next(new AppError(error.message, 500));
}
```

## Performance Optimization

### Query Optimization Strategies

1. **Index Selection**:
   - Use single field indexes for direct filters
   - Use compound indexes for common combinations

2. **Query Execution**:
   - Apply filters before sorting
   - Limit results after sorting
   - Use projection to reduce data transfer

3. **Population**:
   - Only populate necessary fields
   - Limit fields in populate: `populate('requester', 'fullName email')`

4. **Pagination**:
   - Default limit: 20 (reduces memory usage)
   - Maximum limit: 100 (prevents abuse)
   - Use skip for deep pagination (consider cursor-based for very large datasets)

### Performance Benchmarks

| Query Type | Expected Time |
|-----------|---------------|
| Simple filter | 50-100ms |
| Multiple filters | 100-300ms |
| With sorting | 100-200ms |
| With pagination | 50-150ms |
| Complex multi-filter | 200-500ms |

## Common Query Patterns

### Pattern 1: Filter Open High Priority Requests
```javascript
buildAdvancedRequestFilter({
  status: 'open',
  priority: 'high'
})
// Result: { status: 'open', priority: 'high' }
```

### Pattern 2: Price Range with Category
```javascript
buildAdvancedRequestFilter({
  category: '507f1f77bcf86cd799439012',
  minPrice: 1000,
  maxPrice: 5000
})
// Result: { 
//   category: '507f1f77bcf86cd799439012',
//   desiredPrice: { $gte: 1000, $lte: 5000 }
// }
```

### Pattern 3: Popular Recent Requests
```javascript
buildAdvancedRequestFilter({
  popularity: 'high'
})
buildAdvancedRequestSort('trending', 'desc')
// Result: High views AND high offers, sorted by views and date
```

## Virtual Fields

### `isActive`
```javascript
requestSchema.virtual('isActive').get(function() {
  return this.status === 'open' && !this.isExpired;
});
```

### `isExpired`
```javascript
requestSchema.virtual('isExpired').get(function() {
  return this.expiresAt && this.expiresAt < new Date();
});
```

### `timeRemaining`
```javascript
requestSchema.virtual('timeRemaining').get(function() {
  if (!this.expiresAt) return null;
  return Math.ceil((this.expiresAt - new Date()) / (1000 * 60 * 60));
});
```

## Testing Recommendations

1. **Unit Tests**: Test filter/sort builders with various inputs
2. **Integration Tests**: Test full query pipeline
3. **Performance Tests**: Benchmark common queries
4. **Edge Cases**:
   - Empty results
   - Single result
   - Maximum pagination
   - Invalid filters
   - Missing indices

## Future Optimization Opportunities

1. **Cursor-Based Pagination**: For datasets with millions of records
2. **Aggregation Pipeline**: For complex analytics-based sorting
3. **Caching**: Redis cache for popular queries
4. **Elasticsearch**: Full-text search enhancement
5. **Query Analyzer**: Monitor slow queries

