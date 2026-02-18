# Next.js Image 400 Error Fix - Shop Logo Upload

## Problem

When loading shop images from `/public/uploads/shops/...`, Next.js Image component returns a 400 error:

```
GET http://localhost:3000/_next/image?url=%2Fuploads%2Fshops%2F...webp&w=828&q=75 400 (Bad Request)
```

## Root Cause

Next.js Image optimization cannot handle local relative paths that aren't in the `public` folder. The images are stored at:
- Backend: `public/uploads/shops/filename.webp`
- Frontend path: `/uploads/shops/filename.webp`

But Next.js Image optimizer expects:
- Images in `/public` folder to be served as static assets
- External URLs from configured domains
- Proper image dimensions to be provided

## Solution Options

### Option 1: Use Regular `<img>` Tag (Simplest - Recommended for Now)

Replace Next.js Image with HTML img tag:

```javascript
// ❌ This causes 400 error
import Image from 'next/image';

<Image 
  src={shop.logo} 
  alt={shop.name}
  width={200}
  height={200}
/>

// ✅ This works fine
<img 
  src={shop.logo} 
  alt={shop.name}
  style={{ width: '200px', height: '200px', objectFit: 'cover' }}
/>
```

### Option 2: Configure Next.js for Local Images (Better)

Update your `next.config.js`:

```javascript
// next.config.js

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Allow images from localhost backend
    domains: ['localhost', '127.0.0.1'],
    // OR use remotePatterns for more control
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '5000',
        pathname: '/public/uploads/**',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '5000',
        pathname: '/public/uploads/**',
      }
    ]
  },
};

module.exports = nextConfig;
```

### Option 3: Update Backend to Serve Images Properly (Best)

Make sure your backend app.js serves static files:

```javascript
// app.js

// Serve static files from public folder
app.use(express.static(path.join(__dirname, 'public')));

// Or specifically for uploads
app.use('/public/uploads', express.static(path.join(__dirname, 'public/uploads')));
```

This should already be in place. Check your app.js around line 40-60.

## Implementation Steps

### Step 1: Check your app.js has static file serving

Look for this in your app.js (should be near the top, before routes):

```javascript
const path = require('path');

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
```

If not present, add it.

### Step 2: Update next.config.js

Find your `next.config.js` file in your frontend project and add/update:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['localhost', '127.0.0.1', 'api.yourdomain.com'],
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '5000',
      },
    ]
  },
};

module.exports = nextConfig;
```

### Step 3: Update Your Component

Option A - Use regular img tag (faster, no optimization):
```javascript
export default function ShopCard({ shop }) {
  return (
    <div>
      <img 
        src={shop.logo || '/placeholder-shop.png'} 
        alt={shop.name}
        style={{ 
          width: '200px', 
          height: '200px',
          objectFit: 'cover',
          borderRadius: '8px'
        }}
        onError={(e) => {
          e.target.src = '/placeholder-shop.png';
        }}
      />
      <h2>{shop.name}</h2>
    </div>
  );
}
```

Option B - Use Next.js Image with proper configuration:
```javascript
import Image from 'next/image';

export default function ShopCard({ shop }) {
  return (
    <div>
      <Image 
        src={shop.logo || '/placeholder-shop.png'} 
        alt={shop.name}
        width={200}
        height={200}
        style={{ objectFit: 'cover', borderRadius: '8px' }}
        priority={false}
        onError={(result) => {
          console.error('Image failed to load:', result);
        }}
      />
      <h2>{shop.name}</h2>
    </div>
  );
}
```

## Troubleshooting

### Error: "Invalid src prop on <Image> ... looks like it is relative"

Solution: Ensure the path starts with `/`:
```javascript
// ❌ Wrong
src="uploads/shops/file.webp"

// ✅ Correct
src="/uploads/shops/file.webp"
```

### Error: "Not allowed to optimize for external URL" or 400 error

Solutions (in order):
1. Use regular `<img>` tag instead
2. Add domain to `next.config.js` `domains` array
3. Use `remotePatterns` instead of `domains`
4. Make sure backend serves static files correctly

### Images not loading at all

Check:
1. Backend is running at http://localhost:5000
2. File exists at `public/uploads/shops/filename.webp`
3. Path in database is correct format: `/uploads/shops/filename.webp`
4. Browser network tab shows GET request to backend, not `_next/image`

## Verification

After implementation, check:

1. **Backend serving static files**:
   ```bash
   # Should return the image file, not 404
   curl http://localhost:5000/public/uploads/shops/your-image.webp
   ```

2. **Frontend loading image**:
   - Open browser DevTools → Network tab
   - Should see request to `http://localhost:5000/public/uploads/...`
   - Status should be 200, not 400

3. **Image displays**:
   - Shop card should show logo
   - No 400 errors in console

## Quick Fix (Immediate)

If you need a quick fix right now:

```javascript
// In your ShopCard or wherever you display shop.logo
<img 
  src={shop.logo} 
  alt={shop.name}
  width={200}
  height={200}
  style={{width: '200px', height: '200px', objectFit: 'cover'}}
  onError={(e) => e.target.src = '/placeholder.png'}
/>
```

This will work immediately without any configuration changes.

## Complete App.js Static File Setup

Make sure your app.js has this near the top (after imports, before routes):

```javascript
// app.js
const path = require('path');
const express = require('express');

// ... other requires ...

const app = express();

// ============================================
// MIDDLEWARE
// ============================================

// Serve static files from public folder
app.use(express.static(path.join(__dirname, 'public')));

// Specifically serve uploads
app.use('/public/uploads', express.static(path.join(__dirname, 'public/uploads')));

// Body parsers
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ... rest of middleware ...
```

## Summary

The 400 error happens because Next.js Image optimizer can't fetch/process the image URL properly. 

**Quickest Fix**: Use regular `<img>` tag
**Better Fix**: Configure next.config.js domains
**Best Practice**: Ensure backend serves static files + configure Next.js properly

Choose Option 1 (img tag) for immediate results, then implement Option 2 or 3 for better image optimization later.
