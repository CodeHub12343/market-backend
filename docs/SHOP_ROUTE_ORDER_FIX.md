# Shop Route Error - "Cast to ObjectId failed for value me"

## 🔴 Error Analysis

### What's Happening

```
CastError: Cast to ObjectId failed for value "me" (type string) at path "_id" for model "Shop"
GET /api/v1/shops/me 500 Internal Server Error
```

### Root Cause

Your **route order is wrong** in `shopRoutes.js`:

```javascript
// ❌ WRONG ORDER - This is what you have now:
router.get('/:id', shopController.getShop);           // Line catches /me as an :id
router.get('/me', shopController.getMyShops);         // Never reached!
```

When you call `/shops/me`, the `:id` route matches first and treats "me" as a shop ID, then tries to convert it to a MongoDB ObjectId, which fails.

---

## ✅ Solution

**Route order matters in Express!** Specific routes must come BEFORE generic routes with parameters.

### Fix your `routes/shopRoutes.js`

Replace the entire file with this corrected version:

```javascript
// routes/shopRoutes.js
const express = require('express');
const authController = require('../middlewares/authMiddleware');
const shopController = require('../controllers/shopController');

const shopReviewRouter = require('./shopReviewRoutes');

const router = express.Router();

// ============================================
// PUBLIC ROUTES (NO AUTHENTICATION REQUIRED)
// ============================================

router.get('/', shopController.getAllShops);

// ============================================
// PROTECTED ROUTES (AUTHENTICATION REQUIRED)
// ============================================

// Apply authentication middleware to all routes below
router.use(authController.protect);

// ⭐ IMPORTANT: Specific routes BEFORE generic routes with parameters
// Get current user's shops (must come BEFORE /:id route)
router.get('/me', shopController.getMyShops);

// Shop review routes
router.use('/:shopId/reviews', shopReviewRouter);

// Get single shop by ID (generic route - comes LAST)
router.get('/:id', shopController.getShop);

// ============================================
// CRUD OPERATIONS (PROTECTED)
// ============================================

// Create a new shop
router.post('/', shopController.createShop);

// Update shop (only owner)
router.patch('/:id', shopController.updateShop);

// Delete shop (only owner)
router.delete('/:id', shopController.deleteShop);

module.exports = router;
```

### Key Changes

| Before | After | Why |
|--------|-------|-----|
| ❌ `router.get('/:id')` first | ✅ `router.get('/me')` first | Generic routes catch everything, specific routes must come first |
| ❌ `/me` route never reached | ✅ `/me` matches before `:id` | Express matches routes top-to-bottom |
| ❌ "me" treated as shop ID | ✅ Handled as separate route | Prevents type casting errors |

---

## 📋 Understanding the Issue

### How Express Route Matching Works

Express matches routes **in order from top to bottom**:

```javascript
// ❌ WRONG (Current)
router.get('/:id', ...)          // This matches /me, /abc123, /anything
router.get('/me', ...)           // This never runs because :id already matched /me!

// ✅ CORRECT (Fixed)
router.get('/me', ...)           // This specifically matches only /me
router.get('/:id', ...)          // This matches everything else like /abc123
```

When a request comes to `/shops/me`:
1. Express checks: does it match `/`? Yes! Returns all shops
2. Express checks: does it match `/me`? (In wrong order, never gets here)
3. Express checks: does it match `/:id`? Yes! Treats "me" as an ID

Then Mongoose tries to convert "me" to ObjectId:
```
CastError: Cast to ObjectId failed for value "me"
```

---

## 🚀 Implementation Steps

### Step 1: Update shopRoutes.js

Copy the corrected file above and replace your entire `routes/shopRoutes.js`

### Step 2: Verify Your Frontend

Your frontend code should work now:

```javascript
// In your hooks/useShops.js - this will now work!
export const useUserShop = () => {
  return useQuery({
    queryKey: ['userShop'],
    queryFn: async () => {
      const response = await api.get('/shops/me');  // ✅ Now works!
      return response.data.data;
    },
  });
};
```

### Step 3: Test the Endpoint

After updating the route, test in your browser or Postman:

```
GET http://localhost:5000/api/v1/shops/me
Headers: Authorization: Bearer <your_jwt_token>
```

**Expected Response:**
```json
{
  "status": "success",
  "results": 1,
  "data": {
    "shops": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "name": "My Shop",
        "description": "My awesome shop",
        "owner": "507f1f77bcf86cd799439012",
        "campus": "507f1f77bcf86cd799439013",
        "createdAt": "2025-12-17T12:00:00Z"
      }
    ]
  }
}
```

---

## 📚 Best Practices for Route Ordering

When designing Express routes, always follow this pattern:

```javascript
// 1. PUBLIC ROUTES (no parameters)
router.get('/', publicController.getAll);

// 2. APPLY MIDDLEWARE (authentication, etc.)
router.use(authMiddleware);

// 3. SPECIFIC PROTECTED ROUTES (before generic ones)
router.get('/me', protectedController.getCurrent);
router.get('/stats', protectedController.getStats);
router.get('/trending', protectedController.getTrending);

// 4. GENERIC ROUTES WITH PARAMETERS (last)
router.get('/:id', protectedController.getById);

// 5. CRUD OPERATIONS
router.post('/', protectedController.create);
router.patch('/:id', protectedController.update);
router.delete('/:id', protectedController.delete);
```

---

## ✅ Checklist

- [ ] Updated `routes/shopRoutes.js` with correct route order
- [ ] Specific routes like `/me` come BEFORE generic `/:id` route
- [ ] Authentication middleware applied before protected routes
- [ ] Restarted backend server
- [ ] Test `/shops/me` endpoint - should return 200 OK

---

## 🎯 Summary

**Problem:** Route `/shops/me` returns 500 error because `:id` route matches before `/me` route

**Solution:** Reorder routes so specific routes (`/me`) come BEFORE generic routes (`/:id`)

**Result:** `/shops/me` endpoint now works correctly ✅

**Time to fix:** 2 minutes - just update the route file!
