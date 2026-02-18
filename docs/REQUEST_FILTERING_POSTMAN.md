# Request Advanced Filtering - Postman Testing Guide

This guide provides a comprehensive collection of Postman requests for testing the Request Advanced Filtering API.

## Base URL
```
http://localhost:3000/api/v1
```

## Authentication
All requests require the `Authorization` header:
```
Authorization: Bearer <your_jwt_token>
```

---

## Postman Collection Examples

### Test 1: Basic Request Listing
**Name**: Get All Requests - Advanced

**Method**: GET

**URL**: 
```
{{BASE_URL}}/requests/search/advanced?page=1&limit=20
```

**Headers**:
```
Authorization: Bearer {{ACCESS_TOKEN}}
```

**Expected Response**: 200 OK with paginated list of requests

---

### Test 2: Search by Text
**Name**: Search Requests by Text

**Method**: GET

**URL**:
```
{{BASE_URL}}/requests/search/advanced?search=programming&sortBy=newest&limit=10
```

**Description**: Search for requests containing "programming"

**Expected Response**: Matching requests sorted by newest first

---

### Test 3: Filter by Status
**Name**: Filter Open Requests Only

**Method**: GET

**URL**:
```
{{BASE_URL}}/requests/search/advanced?status=open&sortBy=newest
```

**Description**: Get only open requests

**Expected Response**: List of open requests

---

### Test 4: Filter by Priority
**Name**: Filter Urgent Requests

**Method**: GET

**URL**:
```
{{BASE_URL}}/requests/search/advanced?status=open&priority=urgent&sortBy=priority
```

**Description**: Get urgent priority requests

**Expected Response**: Urgent requests sorted by priority

---

### Test 5: Filter by Price Range
**Name**: Filter by Desired Price Range

**Method**: GET

**URL**:
```
{{BASE_URL}}/requests/search/advanced?minPrice=1000&maxPrice=5000&sortBy=priceAsc
```

**Description**: Get requests with desired price between 1000-5000

**Expected Response**: Requests in price range, sorted ascending

---

### Test 6: Filter by Category
**Name**: Filter by Category

**Method**: GET

**URL**:
```
{{BASE_URL}}/requests/search/advanced?category=507f1f77bcf86cd799439012&sortBy=newest
```

**Note**: Replace category ID with actual category from your database

**Description**: Get requests from specific category

**Expected Response**: Requests in specified category

---

### Test 7: Filter by Campus
**Name**: Filter by Campus

**Method**: GET

**URL**:
```
{{BASE_URL}}/requests/search/advanced?campus=507f1f77bcf86cd799439014&sortBy=newest
```

**Note**: Replace campus ID with actual campus from your database

**Description**: Get requests from specific campus

**Expected Response**: Requests from specified campus

---

### Test 8: Filter by Views
**Name**: Filter by Views Range

**Method**: GET

**URL**:
```
{{BASE_URL}}/requests/search/advanced?minViews=10&maxViews=50&sortBy=views
```

**Description**: Get requests with 10-50 views

**Expected Response**: Popular requests within view range

---

### Test 9: Filter by Offers Count
**Name**: Filter by Offers Received

**Method**: GET

**URL**:
```
{{BASE_URL}}/requests/search/advanced?minOffers=3&maxOffers=10&sortBy=offers
```

**Description**: Get requests with 3-10 offers received

**Expected Response**: Requests with offers in specified range

---

### Test 10: Filter by Response Time
**Name**: Filter by Response Time

**Method**: GET

**URL**:
```
{{BASE_URL}}/requests/search/advanced?maxResponseTime=2&sortBy=responseTime
```

**Description**: Get requests with fast response times (< 2 hours)

**Expected Response**: Quickly responded requests

---

### Test 11: Filter by Tags
**Name**: Filter by Tags

**Method**: GET

**URL**:
```
{{BASE_URL}}/requests/search/advanced?tags=experienced&sortBy=newest
```

**Description**: Get requests tagged with "experienced"

**Expected Response**: Requests matching tag

---

### Test 12: Filter with Images
**Name**: Filter Requests with Images

**Method**: GET

**URL**:
```
{{BASE_URL}}/requests/search/advanced?hasImages=true&sortBy=newest&limit=20
```

**Description**: Get only requests that have images attached

**Expected Response**: Requests with images

---

### Test 13: Filter without Images
**Name**: Filter Requests without Images

**Method**: GET

**URL**:
```
{{BASE_URL}}/requests/search/advanced?hasImages=false&sortBy=newest
```

**Description**: Get requests without images

**Expected Response**: Image-less requests

---

### Test 14: Filter Expiring Soon
**Name**: Find Requests Expiring in 24 Hours

**Method**: GET

**URL**:
```
{{BASE_URL}}/requests/search/advanced?expiringIn=24&sortBy=expiringsoon
```

**Description**: Get requests expiring within 24 hours

**Expected Response**: Soon-to-expire requests sorted by expiration

---

### Test 15: Filter by Popularity
**Name**: Filter High Popularity Requests

**Method**: GET

**URL**:
```
{{BASE_URL}}/requests/search/advanced?popularity=high&sortBy=trending
```

**Description**: Get high popularity requests (50+ views, 5+ offers)

**Expected Response**: Popular trending requests

---

### Test 16: Filter Fulfilled Requests
**Name**: Get Fulfilled Requests

**Method**: GET

**URL**:
```
{{BASE_URL}}/requests/search/advanced?status=fulfilled&sortBy=oldest
```

**Description**: Get completed/fulfilled requests

**Expected Response**: Fulfilled requests

---

### Test 17: Sort by Newest
**Name**: Sort by Creation Date (Newest First)

**Method**: GET

**URL**:
```
{{BASE_URL}}/requests/search/advanced?sortBy=newest&page=1&limit=20
```

**Expected Response**: Requests sorted by newest first

---

### Test 18: Sort by Trending
**Name**: Sort by Trending (Views + Recent)

**Method**: GET

**URL**:
```
{{BASE_URL}}/requests/search/advanced?sortBy=trending&limit=15
```

**Expected Response**: Trending requests based on views and recency

---

### Test 19: Sort by Price Descending
**Name**: Sort by Price (Highest First)

**Method**: GET

**URL**:
```
{{BASE_URL}}/requests/search/advanced?sortBy=priceDesc&limit=20
```

**Expected Response**: Requests sorted by highest desired price

---

### Test 20: Sort by Most Offers
**Name**: Sort by Most Offers Received

**Method**: GET

**URL**:
```
{{BASE_URL}}/requests/search/advanced?sortBy=mostOffers&limit=15
```

**Expected Response**: Requests with most offers first

---

### Test 21: Sort by Fulfillment Rate
**Name**: Sort by Fulfillment Rate

**Method**: GET

**URL**:
```
{{BASE_URL}}/requests/search/advanced?sortBy=fulfillmentRate&limit=20
```

**Expected Response**: Requests sorted by fulfillment rate (highest first)

---

### Test 22: Pagination - First Page
**Name**: Get First Page

**Method**: GET

**URL**:
```
{{BASE_URL}}/requests/search/advanced?page=1&limit=20
```

**Expected Response**: First 20 results with pagination metadata

---

### Test 23: Pagination - Next Page
**Name**: Get Second Page

**Method**: GET

**URL**:
```
{{BASE_URL}}/requests/search/advanced?page=2&limit=20
```

**Expected Response**: Results 21-40

---

### Test 24: Pagination - Custom Limit
**Name**: Get Results with Custom Limit

**Method**: GET

**URL**:
```
{{BASE_URL}}/requests/search/advanced?page=1&limit=50
```

**Expected Response**: First 50 results

---

### Test 25: Complex Multi-Filter Query
**Name**: Advanced Multi-Filter Search

**Method**: GET

**URL**:
```
{{BASE_URL}}/requests/search/advanced?
search=tutoring&
status=open&
priority=high&
minPrice=1000&
maxPrice=5000&
campus=507f1f77bcf86cd799439014&
minViews=5&
hasImages=true&
sortBy=priority&
page=1&
limit=25
```

**Description**: Complex query combining multiple filters:
- Text search for "tutoring"
- Open status
- High priority
- Price range 1000-5000
- Specific campus
- At least 5 views
- Must have images
- Sorted by priority
- 25 results per page

**Expected Response**: Refined list matching all criteria

---

### Test 26: Filter by Requester
**Name**: Get Requests by Specific User

**Method**: GET

**URL**:
```
{{BASE_URL}}/requests/search/advanced?requester=507f1f77bcf86cd799439013&sortBy=newest
```

**Note**: Replace requester ID with actual user ID

**Description**: Get all requests created by specific user

**Expected Response**: User's requests

---

### Test 27: Medium Popularity
**Name**: Filter Medium Popularity Requests

**Method**: GET

**URL**:
```
{{BASE_URL}}/requests/search/advanced?popularity=medium&sortBy=views
```

**Description**: Get medium popularity requests (20-50 views, 2-5 offers)

**Expected Response**: Moderately popular requests

---

### Test 28: No Offers Yet
**Name**: Find Requests with No Offers

**Method**: GET

**URL**:
```
{{BASE_URL}}/requests/search/advanced?maxOffers=0&sortBy=newest
```

**Description**: Get requests that haven't received any offers yet

**Expected Response**: Requests without offers

---

### Test 29: High View Count
**Name**: Find Highly Viewed Requests

**Method**: GET

**URL**:
```
{{BASE_URL}}/requests/search/advanced?minViews=100&sortBy=views
```

**Description**: Get requests with 100+ views

**Expected Response**: Highly viewed/popular requests

---

### Test 30: Multiple Statuses
**Name**: Filter Multiple Statuses

**Method**: GET

**URL**:
```
{{BASE_URL}}/requests/search/advanced?status=open,fulfilled&sortBy=newest
```

**Description**: Get both open and fulfilled requests

**Expected Response**: Requests with either status

---

## Response Format Example

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
      }
    ]
  }
}
```

## Postman Environment Variables

Create these variables in your Postman environment:

```
BASE_URL = http://localhost:3000/api/v1
ACCESS_TOKEN = <your_jwt_token>
```

## Test Scenarios

### Scenario 1: Finding Best Offers
1. Test 3: Filter open requests
2. Test 8: Filter by views (10-50)
3. Test 25: Complex multi-filter

### Scenario 2: Browsing by Priority
1. Test 4: Filter urgent requests
2. Test 21: Sort by fulfillment rate
3. Test 9: Filter requests with offers

### Scenario 3: Price Hunting
1. Test 5: Filter by price range
2. Test 19: Sort by price descending
3. Test 23: Pagination through results

### Scenario 4: Quick Responses
1. Test 10: Filter by response time
2. Test 14: Filter expiring soon
3. Test 22: Get first page

## Common Errors and Solutions

### Error: "Invalid query parameters"
- **Solution**: Check parameter names and values for typos
- **Example**: Use `status=open` not `status='open'`

### Error: "Unauthorized"
- **Solution**: Ensure valid JWT token in Authorization header
- **Check**: `Authorization: Bearer <token>` format

### Error: "Empty results"
- **Solution**: Check if filters are too restrictive
- **Try**: Remove some filters or adjust ranges

### Error: "Invalid ObjectId"
- **Solution**: Ensure category, campus, and requester IDs are valid MongoDB ObjectIds
- **Format**: Should be 24-character hex string (e.g., `507f1f77bcf86cd799439012`)

## Performance Testing

### Load Test 1: Single Request
```
{{BASE_URL}}/requests/search/advanced?page=1&limit=20
```
Expected: < 100ms

### Load Test 2: Complex Filter
```
{{BASE_URL}}/requests/search/advanced?search=test&status=open&minPrice=100&maxPrice=5000&minViews=5&sortBy=trending&page=1&limit=50
```
Expected: < 500ms

### Load Test 3: Pagination
```
{{BASE_URL}}/requests/search/advanced?page=10&limit=20
```
Expected: < 200ms

## Tips for Testing

1. **Always check pagination metadata** to verify result count and navigation options
2. **Combine filters** to test realistic user scenarios
3. **Test boundary values** (e.g., price=0, views=0)
4. **Verify virtual fields** are calculated correctly (isActive, isExpired, timeRemaining)
5. **Check timestamps** for consistency and timezone handling
6. **Test with different limit values** to ensure pagination works correctly
7. **Verify populated fields** (category, requester, campus) return expected data

