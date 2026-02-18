# Product Advanced Filtering & Sorting API

## Overview
The product API now includes comprehensive advanced filtering and sorting capabilities to help users discover products efficiently.

## Endpoint

**GET** `/api/v1/products/search/advanced`

## Query Parameters

### Search & Text
- **search** (string): Free-text search across product name, description, and tags
  - Example: `search=laptop`

### Filtering

#### Price Range
- **minPrice** (number): Minimum price filter (inclusive)
- **maxPrice** (number): Maximum price filter (inclusive)
- Examples: `minPrice=1000&maxPrice=50000`

#### Rating Filters
- **minRating** (number, 0-5): Minimum average rating
- **maxRating** (number, 0-5): Maximum average rating
- **rating** (string): Preset rating filters
  - `topRated`: ratingsAverage >= 4.5 with at least 5 ratings
  - `highRated`: ratingsAverage >= 4.0
  - `unrated`: Products with no ratings yet

#### Views Filters
- **minViews** (number): Minimum number of views
- **maxViews** (number): Maximum number of views

#### Product Details
- **category** (ObjectId or slug): Filter by category ID or slug name
- **shop** (ObjectId): Filter by specific shop
- **campus** (ObjectId): Filter by campus
- **condition** (string): Product condition filter
  - Allowed: `new`, `like-new`, `good`, `fair`, `poor`
- **status** (string, default: `active`): Product status
  - Allowed: `active`, `inactive`, `sold`, `out-of-stock`

#### Availability
- **available** (boolean): Filter by availability (`true` or `false`)
- **inStock** (string): `true` to show only products with stock > 0
- **excludeOutOfStock** (string): `true` to exclude out-of-stock items

#### Media
- **hasImages** (string): `true` to only show products with images

#### Tags
- **tags** (string, comma-separated): Filter by product tags
  - Example: `tags=electronics,gadgets`

#### Preset Filters
- **popularity** (string): Preset popularity filters
  - `trending`: High views (>=50) + high favorites (>=5)
  - `mostViewed`: Views >= 100
  - `mostFavorited`: Favorites >= 10

### Sorting

- **sortBy** (string, default: `createdAt`): Field to sort by
  - Sorting options:
    - `price` / `price_asc` / `price_desc`: Sort by price
    - `rating` / `ratingsAverage`: Sort by rating (secondary: by quantity)
    - `views` / `analytics.views`: Sort by view count
    - `favorites` / `analytics.favorites`: Sort by favorites
    - `newest` / `createdAt`: Sort by creation date (newest first)
    - `oldest`: Sort by creation date (oldest first)
    - `updated` / `updatedAt`: Sort by last update
    - `name`: Sort by product name
    - `stock`: Sort by stock quantity
    - `condition`: Sort by condition
    - `popularity`: Multi-factor popularity (views + favorites + rating)
    - `trending`: Recent + high engagement

- **order** (string, default: `desc`): Sort order
  - Allowed: `asc` (ascending), `desc` (descending)
  - Note: Some sorts override this (e.g., `newest` always sorts descending)

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
    "products": [
      {
        "_id": "...",
        "name": "...",
        "price": 25000,
        "category": { "_id": "...", "name": "..." },
        "shop": { "_id": "...", "name": "..." },
        "condition": "like-new",
        "status": "active",
        "stock": 5,
        "ratingsAverage": 4.7,
        "ratingsQuantity": 12,
        "analytics": {
          "views": 125,
          "favorites": 8,
          "lastViewed": "2025-11-18T..."
        },
        "images": ["https://..."],
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
GET /api/v1/products/search/advanced?minPrice=10000&maxPrice=50000&sortBy=price&order=asc&limit=10
```

### 2. Search with Rating Filter
```
GET /api/v1/products/search/advanced?search=phone&rating=topRated&sortBy=rating&order=desc&limit=20
```

### 3. Trending Products
```
GET /api/v1/products/search/advanced?popularity=trending&sortBy=trending&limit=20
```

### 4. Category with Multiple Filters
```
GET /api/v1/products/search/advanced?category=electronics&condition=new&inStock=true&sortBy=price&limit=15
```

### 5. Most Viewed in Campus
```
GET /api/v1/products/search/advanced?campus=60d5ec49c1234567890abc12&sortBy=views&order=desc&limit=10
```

### 6. Available Products with Images & Favorites
```
GET /api/v1/products/search/advanced?available=true&hasImages=true&sortBy=analytics.favorites&order=desc&limit=20
```

### 7. Complex Filter (Multiple Criteria)
```
GET /api/v1/products/search/advanced?
  search=laptop&
  category=electronics&
  minPrice=50000&
  maxPrice=200000&
  minRating=4&
  condition=like-new&
  inStock=true&
  hasImages=true&
  sortBy=rating&
  order=desc&
  page=1&
  limit=20
```

### 8. Tag-Based Search
```
GET /api/v1/products/search/advanced?tags=gadgets,electronics&shop=60d5ec49c1234567890abc12&sortBy=popularity
```

### 9. Oldest Products in Campus
```
GET /api/v1/products/search/advanced?campus=60d5ec49c1234567890abc12&sortBy=oldest&limit=10
```

### 10. Unrated Products
```
GET /api/v1/products/search/advanced?rating=unrated&sortBy=newest&limit=20
```

## Filter Combinations Guide

| Use Case | Query |
|----------|-------|
| Budget items | `minPrice=1000&maxPrice=10000&inStock=true` |
| Premium items | `minPrice=100000&rating=topRated&sortBy=rating` |
| Best deals | `condition=good,like-new&sortBy=price&order=asc` |
| Popular items | `popularity=trending&limit=10` |
| New arrivals | `sortBy=newest&limit=20` |
| High engagement | `minViews=50&sortBy=favorites&order=desc` |
| School supplies | `tags=stationery,textbooks&campus={{campusId}}` |
| Used electronics | `condition=fair,good&category=electronics` |

## Sorting Best Practices

1. **Price Sensitivity**: Use `sortBy=price` with `order=asc` for cheapest
2. **Quality Focus**: Use `sortBy=rating` to find highly-rated items
3. **Popular Items**: Use `sortBy=popularity` or `popularity=trending`
4. **Recent Listings**: Use `sortBy=newest`
5. **High Traffic**: Use `sortBy=views` for popular products

## Error Handling

- **Invalid price values**: Returns 400 with validation error
- **Invalid ObjectId**: Returns 400
- **Page out of range**: Returns empty results with valid pagination
- **Unknown sortBy**: Defaults to `createdAt`

## Performance Notes

- Text search requires `name` text index (already configured)
- Price range queries benefit from price index (already configured)
- Large result sets (limit > 50) may take longer
- Combining many filters with text search may be slower
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
- Tags are matched with exact case-insensitive match
- Coordinates can be used for geospatial queries in future versions
