# Product Creation - Required & Optional Fields

## 📋 REQUIRED Fields (Must Provide)

These fields **MUST** be included when creating a product or the API will reject it:

### 1. **name** (String)
- **Type:** String
- **Max Length:** 100 characters
- **Required:** ✅ YES
- **Example:** `"iPhone 13 Pro Max"`

### 2. **price** (Number)
- **Type:** Number
- **Min Value:** 0
- **Required:** ✅ YES
- **Example:** `₦350,000` → `350000`

### 3. **shop** (ObjectId)
- **Type:** MongoDB ObjectId (Reference to Shop)
- **Required:** ✅ YES
- **Example:** `"507f1f77bcf86cd799439011"`
- **Note:** This is automatically set from `req.user.shop` if not provided

---

## 🔧 OPTIONAL Fields (Nice to Have)

These fields have **defaults** and don't need to be provided:

| Field | Type | Default | Max Length | Notes |
|-------|------|---------|-----------|-------|
| **description** | String | None | 1000 chars | Product details |
| **category** | ObjectId | null | - | Reference to Category |
| **campus** | ObjectId | Not required | - | Reference to Campus |
| **condition** | String (enum) | `"good"` | - | new, like-new, good, fair, poor |
| **stock** | Number | 1 | - | Min: 0 |
| **quantity** | Number | 1 | - | Min: 0 |
| **isAvailable** | Boolean | `true` | - | true or false |
| **tags** | Array | [] | 20 chars each | e.g., ["electronics", "phone"] |
| **status** | String (enum) | `"active"` | - | active, inactive, sold, out-of-stock |
| **location.address** | String | None | 200 chars | Physical location |
| **location.coordinates** | Array | None | - | [longitude, latitude] |

---

## ✅ Minimal Product Creation Example

**Minimum required data:**

```json
POST /api/v1/products
Headers: {
  "Authorization": "Bearer YOUR_TOKEN",
  "Content-Type": "application/json"
}

{
  "name": "iPhone 13",
  "price": 350000,
  "description": "Used iPhone 13 in good condition"
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "product": {
      "_id": "507f1f77bcf86cd799439011",
      "name": "iPhone 13",
      "price": 350000,
      "description": "Used iPhone 13 in good condition",
      "status": "active",
      "isAvailable": true,
      "condition": "good",
      "stock": 1,
      "quantity": 1,
      "shop": "507f1f77bcf86cd799439012",
      "createdAt": "2025-12-16T22:26:34.000Z"
    }
  }
}
```

---

## 🌟 Complete Product Creation Example

**With all recommended fields:**

```json
POST /api/v1/products
Headers: {
  "Authorization": "Bearer YOUR_TOKEN",
  "Content-Type": "application/json"
}

{
  "name": "iPhone 13 Pro Max 256GB",
  "price": 450000,
  "description": "Excellent condition iPhone 13 Pro Max, 256GB storage. Original box and charger included. No scratches or cracks.",
  "condition": "like-new",
  "category": "507f1f77bcf86cd799439013",
  "campus": "507f1f77bcf86cd799439014",
  "stock": 5,
  "quantity": 5,
  "isAvailable": true,
  "tags": ["electronics", "phone", "apple", "iphone13"],
  "location": {
    "address": "Computer Science Building, Lekki Campus"
  }
}
```

---

## 📸 Product Creation with Images (FormData)

When uploading images, use `multipart/form-data`:

```javascript
const formData = new FormData();
formData.append('name', 'iPhone 13');
formData.append('price', 350000);
formData.append('description', 'Used iPhone 13');
formData.append('condition', 'good');
formData.append('tags', JSON.stringify(['phone', 'electronics']));

// Add images (up to 6)
formData.append('images', imageFile1);
formData.append('images', imageFile2);

// Send request
const response = await fetch('/api/v1/products', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});
```

---

## 🎯 Field Validation Rules

### **name**
- Required: YES
- Type: String
- Min Length: 1 character
- Max Length: 100 characters
- Error: "A product must have a name"

### **price**
- Required: YES
- Type: Number
- Min Value: 0
- Error: "A product must have a price" / "Price must be positive"

### **description**
- Required: NO
- Type: String
- Max Length: 1000 characters
- Error: "Description cannot exceed 1000 characters"

### **condition**
- Required: NO
- Type: String (enum)
- Valid Values: `'new'`, `'like-new'`, `'good'`, `'fair'`, `'poor'`
- Default: `'good'`

### **status**
- Required: NO
- Type: String (enum)
- Valid Values: `'active'`, `'inactive'`, `'sold'`, `'out-of-stock'`
- Default: `'active'`

### **tags**
- Required: NO
- Type: Array of Strings
- Max Length per tag: 20 characters
- Example: `["electronics", "phone"]`

### **stock** / **quantity**
- Required: NO
- Type: Number
- Min Value: 0
- Default: 1

### **shop**
- Required: YES
- Type: ObjectId
- Note: Auto-set to user's shop if not provided
- Example: `"507f1f77bcf86cd799439011"`

### **category**
- Required: NO
- Type: ObjectId
- Default: null
- Note: Reference to Category document

### **campus**
- Required: NO
- Type: ObjectId
- Note: Reference to Campus document

### **location.address**
- Required: NO
- Type: String
- Max Length: 200 characters

### **location.coordinates**
- Required: NO
- Type: Array [longitude, latitude]
- Validation: longitude [-180, 180], latitude [-90, 90]

---

## 🚀 Step-by-Step: Creating Your First Product

### Step 1: Get Your Shop ID
```bash
# Call this endpoint to get your shop ID
GET /api/v1/auth/me
Headers: Authorization: Bearer YOUR_TOKEN

# In response, look for: shop._id
```

### Step 2: Prepare Product Data
```javascript
const productData = {
  name: "iPhone 13",
  price: 350000,
  description: "Used iPhone 13 in good condition",
  condition: "good"
  // shop is auto-set from your account
};
```

### Step 3: Send Request
```bash
curl -X POST http://localhost:5000/api/v1/products \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "iPhone 13",
    "price": 350000,
    "description": "Used iPhone 13 in good condition"
  }'
```

### Step 4: Check Response
```json
{
  "status": "success",
  "data": {
    "product": {
      "_id": "...",
      "name": "iPhone 13",
      "price": 350000,
      ...
    }
  }
}
```

---

## ❌ Common Errors & Fixes

### Error: "A product must have a name"
```
✗ Missing: name field
✓ Fix: Add "name": "Your Product Name"
```

### Error: "A product must have a price"
```
✗ Missing: price field
✓ Fix: Add "price": 50000
```

### Error: "Cast to ObjectId failed for value ... (path: 'shop')"
```
✗ Issue: Invalid shop ID format
✓ Fix: Make sure shop ID is valid MongoDB ObjectId (24 hex characters)
```

### Error: "price: Path 'price' is required"
```
✗ Missing: price field
✓ Fix: Add "price": number_value
```

### Error: `condition` is not valid
```
✗ Invalid value for condition field
✓ Valid values: "new", "like-new", "good", "fair", "poor"
✓ Fix: Use one of these exact values
```

---

## 📊 Product Default Values

When you create a product, these fields are automatically set if not provided:

```javascript
{
  status: 'active',           // Product is visible
  isAvailable: true,          // Product is available
  condition: 'good',          // Default condition
  stock: 1,                   // Quantity in stock
  quantity: 1,                // Quantity available
  ratingsAverage: 4.5,        // Default rating
  ratingsQuantity: 0,         // No reviews yet
  category: null,             // No category assigned
  analytics: {
    views: 0,
    favorites: 0
  },
  settings: {
    allowOffers: true,
    allowDirectMessages: true,
    autoAcceptOrders: false,
    requireApproval: false
  }
}
```

---

## 🔐 Auto-Set Fields

These fields are automatically set and **should NOT be provided**:

| Field | Auto-Set From |
|-------|----------------|
| **shop** | `req.user.shop` (your shop) |
| **createdAt** | Server timestamp |
| **updatedAt** | Server timestamp |
| **ratingsAverage** | 4.5 (default) |
| **ratingsQuantity** | 0 (no reviews) |
| **analytics** | Empty (will be updated) |

---

## ✨ Best Practices

1. **Always provide a description** - Helps buyers understand the product
2. **Set condition accurately** - Affects price perception
3. **Add tags** - Improves searchability
4. **Upload images** - Products with images get more views
5. **Set stock correctly** - Prevents overselling
6. **Add location** - Helps local buyers find you

---

## 🧪 Quick Test Command

```bash
# Test create product
curl -X POST http://localhost:5000/api/v1/products \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Product",
    "price": 10000,
    "description": "Test description",
    "condition": "good",
    "tags": ["test"]
  }'
```

Replace `YOUR_JWT_TOKEN` with your actual token from login.

---

## 📞 Support

If you get validation errors:
1. Check the error message - it tells you which field is wrong
2. Verify field type (string, number, etc.)
3. Check field length limits
4. For enums, use exact values provided
5. Make sure required fields are present

**Required Summary:**
- ✅ `name` (string, max 100 chars)
- ✅ `price` (number, >= 0)
- ✅ `shop` (ObjectId, auto-set)

Everything else is optional! 🎉
