# Product Advanced Filtering - Postman Testing Guide

## Base Setup

### Environment Variables
- `baseUrl` = `http://localhost:3000`
- `authToken` = (your JWT token)

---

## Postman Requests

### 1️⃣ **Basic Search**
```
GET {{baseUrl}}/api/v1/products/search/advanced?search=laptop&limit=10

Expected: 200 with products containing "laptop" in name/description
```

---

### 2️⃣ **Price Range Filter**
```
GET {{baseUrl}}/api/v1/products/search/advanced?minPrice=10000&maxPrice=50000&sortBy=price&order=asc&limit=20

Expected: Products priced between ₦10,000 - ₦50,000, sorted by price (cheapest first)
```

---

### 3️⃣ **Top Rated Products**
```
GET {{baseUrl}}/api/v1/products/search/advanced?rating=topRated&sortBy=rating&order=desc&limit=10

Expected: Products with rating >= 4.5 and at least 5 reviews, sorted by rating
```

---

### 4️⃣ **Trending Products**
```
GET {{baseUrl}}/api/v1/products/search/advanced?popularity=trending&sortBy=trending&limit=15

Expected: Recently created products with high engagement (views + favorites)
```

---

### 5️⃣ **Category + Condition Filter**
```
GET {{baseUrl}}/api/v1/products/search/advanced?category=electronics&condition=like-new&inStock=true&limit=20

Expected: Like-new electronics that are in stock
```

---

### 6️⃣ **By Campus + Availability**
```
GET {{baseUrl}}/api/v1/products/search/advanced?campus={{campusId}}&available=true&hasImages=true&limit=20

Expected: Available products with images in specific campus
```

---

### 7️⃣ **Tags Filter**
```
GET {{baseUrl}}/api/v1/products/search/advanced?tags=textbooks,stationery&sortBy=price&order=asc&limit=20

Expected: Products tagged with textbooks or stationery, sorted by price ascending
```

---

### 8️⃣ **Views + Favorites Combo**
```
GET {{baseUrl}}/api/v1/products/search/advanced?minViews=50&sortBy=analytics.favorites&order=desc&limit=10

Expected: Products with at least 50 views, sorted by most favorited
```

---

### 9️⃣ **Complex Multi-Filter**
```
GET {{baseUrl}}/api/v1/products/search/advanced?
  search=phone&
  category=electronics&
  minPrice=20000&
  maxPrice=150000&
  minRating=3.5&
  condition=good,like-new&
  inStock=true&
  hasImages=true&
  sortBy=rating&
  order=desc&
  page=1&
  limit=15

Expected: Complex filtered results with pagination info
```

---

### 🔟 **Most Viewed**
```
GET {{baseUrl}}/api/v1/products/search/advanced?sortBy=views&order=desc&limit=20

Expected: Top 20 most-viewed active products
```

---

### 1️⃣1️⃣ **Newest Arrivals**
```
GET {{baseUrl}}/api/v1/products/search/advanced?sortBy=newest&limit=20&page=1

Expected: Latest 20 products created, with pagination
```

---

### 1️⃣2️⃣ **Unrated Products**
```
GET {{baseUrl}}/api/v1/products/search/advanced?rating=unrated&sortBy=newest&limit=10

Expected: Products with no ratings, sorted by newest
```

---

### 1️⃣3️⃣ **Budget Items**
```
GET {{baseUrl}}/api/v1/products/search/advanced?maxPrice=5000&inStock=true&sortBy=price&order=asc&limit=20

Expected: Cheapest available products under ₦5,000
```

---

### 1️⃣4️⃣ **Premium Selection**
```
GET {{baseUrl}}/api/v1/products/search/advanced?minPrice=100000&rating=topRated&sortBy=rating&order=desc&limit=10

Expected: High-end, highly-rated products
```

---

### 1️⃣5️⃣ **Pagination Test** (Page 2)
```
GET {{baseUrl}}/api/v1/products/search/advanced?limit=10&page=2&sortBy=newest

Expected: Results 11-20, with pagination metadata showing:
  - page: 2
  - hasNextPage: true/false
  - hasPrevPage: true
  - pages: total pages
```

---

## Expected Response Structure

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
        "name": "iPhone 13 Pro",
        "price": 85000,
        "condition": "like-new",
        "status": "active",
        "stock": 3,
        "ratingsAverage": 4.8,
        "ratingsQuantity": 24,
        "analytics": {
          "views": 156,
          "favorites": 12,
          "lastViewed": "2025-11-18T14:30:00Z"
        },
        "category": {
          "_id": "...",
          "name": "Electronics"
        },
        "shop": {
          "_id": "...",
          "name": "Tech Hub"
        },
        "campus": {
          "_id": "...",
          "name": "UNILAG",
          "shortCode": "UNILAG"
        },
        "images": [
          "https://cloudinary.com/.../phone.jpg"
        ],
        "tags": ["smartphone", "apple", "premium"],
        "createdAt": "2025-11-15T10:20:30Z",
        "updatedAt": "2025-11-18T08:45:00Z"
      }
    ]
  }
}
```

---

## Testing Checklist

- [ ] Basic search with text works
- [ ] Price range filtering works
- [ ] Single sort (price, rating, views) works
- [ ] Multiple filters combined work
- [ ] Pagination returns correct page count
- [ ] `hasNextPage` and `hasPrevPage` are accurate
- [ ] Empty results return proper structure
- [ ] Invalid parameters handled gracefully
- [ ] Search + filters combination works
- [ ] Tags filtering works
- [ ] In-stock filter works
- [ ] Condition filter works
- [ ] Campus filtering works
- [ ] Rating presets work (topRated, highRated, unrated)
- [ ] Popularity presets work (trending, mostViewed, mostFavorited)

---

## Common Query Patterns

### Budget Shopper
```
minPrice=1000&maxPrice=10000&inStock=true&sortBy=price&order=asc
```

### Quality Seeker
```
rating=topRated&sortBy=rating&order=desc&minRating=4.5
```

### Trend Follower
```
popularity=trending&sortBy=trending
```

### Campus Explorer
```
campus={{campusId}}&inStock=true&sortBy=newest
```

### Deal Hunter
```
condition=fair,good&sortBy=price&order=asc&inStock=true
```

---

## Postman Collection JSON (Optional)

Create a new collection with these requests as individual items and use the above query patterns.

## Notes

- Limit maximum is 100 (will be capped automatically)
- Default sort is by `createdAt` descending
- Status defaults to `active` unless overridden
- All query parameters are optional
- Combine multiple filters for better results
