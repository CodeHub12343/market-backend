# Service Advanced Filtering & Sorting API

## Overview
The service API now includes comprehensive advanced filtering and sorting capabilities for service discovery.

## Endpoint

**GET** `/api/v1/services/search/advanced`

## Query Parameters

### Search & Text
- **search** (string): Free-text search across title, description, category, and tags
  - Example: `search=tutoring`

### Filtering

#### Price Range
- **minPrice** (number): Minimum price filter (inclusive)
- **maxPrice** (number): Maximum price filter (inclusive)
- Examples: `minPrice=5000&maxPrice=50000`

#### Rating Filters
- **minRating** (number, 0-5): Minimum average rating
- **maxRating** (number, 0-5): Maximum average rating
- **rating** (string): Preset rating filters
  - `topRated`: ratingsAverage >= 4.5 with at least 5 ratings
  - `highRated`: ratingsAverage >= 4.0
  - `unrated`: Services with no ratings yet

#### Duration Filters (in minutes)
- **minDuration** (number): Minimum service duration
- **maxDuration** (number): Maximum service duration
- Examples: `minDuration=30&maxDuration=120` (30 min to 2 hours)

#### Booking Filters
- **minBookings** (number): Minimum current bookings
- **maxBookings** (number): Maximum current bookings
- **available** (string): `true` to show only services with available slots

#### Views Filters
- **minViews** (number): Minimum number of views
- **maxViews** (number): Maximum number of views

#### Service Details
- **category** (string): Filter by category (case-insensitive)
  - Example: `category=tutoring`
- **provider** (ObjectId): Filter by specific service provider
- **campus** (ObjectId): Filter by campus
- **status** (string, default: `active`): Service status
  - Allowed: `active`, `inactive`, `suspended`, `completed`

#### Availability & Media
- **hasImages** (string): `true` to only show services with images
- **allowInstantBooking** (string): `true` to show services with instant booking enabled

#### Settings
- **cancellationPolicy** (string): Filter by cancellation policy
  - Allowed: `flexible`, `moderate`, `strict`

#### Tags
- **tags** (string, comma-separated): Filter by service tags
  - Example: `tags=online,english`

#### Preset Filters
- **popularity** (string): Preset popularity filters
  - `trending`: High views (>=50) + high bookings (>=5)
  - `mostViewed`: Views >= 100
  - `mostBooked`: Total bookings >= 10

### Sorting

- **sortBy** (string, default: `createdAt`): Field to sort by
  - Sorting options:
    - `price` / `price_asc` / `price_desc`: Sort by price
    - `rating` / `ratingsAverage`: Sort by rating (secondary: by quantity)
    - `views` / `analytics.views`: Sort by view count
    - `bookings` / `analytics.totalBookings`: Sort by total bookings
    - `newest` / `createdAt`: Sort by creation date (newest first)
    - `oldest`: Sort by creation date (oldest first)
    - `updated` / `updatedAt`: Sort by last update
    - `title`: Sort by service title
    - `duration`: Sort by duration
    - `popularity`: Multi-factor popularity (views + bookings + rating)
    - `trending`: Recent + high engagement
    - `revenue` / `analytics.totalRevenue`: Sort by total revenue
    - `available`: Sort by available slots (most available first)

- **order** (string, default: `desc`): Sort order
  - Allowed: `asc` (ascending), `desc` (descending)

### Pagination

- **page** (number, default: 1): Page number (1-indexed)
- **limit** (number, default: 20, max: 100): Results per page

## Response Format

```json
{
  "status": "success",
  "results": 15,
  "pagination": {
    "total": 150,
    "page": 1,
    "pages": 10,
    "limit": 15,
    "hasNextPage": true,
    "hasPrevPage": false
  },
  "data": {
    "services": [
      {
        "_id": "...",
        "title": "...",
        "description": "...",
        "price": 10000,
        "category": "tutoring",
        "provider": { "_id": "...", "fullName": "...", "email": "..." },
        "campus": { "_id": "...", "name": "..." },
        "duration": 60,
        "currentBookings": 5,
        "maxBookings": 10,
        "ratingsAverage": 4.8,
        "ratingsQuantity": 12,
        "status": "active",
        "analytics": {
          "views": 125,
          "totalBookings": 5,
          "totalRevenue": 50000,
          "lastViewed": "2025-11-18T..."
        },
        "settings": {
          "allowInstantBooking": true,
          "cancellationPolicy": "moderate"
        },
        "images": ["https://..."],
        "tags": ["english", "online"],
        "createdAt": "2025-11-01T...",
        ...
      }
    ]
  }
}
```

## Example Requests

### 1. Filter by Price Range & Sort by Price
```
GET /api/v1/services/search/advanced?minPrice=5000&maxPrice=50000&sortBy=price&order=asc&limit=10
```

### 2. Search with Rating Filter
```
GET /api/v1/services/search/advanced?search=coding&rating=topRated&sortBy=rating&order=desc&limit=20
```

### 3. Trending Services
```
GET /api/v1/services/search/advanced?popularity=trending&sortBy=trending&limit=20
```

### 4. Category with Duration Filter
```
GET /api/v1/services/search/advanced?category=tutoring&minDuration=30&maxDuration=120&inStock=true&sortBy=price&limit=15
```

### 5. Available Services by Campus
```
GET /api/v1/services/search/advanced?campus={{campusId}}&available=true&hasImages=true&limit=20
```

### 6. Specific Provider Services with Tags
```
GET /api/v1/services/search/advanced?provider={{providerId}}&tags=online,english&sortBy=price&order=asc&limit=20
```

### 7. Complex Multi-Filter
```
GET /api/v1/services/search/advanced?
  search=tutoring&
  category=education&
  minPrice=5000&
  maxPrice=100000&
  minRating=3.5&
  available=true&
  hasImages=true&
  allowInstantBooking=true&
  cancellationPolicy=flexible&
  sortBy=rating&
  order=desc&
  page=1&
  limit=15
```

### 8. Highest Revenue Services
```
GET /api/v1/services/search/advanced?sortBy=revenue&order=desc&limit=10
```

### 9. Most Viewed Services
```
GET /api/v1/services/search/advanced?sortBy=views&order=desc&limit=20
```

### 10. Flexible Cancellation Only
```
GET /api/v1/services/search/advanced?cancellationPolicy=flexible&sortBy=newest&limit=20
```

## Filter Combinations Guide

| Use Case | Query |
|----------|-------|
| Budget services | `minPrice=1000&maxPrice=10000&available=true` |
| Premium services | `minPrice=50000&rating=topRated&sortBy=rating` |
| Quick sessions | `maxDuration=60&sortBy=price&order=asc` |
| Popular services | `popularity=trending&limit=10` |
| New services | `sortBy=newest&limit=20` |
| High engagement | `minViews=50&sortBy=bookings&order=desc` |
| Online tutoring | `tags=online,tutoring&category=education` |
| Available now | `available=true&allowInstantBooking=true` |

## Sorting Best Practices

1. **Budget Conscious**: Use `sortBy=price` with `order=asc` for cheapest
2. **Quality Focus**: Use `sortBy=rating` to find highest-rated services
3. **Popular Items**: Use `sortBy=popularity` or `popularity=trending`
4. **Recent Listings**: Use `sortBy=newest`
5. **Most Booked**: Use `sortBy=bookings` for proven services
6. **Revenue Generators**: Use `sortBy=revenue` to find most successful

## Performance Notes

- Text search uses text indexes on title, description, category, tags
- Price and rating queries benefit from dedicated indexes
- Duration filters query specific range efficiently
- Combining many filters may increase query time
- Consider pagination to limit response size

## Pagination Best Practices

- Default limit is 20; adjust based on UI needs
- Maximum limit is 100 (enforced)
- Use `hasNextPage` and `hasPrevPage` for UI navigation
- Cache results when possible for frequently accessed pages

## Notes

- All filters are optional and can be combined
- Status defaults to `active` (can be overridden)
- Sorting order can be reversed with `order=asc`
- Tags are matched with case-insensitive exact match
- Duration is in minutes
- Prices should be in same currency as system
