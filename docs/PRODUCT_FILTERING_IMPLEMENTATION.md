# Product Advanced Filtering - Implementation Summary

## What Was Implemented

### New Endpoint
**GET** `/api/v1/products/search/advanced`

A comprehensive advanced filtering and sorting endpoint that replaces simple queries with powerful capabilities for product discovery.

---

## Features Added

### 🔍 Advanced Filtering

1. **Text Search**
   - Search across product name, description, and tags
   - Case-insensitive, fuzzy matching

2. **Price Range**
   - Min/max price boundaries
   - Supports all currency values

3. **Product Condition**
   - Filter by: `new`, `like-new`, `good`, `fair`, `poor`

4. **Rating Filters**
   - Min/max rating (0-5)
   - Preset filters: `topRated`, `highRated`, `unrated`

5. **View/Engagement Filters**
   - Min/max views
   - Min/max favorites (via popularity preset)

6. **Stock Availability**
   - `inStock`: Show only products with stock > 0
   - `excludeOutOfStock`: Exclude out-of-stock items
   - `available`: Filter by availability flag

7. **Media Filters**
   - `hasImages`: Show only products with images

8. **Category, Shop, Campus**
   - Filter by specific categories, shops, or campus
   - Category supports slug or ID

9. **Tags**
   - Multi-tag filtering (comma-separated)
   - Case-insensitive matching

10. **Popularity Presets**
    - `trending`: High views + high favorites (recent + engaged)
    - `mostViewed`: Views >= 100
    - `mostFavorited`: Favorites >= 10

### 📊 Advanced Sorting

Available sort options:
- **Price**: `price`, `price_asc`, `price_desc`
- **Rating**: `rating`, `ratingsAverage`
- **Views**: `views`, `analytics.views`
- **Favorites**: `favorites`, `analytics.favorites`
- **Date**: `newest` (createdAt desc), `oldest`, `updated`
- **Name**: Alphabetical sorting
- **Stock**: By quantity available
- **Condition**: By product condition
- **Popularity**: Multi-factor scoring
- **Trending**: Recent + high engagement

### 📄 Pagination

- Page-based pagination (1-indexed)
- Default 20 results per page
- Maximum 100 results per page
- Response includes:
  - `total`: Total matching products
  - `pages`: Total pages
  - `page`: Current page
  - `hasNextPage` / `hasPrevPage`: Navigation flags

### 🎯 Filter Combinations

All filters can be combined for complex queries:
```
/search/advanced?
  search=laptop&
  category=electronics&
  minPrice=50000&
  maxPrice=200000&
  condition=like-new&
  inStock=true&
  hasImages=true&
  rating=highRated&
  sortBy=rating&
  order=desc&
  limit=20
```

---

## Code Changes

### Files Modified

1. **controllers/productController.js**
   - Added `advancedSearchProducts()` handler
   - Added `buildAdvancedFilter()` helper function
   - Added `buildAdvancedSort()` helper function
   - Kept existing `buildFilter()` for backward compatibility

2. **routes/productRoutes.js**
   - Added route: `GET /search/advanced` pointing to `advancedSearchProducts`
   - Placed before `/:id` routes to avoid conflicts

### New Functions

#### `advancedSearchProducts(req, res, next)`
- Accepts all advanced query parameters
- Builds MongoDB filter object
- Applies advanced sorting
- Handles pagination
- Returns formatted response with metadata

#### `buildAdvancedFilter(params)`
- Constructs MongoDB filter from query parameters
- Handles all filter types (price, rating, views, tags, etc.)
- Validates ObjectIds
- Supports preset filters

#### `buildAdvancedSort(sortBy, order)`
- Maps sort parameter to MongoDB sort object
- Supports compound sorts (e.g., rating + quantity)
- Handles special cases (popularity, trending)

---

## Example Usage

### Postman Request
```
GET http://localhost:3000/api/v1/products/search/advanced?
  search=laptop&
  minPrice=50000&
  maxPrice=200000&
  rating=topRated&
  inStock=true&
  sortBy=rating&
  order=desc&
  limit=20&
  page=1
```

### cURL Request
```bash
curl -X GET "http://localhost:3000/api/v1/products/search/advanced?search=laptop&minPrice=50000&maxPrice=200000&rating=topRated&inStock=true&sortBy=rating&order=desc&limit=20" \
  -H "Content-Type: application/json"
```

### Frontend Integration (JavaScript)
```javascript
// Build query string
const filters = {
  search: 'laptop',
  minPrice: 50000,
  maxPrice: 200000,
  rating: 'topRated',
  inStock: 'true',
  sortBy: 'rating',
  order: 'desc',
  limit: 20,
  page: 1
};

const queryString = new URLSearchParams(filters).toString();
const response = await fetch(`/api/v1/products/search/advanced?${queryString}`);
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
    "products": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "name": "Dell XPS 13 Laptop",
        "price": 180000,
        "condition": "like-new",
        "status": "active",
        "stock": 2,
        "ratingsAverage": 4.8,
        "ratingsQuantity": 15,
        "analytics": {
          "views": 234,
          "favorites": 18,
          "lastViewed": "2025-11-18T14:30:00Z"
        },
        "category": {
          "_id": "507f1f77bcf86cd799439012",
          "name": "Electronics",
          "slug": "electronics"
        },
        "shop": {
          "_id": "507f1f77bcf86cd799439013",
          "name": "TechHub Store",
          "campus": "507f1f77bcf86cd799439014",
          "owner": "507f1f77bcf86cd799439015"
        },
        "campus": {
          "_id": "507f1f77bcf86cd799439014",
          "name": "UNILAG",
          "shortCode": "UNILAG"
        },
        "images": [
          "https://res.cloudinary.com/.../dell-xps-13.jpg"
        ],
        "tags": ["laptop", "electronics", "dell"],
        "createdAt": "2025-11-10T08:20:30Z",
        "updatedAt": "2025-11-18T12:45:00Z"
      }
      // ... more products
    ]
  }
}
```

---

## Performance Considerations

1. **Indexes Used**
   - Text index on: `name`, `description`, `tags`
   - Standard indexes on: `price`, `category`, `shop`, `campus`, `status`, `condition`
   - Composite indexes on: `analytics.views`, `analytics.favorites`, `ratingsAverage`

2. **Query Optimization**
   - Efficient MongoDB operators ($gte, $lte, $in)
   - Proper pagination to limit memory usage
   - Selective field population only when needed

3. **Recommendations**
   - For large datasets, consider adding query result caching
   - Implement rate limiting on search endpoint
   - Monitor slow queries in production
   - Consider aggregation pipeline for complex trending calculations

---

## Testing Instructions

### Test via Postman
1. Create a new GET request
2. URL: `{{baseUrl}}/api/v1/products/search/advanced`
3. Add query parameters from examples above
4. Send and verify response structure

### Test via cURL
```bash
# Test basic search
curl "http://localhost:3000/api/v1/products/search/advanced?search=laptop"

# Test with filters
curl "http://localhost:3000/api/v1/products/search/advanced?minPrice=10000&maxPrice=100000&sortBy=price&order=asc"

# Test pagination
curl "http://localhost:3000/api/v1/products/search/advanced?limit=10&page=2"
```

### Test via Browser
```
http://localhost:3000/api/v1/products/search/advanced?search=laptop&sortBy=price&limit=10
```

---

## Backward Compatibility

- Existing `getAllProducts` endpoint remains unchanged
- Original `searchProducts` endpoint still works
- No breaking changes to existing API contracts
- New endpoint is purely additive

---

## Future Enhancements

1. **Faceted Search**: Return filter value suggestions
2. **Saved Filters**: Users can save favorite filter combinations
3. **Search Analytics**: Track popular search terms and filters
4. **AI Recommendations**: Similar products based on current filters
5. **Geospatial Search**: Distance-based product discovery
6. **Aggregation**: Price ranges, average ratings per category
7. **Real-time Filters**: Active users viewing products
8. **Fuzzy Matching**: Better typo tolerance in search

---

## API Reference Summary

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/v1/products/search/advanced` | Advanced filter + sort products |
| GET | `/api/v1/products` | Get all products (basic) |
| GET | `/api/v1/products/top-rated` | Get top-rated products |
| GET | `/api/v1/products/:id` | Get single product |
| POST | `/api/v1/products` | Create product (authenticated) |
| PATCH | `/api/v1/products/:id` | Update product (authenticated) |
| DELETE | `/api/v1/products/:id` | Delete product (authenticated) |

---

## Support & Troubleshooting

### No Results Returned
- Verify filters are not conflicting
- Check that products exist matching criteria
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
