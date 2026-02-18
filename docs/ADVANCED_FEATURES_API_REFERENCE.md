# API Reference - Advanced Features

## Quick Index

- [Search API](#search-api)
- [Recommendations API](#recommendations-api)
- [Request/Response Examples](#requestresponse-examples)

---

## Search API

### 1. Search Products

**Endpoint:** `GET /api/v1/search/products`

**Query Parameters:**
```
search              - Search query string
minPrice            - Minimum price filter
maxPrice            - Maximum price filter
category            - Category ID or comma-separated IDs
tags                - Comma-separated tags
location            - "longitude,latitude,radius_km"
sort                - relevance, price-asc, price-desc, newest, oldest, most-viewed, most-liked, rating
page                - Page number (default: 1)
limit               - Items per page (default: 10)
```

**Example:**
```bash
GET /api/v1/search/products?search=laptop&minPrice=20000&maxPrice=100000&category=electronics&sort=price-asc&page=1&limit=10
```

**Response:**
```json
{
  "status": "success",
  "source": "query" | "cache",
  "results": 25,
  "data": {
    "products": [
      {
        "_id": "...",
        "name": "Dell Laptop",
        "price": 45000,
        "description": "...",
        "images": [],
        "category": {...},
        "rating": 4.5,
        "reviews": 12
      }
    ]
  }
}
```

---

### 2. Search Services

**Endpoint:** `GET /api/v1/search/services`

**Query Parameters:** (Same as products + location)

**Example:**
```bash
GET /api/v1/search/services?search=tutoring&minPrice=1000&maxPrice=5000&location=6.5244,3.3792,2
```

---

### 3. Global Search (All Collections)

**Endpoint:** `GET /api/v1/search/global`

**Query Parameters:**
```
query               - Search query (required)
limit               - Results per type (default: 5)
```

**Example:**
```bash
GET /api/v1/search/global?query=laptop&limit=10
```

**Response:**
```json
{
  "status": "success",
  "source": "query" | "cache",
  "data": {
    "products": [...],
    "services": [...],
    "posts": [...],
    "users": [...],
    "totalResults": 23
  }
}
```

---

### 4. Search Autocomplete

**Endpoint:** `GET /api/v1/search/autocomplete`

**Query Parameters:**
```
query               - Partial search query (min 2 chars)
type                - all, products, services, categories, tags
limit               - Number of suggestions (default: 5)
```

**Example:**
```bash
GET /api/v1/search/autocomplete?query=del&type=products&limit=8
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "suggestions": {
      "products": ["Dell Laptop", "Dell Monitor", "Dell Keyboard"],
      "services": ["Delivery Service"],
      "categories": ["Electronics"],
      "tags": ["delicate", "delivery-required"]
    }
  }
}
```

---

### 5. Trending Searches

**Endpoint:** `GET /api/v1/search/trending` (PUBLIC)

**Query Parameters:**
```
days                - Trending period in days (default: 7)
limit               - Number of trending searches (default: 10)
searchType          - Filter by type (products, services, posts, users, all)
```

**Example:**
```bash
GET /api/v1/search/trending?days=7&limit=15&searchType=products
```

**Response:**
```json
{
  "status": "success",
  "results": 15,
  "data": {
    "trendingSearches": [
      {
        "_id": "laptop",
        "count": 456,
        "avgResultsCount": 23.5,
        "conversionRate": 0.15
      },
      {
        "_id": "tutoring",
        "count": 234,
        "avgResultsCount": 18.2,
        "conversionRate": 0.22
      }
    ]
  }
}
```

---

### 6. Get Saved Searches

**Endpoint:** `GET /api/v1/search/saved` (PROTECTED)

**Response:**
```json
{
  "status": "success",
  "results": 5,
  "data": {
    "savedSearches": [
      {
        "_id": "...",
        "name": "Cheap Laptops",
        "description": "Laptops under 50k",
        "searchType": "products",
        "filters": {
          "search": "laptop",
          "maxPrice": 50000,
          "category": "electronics"
        },
        "statistics": {
          "resultsCount": 23,
          "timesRun": 5,
          "averageResultsCount": 24
        },
        "isPinned": true,
        "lastUsedAt": "2025-11-18T10:30:00Z",
        "createdAt": "2025-11-15T08:00:00Z"
      }
    ]
  }
}
```

---

### 7. Create Saved Search

**Endpoint:** `POST /api/v1/search/saved` (PROTECTED)

**Request Body:**
```json
{
  "name": "Budget Laptops",
  "description": "Laptops under 50k",
  "searchType": "products",
  "filters": {
    "search": "laptop",
    "maxPrice": 50000,
    "category": "electronics",
    "condition": "new",
    "sortBy": "price-asc"
  },
  "notifications": {
    "enabled": true,
    "frequency": "daily"
  }
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Saved search created successfully",
  "data": {
    "savedSearch": {
      "_id": "...",
      "name": "Budget Laptops",
      ...
    }
  }
}
```

---

### 8. Execute Saved Search

**Endpoint:** `POST /api/v1/search/saved/:id/execute` (PROTECTED)

**Response:**
```json
{
  "status": "success",
  "message": "Saved search executed successfully",
  "results": 23,
  "data": {
    "results": [...]
  }
}
```

---

### 9. Update Saved Search

**Endpoint:** `PATCH /api/v1/search/saved/:id` (PROTECTED)

**Request Body:**
```json
{
  "name": "Very Cheap Laptops",
  "filters": {
    "maxPrice": 30000
  },
  "isPinned": true
}
```

---

### 10. Delete Saved Search

**Endpoint:** `DELETE /api/v1/search/saved/:id` (PROTECTED)

**Response:**
```json
{
  "status": "success",
  "data": null
}
```

---

### 11. Search Analytics

**Endpoint:** `GET /api/v1/search/analytics` (PROTECTED)

**Query Parameters:**
```
days                - Number of days to analyze (default: 30)
```

**Example:**
```bash
GET /api/v1/search/analytics?days=30
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "analytics": {
      "totalSearches": 45,
      "searchesByType": [
        {
          "_id": "products",
          "count": 28,
          "avgResults": 15.2
        },
        {
          "_id": "services",
          "count": 12,
          "avgResults": 8.5
        }
      ],
      "topSearchQueries": [
        {
          "_id": "laptop",
          "count": 12,
          "totalClicks": 28,
          "conversions": 4
        }
      ],
      "searchTrend": [
        {
          "_id": { "year": 2025, "month": 11, "day": 18 },
          "count": 8
        }
      ]
    }
  }
}
```

---

### 12. Record Search Feedback

**Endpoint:** `POST /api/v1/search/feedback` (PROTECTED)

**Request Body:**
```json
{
  "searchAnalyticsId": "...",
  "relevant": true,
  "helpful": true,
  "rating": 5,
  "comment": "Found exactly what I was looking for"
}
```

---

## Recommendations API

### 1. Get Personalized Recommendations

**Endpoint:** `GET /api/v1/recommendations` (PROTECTED)

**Query Parameters:**
```
limit               - Number of recommendations (default: 10)
type                - all, collaborative, content-based, trending, similar
```

**Example:**
```bash
GET /api/v1/recommendations?limit=10&type=all
```

**Response:**
```json
{
  "status": "success",
  "results": 10,
  "data": {
    "recommendations": [
      {
        "id": "...",
        "model": "Product",
        "recommendationType": "collaborative-similar-users",
        "score": 85,
        "itemDetails": {
          "_id": "...",
          "name": "HP Laptop",
          "price": 55000,
          "rating": 4.7,
          "images": []
        }
      }
    ]
  }
}
```

---

### 2. Get Product Recommendations

**Endpoint:** `GET /api/v1/recommendations/product/:productId` (PUBLIC)

**Query Parameters:**
```
limit               - Number of recommendations (default: 5)
```

**Example:**
```bash
GET /api/v1/recommendations/product/507f1f77bcf86cd799439011?limit=8
```

**Response:**
```json
{
  "status": "success",
  "results": 8,
  "data": {
    "recommendations": [
      {
        "_id": "...",
        "name": "Similar Product",
        "price": 45000,
        "category": {...},
        "tags": [...],
        "rating": 4.5
      }
    ]
  }
}
```

---

### 3. Get Trending Recommendations

**Endpoint:** `GET /api/v1/recommendations/trending` (PUBLIC)

**Query Parameters:**
```
limit               - Number of items (default: 10)
days                - Trending period (default: 7)
```

**Example:**
```bash
GET /api/v1/recommendations/trending?limit=15&days=7
```

---

### 4. Mark Recommendation as Clicked

**Endpoint:** `POST /api/v1/recommendations/:recommendationId/click` (PROTECTED)

**Response:**
```json
{
  "status": "success",
  "data": {
    "recommendation": {
      "_id": "...",
      "isClicked": true,
      "clickedAt": "2025-11-18T10:30:00Z"
    }
  }
}
```

---

### 5. Dismiss Recommendation

**Endpoint:** `POST /api/v1/recommendations/:recommendationId/dismiss` (PROTECTED)

**Request Body:**
```json
{
  "reason": "not-interested" | "already-have" | "too-expensive" | "quality-issues" | "other"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Recommendation dismissed",
  "data": {
    "recommendation": {
      "_id": "...",
      "isDismissed": true,
      "dismissReason": "not-interested"
    }
  }
}
```

---

### 6. Rate Recommendation

**Endpoint:** `POST /api/v1/recommendations/:recommendationId/rate` (PROTECTED)

**Request Body:**
```json
{
  "rating": 4,
  "comment": "Great recommendation!"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Rating recorded successfully",
  "data": {
    "recommendation": {
      "_id": "...",
      "userRating": 4,
      "ratingComment": "Great recommendation!",
      "ratedAt": "2025-11-18T10:30:00Z"
    }
  }
}
```

---

### 7. Get Recommendation Analytics

**Endpoint:** `GET /api/v1/recommendations/analytics` (PROTECTED)

**Query Parameters:**
```
days                - Number of days to analyze (default: 30)
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "analytics": {
      "totalRecommendations": 150,
      "clickedCount": 45,
      "purchasedCount": 12,
      "dismissedCount": 38,
      "clickThroughRate": "30.00%",
      "conversionRate": "8.00%",
      "dismissalRate": "25.33%",
      "byType": [
        {
          "_id": "collaborative-similar-users",
          "count": 50,
          "clicks": 20,
          "purchases": 6,
          "dismissals": 10
        }
      ]
    }
  }
}
```

---

## Request/Response Examples

### Complete Search Workflow

```javascript
// 1. User types in search box (autocomplete)
const suggestions = await fetch(
  '/api/v1/search/autocomplete?query=lap&type=products'
).then(r => r.json());

// 2. User performs search
const results = await fetch(
  '/api/v1/search/products?search=laptop&minPrice=20000&maxPrice=100000&sort=price-asc'
).then(r => r.json());

// 3. User saves this search for later
await fetch('/api/v1/search/saved', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer TOKEN' },
  body: JSON.stringify({
    name: 'Affordable Laptops',
    searchType: 'products',
    filters: {
      search: 'laptop',
      minPrice: 20000,
      maxPrice: 100000,
      sortBy: 'price-asc'
    },
    notifications: { enabled: true, frequency: 'daily' }
  })
}).then(r => r.json());

// 4. User checks analytics
const analytics = await fetch(
  '/api/v1/search/analytics?days=30',
  { headers: { 'Authorization': 'Bearer TOKEN' } }
).then(r => r.json());

// 5. User provides feedback
await fetch('/api/v1/search/feedback', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer TOKEN' },
  body: JSON.stringify({
    searchAnalyticsId: '...',
    relevant: true,
    helpful: true,
    rating: 5
  })
}).then(r => r.json());
```

---

### Complete Recommendation Workflow

```javascript
// 1. Get personalized recommendations
const recs = await fetch(
  '/api/v1/recommendations?limit=10',
  { headers: { 'Authorization': 'Bearer TOKEN' } }
).then(r => r.json());

// 2. User clicks on recommendation
await fetch('/api/v1/recommendations/:recId/click', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer TOKEN' }
}).then(r => r.json());

// 3. User likes or dismisses recommendation
await fetch('/api/v1/recommendations/:recId/dismiss', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer TOKEN' },
  body: JSON.stringify({ reason: 'already-have' })
}).then(r => r.json());

// 4. User rates recommendations
await fetch('/api/v1/recommendations/:recId/rate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer TOKEN' },
  body: JSON.stringify({ rating: 4, comment: 'Helpful!' })
}).then(r => r.json());

// 5. Check recommendation performance
const analytics = await fetch(
  '/api/v1/recommendations/analytics',
  { headers: { 'Authorization': 'Bearer TOKEN' } }
).then(r => r.json());
```

---

## Error Handling

All endpoints return standard error responses:

```json
{
  "status": "error",
  "message": "Error message here",
  "statusCode": 400
}
```

**Common Status Codes:**
- `200` - Success
- `201` - Created
- `204` - No Content (delete)
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Server Error

---

## Authentication

All protected endpoints require:
```
Authorization: Bearer YOUR_JWT_TOKEN
```

Obtained from:
```bash
POST /api/v1/auth/login
{
  "email": "user@example.com",
  "password": "password"
}
```

---

## Rate Limiting

Search endpoints: 100 requests per 15 minutes per user  
Recommendation endpoints: 50 requests per 15 minutes per user

---

**For complete implementation details, see: `ADVANCED_FEATURES_IMPLEMENTATION_GUIDE.md`**
