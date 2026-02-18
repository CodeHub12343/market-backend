# Offer Advanced Filtering & Sorting API Documentation

## Overview

The Offer Advanced Filtering API provides comprehensive search, filtering, and sorting capabilities for discovering and managing seller offers. This endpoint enables powerful offer discovery with multiple filtering options and flexible sorting.

**Endpoint**: `GET /api/v1/offers/search/advanced`

## Authentication

Requires valid JWT authentication token in the `Authorization` header:
```
Authorization: Bearer <your_jwt_token>
```

## Query Parameters

### Pagination Parameters

| Parameter | Type | Default | Max | Description |
|-----------|------|---------|-----|-------------|
| `page` | integer | 1 | N/A | Page number for pagination |
| `limit` | integer | 20 | 100 | Number of results per page |

### Search Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `search` | string | Full-text search across offer message field |

### Filter Parameters

#### Relationship Filters
| Parameter | Type | Description |
|-----------|------|-------------|
| `request` | string | Filter by request ID |
| `seller` | string | Filter by seller user ID |

#### Status Filters
| Parameter | Type | Values | Description |
|-----------|------|--------|-------------|
| `status` | string/array | `pending`, `accepted`, `rejected`, `withdrawn`, `cancelled` | Filter by offer status |

#### Amount Filters
| Parameter | Type | Description |
|-----------|------|-------------|
| `minAmount` | number | Minimum offer amount filter |
| `maxAmount` | number | Maximum offer amount filter |

#### Engagement Filters
| Parameter | Type | Description |
|-----------|------|-------------|
| `minViews` | integer | Minimum number of views |
| `maxViews` | integer | Maximum number of views |

#### Response Time Filters
| Parameter | Type | Description |
|-----------|------|-------------|
| `minResponseTime` | number | Minimum response time in hours |
| `maxResponseTime` | number | Maximum response time in hours |

#### Performance Filters
| Parameter | Type | Values | Description |
|-----------|------|--------|-------------|
| `acceptanceRate` | string | `high`, `medium`, `low` | Filter by seller's acceptance rate |

#### Time-Based Filters
| Parameter | Type | Description |
|-----------|------|-------------|
| `expiringIn` | integer | Find offers expiring within N hours |

#### Settings Filters
| Parameter | Type | Description |
|-----------|------|-------------|
| `autoExpire` | boolean | Filter offers with/without auto-expire enabled |

### Sort Parameters

| Parameter | Type | Values | Default | Description |
|-----------|------|--------|---------|-------------|
| `sortBy` | string | See sorting options below | `createdAt` | Field to sort by |
| `order` | string | `asc`, `desc` | `desc` | Sort order |

#### Available Sort Options

| Sort Value | Description |
|-----------|-------------|
| `newest` | Sort by creation date (newest first) |
| `oldest` | Sort by creation date (oldest first) |
| `amountAsc` | Sort by offer amount (ascending) |
| `amountDesc` | Sort by offer amount (descending) |
| `views` | Sort by number of views (highest first) |
| `responseTime` | Sort by response time (fastest first) |
| `acceptanceRate` | Sort by seller acceptance rate (highest first) |
| `expiringsoon` | Sort by expiration date (expiring soon first) |
| `pending` | Prioritize pending offers (pending status first) |
| `trending` | Combine views and recent date for trending offers |
| `mostViewed` | Sort by views count (highest first) |
| `leastViewed` | Sort by views count (lowest first) |

## Response Format

### Success Response

```json
{
  "status": "success",
  "results": 20,
  "pagination": {
    "total": 85,
    "page": 1,
    "pages": 5,
    "limit": 20,
    "hasNextPage": true,
    "hasPrevPage": false
  },
  "data": {
    "offers": [
      {
        "_id": "507f1f77bcf86cd799439015",
        "request": {
          "_id": "507f1f77bcf86cd799439011",
          "title": "Need programming tutor",
          "category": "507f1f77bcf86cd799439012",
          "requester": "507f1f77bcf86cd799439013"
        },
        "seller": {
          "_id": "507f1f77bcf86cd799439016",
          "fullName": "Jane Smith",
          "email": "jane@example.com"
        },
        "product": {
          "_id": "507f1f77bcf86cd799439017",
          "name": "Python & JavaScript Tutoring"
        },
        "amount": 2000,
        "message": "I have 5 years of experience in Python and JavaScript",
        "status": "pending",
        "analytics": {
          "views": 12,
          "responseTime": 1.5,
          "acceptanceRate": 0.88
        },
        "settings": {
          "autoExpire": true,
          "notifyOnView": true,
          "allowCounterOffers": false
        },
        "expiresAt": "2024-02-15T10:00:00Z",
        "createdAt": "2024-01-16T10:00:00Z",
        "isActive": true,
        "isExpired": false
      },
      // ... more offers
    ]
  }
}
```

### Error Response

```json
{
  "status": "error",
  "message": "Invalid query parameters"
}
```

## Common Use Cases

### 1. Find All Pending Offers

```
GET /api/v1/offers/search/advanced?status=pending&sortBy=newest
```

### 2. Find Offers in Price Range

```
GET /api/v1/offers/search/advanced?minAmount=1000&maxAmount=5000&sortBy=amountAsc
```

### 3. Find Offers from High-Performing Sellers

```
GET /api/v1/offers/search/advanced?acceptanceRate=high&sortBy=responseTime
```

### 4. Find Offers Expiring Soon

```
GET /api/v1/offers/search/advanced?expiringIn=12&sortBy=expiringsoon
```

### 5. Find Offers for a Specific Request

```
GET /api/v1/offers/search/advanced?request=507f1f77bcf86cd799439011&sortBy=amountAsc
```

### 6. Find Trending Offers

```
GET /api/v1/offers/search/advanced?sortBy=trending&page=1&limit=20
```

### 7. Find Offers from a Specific Seller

```
GET /api/v1/offers/search/advanced?seller=507f1f77bcf86cd799439016&status=pending&sortBy=newest
```

### 8. Find Most Viewed Offers

```
GET /api/v1/offers/search/advanced?minViews=5&sortBy=mostViewed
```

## Filter Combinations

### Advanced Multi-Filter Example

```
GET /api/v1/offers/search/advanced?
  request=507f1f77bcf86cd799439011&
  status=pending&
  minAmount=1500&
  maxAmount=3000&
  acceptanceRate=high&
  autoExpire=true&
  minResponseTime=0&
  maxResponseTime=5&
  sortBy=responseTime&
  order=asc&
  page=1&
  limit=20
```

This query finds:
- Offers for a specific request
- With "pending" status
- With offer amount between $1500-$3000
- From sellers with high acceptance rates
- With auto-expiration enabled
- With response time between 0-5 hours
- Sorted by fastest response time first
- First page with 20 results per page

## Pagination Details

The response includes comprehensive pagination metadata:

```json
{
  "pagination": {
    "total": 85,         // Total number of matching results
    "page": 1,           // Current page number
    "pages": 5,          // Total number of pages
    "limit": 20,         // Results per page
    "hasNextPage": true, // Whether next page exists
    "hasPrevPage": false // Whether previous page exists
  }
}
```

### Navigating Pages

```
// First page
GET /api/v1/offers/search/advanced?page=1&limit=20

// Next page
GET /api/v1/offers/search/advanced?page=2&limit=20

// Last page for 85 results with 20 per page
GET /api/v1/offers/search/advanced?page=5&limit=20

// Get more results per page (max 100)
GET /api/v1/offers/search/advanced?page=1&limit=50
```

## Virtual Fields in Response

### `isActive`
- **Type**: Boolean
- **Description**: Indicates if offer is currently valid and active
- **Computed as**: status === 'pending' && !isExpired

### `isExpired`
- **Type**: Boolean
- **Description**: Indicates if offer has passed its expiration date
- **Computed as**: expiresAt < current date/time

## Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 400 | Bad request (invalid parameters) |
| 401 | Unauthorized (missing or invalid token) |
| 404 | Offer not found |
| 500 | Server error |

## Rate Limiting

Advanced search requests are subject to rate limiting:
- **Limit**: 100 requests per 15 minutes per user
- **Header**: `X-RateLimit-Remaining` indicates remaining requests

## Performance Tips

1. **Use Specific Filters**: Narrow down results with specific filters
2. **Limit Results**: Use appropriate `limit` values (20-50 recommended)
3. **Index Optimization**: The following fields are indexed:
   - `request`
   - `seller`
   - `status`
   - `createdAt`
   - `expiresAt`
   - `analytics.views`
   - `analytics.responseTime`
   - `analytics.acceptanceRate`

4. **Pagination Strategy**: Use pagination instead of requesting all results at once

## Error Handling

### Invalid Query Parameters

```json
{
  "status": "error",
  "message": "Invalid filter parameters"
}
```

### Authentication Required

```json
{
  "status": "error",
  "message": "You must be logged in to access this resource"
}
```

### Invalid Status Filter

```json
{
  "status": "error",
  "message": "Invalid status value"
}
```

### Rate Limit Exceeded

```json
{
  "status": "error",
  "message": "Too many requests, please try again later"
}
```

## Field Descriptions

### Offer Object Fields

| Field | Type | Description |
|-------|------|-------------|
| `_id` | ObjectId | Unique offer identifier |
| `request` | Reference | Request this offer is for |
| `seller` | Reference | User who created the offer |
| `product` | Reference | Associated product (if any) |
| `amount` | Number | Offered amount/price |
| `message` | String | Seller's offer message/description |
| `status` | String | Current status (pending/accepted/rejected/withdrawn/cancelled) |
| `reason` | String | Reason for rejection/withdrawal |
| `analytics` | Object | Performance and engagement metrics |
| `settings` | Object | Offer settings (autoExpire, notifyOnView, allowCounterOffers) |
| `expiresAt` | Date | Expiration date/time |
| `createdAt` | Date | Creation timestamp |
| `isActive` | Boolean | Virtual field - currently active |
| `isExpired` | Boolean | Virtual field - past expiration |

## Offer Status Definitions

| Status | Description | Next States |
|--------|-------------|-------------|
| `pending` | Offer is awaiting buyer response | accepted, rejected, withdrawn, cancelled |
| `accepted` | Buyer has accepted the offer | (terminal) |
| `rejected` | Buyer rejected the offer | (terminal) |
| `withdrawn` | Seller withdrew the offer | (terminal) |
| `cancelled` | Offer was cancelled (auto-expire or admin) | (terminal) |

## Acceptance Rate Categories

### High Acceptance Rate
- **Range**: >= 70% (0.7)
- **Interpretation**: Seller has strong track record of accepted offers

### Medium Acceptance Rate
- **Range**: 40% - 69% (0.4 - 0.69)
- **Interpretation**: Seller has moderate acceptance success

### Low Acceptance Rate
- **Range**: < 40% (< 0.4)
- **Interpretation**: Seller's offers are frequently rejected

## Advanced Filtering Strategies

### Strategy 1: Find Best Value Offers
```
GET /api/v1/offers/search/advanced?
  status=pending&
  acceptanceRate=high&
  sortBy=amountAsc&
  limit=20
```

### Strategy 2: Find Quick Responses
```
GET /api/v1/offers/search/advanced?
  status=pending&
  maxResponseTime=2&
  sortBy=responseTime&
  limit=20
```

### Strategy 3: Find Trending Offers by Request
```
GET /api/v1/offers/search/advanced?
  request=507f1f77bcf86cd799439011&
  status=pending&
  sortBy=trending&
  limit=10
```

### Strategy 4: Compare Similar Offers
```
GET /api/v1/offers/search/advanced?
  request=507f1f77bcf86cd799439011&
  status=pending&
  sortBy=amountAsc&
  limit=50
```
Shows all offers for same request, sorted by price, allowing comparison.

