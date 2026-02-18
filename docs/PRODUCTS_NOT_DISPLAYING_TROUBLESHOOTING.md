# Products Not Displaying - Troubleshooting Guide

## Problem
Frontend shows `results: 0` when fetching products, even though no errors are thrown.

## Root Cause Analysis

The issue is likely ONE of these:

1. **No products exist in database**
2. **Products have wrong status** (not `'active'`)
3. **Products don't have valid shops**
4. **Cache is returning empty results**
5. **Shop lookup is failing**

---

## Step 1: Check Database State

Run this diagnostic endpoint in your browser or Postman:

```
GET http://localhost:5000/api/v1/products/debug/status
```

You should see something like:
```json
{
  "debug": true,
  "totalProducts": 10,
  "activeProducts": 8,
  "availableProducts": 9,
  "sample": [
    {
      "_id": "...",
      "name": "iPhone 13",
      "status": "active",
      "isAvailable": true,
      "shop": "..."
    }
  ]
}
```

### Possible Results:

**❌ Result: `totalProducts: 0`**
- No products in database at all
- Solution: Create a test product first (see Step 4)

**❌ Result: `activeProducts: 0` but `totalProducts > 0`**
- Products exist but none are marked as `'active'`
- Solution: See Step 2 - Update product status

**❌ Result: `totalProducts > 0` but `shop` is null**
- Products don't have shops associated
- Solution: See Step 3 - Fix product-shop relationship

---

## Step 2: Check Product Status

Run in terminal/Postman to see what status your products have:

```bash
# Via MongoDB directly (if you have mongo shell access)
db.products.find({}, {name: 1, status: 1, isAvailable: 1}).limit(5)
```

### If products have wrong status, update them:

```bash
# Via MongoDB - Update all products to active
db.products.updateMany({}, {$set: {status: 'active', isAvailable: true}})
```

Or via API (if you have an admin endpoint):
```javascript
// In your database connection (dev only!)
const Product = require('./models/productModel');
await Product.updateMany({}, {status: 'active', isAvailable: true});
console.log('Products updated');
```

---

## Step 3: Check Product-Shop Relationship

Products MUST have a valid `shop` ID. Check:

```bash
# MongoDB - See products without shops
db.products.find({shop: {$exists: false}})
db.products.find({shop: null})
```

If products are missing shops:

```javascript
// Create a test shop first
const shop = await Shop.create({
  name: 'Test Shop',
  owner: userId,
  location: 'Test Location'
});

// Then create products with that shop
const product = await Product.create({
  name: 'Test Product',
  price: 5000,
  shop: shop._id,  // Make sure this is set!
  status: 'active',
  isAvailable: true
});
```

---

## Step 4: Create a Test Product

If no products exist, create one:

```bash
# POST http://localhost:5000/api/v1/products
# Headers: 
#   Authorization: Bearer YOUR_TOKEN
#   Content-Type: application/json

{
  "name": "Test Product",
  "description": "This is a test product",
  "price": 5000,
  "condition": "new",
  "status": "active",
  "isAvailable": true,
  "quantity": 10,
  "tags": ["test", "sample"]
}
```

---

## Step 5: Clear Cache

The caching middleware might be returning stale (empty) results.

### Option A: Disable Redis (Quick Fix)
In your `.env` file:
```
DISABLE_REDIS=true
```

Then restart the server.

### Option B: Clear Redis Cache
```bash
# Connect to Redis
redis-cli

# Clear all cache
FLUSHALL

# Or just products cache
DEL "products:*"
```

---

## Step 6: Check Backend Logs

After implementing changes above, look for these debug logs:

```
=== getAllProducts called ===
req.query: {...}
rawFilter after buildFilter: {...}
Final filter before query: {status: 'active', isAvailable: true}
Products matching filter: 5
getAllProducts returning 5 products
```

If you see `Products matching filter: 0`, the issue is in the database.

---

## Complete Debugging Checklist

- [ ] Run `/products/debug/status` endpoint - check counts
- [ ] Check if `totalProducts > 0`
- [ ] Check if `activeProducts > 0`
- [ ] Verify products have `shop` field set
- [ ] Look at backend console logs for filter being applied
- [ ] Try creating a test product manually
- [ ] Restart the server after making database changes
- [ ] Clear Redis cache or disable it temporarily
- [ ] Check browser DevTools Network tab - status 200?
- [ ] Check `response.data.results` value

---

## Common Issues & Fixes

### Issue: "results: 0" in response

**Check 1: Database Empty?**
```javascript
// Run in Node REPL connected to your db
const Product = require('./models/productModel');
const count = await Product.countDocuments();
console.log('Total products:', count);
```

**Check 2: Filter Too Restrictive?**
```javascript
// Check what buildFilter is creating
const rawFilter = buildFilter(req.query);
console.log('Filter:', rawFilter);
const matching = await Product.countDocuments(rawFilter);
console.log('Matching:', matching);
```

**Check 3: Cache Returning Stale Data?**
- Disable Redis: `DISABLE_REDIS=true`
- Or clear it: `redis-cli FLUSHALL`

---

### Issue: Products show in database but not in API

**Solution:**
1. Check `status` field - must be `'active'`
2. Check `isAvailable` field - must be `true`
3. Check `shop` field - must be valid ObjectId
4. Check backend logs for filter applied
5. Clear cache and restart server

---

### Issue: Shop field is null

Products need valid shops. Create a shop first:

```javascript
const Shop = require('./models/shopModel');
const shop = await Shop.create({
  name: 'My Shop',
  owner: userId,
  location: 'Campus'
});

// Then use shop._id when creating products
```

---

## Testing Steps

### 1. Test Backend Directly

```bash
# Get all products (no filters)
curl -X GET http://localhost:5000/api/v1/products

# Get debug info
curl -X GET http://localhost:5000/api/v1/products/debug/status

# Create test product
curl -X POST http://localhost:5000/api/v1/products \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test",
    "price": 5000,
    "status": "active",
    "isAvailable": true
  }'
```

### 2. Test Frontend Hook

```javascript
// In your page or component
import { useAllProducts } from '@/hooks/useProducts';

const { data, isLoading, error } = useAllProducts(1, 12, {});

useEffect(() => {
  console.log('Data:', data);
  console.log('Is Loading:', isLoading);
  console.log('Error:', error);
}, [data, isLoading, error]);
```

### 3. Check Network in Browser DevTools

- Open DevTools → Network tab
- Filter to XHR/Fetch
- Look for GET `/api/v1/products`
- Check Response tab - see if `results: 0`
- Check if products array is empty in response

---

## Server Configuration Check

Make sure your backend server is properly configured:

```javascript
// app.js should have:

// 1. Cache disabled for products
app.use((req, res, next) => {
  if (req.method === 'GET' && req.path.includes('/api/v1/products')) {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  }
  next();
});

// 2. CORS enabled
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));

// 3. Product routes mounted
app.use('/api/v1/products', productRouter);
```

---

## Next Steps After Fixing

1. ✅ Verify products display on frontend
2. ✅ Test pagination (if more than 12 products)
3. ✅ Test filters (category, search, price range)
4. ✅ Test create/edit/delete operations
5. ✅ Check performance with React Query

---

## Need More Help?

If still stuck, provide:

1. Output from `/products/debug/status` endpoint
2. Backend console logs (with debug lines enabled)
3. Frontend console logs (check `rawData` structure)
4. Network response from `/api/v1/products` in DevTools
5. MongoDB collections - do products exist? What's their status?

