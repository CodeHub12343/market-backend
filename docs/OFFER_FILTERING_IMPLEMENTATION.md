# Offer Advanced Filtering - Implementation Details

## Overview

This document provides technical details about the implementation of advanced filtering and sorting for the Offer resource.

## Architecture

### Filter Pipeline

The filtering system follows a three-stage pipeline:

```
Query String → Filter Builder → MongoDB Query → Results
```

### Key Components

1. **Query Parser**: Extracts and validates query parameters
2. **Filter Builder** (`buildAdvancedOfferFilter`): Constructs MongoDB filter object
3. **Sort Builder** (`buildAdvancedOfferSort`): Constructs MongoDB sort object
4. **Pagination Handler**: Implements offset-based pagination
5. **Response Formatter**: Structures response with metadata

## Filter Implementation

### buildAdvancedOfferFilter Function

**Location**: `controllers/offerController.js`

**Purpose**: Converts query parameters into MongoDB filter object

**Input Parameters**:
```javascript
{
  search,              // string - text search in message
  request,             // string - request ID
  seller,              // string - seller user ID
  status,              // string/array - offer status
  minAmount,           // number - minimum amount
  maxAmount,           // number - maximum amount
  minViews,            // number - minimum view count
  maxViews,            // number - maximum view count
  minResponseTime,     // number - minimum hours
  maxResponseTime,     // number - maximum hours
  expiringIn,          // number - hours until expiration
  acceptanceRate,      // string - high/medium/low
  autoExpire           // boolean - auto-expire setting
}
```

**Output**: MongoDB filter object

### Filter Logic Details

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
- Validates against: pending, accepted, rejected, withdrawn, cancelled
- Uses `$in` operator for multiple values

#### Request & Seller Filters
```javascript
if (request && /^[0-9a-fA-F]{24}$/.test(request)) {
  filter.request = request;
}

if (seller && /^[0-9a-fA-F]{24}$/.test(seller)) {
  filter.seller = seller;
}
```
- Validates MongoDB ObjectId format (24-character hex string)
- Prevents invalid ID injection
- Optional filters

#### Amount Range Filter
```javascript
const amountRange = {};
if (minAmount !== undefined && minAmount !== '') {
  amountRange.$gte = Math.max(0, parseFloat(minAmount));
}
if (maxAmount !== undefined && maxAmount !== '') {
  amountRange.$lte = Math.max(0, parseFloat(maxAmount));
}
if (Object.keys(amountRange).length > 0) {
  filter.amount = amountRange;
}
```
- Handles both bounds independently
- Uses `$gte` and `$lte` operators
- Ensures non-negative values

#### Views Filter
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
- Accesses nested analytics field using dot notation
- Converts to integer type
- Filters by view count range

#### Response Time Filter
```javascript
const respTimeRange = {};
if (minResponseTime !== undefined && minResponseTime !== '') {
  respTimeRange.$gte = Math.max(0, parseFloat(minResponseTime));
}
if (maxResponseTime !== undefined && maxResponseTime !== '') {
  respTimeRange.$lte = Math.max(0, parseFloat(maxResponseTime));
}
if (Object.keys(respTimeRange).length > 0) {
  filter['analytics.responseTime'] = respTimeRange;
}
```
- Filters by response time in hours
- Can find fast responders
- Useful for time-sensitive requests

#### Text Search Filter
```javascript
if (search && search.trim()) {
  filter.$text = { $search: search.trim() };
}
```
- Searches in offer message field
- Uses MongoDB text index
- Full-text search capability

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
- Uses `$gt` for current time (active offers)
- Uses `$lte` for expiration cutoff
- Time conversion: hours × 60 × 60 × 1000

#### Acceptance Rate Filter
```javascript
if (acceptanceRate) {
  if (acceptanceRate === 'high') {
    filter['analytics.acceptanceRate'] = { $gte: 0.7 };
  } else if (acceptanceRate === 'medium') {
    filter['analytics.acceptanceRate'] = { $gte: 0.4, $lt: 0.7 };
  } else if (acceptanceRate === 'low') {
    filter['analytics.acceptanceRate'] = { $lt: 0.4 };
  }
}
```
- Categories:
  - High: ≥ 70% (0.7)
  - Medium: 40% - 69% (0.4 - 0.69)
  - Low: < 40% (< 0.4)
- Identifies reliable sellers
- Helps assess seller quality

#### Auto-Expire Setting Filter
```javascript
if (autoExpire === 'true' || autoExpire === true) {
  filter['settings.autoExpire'] = true;
} else if (autoExpire === 'false' || autoExpire === false) {
  filter['settings.autoExpire'] = false;
}
```
- Handles both string and boolean inputs
- Filters offers based on auto-expire setting
- Accesses nested settings object

## Sort Implementation

### buildAdvancedOfferSort Function

**Location**: `controllers/offerController.js`

**Purpose**: Constructs MongoDB sort specification

**Input Parameters**:
- `sortBy`: string - field to sort by
- `order`: string - 'asc' or 'desc' (unused in most cases)

**Sort Options**:

| Option | Implementation |
|--------|-----------------|
| `newest` | `{ createdAt: -1 }` |
| `oldest` | `{ createdAt: 1 }` |
| `amountAsc` | `{ amount: 1 }` |
| `amountDesc` | `{ amount: -1 }` |
| `views` | `{ 'analytics.views': -1 }` |
| `responseTime` | `{ 'analytics.responseTime': 1 }` |
| `acceptanceRate` | `{ 'analytics.acceptanceRate': -1 }` |
| `expiringsoon` | `{ expiresAt: 1 }` |
| `pending` | `{ status: 1, createdAt: -1 }` |
| `trending` | `{ 'analytics.views': -1, createdAt: -1 }` |
| `mostViewed` | `{ 'analytics.views': -1 }` |
| `leastViewed` | `{ 'analytics.views': 1 }` |

**Sort Direction**:
- Descending (-1): Most recent, highest values first
- Ascending (1): Oldest, lowest values first

## Database Indexes

Required indexes for optimal performance:

```javascript
// Text index for message search
db.offers.createIndex({ message: "text" })

// Single field indexes
db.offers.createIndex({ request: 1 })
db.offers.createIndex({ seller: 1 })
db.offers.createIndex({ status: 1 })
db.offers.createIndex({ createdAt: -1 })
db.offers.createIndex({ expiresAt: 1 })

// Analytics indexes
db.offers.createIndex({ "analytics.views": -1 })
db.offers.createIndex({ "analytics.responseTime": 1 })
db.offers.createIndex({ "analytics.acceptanceRate": -1 })

// Compound indexes for common queries
db.offers.createIndex({ request: 1, status: 1 })
db.offers.createIndex({ seller: 1, status: 1 })
db.offers.createIndex({ status: 1, createdAt: -1 })
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
- Page 5, limit 20: skip 80, get results 81-100

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
const [offers, total] = await Promise.all([
  Offer.find(filter)
    .sort(sortObj)
    .skip(skip)
    .limit(limitNum)
    .populate('request', 'title category requester')
    .populate('seller', 'fullName email')
    .populate('product', 'name'),
  Offer.countDocuments(filter)
]);
```

**Steps**:
1. Apply filter
2. Apply sort
3. Skip to page
4. Limit results
5. Populate references (request, seller, product)
6. Execute in parallel with count

**Optimization**: Uses `Promise.all()` to execute query and count in parallel

## Offer Schema Indexes

From `models/offerModel.js`:

```javascript
// Text index
offerSchema.index({ message: 'text' });

// Single field indexes
offerSchema.index({ request: 1 });
offerSchema.index({ seller: 1 });
offerSchema.index({ status: 1 });
offerSchema.index({ createdAt: -1 });
offerSchema.index({ expiresAt: 1 });

// Analytics indexes
offerSchema.index({ 'analytics.views': -1 });
offerSchema.index({ 'analytics.responseTime': 1 });
offerSchema.index({ 'analytics.acceptanceRate': -1 });

// Compound indexes
offerSchema.index({ request: 1, status: 1 });
offerSchema.index({ seller: 1, status: 1 });
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
    offers: Array           // Array of offer documents
  }
}
```

### Offer Document Structure

```javascript
{
  _id: ObjectId,
  request: {                // Populated reference
    _id: ObjectId,
    title: String,
    category: ObjectId,
    requester: ObjectId
  },
  seller: {                 // Populated reference
    _id: ObjectId,
    fullName: String,
    email: String
  },
  product: {                // Optional populated reference
    _id: ObjectId,
    name: String
  },
  amount: Number,
  message: String,
  status: String,           // pending, accepted, rejected, withdrawn, cancelled
  reason: String,           // Optional - for rejection/withdrawal
  analytics: {
    views: Number,
    responseTime: Number,   // In hours
    acceptanceRate: Number  // Decimal 0-1
  },
  settings: {
    autoExpire: Boolean,
    notifyOnView: Boolean,
    allowCounterOffers: Boolean
  },
  expiresAt: Date,
  createdAt: Date,
  isActive: Boolean,        // Virtual field
  isExpired: Boolean        // Virtual field
}
```

## Error Handling

### Invalid Parameters

```javascript
if (!Number.isFinite(minAmount)) {
  // Skip invalid amount
}
```

### Invalid Status Values

```javascript
const validStatuses = ['pending', 'accepted', 'rejected', 'withdrawn', 'cancelled'];
if (status && !validStatuses.includes(status)) {
  // Return error or skip invalid status
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
    data: { offers: [] }
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
   - Use request index for offer lookup by request
   - Use seller index for seller's offer listing
   - Use status index for status filtering
   - Use compound indexes for common combinations

2. **Query Execution**:
   - Apply filters before sorting
   - Use limit to reduce document processing
   - Populate only necessary fields

3. **Population**:
   - Only populate needed fields
   - Field projection: `populate('seller', 'fullName email')`
   - Avoid circular population

4. **Pagination**:
   - Default limit: 20 (reduces memory usage)
   - Maximum limit: 100 (prevents abuse)
   - Use skip for pagination (cursor-based for deep pagination optimization)

### Performance Benchmarks

| Query Type | Expected Time |
|-----------|---------------|
| Simple filter (status) | 50-100ms |
| By request + status | 50-150ms |
| Amount range filter | 100-200ms |
| Multiple filters | 150-300ms |
| Complex query | 200-500ms |
| With sorting | 100-250ms |
| Deep pagination | 100-300ms |

## Common Query Patterns

### Pattern 1: Get All Pending Offers for Request
```javascript
buildAdvancedOfferFilter({
  request: '507f1f77bcf86cd799439011',
  status: 'pending'
})
// Result: { 
//   request: '507f1f77bcf86cd799439011',
//   status: 'pending' 
// }
```

### Pattern 2: Find Low-Cost Offers from Quality Sellers
```javascript
buildAdvancedOfferFilter({
  maxAmount: 3000,
  acceptanceRate: 'high'
})
// Result: { 
//   amount: { $lte: 3000 },
//   'analytics.acceptanceRate': { $gte: 0.7 }
// }
```

### Pattern 3: Compare Offers (Trending + Price)
```javascript
buildAdvancedOfferFilter({
  request: '507f1f77bcf86cd799439011'
})
buildAdvancedOfferSort('trending', 'desc')
// Result: Offers sorted by views and recency
```

## Virtual Fields

### `isActive`
```javascript
offerSchema.virtual('isActive').get(function() {
  return this.status === 'pending' && !this.isExpired;
});
```
- True if: status is pending AND not expired

### `isExpired`
```javascript
offerSchema.virtual('isExpired').get(function() {
  return this.expiresAt && this.expiresAt < new Date();
});
```
- True if: expiration date has passed

## Testing Recommendations

1. **Unit Tests**:
   - Test filter builders with various inputs
   - Test sort builders with all options
   - Test parameter validation

2. **Integration Tests**:
   - Test full query pipeline
   - Test pagination logic
   - Test population logic

3. **Performance Tests**:
   - Benchmark common queries
   - Test pagination with large datasets
   - Verify index usage

4. **Edge Cases**:
   - Empty results
   - Single result
   - Maximum pagination
   - Invalid status values
   - Missing indices
   - Invalid seller/request IDs

## Future Optimization Opportunities

1. **Cursor-Based Pagination**: For datasets with millions of records
2. **Caching**: Redis cache for popular queries (trending, by status)
3. **Aggregation Pipeline**: For complex acceptance rate calculations
4. **Elasticsearch**: Full-text search enhancement
5. **Query Analyzer**: Monitor slow queries
6. **Seller Rating Cache**: Pre-calculate acceptance rates

## Offer Status Flow

```
          ┌─────────────┐
          │   pending   │
          └──────┬──────┘
          ┌──────┴──────┐
          │             │
      ┌───▼───┐     ┌──▼────┐
      │accepted│     │rejected│
      └────────┘     └────────┘

    From pending:
    ├─ accepted (buyer accepts)
    ├─ rejected (buyer rejects)
    ├─ withdrawn (seller withdraws)
    └─ cancelled (auto-expire or admin)
```

