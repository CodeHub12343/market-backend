# Request Advanced Filtering & Sorting API Documentation

## Overview

The Request Advanced Filtering API provides comprehensive search, filtering, and sorting capabilities for discovering buyer requests. This endpoint combines powerful filtering options with flexible sorting and pagination to enable rich request discovery experiences.

**Endpoint**: `GET /api/v1/requests/search/advanced`

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
| `search` | string | Full-text search across request title and description |

### Filter Parameters

#### Category & Campus Filters
| Parameter | Type | Description |
|-----------|------|-------------|
| `category` | string/array | Filter by category ID or array of category IDs |
| `campus` | string/array | Filter by campus ID or array of campus IDs |
| `requester` | string | Filter by requester user ID |

#### Status & Fulfillment Filters
| Parameter | Type | Values | Description |
|-----------|------|--------|-------------|
| `status` | string/array | `open`, `fulfilled`, `closed` | Filter by request status |
| `fulfilled` | boolean | `true`, `false` | Quick filter for fulfilled requests |

#### Price Filters
| Parameter | Type | Description |
|-----------|------|-------------|
| `minPrice` | number | Minimum desired price filter |
| `maxPrice` | number | Maximum desired price filter |

#### Engagement Filters
| Parameter | Type | Description |
|-----------|------|-------------|
| `minViews` | integer | Minimum number of views |
| `maxViews` | integer | Maximum number of views |
| `minOffers` | integer | Minimum number of offers received |
| `maxOffers` | integer | Maximum number of offers received |

#### Response Time Filters
| Parameter | Type | Description |
|-----------|------|-------------|
| `minResponseTime` | number | Minimum average response time in hours |
| `maxResponseTime` | number | Maximum average response time in hours |

#### Priority & Attributes
| Parameter | Type | Values | Description |
|-----------|------|--------|-------------|
| `priority` | string/array | `low`, `medium`, `high`, `urgent` | Filter by request priority |
| `tags` | string/array | Custom tags | Filter by tags |
| `hasImages` | boolean | `true`, `false` | Filter requests with/without images |

#### Time-Based Filters
| Parameter | Type | Description |
|-----------|------|-------------|
| `expiringIn` | integer | Find requests expiring within N hours |

#### Special Filters
| Parameter | Type | Values | Description |
|-----------|------|--------|-------------|
| `popularity` | string | `high`, `medium` | Filter by popularity (views and offers combined) |

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
| `priceAsc` | Sort by desired price (ascending) |
| `priceDesc` | Sort by desired price (descending) |
| `views` | Sort by number of views (highest first) |
| `offers` | Sort by number of offers received (highest first) |
| `priority` | Sort by priority level |
| `responseTime` | Sort by average response time (fastest first) |
| `expiringsoon` | Sort by expiration date (expiring soon first) |
| `fulfillmentRate` | Sort by fulfillment rate (highest first) |
| `trending` | Combine views and recent date for trending requests |
| `mostOffers` | Sort by offers count (highest first) |
| `leastOffers` | Sort by offers count (lowest first) |

## Response Format

### Success Response

```json
{
  "status": "success",
  "results": 20,
  "pagination": {
    "total": 150,
    "page": 1,
    "pages": 8,
    "limit": 20,
    "hasNextPage": true,
    "hasPrevPage": false
  },
  "data": {
    "requests": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "title": "Need programming tutor",
        "description": "Looking for experienced Python and JavaScript tutor",
        "category": {
          "_id": "507f1f77bcf86cd799439012",
          "name": "Tutoring",
          "slug": "tutoring"
        },
        "requester": {
          "_id": "507f1f77bcf86cd799439013",
          "fullName": "John Doe",
          "email": "john@example.com"
        },
        "campus": {
          "_id": "507f1f77bcf86cd799439014",
          "name": "Main Campus",
          "shortCode": "MC"
        },
        "desiredPrice": 2500,
        "priority": "high",
        "status": "open",
        "tags": ["programming", "python", "javascript"],
        "images": ["https://cloudinary.com/image1.jpg"],
        "analytics": {
          "views": 45,
          "offersCount": 8,
          "responseTime": 2.5,
          "fulfillmentRate": 0.85
        },
        "expiresAt": "2024-02-15T10:00:00Z",
        "createdAt": "2024-01-16T10:00:00Z",
        "isActive": true,
        "isExpired": false,
        "timeRemaining": 720
      },
      // ... more requests
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

### 1. Find All Urgent Open Requests

```
GET /api/v1/requests/search/advanced?status=open&priority=urgent&sortBy=newest
```

### 2. Find Requests in Price Range with Most Offers

```
GET /api/v1/requests/search/advanced?minPrice=1000&maxPrice=5000&sortBy=offers&limit=15
```

### 3. Find Trending Requests

```
GET /api/v1/requests/search/advanced?sortBy=trending&popularity=high&page=1&limit=20
```

### 4. Find Requests Expiring Soon

```
GET /api/v1/requests/search/advanced?expiringIn=24&sortBy=expiringsoon
```

### 5. Find Requests by Category with Images

```
GET /api/v1/requests/search/advanced?category=507f1f77bcf86cd799439012&hasImages=true&sortBy=views
```

### 6. Search Requests with Multiple Filters

```
GET /api/v1/requests/search/advanced?search=programming&campus=507f1f77bcf86cd799439014&status=open&minPrice=500&maxPrice=10000&priority=high&sortBy=responseTime&page=1&limit=25
```

### 7. Find Popular Requests by Campus

```
GET /api/v1/requests/search/advanced?campus=507f1f77bcf86cd799439014&popularity=high&sortBy=views&page=1
```

### 8. Find Requests with Few Offers

```
GET /api/v1/requests/search/advanced?status=open&maxOffers=3&sortBy=newest
```

## Filter Combinations

### Advanced Multi-Filter Example

```
GET /api/v1/requests/search/advanced?
  search=tutoring&
  campus=507f1f77bcf86cd799439014&
  category=507f1f77bcf86cd799439012&
  status=open&
  priority=urgent&
  minPrice=1000&
  maxPrice=5000&
  minViews=10&
  maxViews=100&
  hasImages=true&
  tags=experienced&
  sortBy=priority&
  order=desc&
  page=1&
  limit=20
```

This query finds:
- Requests matching "tutoring"
- On a specific campus
- In a specific category
- With "open" status
- Marked as "urgent"
- With desired price between $1000-$5000
- With 10-100 views
- That have images
- Tagged with "experienced"
- Sorted by priority (urgent first)
- First page with 20 results per page

## Pagination Details

The response includes comprehensive pagination metadata:

```json
{
  "pagination": {
    "total": 150,        // Total number of matching results
    "page": 1,           // Current page number
    "pages": 8,          // Total number of pages
    "limit": 20,         // Results per page
    "hasNextPage": true, // Whether next page exists
    "hasPrevPage": false // Whether previous page exists
  }
}
```

### Navigating Pages

```
// First page
GET /api/v1/requests/search/advanced?page=1&limit=20

// Next page
GET /api/v1/requests/search/advanced?page=2&limit=20

// Last page for 150 results with 20 per page
GET /api/v1/requests/search/advanced?page=8&limit=20

// Get more results per page (max 100)
GET /api/v1/requests/search/advanced?page=1&limit=50
```

## Virtual Fields in Response

### `isActive`
- **Type**: Boolean
- **Description**: Indicates if request is currently active and open for offers
- **Computed as**: status === 'open' && !isExpired

### `isExpired`
- **Type**: Boolean
- **Description**: Indicates if request has passed its expiration date
- **Computed as**: expiresAt < current date/time

### `timeRemaining`
- **Type**: Number
- **Description**: Hours remaining before request expires
- **Computed as**: Difference between expiresAt and current time in hours

## Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 400 | Bad request (invalid parameters) |
| 401 | Unauthorized (missing or invalid token) |
| 404 | Request not found |
| 500 | Server error |

## Rate Limiting

Advanced search requests are subject to rate limiting:
- **Limit**: 100 requests per 15 minutes per user
- **Header**: `X-RateLimit-Remaining` indicates remaining requests

## Performance Tips

1. **Use Specific Filters**: Narrow down results with specific filters to reduce query time
2. **Limit Results**: Use appropriate `limit` values (20-50 recommended)
3. **Index Optimization**: The following fields are indexed:
   - `requester`
   - `status`
   - `createdAt`
   - `category`
   - `campus`
   - `priority`
   - `analytics.views`
   - `analytics.offersCount`
   - `expiresAt`

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

### Rate Limit Exceeded

```json
{
  "status": "error",
  "message": "Too many requests, please try again later"
}
```

## Field Descriptions

### Request Object Fields

| Field | Type | Description |
|-------|------|-------------|
| `_id` | ObjectId | Unique request identifier |
| `title` | String | Request title/heading |
| `description` | String | Detailed request description |
| `category` | Reference | Category information |
| `requester` | Reference | User who created the request |
| `campus` | Reference | Campus location |
| `desiredPrice` | Number | Expected price/budget |
| `priority` | String | Priority level (low/medium/high/urgent) |
| `status` | String | Current status (open/fulfilled/closed) |
| `tags` | Array | Custom tags for categorization |
| `images` | Array | URLs of attached images |
| `analytics` | Object | Engagement and performance metrics |
| `expiresAt` | Date | Expiration date/time |
| `createdAt` | Date | Creation timestamp |
| `isActive` | Boolean | Virtual field - currently active |
| `isExpired` | Boolean | Virtual field - past expiration |
| `timeRemaining` | Number | Virtual field - hours until expiration |
