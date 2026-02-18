# Request & Offer Advanced Filtering - Quick Reference

## Endpoints

### Request Advanced Search
```
GET /api/v1/requests/search/advanced
```

### Offer Advanced Search
```
GET /api/v1/offers/search/advanced
```

---

## Request Filter Parameters

| Parameter | Type | Example | Description |
|-----------|------|---------|-------------|
| `search` | string | `search=programming` | Text search in title/description |
| `status` | string | `status=open` | open, fulfilled, closed |
| `priority` | string | `priority=urgent` | low, medium, high, urgent |
| `category` | string | `category=507f...` | Category ID |
| `campus` | string | `campus=507f...` | Campus ID |
| `requester` | string | `requester=507f...` | Requester user ID |
| `minPrice` | number | `minPrice=1000` | Minimum desired price |
| `maxPrice` | number | `maxPrice=5000` | Maximum desired price |
| `minViews` | number | `minViews=10` | Minimum view count |
| `maxViews` | number | `maxViews=100` | Maximum view count |
| `minOffers` | number | `minOffers=2` | Minimum offers received |
| `maxOffers` | number | `maxOffers=10` | Maximum offers received |
| `minResponseTime` | number | `minResponseTime=0` | Min response time (hours) |
| `maxResponseTime` | number | `maxResponseTime=5` | Max response time (hours) |
| `tags` | string | `tags=experienced` | Filter by tags |
| `hasImages` | boolean | `hasImages=true` | true/false |
| `expiringIn` | number | `expiringIn=24` | Expiring in N hours |
| `popularity` | string | `popularity=high` | high, medium |
| `fulfilled` | boolean | `fulfilled=false` | Quick filter |

## Request Sort Options

| Option | Description |
|--------|-------------|
| `newest` | Creation date (newest first) |
| `oldest` | Creation date (oldest first) |
| `priceAsc` | Price ascending (lowest first) |
| `priceDesc` | Price descending (highest first) |
| `views` | Most viewed first |
| `offers` | Most offers received first |
| `priority` | By priority level |
| `responseTime` | Fastest response time first |
| `expiringsoon` | Expiring soon first |
| `fulfillmentRate` | Highest fulfillment rate first |
| `trending` | Views + recency combination |
| `mostOffers` | Most offers first |
| `leastOffers` | Least offers first |

## Request Example Queries

```
# Find urgent open requests
/requests/search/advanced?status=open&priority=urgent

# Find tutoring in price range
/requests/search/advanced?search=tutoring&minPrice=1000&maxPrice=5000

# Find trending requests
/requests/search/advanced?sortBy=trending

# Find expiring soon
/requests/search/advanced?expiringIn=24&sortBy=expiringsoon

# Complex search
/requests/search/advanced?
  search=programming&
  status=open&
  priority=high&
  campus=507f...&
  hasImages=true&
  sortBy=priority&
  page=1&limit=20
```

---

## Offer Filter Parameters

| Parameter | Type | Example | Description |
|-----------|------|---------|-------------|
| `search` | string | `search=experienced` | Text search in message |
| `request` | string | `request=507f...` | Request ID |
| `seller` | string | `seller=507f...` | Seller user ID |
| `status` | string | `status=pending` | pending, accepted, rejected, withdrawn, cancelled |
| `minAmount` | number | `minAmount=1000` | Minimum offer amount |
| `maxAmount` | number | `maxAmount=3000` | Maximum offer amount |
| `minViews` | number | `minViews=5` | Minimum view count |
| `maxViews` | number | `maxViews=50` | Maximum view count |
| `minResponseTime` | number | `minResponseTime=0` | Min response time (hours) |
| `maxResponseTime` | number | `maxResponseTime=2` | Max response time (hours) |
| `acceptanceRate` | string | `acceptanceRate=high` | high, medium, low |
| `expiringIn` | number | `expiringIn=12` | Expiring in N hours |
| `autoExpire` | boolean | `autoExpire=true` | true/false |

## Offer Sort Options

| Option | Description |
|--------|-------------|
| `newest` | Creation date (newest first) |
| `oldest` | Creation date (oldest first) |
| `amountAsc` | Amount ascending (lowest first) |
| `amountDesc` | Amount descending (highest first) |
| `views` | Most viewed first |
| `responseTime` | Fastest response time first |
| `acceptanceRate` | Highest acceptance rate first |
| `expiringsoon` | Expiring soon first |
| `pending` | Pending status first |
| `trending` | Views + recency combination |
| `mostViewed` | Most viewed first |
| `leastViewed` | Least viewed first |

## Offer Example Queries

```
# Find all pending offers
/offers/search/advanced?status=pending

# Compare offers for a request
/offers/search/advanced?request=507f...&sortBy=amountAsc

# Find offers from quality sellers
/offers/search/advanced?acceptanceRate=high&sortBy=responseTime

# Find expiring offers
/offers/search/advanced?expiringIn=12&sortBy=expiringsoon

# Complex search
/offers/search/advanced?
  request=507f...&
  status=pending&
  minAmount=1500&
  maxAmount=3000&
  acceptanceRate=high&
  sortBy=amountAsc&
  page=1&limit=20
```

---

## Common Pagination

| Parameter | Default | Max | Usage |
|-----------|---------|-----|-------|
| `page` | 1 | N/A | `?page=2` |
| `limit` | 20 | 100 | `?limit=50` |

```
# Get first page
?page=1&limit=20

# Get second page
?page=2&limit=20

# Get with custom limit
?page=1&limit=50
```

---

## Response Format

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
    "requests": [ /* or "offers" */ ]
  }
}
```

---

## Common Query Combinations

### For Requesters - Finding Best Offers
```
# High quality sellers with quick response
GET /offers/search/advanced?
  request={YOUR_REQUEST_ID}&
  status=pending&
  acceptanceRate=high&
  maxResponseTime=5&
  sortBy=responseTime
```

### For Sellers - Browsing Requests
```
# Trending high-value requests
GET /requests/search/advanced?
  status=open&
  sortBy=trending&
  popularity=high&
  minPrice=1000
```

### For Discovery - Browse by Category
```
# Latest requests in category
GET /requests/search/advanced?
  category={CATEGORY_ID}&
  status=open&
  sortBy=newest&
  limit=50
```

### For Comparison - Side-by-Side Analysis
```
# All offers for request, cheapest first
GET /offers/search/advanced?
  request={REQUEST_ID}&
  status=pending&
  sortBy=amountAsc&
  limit=100
```

---

## Status Values

### Request Status
- `open` - Accepting offers
- `fulfilled` - Request completed
- `closed` - Request closed

### Offer Status
- `pending` - Awaiting buyer response
- `accepted` - Buyer accepted
- `rejected` - Buyer rejected
- `withdrawn` - Seller withdrew
- `cancelled` - Auto-expired or admin cancelled

---

## Priority Levels (Request)

- `low` - Flexible timeline
- `medium` - Normal priority
- `high` - Important
- `urgent` - Time-sensitive

---

## Acceptance Rate Categories

- `high` - ≥ 70% acceptance rate (0.7)
- `medium` - 40-69% acceptance rate (0.4-0.69)
- `low` - < 40% acceptance rate

---

## Virtual Fields in Responses

### Requests
- `isActive` - Open and not expired
- `isExpired` - Past expiration date
- `timeRemaining` - Hours until expiration

### Offers
- `isActive` - Pending and not expired
- `isExpired` - Past expiration date

---

## Full Example Requests

### Scenario 1: Buyer Finding Best Offer
```
GET /offers/search/advanced?
  request=507f1f77bcf86cd799439011&
  status=pending&
  acceptanceRate=high&
  maxResponseTime=3&
  sortBy=amountAsc&
  limit=10
```

### Scenario 2: Seller Browsing Opportunities
```
GET /requests/search/advanced?
  status=open&
  minPrice=500&
  category=507f1f77bcf86cd799439012&
  sortBy=trending&
  popularity=high&
  page=1&limit=20
```

### Scenario 3: Finding Urgent Time-Sensitive Work
```
GET /requests/search/advanced?
  priority=urgent&
  status=open&
  expiringIn=24&
  sortBy=expiringsoon&
  limit=15
```

### Scenario 4: Popular Items Discovery
```
GET /requests/search/advanced?
  popularity=high&
  sortBy=views&
  minOffers=5&
  page=1&limit=30
```

---

## Error Responses

```json
// Invalid parameters
{
  "status": "error",
  "message": "Invalid query parameters"
}

// Unauthorized
{
  "status": "error",
  "message": "You must be logged in to access this resource"
}

// Rate limited
{
  "status": "error",
  "message": "Too many requests, please try again later"
}
```

---

## Authentication

All requests require:
```
Authorization: Bearer <your_jwt_token>
```

---

## Performance Tips

1. Use specific filters to narrow results
2. Limit results with `limit` parameter (20-50 recommended)
3. Use pagination for large result sets
4. Combine filters for better performance
5. Avoid very deep pagination (page > 100)

---

## Documentation Files

- `REQUEST_ADVANCED_FILTERING.md` - Full API documentation
- `REQUEST_FILTERING_POSTMAN.md` - 30 Postman test examples
- `REQUEST_FILTERING_IMPLEMENTATION.md` - Technical details
- `OFFER_ADVANCED_FILTERING.md` - Full API documentation
- `OFFER_FILTERING_POSTMAN.md` - 35 Postman test examples
- `OFFER_FILTERING_IMPLEMENTATION.md` - Technical details
- `REQUEST_OFFER_FILTERING_SUMMARY.md` - Implementation summary

---

## Quick Start

1. **Test an endpoint**:
   ```
   curl -H "Authorization: Bearer YOUR_TOKEN" \
     "http://localhost:3000/api/v1/requests/search/advanced?status=open&page=1&limit=20"
   ```

2. **Import Postman collection** from provided guides

3. **Create database indexes** (see implementation docs)

4. **Integrate with frontend** using response format

---

**Last Updated**: 2024
**Version**: 1.0
**Status**: Production Ready ✅

