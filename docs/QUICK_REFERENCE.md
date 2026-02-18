# Quick Reference: Advanced Filtering & Sorting

## 🚀 Endpoints

### Products
```
GET /api/v1/products/search/advanced
```

### Services
```
GET /api/v1/services/search/advanced
```

---

## 📋 Common Queries

### Products

**Budget items (under ₦50k, in stock)**
```
GET /api/v1/products/search/advanced?maxPrice=50000&inStock=true&sortBy=price
```

**Top-rated electronics**
```
GET /api/v1/products/search/advanced?category=electronics&rating=topRated&sortBy=rating
```

**Trending now**
```
GET /api/v1/products/search/advanced?popularity=trending&limit=10
```

**Most viewed this week**
```
GET /api/v1/products/search/advanced?sortBy=views&order=desc&limit=20
```

---

### Services

**Budget tutoring services**
```
GET /api/v1/services/search/advanced?category=tutoring&maxPrice=50000&sortBy=price
```

**Quick 1-hour sessions available**
```
GET /api/v1/services/search/advanced?maxDuration=60&available=true&sortBy=price
```

**Highly-rated services with instant booking**
```
GET /api/v1/services/search/advanced?rating=topRated&allowInstantBooking=true
```

**Most booked this month**
```
GET /api/v1/services/search/advanced?sortBy=bookings&order=desc&limit=10
```

---

## 🔍 Core Filters

| Filter | Products | Services | Example |
|--------|----------|----------|---------|
| **search** | ✅ | ✅ | `search=laptop` |
| **minPrice** | ✅ | ✅ | `minPrice=10000` |
| **maxPrice** | ✅ | ✅ | `maxPrice=100000` |
| **category** | ✅ | ✅ | `category=electronics` |
| **campus** | ✅ | ✅ | `campus={{campusId}}` |
| **minRating** | ✅ | ✅ | `minRating=4` |
| **rating** | ✅ | ✅ | `rating=topRated` |
| **hasImages** | ✅ | ✅ | `hasImages=true` |
| **inStock** | ✅ | ❌ | `inStock=true` |
| **available** | ✅ | ✅ | `available=true` |
| **condition** | ✅ | ❌ | `condition=like-new` |
| **minDuration** | ❌ | ✅ | `minDuration=30` |
| **maxDuration** | ❌ | ✅ | `maxDuration=120` |
| **provider** | ❌ | ✅ | `provider={{providerId}}` |
| **allowInstantBooking** | ❌ | ✅ | `allowInstantBooking=true` |
| **cancellationPolicy** | ❌ | ✅ | `cancellationPolicy=flexible` |
| **tags** | ✅ | ✅ | `tags=online,english` |

---

## 🔀 Sort Options

### Products
```
sortBy=price              // Low to high
sortBy=price&order=desc   // High to low
sortBy=rating             // Highest rated
sortBy=views              // Most viewed
sortBy=newest             // Recently added
sortBy=popularity         // Popular items
sortBy=trending           // Trending now
```

### Services
```
sortBy=price              // Cheapest first
sortBy=rating             // Best rated
sortBy=bookings           // Most booked
sortBy=revenue            // Most successful
sortBy=duration           // Shortest duration
sortBy=available          // Most slots available
sortBy=newest             // Recently added
sortBy=trending           // Trending services
```

---

## 📄 Pagination

```
page=1                    // First page
limit=20                  // 20 results per page
limit=100                 // Max 100 results per page
```

Response includes:
- `results`: Items in current page
- `pagination.total`: Total matching items
- `pagination.page`: Current page
- `pagination.pages`: Total pages
- `pagination.hasNextPage`: Has next page?
- `pagination.hasPrevPage`: Has previous page?

---

## 📊 Response Format

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
    "products": [ ... ]  // OR "services": [ ... ]
  }
}
```

---

## 🎯 Preset Filters

### Rating Presets
- `rating=topRated` → ≥4.5 stars with 5+ reviews
- `rating=highRated` → ≥4.0 stars
- `rating=unrated` → No reviews yet

### Popularity Presets (Products)
- `popularity=trending` → High views + favorites
- `popularity=mostViewed` → Views ≥ 100
- `popularity=mostFavorited` → Favorites ≥ 10

### Popularity Presets (Services)
- `popularity=trending` → High views + bookings
- `popularity=mostViewed` → Views ≥ 100
- `popularity=mostBooked` → Bookings ≥ 10

---

## 💡 Best Practices

### Filter Combinations
```
// Budget & Quality
?maxPrice=50000&minRating=4&inStock=true

// Trending & Highly Rated
?popularity=trending&rating=topRated

// Specific Category & Available
?category=education&available=true&hasImages=true

// Time-Efficient Services
?maxDuration=60&allowInstantBooking=true&available=true
```

### Pagination
```
// Get first 20 results
?limit=20&page=1

// Get next 20 results
?limit=20&page=2

// Get specific page
?limit=10&page=5
```

### Sorting
```
// Cheapest first
?sortBy=price&order=asc

// Most popular
?sortBy=popularity&order=desc

// Newest additions
?sortBy=newest

// Best rated
?sortBy=rating&order=desc
```

---

## 🧪 Quick Test URLs

### Products
```
http://localhost:3000/api/v1/products/search/advanced?search=laptop&limit=10

http://localhost:3000/api/v1/products/search/advanced?minPrice=10000&maxPrice=100000&sortBy=price

http://localhost:3000/api/v1/products/search/advanced?rating=topRated&sortBy=rating&limit=5

http://localhost:3000/api/v1/products/search/advanced?popularity=trending&limit=10&page=1
```

### Services
```
http://localhost:3000/api/v1/services/search/advanced?search=tutoring&limit=10

http://localhost:3000/api/v1/services/search/advanced?minPrice=5000&maxPrice=50000&sortBy=price

http://localhost:3000/api/v1/services/search/advanced?rating=topRated&available=true&limit=10

http://localhost:3000/api/v1/services/search/advanced?maxDuration=60&allowInstantBooking=true&limit=20
```

---

## 📚 Documentation

- **ADVANCED_FILTERING_SUMMARY.md** - Complete overview
- **PRODUCT_ADVANCED_FILTERING.md** - Product API details
- **PRODUCT_FILTERING_POSTMAN.md** - Product test requests
- **SERVICE_ADVANCED_FILTERING.md** - Service API details
- **SERVICE_FILTERING_POSTMAN.md** - Service test requests

---

## ✅ Key Points

- All filters are **optional** (can combine any)
- Default sort is **newest first** (createdAt desc)
- Max limit is **100 results** per page
- Status defaults to **active**
- All searches are **case-insensitive**
- Empty results still return proper structure
- Pagination always included in response

---

## 🚨 Common Issues

### No Results
- Check filters aren't conflicting
- Verify status=active (default)
- Try reducing filters

### Slow Queries
- Reduce limit (max 100)
- Remove unnecessary filters
- Avoid too many tags

### Invalid Parameters
- Use valid ObjectIds (24-char hex)
- Use string values for booleans: `"true"` or `"false"`
- Check spelling of parameter names

---

## 📞 Support

For detailed documentation, see:
- Individual API reference files
- Postman test examples
- Implementation guides in `/docs`

Ready to integrate with your frontend!
