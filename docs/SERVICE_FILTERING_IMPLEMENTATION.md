# Service Advanced Filtering - Implementation Summary

## What Was Implemented

### New Endpoint
**GET** `/api/v1/services/search/advanced`

A comprehensive advanced filtering and sorting endpoint for service discovery with support for price, duration, availability, ratings, and more.

---

## Features Added

### 🔍 Advanced Filtering

1. **Text Search**
   - Search across title, description, category, and tags
   - Case-insensitive fuzzy matching

2. **Price Range**
   - Min/max price boundaries
   - All currency support

3. **Duration Filters**
   - Min/max duration in minutes
   - Useful for quick vs. comprehensive services

4. **Rating Filters**
   - Min/max rating (0-5)
   - Preset filters: `topRated`, `highRated`, `unrated`

5. **Booking/Availability Filters**
   - Min/max current bookings
   - `available`: Show only services with open slots
   - Available slots = maxBookings - currentBookings

6. **View/Engagement Filters**
   - Min/max views
   - Min/max total bookings (popularity)

7. **Stock Availability**
   - Filter by availability status
   - Can combine with availability expressions

8. **Media Filters**
   - `hasImages`: Show only services with images

9. **Category, Provider, Campus**
   - Filter by specific categories (case-insensitive)
   - Filter by provider ID
   - Filter by campus

10. **Tags**
    - Multi-tag filtering (comma-separated)
    - Case-insensitive matching

11. **Settings Filters**
    - `allowInstantBooking`: Instant booking available
    - `cancellationPolicy`: `flexible`, `moderate`, `strict`

12. **Popularity Presets**
    - `trending`: High views + high bookings (recent + engaged)
    - `mostViewed`: Views >= 100
    - `mostBooked`: Total bookings >= 10

### 📊 Advanced Sorting

Available sort options:
- **Price**: `price`, `price_asc`, `price_desc`
- **Rating**: `rating`, `ratingsAverage`
- **Bookings**: `bookings`, `analytics.totalBookings`
- **Views**: `views`, `analytics.views`
- **Revenue**: `revenue`, `analytics.totalRevenue`
- **Date**: `newest` (createdAt desc), `oldest`, `updated`
- **Title**: Alphabetical sorting
- **Duration**: By service duration
- **Availability**: By available slots
- **Popularity**: Multi-factor scoring
- **Trending**: Recent + high engagement

### 📄 Pagination

- Page-based pagination (1-indexed)
- Default 20 results per page
- Maximum 100 results per page
- Response includes:
  - `total`: Total matching services
  - `pages`: Total pages
  - `page`: Current page
  - `hasNextPage` / `hasPrevPage`: Navigation flags

### 🎯 Filter Combinations

All filters can be combined for complex queries:
```
/search/advanced?
  search=tutoring&
  category=education&
  minPrice=10000&
  maxPrice=100000&
  minDuration=30&
  maxDuration=120&
  available=true&
  hasImages=true&
  rating=highRated&
  cancellationPolicy=flexible&
  sortBy=rating&
  order=desc&
  limit=20
```

---

## Code Changes

### Files Modified

1. **controllers/serviceController.js**
   - Added `advancedSearchServices()` handler
   - Added `buildAdvancedServiceFilter()` helper function
   - Added `buildAdvancedServiceSort()` helper function
   - Kept existing functions for backward compatibility

2. **routes/serviceRoutes.js**
   - Added route: `GET /search/advanced` pointing to `advancedSearchServices`
   - Placed before `/:id` routes to avoid conflicts

### New Functions

#### `advancedSearchServices(req, res, next)`
- Accepts all advanced query parameters
- Builds MongoDB filter object
- Applies advanced sorting
- Handles pagination
- Returns formatted response with metadata

#### `buildAdvancedServiceFilter(params)`
- Constructs MongoDB filter from query parameters
- Handles all filter types (price, duration, rating, availability, etc.)
- Validates ObjectIds
- Supports preset filters

#### `buildAdvancedServiceSort(sortBy, order)`
- Maps sort parameter to MongoDB sort object
- Supports compound sorts (e.g., rating + quantity)
- Handles special cases (popularity, trending)

---

## Example Usage

### Postman Request
```
GET http://localhost:3000/api/v1/services/search/advanced?
  search=tutoring&
  minPrice=10000&
  maxPrice=100000&
  rating=topRated&
  available=true&
  sortBy=rating&
  order=desc&
  limit=20&
  page=1
```

### cURL Request
```bash
curl -X GET "http://localhost:3000/api/v1/services/search/advanced?search=tutoring&minPrice=10000&maxPrice=100000&rating=topRated&available=true&sortBy=rating&order=desc&limit=20" \
  -H "Content-Type: application/json"
```

### Frontend Integration (JavaScript)
```javascript
// Build query string
const filters = {
  search: 'tutoring',
  minPrice: 10000,
  maxPrice: 100000,
  rating: 'topRated',
  available: 'true',
  sortBy: 'rating',
  order: 'desc',
  limit: 20,
  page: 1
};

const queryString = new URLSearchParams(filters).toString();
const response = await fetch(`/api/v1/services/search/advanced?${queryString}`);
const data = await response.json();
```

---

## Response Example

```json
{
  "status": "success",
  "results": 5,
  "pagination": {
    "total": 15,
    "page": 1,
    "pages": 3,
    "limit": 5,
    "hasNextPage": true,
    "hasPrevPage": false
  },
  "data": {
    "services": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "title": "Professional Math Tutoring",
        "description": "Expert math tutoring for all levels...",
        "price": 25000,
        "category": "education",
        "status": "active",
        "duration": 60,
        "currentBookings": 3,
        "maxBookings": 10,
        "ratingsAverage": 4.9,
        "ratingsQuantity": 18,
        "analytics": {
          "views": 234,
          "totalBookings": 18,
          "totalRevenue": 450000,
          "lastViewed": "2025-11-18T14:30:00Z"
        },
        "provider": {
          "_id": "507f1f77bcf86cd799439012",
          "fullName": "Prof. John Smith",
          "email": "john@example.com"
        },
        "campus": {
          "_id": "507f1f77bcf86cd799439013",
          "name": "UNILAG"
        },
        "images": [
          "https://res.cloudinary.com/.../tutoring.jpg"
        ],
        "tags": ["math", "tutoring", "online"],
        "settings": {
          "allowInstantBooking": true,
          "cancellationPolicy": "flexible"
        },
        "createdAt": "2025-11-10T08:20:30Z",
        "updatedAt": "2025-11-18T12:45:00Z"
      }
      // ... more services
    ]
  }
}
```

---

## Performance Considerations

1. **Indexes Used**
   - Text index on: `title`, `description`, `category`, `tags`
   - Standard indexes on: `price`, `category`, `campus`, `provider`, `status`, `duration`
   - Composite indexes on: `analytics.views`, `analytics.totalBookings`, `analytics.totalRevenue`, `ratingsAverage`

2. **Query Optimization**
   - Efficient MongoDB operators ($gte, $lte, $in, $expr)
   - Proper pagination to limit memory usage
   - Selective field population only when needed

3. **Recommendations**
   - For large datasets, consider query result caching
   - Implement rate limiting on search endpoint
   - Monitor slow queries in production
   - Consider materialized views for popular aggregations

---

## Testing Instructions

### Test via Postman
1. Create a new GET request
2. URL: `{{baseUrl}}/api/v1/services/search/advanced`
3. Add query parameters from examples
4. Send and verify response structure

### Test via cURL
```bash
# Test basic search
curl "http://localhost:3000/api/v1/services/search/advanced?search=tutoring"

# Test with filters
curl "http://localhost:3000/api/v1/services/search/advanced?minPrice=10000&maxPrice=100000&sortBy=price&order=asc"

# Test pagination
curl "http://localhost:3000/api/v1/services/search/advanced?limit=10&page=2"
```

### Test via Browser
```
http://localhost:3000/api/v1/services/search/advanced?search=tutoring&sortBy=price&limit=10
```

---

## Backward Compatibility

- Existing `getAllServices` endpoint remains unchanged
- Original `searchServices` endpoint still works
- No breaking changes to existing API contracts
- New endpoint is purely additive

---

## Future Enhancements

1. **Faceted Search**: Return filter value suggestions
2. **Saved Searches**: Users can save favorite filter combinations
3. **Search Analytics**: Track popular search terms
4. **AI Recommendations**: Similar services based on current filters
5. **Real-time Availability**: Live slot availability updates
6. **Service Bundles**: Combine multiple services
7. **Time-based Filtering**: Services available at specific times
8. **Rating Breakdown**: Detailed rating analytics

---

## API Reference Summary

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/v1/services/search/advanced` | Advanced filter + sort services |
| GET | `/api/v1/services` | Get all services (basic) |
| GET | `/api/v1/services/:id` | Get single service |
| POST | `/api/v1/services` | Create service (authenticated) |
| PATCH | `/api/v1/services/:id` | Update service (authenticated) |
| DELETE | `/api/v1/services/:id` | Delete service (authenticated) |

---

## Support & Troubleshooting

### No Results Returned
- Verify filters are not conflicting
- Check that services exist matching criteria
- Ensure `status: 'active'` (default) - override if needed

### Slow Queries
- Reduce limit (max 100)
- Remove unnecessary filters
- Avoid complex text searches if possible

### Invalid Parameter Error
- Check parameter names are spelled correctly
- Ensure ObjectIds are valid format
- Use `true`/`false` strings for boolean params

---

## Notes

- All query parameters are optional
- Default sorting is by `createdAt` descending
- Status defaults to `active` (can be changed)
- Maximum pagination limit is 100
- Text search is case-insensitive
- Combining too many filters may slow queries
- Duration is measured in minutes
