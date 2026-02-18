# 📊 Admin Dashboard API Documentation

**Base URL:** `/api/v1/admin`  
**Authentication:** JWT Bearer Token Required  
**Authorization:** Admin Role Required  
**Content-Type:** `application/json`

---

## 📑 Table of Contents

1. [Authentication & Authorization](#authentication--authorization)
2. [User Management](#1-user-management)
3. [Shop Management](#2-shop-management)
4. [Product Management](#3-product-management)
5. [Order Management](#4-order-management)
6. [Document Management](#5-document-management)
7. [Content Moderation](#6-content-moderation)
8. [Chat Monitoring](#7-chat--message-monitoring)
9. [Analytics & Insights](#8-analytics--insights)
10. [System Management](#9-system-settings--health)
11. [Error Handling](#error-handling)

---

## Authentication & Authorization

### Required Headers

```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

### Admin Role Requirements

All endpoints require:
- User authentication (valid JWT token)
- Admin role (`role: 'admin'` in user model)

### Response Format

All responses follow this format:

```json
{
  "status": "success|error",
  "message": "Action description",
  "results": 10,
  "total": 100,
  "pages": 5,
  "data": {
    // Response data
  }
}
```

---

## 1️⃣ User Management

### 1.1 Get All Users

**Endpoint:** `GET /users`

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| page | number | Page number (default: 1) |
| limit | number | Results per page (default: 20, max: 100) |
| role | string | Filter by role (user, seller, admin) |
| status | string | Filter by status (active, inactive, banned) |
| campus | string | Filter by campus ID |
| search | string | Search in email/name |
| dateFrom | date | Start date (YYYY-MM-DD) |
| dateTo | date | End date (YYYY-MM-DD) |

**Example Request:**
```bash
curl -X GET "http://localhost:3000/api/v1/admin/users?page=1&limit=20&status=active&campus=123abc" \
  -H "Authorization: Bearer <jwt_token>"
```

**Example Response:**
```json
{
  "status": "success",
  "results": 20,
  "total": 450,
  "pages": 23,
  "data": {
    "users": [
      {
        "_id": "user_id_123",
        "fullName": "John Doe",
        "email": "john@example.com",
        "phone": "+234801234567",
        "role": "user",
        "status": "active",
        "campus": {
          "_id": "campus_123",
          "name": "University of Lagos"
        },
        "createdAt": "2024-01-15T10:30:00Z",
        "reputation": 4.5
      }
      // ... more users
    ]
  }
}
```

---

### 1.2 Get User Details

**Endpoint:** `GET /users/:id`

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | User ID (MongoDB ObjectId) |

**Example Request:**
```bash
curl -X GET "http://localhost:3000/api/v1/admin/users/user_id_123" \
  -H "Authorization: Bearer <jwt_token>"
```

**Example Response:**
```json
{
  "status": "success",
  "data": {
    "user": {
      "_id": "user_id_123",
      "fullName": "John Doe",
      "email": "john@example.com",
      "phone": "+234801234567",
      "role": "user",
      "status": "active",
      "campus": {
        "_id": "campus_123",
        "name": "University of Lagos",
        "location": "Lagos"
      },
      "createdAt": "2024-01-15T10:30:00Z",
      "lastLogin": "2024-01-20T14:45:00Z"
    },
    "activities": [
      {
        "_id": "activity_123",
        "action": "LOGIN",
        "description": "User logged in",
        "createdAt": "2024-01-20T14:45:00Z"
      }
      // ... more activities
    ],
    "stats": {
      "totalOrders": 15,
      "totalProducts": 3,
      "totalReviews": 8,
      "totalDocuments": 12,
      "accountBalance": 5000,
      "reputation": 4.5
    }
  }
}
```

---

### 1.3 Ban User

**Endpoint:** `PATCH /users/:id/ban`

**Request Body:**
```json
{
  "reason": "Violating community guidelines",
  "duration": 30
}
```

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| reason | string | Yes | Reason for ban |
| duration | number | No | Ban duration in days (null = permanent) |

**Example Request:**
```bash
curl -X PATCH "http://localhost:3000/api/v1/admin/users/user_id_123/ban" \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Multiple policy violations",
    "duration": 30
  }'
```

**Example Response:**
```json
{
  "status": "success",
  "message": "User john@example.com has been banned",
  "data": {
    "user": {
      "_id": "user_id_123",
      "status": "banned",
      "banReason": "Multiple policy violations",
      "bannedAt": "2024-01-21T10:00:00Z",
      "banExpiry": "2024-02-20T10:00:00Z"
    }
  }
}
```

---

### 1.4 Unban User

**Endpoint:** `PATCH /users/:id/unban`

**Example Request:**
```bash
curl -X PATCH "http://localhost:3000/api/v1/admin/users/user_id_123/unban" \
  -H "Authorization: Bearer <jwt_token>"
```

**Example Response:**
```json
{
  "status": "success",
  "message": "User john@example.com has been unbanned",
  "data": {
    "user": {
      "_id": "user_id_123",
      "status": "active",
      "banReason": null,
      "bannedAt": null
    }
  }
}
```

---

### 1.5 Reset User Password

**Endpoint:** `PATCH /users/:id/password-reset`

**Request Body:**
```json
{
  "newPassword": "SecurePassword123!"
}
```

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| newPassword | string | Yes | New password (min 8 chars) |

**Example Request:**
```bash
curl -X PATCH "http://localhost:3000/api/v1/admin/users/user_id_123/password-reset" \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "newPassword": "NewSecurePassword123!"
  }'
```

---

### 1.6 Get User Audit Trail

**Endpoint:** `GET /users/:id/audit-trail`

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| page | number | Page number (default: 1) |
| limit | number | Results per page (default: 50) |

**Example Request:**
```bash
curl -X GET "http://localhost:3000/api/v1/admin/users/user_id_123/audit-trail?page=1&limit=50" \
  -H "Authorization: Bearer <jwt_token>"
```

**Example Response:**
```json
{
  "status": "success",
  "results": 50,
  "total": 200,
  "pages": 4,
  "data": {
    "activities": [
      {
        "_id": "activity_123",
        "action": "LOGIN",
        "description": "User logged in",
        "ipAddress": "192.168.1.100",
        "createdAt": "2024-01-20T14:45:00Z"
      }
      // ... more activities
    ]
  }
}
```

---

## 2️⃣ Shop Management

### 2.1 Get All Shops

**Endpoint:** `GET /shops`

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| page | number | Page number (default: 1) |
| limit | number | Results per page (default: 20) |
| status | string | Filter by status (active, suspended, closed) |
| campus | string | Filter by campus |
| verified | boolean | Filter by verification status |
| search | string | Search shop name |

**Example Request:**
```bash
curl -X GET "http://localhost:3000/api/v1/admin/shops?page=1&verified=true" \
  -H "Authorization: Bearer <jwt_token>"
```

---

### 2.2 Get Shop Details

**Endpoint:** `GET /shops/:shopId`

**Example Response:**
```json
{
  "status": "success",
  "data": {
    "shop": {
      "_id": "shop_123",
      "name": "John's Electronics",
      "description": "Premium electronics store",
      "owner": {
        "_id": "user_123",
        "fullName": "John Doe",
        "email": "john@shop.com"
      },
      "isVerified": true,
      "status": "active",
      "createdAt": "2024-01-10T08:00:00Z"
    },
    "stats": {
      "totalProducts": 45,
      "totalOrders": 156,
      "totalRevenue": 250000,
      "totalReviews": 89,
      "averageRating": 4.7,
      "totalFollowers": 234
    }
  }
}
```

---

### 2.3 Verify Shop

**Endpoint:** `PATCH /shops/:shopId/verify`

**Request Body:** (empty)

**Example Request:**
```bash
curl -X PATCH "http://localhost:3000/api/v1/admin/shops/shop_123/verify" \
  -H "Authorization: Bearer <jwt_token>"
```

---

### 2.4 Suspend Shop

**Endpoint:** `PATCH /shops/:shopId/suspend`

**Request Body:**
```json
{
  "reason": "Selling counterfeit products"
}
```

---

### 2.5 Get Shop Revenue

**Endpoint:** `GET /shops/:shopId/revenue`

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| period | string | 'week', 'month', 'year' (default: month) |

**Example Response:**
```json
{
  "status": "success",
  "data": {
    "revenue": [
      {
        "_id": "2024-01-15",
        "dailyRevenue": 12500,
        "orderCount": 8
      }
      // ... more days
    ],
    "period": "month"
  }
}
```

---

## 3️⃣ Product Management

### 3.1 Get All Products

**Endpoint:** `GET /products`

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| page | number | Page number |
| limit | number | Results per page |
| category | string | Filter by category |
| status | string | Filter by status |
| shop | string | Filter by shop |
| search | string | Search product name |

---

### 3.2 Reject Product

**Endpoint:** `PATCH /products/:productId/reject`

**Request Body:**
```json
{
  "reason": "Product image violates guidelines"
}
```

---

### 3.3 Delete Product

**Endpoint:** `DELETE /products/:productId`

**Example Response:**
```json
{
  "status": "success",
  "message": "Product deleted successfully"
}
```

---

## 4️⃣ Order Management

### 4.1 Get All Orders

**Endpoint:** `GET /orders`

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| page | number | Page number |
| limit | number | Results per page |
| status | string | Filter by status |
| shop | string | Filter by shop |
| buyer | string | Filter by buyer |
| dateFrom | date | Start date |
| dateTo | date | End date |

---

### 4.2 Get Order Details

**Endpoint:** `GET /orders/:orderId`

---

### 4.3 Update Order Status

**Endpoint:** `PATCH /orders/:orderId/status`

**Request Body:**
```json
{
  "status": "shipped"
}
```

**Valid Statuses:** `pending`, `processing`, `shipped`, `delivered`, `cancelled`, `refunded`

**Example Response:**
```json
{
  "status": "success",
  "message": "Order status updated",
  "data": {
    "order": {
      "_id": "order_123",
      "status": "shipped",
      "totalAmount": 15000,
      "createdAt": "2024-01-15T10:00:00Z"
    }
  }
}
```

---

### 4.4 Process Refund

**Endpoint:** `PATCH /orders/:orderId/refund`

**Request Body:**
```json
{
  "reason": "Customer requested refund"
}
```

---

## 5️⃣ Document Management

### 5.1 Get All Documents

**Endpoint:** `GET /documents`

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| page | number | Page number |
| limit | number | Results per page |
| status | string | Filter by status |
| campus | string | Filter by campus |
| faculty | string | Filter by faculty |
| uploadStatus | string | 'pending', 'approved', 'rejected' |

---

### 5.2 Approve Document

**Endpoint:** `PATCH /documents/:documentId/approve`

**Example Response:**
```json
{
  "status": "success",
  "message": "Document approved",
  "data": {
    "document": {
      "_id": "doc_123",
      "title": "Advanced Calculus Notes",
      "uploadStatus": "approved",
      "approvedAt": "2024-01-21T10:00:00Z"
    }
  }
}
```

---

### 5.3 Reject Document

**Endpoint:** `PATCH /documents/:documentId/reject`

**Request Body:**
```json
{
  "reason": "Contains copyrighted material"
}
```

---

### 5.4 Delete Document

**Endpoint:** `DELETE /documents/:documentId`

---

## 6️⃣ Content Moderation

### 6.1 Get All Reports

**Endpoint:** `GET /reports`

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| page | number | Page number |
| limit | number | Results per page |
| type | string | Report type (post, user, shop, etc) |
| status | string | Filter by status |
| resolved | boolean | Filter by resolution status |

**Example Response:**
```json
{
  "status": "success",
  "results": 20,
  "total": 156,
  "data": {
    "reports": [
      {
        "_id": "report_123",
        "type": "post",
        "reportedBy": {
          "_id": "user_456",
          "fullName": "Jane Smith",
          "email": "jane@example.com"
        },
        "reportedUser": {
          "_id": "user_789",
          "fullName": "John Doe",
          "email": "john@example.com"
        },
        "reason": "Inappropriate content",
        "description": "Post contains offensive language",
        "status": "pending",
        "resolved": false,
        "createdAt": "2024-01-20T15:30:00Z"
      }
      // ... more reports
    ]
  }
}
```

---

### 6.2 Get Report Details

**Endpoint:** `GET /reports/:reportId`

---

### 6.3 Resolve Report

**Endpoint:** `PATCH /reports/:reportId/resolve`

**Request Body:**
```json
{
  "action": "delete_post",
  "reason": "Post violates community guidelines"
}
```

**Valid Actions:** `delete_post`, `ban_user`, `warn_user`, `no_action`

---

### 6.4 Delete Post

**Endpoint:** `DELETE /posts/:postId`

**Example Response:**
```json
{
  "status": "success",
  "message": "Post deleted successfully"
}
```

---

## 7️⃣ Chat & Message Monitoring

### 7.1 Get All Chats

**Endpoint:** `GET /chats`

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| page | number | Page number |
| limit | number | Results per page |
| search | string | Search chat participants |

---

### 7.2 Get Chat Messages

**Endpoint:** `GET /chats/:chatId/messages`

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| page | number | Page number |
| limit | number | Messages per page |

**Example Response:**
```json
{
  "status": "success",
  "results": 50,
  "total": 234,
  "data": {
    "messages": [
      {
        "_id": "msg_123",
        "sender": {
          "_id": "user_123",
          "fullName": "John Doe",
          "email": "john@example.com"
        },
        "content": "Hello, is this item available?",
        "createdAt": "2024-01-20T14:00:00Z"
      }
      // ... more messages
    ]
  }
}
```

---

### 7.3 Delete Message

**Endpoint:** `DELETE /messages/:messageId`

---

## 8️⃣ Analytics & Insights

### 8.1 Get Dashboard Overview

**Endpoint:** `GET /analytics/dashboard`

**Example Response:**
```json
{
  "status": "success",
  "data": {
    "overview": {
      "totalUsers": 5432,
      "totalOrders": 1250,
      "totalRevenue": 3500000,
      "totalProducts": 8950,
      "totalShops": 156,
      "totalDocuments": 4521,
      "activeChats": 234,
      "pendingReports": 18,
      "bannedUsers": 12,
      "totalEvents": 45
    }
  }
}
```

---

### 8.2 Get User Analytics

**Endpoint:** `GET /analytics/users`

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| period | string | 'week', 'month', 'year' |

**Example Response:**
```json
{
  "status": "success",
  "data": {
    "userGrowth": [
      {
        "_id": "2024-01-15",
        "newUsers": 45
      }
      // ... daily data
    ],
    "usersByRole": [
      {
        "_id": "user",
        "count": 4500
      },
      {
        "_id": "seller",
        "count": 850
      },
      {
        "_id": "admin",
        "count": 12
      }
    ],
    "usersByStatus": [
      {
        "_id": "active",
        "count": 5200
      },
      {
        "_id": "inactive",
        "count": 150
      },
      {
        "_id": "banned",
        "count": 12
      }
    ],
    "period": "month"
  }
}
```

---

### 8.3 Get Revenue Analytics

**Endpoint:** `GET /analytics/revenue`

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| period | string | 'week', 'month', 'year' |

---

### 8.4 Get Product Analytics

**Endpoint:** `GET /analytics/products`

**Example Response:**
```json
{
  "status": "success",
  "data": {
    "topProducts": [
      {
        "_id": "prod_123",
        "title": "iPhone 14 Pro",
        "price": 450000,
        "views": 5600,
        "purchases": 156
      }
      // ... more products
    ],
    "productsByCategory": [
      {
        "_id": "electronics",
        "count": 1250,
        "totalSales": 12500
      }
      // ... more categories
    ]
  }
}
```

---

### 8.5 Get Document Analytics

**Endpoint:** `GET /analytics/documents`

---

### 8.6 Get Event Analytics

**Endpoint:** `GET /analytics/events`

---

## 9️⃣ System Settings & Health

### 9.1 Get System Health

**Endpoint:** `GET /system/health`

**Example Response:**
```json
{
  "status": "success",
  "data": {
    "health": {
      "database": "connected",
      "timestamp": "2024-01-21T10:30:00Z",
      "uptime": 864000,
      "environment": "production",
      "apiVersion": "1.0.0",
      "services": {
        "mongodb": "connected",
        "redis": "connected",
        "cloudinary": "connected",
        "paystack": "connected"
      }
    }
  }
}
```

---

### 9.2 Get System Logs

**Endpoint:** `GET /system/logs`

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| limit | number | Number of logs (default: 100) |
| level | string | Log level (all, error, warning, info) |

---

### 9.3 Clear Cache

**Endpoint:** `POST /system/cache/clear`

**Example Response:**
```json
{
  "status": "success",
  "message": "Cache cleared successfully"
}
```

---

### 9.4 Get System Performance

**Endpoint:** `GET /system/performance`

**Example Response:**
```json
{
  "status": "success",
  "data": {
    "performance": {
      "cpuUsage": {
        "user": 2500,
        "system": 1000
      },
      "memoryUsage": {
        "rss": 52428800,
        "heapTotal": 36864000,
        "heapUsed": 19595520,
        "external": 1024000
      },
      "uptime": 864000,
      "timestamp": "2024-01-21T10:30:00Z"
    }
  }
}
```

---

## Error Handling

### Error Response Format

```json
{
  "status": "error",
  "message": "Error description",
  "statusCode": 400
}
```

### Common Error Codes

| Code | Message | Description |
|------|---------|-------------|
| 400 | Bad Request | Invalid request parameters |
| 401 | Unauthorized | Missing or invalid JWT token |
| 403 | Forbidden | Insufficient permissions (not admin) |
| 404 | Not Found | Resource not found |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |

### Example Error Response

```json
{
  "status": "error",
  "message": "User not found",
  "statusCode": 404
}
```

---

## Authentication Examples

### JavaScript (Fetch API)

```javascript
const headers = {
  'Authorization': `Bearer ${jwtToken}`,
  'Content-Type': 'application/json'
};

// Get all users
fetch('http://localhost:3000/api/v1/admin/users?page=1&limit=20', { headers })
  .then(res => res.json())
  .then(data => console.log(data));

// Ban a user
fetch('http://localhost:3000/api/v1/admin/users/user_id_123/ban', {
  method: 'PATCH',
  headers,
  body: JSON.stringify({
    reason: 'Violating guidelines',
    duration: 30
  })
})
  .then(res => res.json())
  .then(data => console.log(data));
```

### Python (Requests)

```python
import requests

headers = {
    'Authorization': f'Bearer {jwt_token}',
    'Content-Type': 'application/json'
}

# Get all users
response = requests.get(
    'http://localhost:3000/api/v1/admin/users?page=1&limit=20',
    headers=headers
)
print(response.json())

# Ban a user
data = {
    'reason': 'Violating guidelines',
    'duration': 30
}
response = requests.patch(
    'http://localhost:3000/api/v1/admin/users/user_id_123/ban',
    headers=headers,
    json=data
)
print(response.json())
```

### cURL

```bash
# Get all users
curl -X GET "http://localhost:3000/api/v1/admin/users?page=1&limit=20" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json"

# Ban a user
curl -X PATCH "http://localhost:3000/api/v1/admin/users/user_id_123/ban" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Violating guidelines",
    "duration": 30
  }'
```

---

## Rate Limiting

Admin actions have rate limits to prevent abuse:

- **Ban/Unban:** 10 per minute
- **Delete:** 20 per minute
- **Refund:** 15 per minute

Exceeding limits returns HTTP 429 (Too Many Requests).

---

## Audit Logging

All admin actions are logged including:
- Admin user ID
- Action type
- Resource ID
- Timestamp
- IP address
- Request details

Access audit logs via: `GET /users/:id/audit-trail`

---

## Best Practices

1. **Always verify resource exists** before performing actions
2. **Log sensitive operations** (bans, deletions, refunds)
3. **Use pagination** for list endpoints (recommended: limit 20-50)
4. **Validate date ranges** when using date filters
5. **Handle errors gracefully** and check error responses
6. **Monitor rate limits** and back off if needed
7. **Use appropriate status codes** in requests
8. **Implement timeouts** for long-running operations (30s recommended)
9. **Keep JWT tokens secure** and refresh regularly
10. **Document custom admin actions** in your implementation

---

## Webhooks & Callbacks

Future feature: Admin action webhooks for external integrations

```
POST /webhooks/admin/action
POST /webhooks/admin/alert
POST /webhooks/admin/report
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2024-01-21 | Initial release with 50+ endpoints |
| 1.1.0 | TBD | Batch operations, advanced filtering |
| 1.2.0 | TBD | Webhook support, custom alerts |

---

**Last Updated:** January 21, 2024  
**API Version:** 1.0.0  
**Support:** admin-support@studentplatform.com
