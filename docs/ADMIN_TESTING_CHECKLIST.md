# ✅ Admin Dashboard Backend - Testing & Verification Checklist

**Purpose:** Verify all 52+ endpoints are working correctly  
**Estimated Time:** 30-45 minutes  
**Prerequisites:** Valid JWT token with admin role

---

## 🚀 Pre-Testing Setup

### 1. Ensure Server is Running
```bash
npm start
# or
node server.js
```

### 2. Get Admin JWT Token
```bash
# Login with admin account
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "your_password"
  }'

# Save token
JWT_TOKEN="eyJhbGc..." # Replace with actual token
```

### 3. Verify Admin Role
Ensure your test user has `role: 'admin'` in the database

---

## 📋 Module Testing Checklist

### ✅ Module 1: User Management (6 endpoints)

- [ ] **GET /admin/users**
  ```bash
  curl -X GET "http://localhost:3000/api/v1/admin/users?page=1&limit=20" \
    -H "Authorization: Bearer $JWT_TOKEN"
  ```
  **Expected:** 200 with user list
  **Verify:** `results`, `total`, `pages`, `data.users` present

- [ ] **GET /admin/users/:id**
  ```bash
  # Replace user_123 with actual user ID
  curl -X GET "http://localhost:3000/api/v1/admin/users/user_123" \
    -H "Authorization: Bearer $JWT_TOKEN"
  ```
  **Expected:** 200 with user details
  **Verify:** `data.user`, `data.activities`, `data.stats`

- [ ] **PATCH /admin/users/:id/ban**
  ```bash
  curl -X PATCH "http://localhost:3000/api/v1/admin/users/user_123/ban" \
    -H "Authorization: Bearer $JWT_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"reason":"Test ban","duration":7}'
  ```
  **Expected:** 200 with user status changed to "banned"
  **Verify:** `data.user.status` = "banned"

- [ ] **PATCH /admin/users/:id/unban**
  ```bash
  curl -X PATCH "http://localhost:3000/api/v1/admin/users/user_123/unban" \
    -H "Authorization: Bearer $JWT_TOKEN"
  ```
  **Expected:** 200 with user status changed to "active"
  **Verify:** `data.user.status` = "active"

- [ ] **PATCH /admin/users/:id/password-reset**
  ```bash
  curl -X PATCH "http://localhost:3000/api/v1/admin/users/user_123/password-reset" \
    -H "Authorization: Bearer $JWT_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"newPassword":"NewPassword123!"}'
  ```
  **Expected:** 200 with success message
  **Verify:** Message indicates password reset

- [ ] **GET /admin/users/:id/audit-trail**
  ```bash
  curl -X GET "http://localhost:3000/api/v1/admin/users/user_123/audit-trail?page=1&limit=50" \
    -H "Authorization: Bearer $JWT_TOKEN"
  ```
  **Expected:** 200 with activity list
  **Verify:** `data.activities` array present

---

### ✅ Module 2: Shop Management (5 endpoints)

- [ ] **GET /admin/shops**
  ```bash
  curl -X GET "http://localhost:3000/api/v1/admin/shops?page=1&limit=20" \
    -H "Authorization: Bearer $JWT_TOKEN"
  ```
  **Expected:** 200 with shops list
  **Verify:** Pagination and shop data

- [ ] **GET /admin/shops/:shopId**
  ```bash
  curl -X GET "http://localhost:3000/api/v1/admin/shops/shop_123" \
    -H "Authorization: Bearer $JWT_TOKEN"
  ```
  **Expected:** 200 with shop details
  **Verify:** `data.shop` and `data.stats`

- [ ] **PATCH /admin/shops/:shopId/verify**
  ```bash
  curl -X PATCH "http://localhost:3000/api/v1/admin/shops/shop_123/verify" \
    -H "Authorization: Bearer $JWT_TOKEN"
  ```
  **Expected:** 200 with verified shop
  **Verify:** `data.shop.isVerified` = true

- [ ] **PATCH /admin/shops/:shopId/suspend**
  ```bash
  curl -X PATCH "http://localhost:3000/api/v1/admin/shops/shop_123/suspend" \
    -H "Authorization: Bearer $JWT_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"reason":"Selling counterfeit items"}'
  ```
  **Expected:** 200 with suspended shop
  **Verify:** `data.shop.status` = "suspended"

- [ ] **GET /admin/shops/:shopId/revenue**
  ```bash
  curl -X GET "http://localhost:3000/api/v1/admin/shops/shop_123/revenue?period=month" \
    -H "Authorization: Bearer $JWT_TOKEN"
  ```
  **Expected:** 200 with revenue data
  **Verify:** `data.revenue` array with daily breakdown

---

### ✅ Module 3: Product Management (3 endpoints)

- [ ] **GET /admin/products**
  ```bash
  curl -X GET "http://localhost:3000/api/v1/admin/products?page=1&limit=20" \
    -H "Authorization: Bearer $JWT_TOKEN"
  ```
  **Expected:** 200 with products
  **Verify:** Pagination and product data

- [ ] **PATCH /admin/products/:productId/reject**
  ```bash
  curl -X PATCH "http://localhost:3000/api/v1/admin/products/prod_123/reject" \
    -H "Authorization: Bearer $JWT_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"reason":"Violates guidelines"}'
  ```
  **Expected:** 200 with rejected product
  **Verify:** `data.product.status` = "rejected"

- [ ] **DELETE /admin/products/:productId**
  ```bash
  curl -X DELETE "http://localhost:3000/api/v1/admin/products/prod_123" \
    -H "Authorization: Bearer $JWT_TOKEN"
  ```
  **Expected:** 200 with success message

---

### ✅ Module 4: Order Management (4 endpoints)

- [ ] **GET /admin/orders**
  ```bash
  curl -X GET "http://localhost:3000/api/v1/admin/orders?page=1&limit=20" \
    -H "Authorization: Bearer $JWT_TOKEN"
  ```
  **Expected:** 200 with orders
  **Verify:** Pagination and order data

- [ ] **GET /admin/orders/:orderId**
  ```bash
  curl -X GET "http://localhost:3000/api/v1/admin/orders/order_123" \
    -H "Authorization: Bearer $JWT_TOKEN"
  ```
  **Expected:** 200 with order details
  **Verify:** All order fields present

- [ ] **PATCH /admin/orders/:orderId/status**
  ```bash
  curl -X PATCH "http://localhost:3000/api/v1/admin/orders/order_123/status" \
    -H "Authorization: Bearer $JWT_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"status":"shipped"}'
  ```
  **Expected:** 200 with updated order
  **Verify:** `data.order.status` = "shipped"

- [ ] **PATCH /admin/orders/:orderId/refund**
  ```bash
  curl -X PATCH "http://localhost:3000/api/v1/admin/orders/order_123/refund" \
    -H "Authorization: Bearer $JWT_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"reason":"Customer requested"}'
  ```
  **Expected:** 200 with refunded order
  **Verify:** `data.order.status` = "refunded"

---

### ✅ Module 5: Document Management (4 endpoints)

- [ ] **GET /admin/documents**
  ```bash
  curl -X GET "http://localhost:3000/api/v1/admin/documents?page=1&limit=20" \
    -H "Authorization: Bearer $JWT_TOKEN"
  ```
  **Expected:** 200 with documents

- [ ] **PATCH /admin/documents/:documentId/approve**
  ```bash
  curl -X PATCH "http://localhost:3000/api/v1/admin/documents/doc_123/approve" \
    -H "Authorization: Bearer $JWT_TOKEN"
  ```
  **Expected:** 200 with approved document
  **Verify:** `data.document.uploadStatus` = "approved"

- [ ] **PATCH /admin/documents/:documentId/reject**
  ```bash
  curl -X PATCH "http://localhost:3000/api/v1/admin/documents/doc_123/reject" \
    -H "Authorization: Bearer $JWT_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"reason":"Copyrighted material"}'
  ```
  **Expected:** 200 with rejected document
  **Verify:** `data.document.uploadStatus` = "rejected"

- [ ] **DELETE /admin/documents/:documentId**
  ```bash
  curl -X DELETE "http://localhost:3000/api/v1/admin/documents/doc_123" \
    -H "Authorization: Bearer $JWT_TOKEN"
  ```
  **Expected:** 200 with success

---

### ✅ Module 6: Content Moderation (4 endpoints)

- [ ] **GET /admin/reports**
  ```bash
  curl -X GET "http://localhost:3000/api/v1/admin/reports?page=1&limit=20" \
    -H "Authorization: Bearer $JWT_TOKEN"
  ```
  **Expected:** 200 with reports

- [ ] **GET /admin/reports/:reportId**
  ```bash
  curl -X GET "http://localhost:3000/api/v1/admin/reports/report_123" \
    -H "Authorization: Bearer $JWT_TOKEN"
  ```
  **Expected:** 200 with report details

- [ ] **PATCH /admin/reports/:reportId/resolve**
  ```bash
  curl -X PATCH "http://localhost:3000/api/v1/admin/reports/report_123/resolve" \
    -H "Authorization: Bearer $JWT_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"action":"delete_post","reason":"Violates guidelines"}'
  ```
  **Expected:** 200 with resolved report
  **Verify:** `data.report.resolved` = true

- [ ] **DELETE /admin/posts/:postId**
  ```bash
  curl -X DELETE "http://localhost:3000/api/v1/admin/posts/post_123" \
    -H "Authorization: Bearer $JWT_TOKEN"
  ```
  **Expected:** 200 with success

---

### ✅ Module 7: Chat Monitoring (3 endpoints)

- [ ] **GET /admin/chats**
  ```bash
  curl -X GET "http://localhost:3000/api/v1/admin/chats?page=1&limit=20" \
    -H "Authorization: Bearer $JWT_TOKEN"
  ```
  **Expected:** 200 with chats

- [ ] **GET /admin/chats/:chatId/messages**
  ```bash
  curl -X GET "http://localhost:3000/api/v1/admin/chats/chat_123/messages?page=1&limit=50" \
    -H "Authorization: Bearer $JWT_TOKEN"
  ```
  **Expected:** 200 with messages

- [ ] **DELETE /admin/messages/:messageId**
  ```bash
  curl -X DELETE "http://localhost:3000/api/v1/admin/messages/msg_123" \
    -H "Authorization: Bearer $JWT_TOKEN"
  ```
  **Expected:** 200 with success

---

### ✅ Module 8: Analytics & Insights (6 endpoints)

- [ ] **GET /admin/analytics/dashboard**
  ```bash
  curl -X GET "http://localhost:3000/api/v1/admin/analytics/dashboard" \
    -H "Authorization: Bearer $JWT_TOKEN"
  ```
  **Expected:** 200 with overview metrics
  **Verify:** All key metrics present

- [ ] **GET /admin/analytics/users**
  ```bash
  curl -X GET "http://localhost:3000/api/v1/admin/analytics/users?period=month" \
    -H "Authorization: Bearer $JWT_TOKEN"
  ```
  **Expected:** 200 with user analytics

- [ ] **GET /admin/analytics/revenue**
  ```bash
  curl -X GET "http://localhost:3000/api/v1/admin/analytics/revenue?period=month" \
    -H "Authorization: Bearer $JWT_TOKEN"
  ```
  **Expected:** 200 with revenue data

- [ ] **GET /admin/analytics/products**
  ```bash
  curl -X GET "http://localhost:3000/api/v1/admin/analytics/products" \
    -H "Authorization: Bearer $JWT_TOKEN"
  ```
  **Expected:** 200 with product analytics

- [ ] **GET /admin/analytics/documents**
  ```bash
  curl -X GET "http://localhost:3000/api/v1/admin/analytics/documents" \
    -H "Authorization: Bearer $JWT_TOKEN"
  ```
  **Expected:** 200 with document analytics

- [ ] **GET /admin/analytics/events**
  ```bash
  curl -X GET "http://localhost:3000/api/v1/admin/analytics/events" \
    -H "Authorization: Bearer $JWT_TOKEN"
  ```
  **Expected:** 200 with event analytics

---

### ✅ Module 9: Request & Offer Management (2 endpoints)

- [ ] **GET /admin/requests**
  ```bash
  curl -X GET "http://localhost:3000/api/v1/admin/requests?page=1&limit=20" \
    -H "Authorization: Bearer $JWT_TOKEN"
  ```
  **Expected:** 200 with requests

- [ ] **GET /admin/offers**
  ```bash
  curl -X GET "http://localhost:3000/api/v1/admin/offers?page=1&limit=20" \
    -H "Authorization: Bearer $JWT_TOKEN"
  ```
  **Expected:** 200 with offers

---

### ✅ Module 10: System Settings (4 endpoints)

- [ ] **GET /admin/system/health**
  ```bash
  curl -X GET "http://localhost:3000/api/v1/admin/system/health" \
    -H "Authorization: Bearer $JWT_TOKEN"
  ```
  **Expected:** 200 with system status
  **Verify:** All services connected

- [ ] **GET /admin/system/logs**
  ```bash
  curl -X GET "http://localhost:3000/api/v1/admin/system/logs?limit=50" \
    -H "Authorization: Bearer $JWT_TOKEN"
  ```
  **Expected:** 200 with logs

- [ ] **POST /admin/system/cache/clear**
  ```bash
  curl -X POST "http://localhost:3000/api/v1/admin/system/cache/clear" \
    -H "Authorization: Bearer $JWT_TOKEN"
  ```
  **Expected:** 200 with success message

- [ ] **GET /admin/system/performance**
  ```bash
  curl -X GET "http://localhost:3000/api/v1/admin/system/performance" \
    -H "Authorization: Bearer $JWT_TOKEN"
  ```
  **Expected:** 200 with performance metrics

---

## 🔒 Security Testing

- [ ] **Test 401 Unauthorized (No token)**
  ```bash
  curl -X GET http://localhost:3000/api/v1/admin/users
  ```
  **Expected:** 401 Unauthorized

- [ ] **Test 403 Forbidden (Non-admin user)**
  ```bash
  # Use non-admin JWT token
  curl -X GET http://localhost:3000/api/v1/admin/users \
    -H "Authorization: Bearer $NON_ADMIN_TOKEN"
  ```
  **Expected:** 403 Forbidden

- [ ] **Test 429 Rate Limit**
  ```bash
  # Make 15+ ban requests in quick succession
  for i in {1..15}; do
    curl -X PATCH http://localhost:3000/api/v1/admin/users/user_123/ban \
      -H "Authorization: Bearer $JWT_TOKEN" \
      -d '{"reason":"test","duration":7}'
  done
  ```
  **Expected:** 429 on 11th+ request

---

## 🧪 Data Validation Testing

- [ ] **Invalid user ID format**
  ```bash
  curl -X GET "http://localhost:3000/api/v1/admin/users/invalid_id" \
    -H "Authorization: Bearer $JWT_TOKEN"
  ```
  **Expected:** 400 Bad Request

- [ ] **Invalid pagination**
  ```bash
  curl -X GET "http://localhost:3000/api/v1/admin/users?limit=999" \
    -H "Authorization: Bearer $JWT_TOKEN"
  ```
  **Expected:** Should cap at 100 or reject

- [ ] **Invalid date format**
  ```bash
  curl -X GET "http://localhost:3000/api/v1/admin/users?dateFrom=invalid" \
    -H "Authorization: Bearer $JWT_TOKEN"
  ```
  **Expected:** 400 Bad Request

---

## 📊 Audit Logging Verification

- [ ] **Check audit log creation**
  ```bash
  # After performing an admin action, verify in database
  db.activities.findOne({action: "ADMIN_*"})
  ```
  **Expected:** Activity logged with admin ID, timestamp, IP

- [ ] **Verify sensitive operations logged**
  ```bash
  # Check for ban, delete, refund logs
  db.activities.find({action: {$in: ["ADMIN_BAN", "ADMIN_DELETE", "ADMIN_REFUND"]}})
  ```
  **Expected:** All sensitive ops logged

---

## ✅ Final Verification

- [ ] All 52+ endpoints tested successfully
- [ ] Error handling working correctly
- [ ] Rate limiting functioning
- [ ] Audit logs created
- [ ] Authorization working
- [ ] Pagination working
- [ ] Filters working
- [ ] No console errors
- [ ] Response times acceptable
- [ ] Database changes persisted

---

## 🎉 Sign-Off

**Tested by:** _______________  
**Date:** _______________  
**Status:** _______________  
**Issues Found:** _______________  
**Recommendations:** _______________  

---

**Once all checks are complete, the Admin Dashboard Backend is ready for production!** ✅
