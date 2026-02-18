# Service Advanced Filtering - Postman Testing Guide

## Base Setup

### Environment Variables
- `baseUrl` = `http://localhost:3000`
- `authToken` = (your JWT token)

---

## Postman Requests

### 1️⃣ **Basic Search**
```
GET {{baseUrl}}/api/v1/services/search/advanced?search=tutoring&limit=10

Expected: 200 with services containing "tutoring" in title/description
```

---

### 2️⃣ **Price Range Filter**
```
GET {{baseUrl}}/api/v1/services/search/advanced?minPrice=5000&maxPrice=50000&sortBy=price&order=asc&limit=20

Expected: Services priced between ₦5,000 - ₦50,000, sorted by price (cheapest first)
```

---

### 3️⃣ **Top Rated Services**
```
GET {{baseUrl}}/api/v1/services/search/advanced?rating=topRated&sortBy=rating&order=desc&limit=10

Expected: Services with rating >= 4.5 and at least 5 reviews, sorted by rating
```

---

### 4️⃣ **Trending Services**
```
GET {{baseUrl}}/api/v1/services/search/advanced?popularity=trending&sortBy=trending&limit=15

Expected: Recently created services with high engagement (views + bookings)
```

---

### 5️⃣ **Category + Duration Filter**
```
GET {{baseUrl}}/api/v1/services/search/advanced?category=education&minDuration=30&maxDuration=120&available=true&limit=20

Expected: Education services (30-120 min duration) with available slots
```

---

### 6️⃣ **By Campus + Availability**
```
GET {{baseUrl}}/api/v1/services/search/advanced?campus={{campusId}}&available=true&hasImages=true&limit=20

Expected: Available services with images in specific campus
```

---

### 7️⃣ **Tags Filter**
```
GET {{baseUrl}}/api/v1/services/search/advanced?tags=online,english&sortBy=price&order=asc&limit=20

Expected: Services tagged with online or english, sorted by price ascending
```

---

### 8️⃣ **Bookings + Revenue Combo**
```
GET {{baseUrl}}/api/v1/services/search/advanced?minViews=50&sortBy=analytics.totalRevenue&order=desc&limit=10

Expected: Services with at least 50 views, sorted by revenue
```

---

### 9️⃣ **Complex Multi-Filter**
```
GET {{baseUrl}}/api/v1/services/search/advanced?
  search=coding&
  category=technology&
  minPrice=10000&
  maxPrice=100000&
  minRating=3.5&
  available=true&
  hasImages=true&
  allowInstantBooking=true&
  sortBy=rating&
  order=desc&
  page=1&
  limit=15

Expected: Complex filtered results with pagination info
```

---

### 🔟 **Most Booked Services**
```
GET {{baseUrl}}/api/v1/services/search/advanced?sortBy=bookings&order=desc&limit=20

Expected: Top 20 services by total bookings
```

---

### 1️⃣1️⃣ **Newest Services**
```
GET {{baseUrl}}/api/v1/services/search/advanced?sortBy=newest&limit=20&page=1

Expected: Latest 20 services created, with pagination
```

---

### 1️⃣2️⃣ **Unrated Services**
```
GET {{baseUrl}}/api/v1/services/search/advanced?rating=unrated&sortBy=newest&limit=10

Expected: Services with no ratings, sorted by newest
```

---

### 1️⃣3️⃣ **Budget Services**
```
GET {{baseUrl}}/api/v1/services/search/advanced?maxPrice=10000&available=true&sortBy=price&order=asc&limit=20

Expected: Cheapest available services under ₦10,000
```

---

### 1️⃣4️⃣ **Premium Selection**
```
GET {{baseUrl}}/api/v1/services/search/advanced?minPrice=50000&rating=topRated&sortBy=rating&order=desc&limit=10

Expected: High-end, highly-rated services
```

---

### 1️⃣5️⃣ **Flexible Cancellation**
```
GET {{baseUrl}}/api/v1/services/search/advanced?cancellationPolicy=flexible&allowInstantBooking=true&sortBy=newest&limit=20

Expected: Services with flexible cancellation and instant booking enabled
```

---

### 1️⃣6️⃣ **Provider Services**
```
GET {{baseUrl}}/api/v1/services/search/advanced?provider={{providerId}}&sortBy=newest&limit=20

Expected: All services from specific provider
```

---

### 1️⃣7️⃣ **Short Duration Services**
```
GET {{baseUrl}}/api/v1/services/search/advanced?maxDuration=60&available=true&sortBy=price&limit=15

Expected: Services under 1 hour with available slots
```

---

### 1️⃣8️⃣ **Pagination Test** (Page 2)
```
GET {{baseUrl}}/api/v1/services/search/advanced?limit=10&page=2&sortBy=newest

Expected: Results 11-20, with pagination metadata showing:
  - page: 2
  - hasNextPage: true/false
  - hasPrevPage: true
  - pages: total pages
```

---

### 1️⃣9️⃣ **High Revenue Services**
```
GET {{baseUrl}}/api/v1/services/search/advanced?sortBy=revenue&order=desc&limit=15

Expected: Top services by total revenue
```

---

### 2️⃣0️⃣ **Most Viewed**
```
GET {{baseUrl}}/api/v1/services/search/advanced?sortBy=views&order=desc&limit=20

Expected: Top 20 most-viewed active services
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
    "services": [
      {
        "_id": "...",
        "title": "Advanced English Tutoring",
        "description": "Professional English tutoring...",
        "price": 25000,
        "category": "education",
        "status": "active",
        "duration": 60,
        "currentBookings": 3,
        "maxBookings": 10,
        "ratingsAverage": 4.8,
        "ratingsQuantity": 24,
        "analytics": {
          "views": 156,
          "totalBookings": 24,
          "totalRevenue": 600000,
          "lastViewed": "2025-11-18T14:30:00Z"
        },
        "provider": {
          "_id": "...",
          "fullName": "Jane Doe",
          "email": "jane@example.com"
        },
        "campus": {
          "_id": "...",
          "name": "UNILAG"
        },
        "images": [
          "https://cloudinary.com/.../tutoring.jpg"
        ],
        "tags": ["english", "online", "professional"],
        "settings": {
          "allowInstantBooking": true,
          "cancellationPolicy": "moderate"
        },
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
- [ ] Single sort (price, rating, bookings) works
- [ ] Multiple filters combined work
- [ ] Pagination returns correct page count
- [ ] `hasNextPage` and `hasPrevPage` are accurate
- [ ] Empty results return proper structure
- [ ] Invalid parameters handled gracefully
- [ ] Search + filters combination works
- [ ] Tags filtering works
- [ ] Available filter works
- [ ] Duration filter works
- [ ] Campus filtering works
- [ ] Rating presets work (topRated, highRated, unrated)
- [ ] Popularity presets work (trending, mostViewed, mostBooked)
- [ ] Cancellation policy filtering works
- [ ] Allow instant booking filtering works

---

## Common Query Patterns

### Budget Shopper
```
maxPrice=10000&available=true&sortBy=price&order=asc
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
campus={{campusId}}&available=true&sortBy=newest
```

### Best Value
```
sortBy=popularity&minRating=4.0&available=true
```

---

## Notes

- Limit maximum is 100 (will be capped automatically)
- Default sort is by `createdAt` descending
- Status defaults to `active` unless overridden
- All query parameters are optional
- Combine multiple filters for better results
- Duration is in minutes
