# Service Display Troubleshooting Guide

## Step-by-Step Debugging

### 1. Check Network Requests (Browser DevTools)

Open your browser's DevTools → Network tab and:

1. Navigate to `http://localhost:3000/services`
2. Look for a GET request to `http://localhost:5000/api/v1/services`
3. Check the response:
   - **Status 200**: Data is coming ✅
   - **Status 404**: Endpoint doesn't exist ❌
   - **Status 401**: Not authenticated ❌
   - **No request at all**: Hook not being called ❌

### 2. Check Browser Console

Open DevTools → Console and look for:
- Network errors (red text)
- Warning messages
- Any logs about services

### 3. Check Backend API Response

Test the backend directly:

```bash
# In PowerShell terminal
curl http://localhost:5000/api/v1/services -Headers @{"Authorization"="Bearer YOUR_TOKEN"}
```

Or use Postman/Insomnia:
- URL: `http://localhost:5000/api/v1/services`
- Headers: `Authorization: Bearer <your_jwt_token>`
- Method: GET

**Expected response**:
```json
{
  "status": "success",
  "data": {
    "services": [ ... ],
    "pagination": { "page": 1, "pages": 1, "total": 0 }
  }
}
```

---

## Common Issues & Solutions

### Issue 1: Services Array is Empty

**Symptom**: Network request returns 200 but `services: []`

**Causes**:
- No services exist in database
- Services are in wrong collection
- Filtering is removing all services

**Fix**:
```bash
# In Postman, POST to create a test service
POST http://localhost:5000/api/v1/services
Headers: Authorization: Bearer <token>, Content-Type: application/json
Body:
{
  "title": "Test Service",
  "description": "This is a test service for debugging",
  "category": "5f7d5c3e6c3f8a0b9c6d5e3f",
  "price": 50,
  "duration": 1,
  "durationUnit": "hour",
  "availability": "available"
}
```

### Issue 2: 404 Error - Endpoint Not Found

**Symptom**: Network request returns 404

**Causes**:
- Backend routes not created
- Endpoint path is wrong
- Backend not running

**Fix**:
```javascript
// Verify backend has services route
// In your backend app.js, check for:
app.use('/api/v1/services', serviceRoutes);
```

### Issue 3: 401 Unauthorized

**Symptom**: Network request returns 401

**Causes**:
- JWT token missing or expired
- Token not being sent in headers
- Token is invalid

**Fix**:
Check `src/services/api.js`:
```javascript
// Should have axios interceptor for token
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api/v1'
});

// Add token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token'); // or from cookies
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
```

### Issue 4: No Network Request at All

**Symptom**: Network tab shows no request to `/services`

**Causes**:
- Component not rendering
- useAllServices hook not being called
- Route not accessible

**Fix - Check if page is loading**:
```javascript
// Add console.log to debug
export default function ServicesPage() {
  useProtectedRoute();
  
  console.log('Services page loaded');
  
  const { data, isLoading, error } = useAllServices({
    page: 1,
    limit: 12
  });
  
  console.log('Services data:', data);
  console.log('Loading:', isLoading);
  console.log('Error:', error);
  
  // ... rest of component
}
```

### Issue 5: Data Structure Mismatch

**Symptom**: Request succeeds but data doesn't display

**Causes**:
- Backend returns different structure than expected
- Service object doesn't have required fields

**Fix**:
Check the exact response structure:
```javascript
console.log('Raw response:', JSON.stringify(data, null, 2));
```

**Expected structure**:
```javascript
{
  status: 'success',
  data: {
    services: [
      {
        _id: 'abc123...',
        title: 'Service Name',
        description: 'Description',
        price: 50,
        durationUnit: 'hour',
        category: { _id: '...', name: 'Category' },
        provider: { fullName: 'John', avatar: '...' },
        image: '/uploads/...',
        availability: 'available',
        ratingsAverage: 4.5,
        ratingsQuantity: 10,
        tags: ['tag1', 'tag2']
      }
    ],
    pagination: { page: 1, pages: 1, total: 1 }
  }
}
```

### Issue 6: API Endpoint Configuration Wrong

**Symptom**: Error about baseURL or endpoint

**Fix - Check env file**:
```
// .env.local
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api/v1
```

**And check services.js**:
```javascript
const SERVICES_ENDPOINT = '/services'; // Should be just '/services'
// NOT '/api/v1/services' (baseURL handles that)
```

---

## Debugging Script

Add this to `src/app/(protected)/services/page.js`:

```javascript
export default function ServicesPage() {
  useProtectedRoute();
  
  const [debugInfo, setDebugInfo] = useState('');
  
  const { data, isLoading, error, isError } = useAllServices({
    page: 1,
    limit: 12,
    sort: '-createdAt'
  });

  useEffect(() => {
    const info = {
      dataReceived: !!data,
      servicesCount: data?.data?.services?.length || 0,
      isLoading,
      hasError: isError,
      errorMessage: error?.message,
      fullData: data
    };
    
    console.log('=== DEBUG INFO ===');
    console.log(JSON.stringify(info, null, 2));
    setDebugInfo(JSON.stringify(info, null, 2));
  }, [data, isLoading, error, isError]);

  return (
    <PageContainer>
      {/* ... existing code ... */}
      
      {/* TEMPORARY: Show debug info */}
      <div style={{
        background: '#f0f0f0',
        padding: '20px',
        borderRadius: '4px',
        marginBottom: '20px',
        fontFamily: 'monospace',
        fontSize: '12px',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-all'
      }}>
        <strong>DEBUG INFO:</strong>
        {debugInfo}
      </div>
      
      {/* ... rest of component ... */}
    </PageContainer>
  );
}
```

---

## Verification Checklist

- [ ] Backend is running (`http://localhost:5000` loads)
- [ ] Services route exists on backend (`/api/v1/services`)
- [ ] User is authenticated (has valid JWT token)
- [ ] `.env.local` has correct `NEXT_PUBLIC_API_BASE_URL`
- [ ] Browser Network tab shows GET request to `/api/v1/services`
- [ ] Response status is 200
- [ ] Response body has `data.services` array
- [ ] Services array is not empty (or create test service)
- [ ] `useAllServices` hook is being called
- [ ] No console errors in browser

---

## Quick Fixes to Try

### Fix 1: Create a Test Service

```bash
# Using curl in PowerShell
$headers = @{
  "Authorization" = "Bearer YOUR_JWT_TOKEN"
  "Content-Type" = "application/json"
}

$body = @{
  title = "Test Service"
  description = "Test description"
  category = "YOUR_CATEGORY_ID"
  price = 50
  duration = 1
  durationUnit = "hour"
  availability = "available"
} | ConvertTo-Json

Invoke-WebRequest `
  -Uri "http://localhost:5000/api/v1/services" `
  -Method POST `
  -Headers $headers `
  -Body $body
```

### Fix 2: Check if Backend Route Exists

In your backend `routes/serviceRoutes.js`, verify:
```javascript
const express = require('express');
const router = express.Router();

router.get('/', serviceController.getAllServices);
// ... other routes ...

module.exports = router;
```

And in `app.js`:
```javascript
app.use('/api/v1/services', serviceRoutes);
```

### Fix 3: Verify React Query Setup

Check `src/lib/react-query.js`:
```javascript
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
    },
  },
});
```

And in `src/components/Providers.jsx`:
```javascript
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/react-query';

export function Providers({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
```

---

## If Still Not Working

Please provide:

1. **Network tab screenshot** showing the request/response to `/services`
2. **Console errors** (copy-paste from DevTools console)
3. **Response body** (what does the backend return?)
4. **Backend logs** (what does `npm run dev` show?)
5. **Output from debug script** above

This will help identify the exact issue!
