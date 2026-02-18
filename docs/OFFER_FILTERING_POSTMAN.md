# Offer Advanced Filtering - Postman Testing Guide

This guide provides a comprehensive collection of Postman requests for testing the Offer Advanced Filtering API.

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

### Test 1: Basic Offer Listing
**Name**: Get All Offers - Advanced

**Method**: GET

**URL**: 
```
{{BASE_URL}}/offers/search/advanced?page=1&limit=20
```

**Headers**:
```
Authorization: Bearer {{ACCESS_TOKEN}}
```

**Expected Response**: 200 OK with paginated list of offers

---

### Test 2: Filter by Status - Pending
**Name**: Filter Pending Offers

**Method**: GET

**URL**:
```
{{BASE_URL}}/offers/search/advanced?status=pending&sortBy=newest
```

**Description**: Get only pending offers

**Expected Response**: List of pending offers sorted by newest

---

### Test 3: Filter by Status - Accepted
**Name**: Filter Accepted Offers

**Method**: GET

**URL**:
```
{{BASE_URL}}/offers/search/advanced?status=accepted&sortBy=oldest
```

**Description**: Get accepted offers

**Expected Response**: Accepted offers

---

### Test 4: Filter by Amount Range
**Name**: Filter by Amount Range

**Method**: GET

**URL**:
```
{{BASE_URL}}/offers/search/advanced?minAmount=1000&maxAmount=5000&sortBy=amountAsc
```

**Description**: Get offers with amount between 1000-5000

**Expected Response**: Offers in specified amount range, sorted ascending

---

### Test 5: Filter by Seller
**Name**: Filter Offers by Specific Seller

**Method**: GET

**URL**:
```
{{BASE_URL}}/offers/search/advanced?seller=507f1f77bcf86cd799439016&sortBy=newest
```

**Note**: Replace seller ID with actual seller user ID

**Description**: Get all offers from specific seller

**Expected Response**: Seller's offers

---

### Test 6: Filter by Request
**Name**: Filter Offers for Specific Request

**Method**: GET

**URL**:
```
{{BASE_URL}}/offers/search/advanced?request=507f1f77bcf86cd799439011&sortBy=amountAsc
```

**Note**: Replace request ID with actual request ID

**Description**: Get all offers for a specific request

**Expected Response**: Offers for that request, sorted by amount

---

### Test 7: Filter by Views
**Name**: Filter by Views Range

**Method**: GET

**URL**:
```
{{BASE_URL}}/offers/search/advanced?minViews=5&maxViews=50&sortBy=views
```

**Description**: Get offers with 5-50 views

**Expected Response**: Offers within view range

---

### Test 8: Filter by Response Time
**Name**: Filter Fast Response Offers

**Method**: GET

**URL**:
```
{{BASE_URL}}/offers/search/advanced?maxResponseTime=2&sortBy=responseTime
```

**Description**: Get offers with response time < 2 hours

**Expected Response**: Quickly responded offers

---

### Test 9: Filter by High Acceptance Rate
**Name**: Filter High Acceptance Rate Sellers

**Method**: GET

**URL**:
```
{{BASE_URL}}/offers/search/advanced?acceptanceRate=high&sortBy=responseTime
```

**Description**: Get offers from sellers with 70%+ acceptance rate

**Expected Response**: Offers from reliable sellers

---

### Test 10: Filter by Medium Acceptance Rate
**Name**: Filter Medium Acceptance Rate

**Method**: GET

**URL**:
```
{{BASE_URL}}/offers/search/advanced?acceptanceRate=medium&sortBy=amountAsc
```

**Description**: Get offers from sellers with 40-69% acceptance rate

**Expected Response**: Medium-rated sellers' offers

---

### Test 11: Filter by Low Acceptance Rate
**Name**: Filter Low Acceptance Rate

**Method**: GET

**URL**:
```
{{BASE_URL}}/offers/search/advanced?acceptanceRate=low&sortBy=newest
```

**Description**: Get offers from sellers with < 40% acceptance rate

**Expected Response**: Low-rated sellers' offers

---

### Test 12: Filter Expiring Soon
**Name**: Find Offers Expiring in 12 Hours

**Method**: GET

**URL**:
```
{{BASE_URL}}/offers/search/advanced?expiringIn=12&sortBy=expiringsoon
```

**Description**: Get offers expiring within 12 hours

**Expected Response**: Soon-to-expire offers sorted by expiration

---

### Test 13: Filter with Auto-Expire Enabled
**Name**: Filter Offers with Auto-Expire

**Method**: GET

**URL**:
```
{{BASE_URL}}/offers/search/advanced?autoExpire=true&sortBy=newest
```

**Description**: Get offers with auto-expire setting enabled

**Expected Response**: Offers with auto-expire

---

### Test 14: Filter without Auto-Expire
**Name**: Filter Offers without Auto-Expire

**Method**: GET

**URL**:
```
{{BASE_URL}}/offers/search/advanced?autoExpire=false&sortBy=newest
```

**Description**: Get offers without auto-expire

**Expected Response**: Manual expiration offers

---

### Test 15: Search in Message
**Name**: Search Offers by Message Content

**Method**: GET

**URL**:
```
{{BASE_URL}}/offers/search/advanced?search=experienced&sortBy=newest
```

**Description**: Search for "experienced" in offer messages

**Expected Response**: Offers matching search term

---

### Test 16: Sort by Newest
**Name**: Sort by Creation Date (Newest First)

**Method**: GET

**URL**:
```
{{BASE_URL}}/offers/search/advanced?sortBy=newest&page=1&limit=20
```

**Expected Response**: Offers sorted by newest first

---

### Test 17: Sort by Amount Ascending
**Name**: Sort by Amount (Lowest First)

**Method**: GET

**URL**:
```
{{BASE_URL}}/offers/search/advanced?sortBy=amountAsc&limit=20
```

**Expected Response**: Offers sorted by lowest amount first (best value)

---

### Test 18: Sort by Amount Descending
**Name**: Sort by Amount (Highest First)

**Method**: GET

**URL**:
```
{{BASE_URL}}/offers/search/advanced?sortBy=amountDesc&limit=20
```

**Expected Response**: Offers sorted by highest amount

---

### Test 19: Sort by Most Viewed
**Name**: Sort by Most Viewed Offers

**Method**: GET

**URL**:
```
{{BASE_URL}}/offers/search/advanced?sortBy=mostViewed&limit=15
```

**Expected Response**: Most viewed offers first

---

### Test 20: Sort by Trending
**Name**: Sort by Trending (Views + Recent)

**Method**: GET

**URL**:
```
{{BASE_URL}}/offers/search/advanced?sortBy=trending&limit=15
```

**Expected Response**: Trending offers based on views and recency

---

### Test 21: Sort by Response Time
**Name**: Sort by Response Time (Fastest First)

**Method**: GET

**URL**:
```
{{BASE_URL}}/offers/search/advanced?sortBy=responseTime&limit=20
```

**Expected Response**: Fastest responding sellers first

---

### Test 22: Sort by Acceptance Rate
**Name**: Sort by Acceptance Rate (Highest First)

**Method**: GET

**URL**:
```
{{BASE_URL}}/offers/search/advanced?sortBy=acceptanceRate&limit=20
```

**Expected Response**: Most reliable sellers first

---

### Test 23: Prioritize Pending Offers
**Name**: Prioritize Pending Status

**Method**: GET

**URL**:
```
{{BASE_URL}}/offers/search/advanced?sortBy=pending&limit=20
```

**Expected Response**: Pending offers first, then sorted by date

---

### Test 24: Pagination - First Page
**Name**: Get First Page

**Method**: GET

**URL**:
```
{{BASE_URL}}/offers/search/advanced?page=1&limit=20
```

**Expected Response**: First 20 results with pagination metadata

---

### Test 25: Pagination - Second Page
**Name**: Get Second Page

**Method**: GET

**URL**:
```
{{BASE_URL}}/offers/search/advanced?page=2&limit=20
```

**Expected Response**: Results 21-40

---

### Test 26: Pagination - Custom Limit
**Name**: Get Results with Custom Limit

**Method**: GET

**URL**:
```
{{BASE_URL}}/offers/search/advanced?page=1&limit=50
```

**Expected Response**: First 50 results

---

### Test 27: Compare Offers for Request
**Name**: Compare All Offers for Same Request

**Method**: GET

**URL**:
```
{{BASE_URL}}/offers/search/advanced?
request=507f1f77bcf86cd799439011&
status=pending&
sortBy=amountAsc&
limit=50
```

**Description**: Get all pending offers for a request, sorted by price for easy comparison

**Expected Response**: All offers for request, sorted by amount

---

### Test 28: Find Best Offers (Quality + Price)
**Name**: Best Offers - High Acceptance + Lower Price

**Method**: GET

**URL**:
```
{{BASE_URL}}/offers/search/advanced?
status=pending&
acceptanceRate=high&
sortBy=amountAsc&
limit=20
```

**Description**: Get pending offers from reliable sellers, sorted by price

**Expected Response**: Quality offers sorted by value

---

### Test 29: Complex Multi-Filter Query
**Name**: Advanced Multi-Filter Search

**Method**: GET

**URL**:
```
{{BASE_URL}}/offers/search/advanced?
request=507f1f77bcf86cd799439011&
status=pending&
minAmount=1500&
maxAmount=3000&
acceptanceRate=high&
autoExpire=true&
minResponseTime=0&
maxResponseTime=5&
sortBy=responseTime&
page=1&
limit=20
```

**Description**: Complex query combining multiple filters:
- For specific request
- Pending status
- Amount range 1500-3000
- High acceptance rate seller
- Auto-expire enabled
- Response time 0-5 hours
- Sorted by response time
- 20 results per page

**Expected Response**: Refined list matching all criteria

---

### Test 30: Find Least Viewed Offers
**Name**: Sort by Least Viewed

**Method**: GET

**URL**:
```
{{BASE_URL}}/offers/search/advanced?sortBy=leastViewed&limit=20
```

**Description**: Get offers with lowest view count (potentially underrated)

**Expected Response**: Least viewed offers first

---

### Test 31: Multiple Statuses
**Name**: Filter Multiple Statuses

**Method**: GET

**URL**:
```
{{BASE_URL}}/offers/search/advanced?status=pending,accepted&sortBy=newest
```

**Description**: Get both pending and accepted offers

**Expected Response**: Offers with either status

---

### Test 32: High Views Filter
**Name**: Find Popular Offers

**Method**: GET

**URL**:
```
{{BASE_URL}}/offers/search/advanced?minViews=10&sortBy=mostViewed
```

**Description**: Get offers with 10+ views (popular offers)

**Expected Response**: Popular offers

---

### Test 33: Withdrawn Offers
**Name**: Filter Withdrawn Offers

**Method**: GET

**URL**:
```
{{BASE_URL}}/offers/search/advanced?status=withdrawn&sortBy=oldest
```

**Description**: Get withdrawn offers

**Expected Response**: Withdrawn offers

---

### Test 34: Rejected Offers
**Name**: Filter Rejected Offers

**Method**: GET

**URL**:
```
{{BASE_URL}}/offers/search/advanced?status=rejected&sortBy=oldest
```

**Description**: Get rejected offers (for analysis)

**Expected Response**: Rejected offers

---

### Test 35: Seller Analytics
**Name**: Get All Offers from Seller

**Method**: GET

**URL**:
```
{{BASE_URL}}/offers/search/advanced?
seller=507f1f77bcf86cd799439016&
sortBy=newest&
limit=100
```

**Description**: Get all offers from specific seller for analytics

**Expected Response**: Seller's complete offer history

---

## Response Format Example

```json
{
  "status": "success",
  "results": 20,
  "pagination": {
    "total": 85,
    "page": 1,
    "pages": 5,
    "limit": 20,
    "hasNextPage": true,
    "hasPrevPage": false
  },
  "data": {
    "offers": [
      {
        "_id": "507f1f77bcf86cd799439015",
        "request": {
          "_id": "507f1f77bcf86cd799439011",
          "title": "Need programming tutor",
          "category": "507f1f77bcf86cd799439012",
          "requester": "507f1f77bcf86cd799439013"
        },
        "seller": {
          "_id": "507f1f77bcf86cd799439016",
          "fullName": "Jane Smith",
          "email": "jane@example.com"
        },
        "product": {
          "_id": "507f1f77bcf86cd799439017",
          "name": "Python & JavaScript Tutoring"
        },
        "amount": 2000,
        "message": "I have 5 years of experience in Python and JavaScript",
        "status": "pending",
        "analytics": {
          "views": 12,
          "responseTime": 1.5,
          "acceptanceRate": 0.88
        },
        "settings": {
          "autoExpire": true,
          "notifyOnView": true,
          "allowCounterOffers": false
        },
        "expiresAt": "2024-02-15T10:00:00Z",
        "createdAt": "2024-01-16T10:00:00Z",
        "isActive": true,
        "isExpired": false
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
REQUEST_ID = <sample_request_id>
SELLER_ID = <sample_seller_id>
```

## Test Scenarios

### Scenario 1: Finding Best Value Offers
1. Test 27: Compare offers for request
2. Test 4: Filter by amount (low to high)
3. Test 28: Best offers (quality + price)

### Scenario 2: Browsing Quality Sellers
1. Test 9: High acceptance rate
2. Test 21: Fast response time
3. Test 28: Combine quality metrics

### Scenario 3: Time-Sensitive Search
1. Test 12: Expiring soon
2. Test 16: Newest first
3. Test 23: Pending priority

### Scenario 4: Popular Offers
1. Test 20: Trending offers
2. Test 19: Most viewed
3. Test 32: High views

### Scenario 5: Seller Comparison
1. Test 6: Get all offers for request
2. Test 27: Sort by amount
3. Test 28: Filter by quality

## Common Errors and Solutions

### Error: "Invalid query parameters"
- **Solution**: Check parameter names and values
- **Example**: Use `status=pending` not `status='pending'`

### Error: "Unauthorized"
- **Solution**: Ensure valid JWT token in Authorization header
- **Check**: `Authorization: Bearer <token>` format

### Error: "Empty results"
- **Solution**: Check if filters are too restrictive
- **Try**: Remove some filters or adjust ranges

### Error: "Invalid ObjectId"
- **Solution**: Ensure seller, request IDs are valid MongoDB ObjectIds
- **Format**: Should be 24-character hex string

### Error: "Invalid acceptance rate value"
- **Solution**: Use exact values: `high`, `medium`, or `low`

## Performance Testing

### Load Test 1: Simple Query
```
{{BASE_URL}}/offers/search/advanced?page=1&limit=20
```
Expected: < 100ms

### Load Test 2: Complex Filter
```
{{BASE_URL}}/offers/search/advanced?request=507f1f77bcf86cd799439011&status=pending&minAmount=100&maxAmount=5000&acceptanceRate=high&sortBy=amountAsc&page=1&limit=50
```
Expected: < 500ms

### Load Test 3: Pagination
```
{{BASE_URL}}/offers/search/advanced?page=10&limit=20
```
Expected: < 200ms

## Tips for Testing

1. **Always check pagination metadata** to verify result count and navigation
2. **Test comparisons** using Test 27 (compare offers for same request)
3. **Verify seller quality** by combining acceptance rate and response time
4. **Check virtual fields** (isActive, isExpired) are calculated correctly
5. **Verify populated fields** return expected data (request, seller, product)
6. **Test expiration logic** with expiringIn filter
7. **Test status filters** with all status values (pending, accepted, rejected, withdrawn, cancelled)
8. **Validate amounts** in different currencies if applicable
9. **Check timestamps** for consistency and timezone handling
10. **Test with different limit values** to ensure pagination works correctly

## Advanced Testing Scenarios

### Scenario: Buyer Finding Best Offer
```
GET {{BASE_URL}}/offers/search/advanced?
  request={{REQUEST_ID}}&
  status=pending&
  sortBy=amountAsc&
  limit=10
```
Then review top results and compare using Test 27

### Scenario: Quality Seller Discovery
```
GET {{BASE_URL}}/offers/search/advanced?
  acceptanceRate=high&
  maxResponseTime=3&
  minViews=5&
  sortBy=responseTime&
  limit=20
```

### Scenario: Time-Critical Purchase
```
GET {{BASE_URL}}/offers/search/advanced?
  request={{REQUEST_ID}}&
  status=pending&
  expiringIn=6&
  sortBy=expiringsoon&
  limit=10
```

### Scenario: Value Analysis
```
GET {{BASE_URL}}/offers/search/advanced?
  request={{REQUEST_ID}}&
  status=pending&
  minAmount=500&
  maxAmount=3000&
  acceptanceRate=high&
  sortBy=amountAsc
```

