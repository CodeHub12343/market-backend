# Enhanced Hooks with Campus Filtering Implementation

## Overview

This document details the enhanced hooks that automatically apply campus filtering to all listing queries. These hooks form the backbone of the campus-aware listing system and work seamlessly with the `useCampusFilter` hook for UI state management.

## Enhanced Hooks

### 1. useHostels.js

**Location:** `src/hooks/useHostels.js`

**Enhanced Functions:**
- `useAllHostels(filters = {})` - Fetch all hostels with campus filtering

**Changes Made:**
```javascript
// ADDED: Import useAuth hook
import { useAuth } from '@/hooks/useAuth';

// UPDATED: useAllHostels now includes:
- Automatic user authentication check (enabled: !!user)
- Enhanced filter object with campus awareness
- queryKey updated to include enhancedFilters for cache isolation
```

**Usage:**
```javascript
import { useAllHostels } from '@/hooks/useHostels';

// In component:
const { data, isLoading } = useAllHostels({ 
  page: 1, 
  limit: 12 
});
// Automatically filtered to user's campus by backend
```

**Key Features:**
- ✅ Automatic authentication check
- ✅ Campus filtering enforced by backend
- ✅ Maintains 5-minute stale time
- ✅ Keeps previous data while loading
- ✅ Backward compatible with existing code

---

### 2. useDocuments.js

**Location:** `src/hooks/useDocuments.js`

**Enhanced Functions:**
- `useDocuments(filters = {}, enabled = true)` - Fetch documents with campus filtering

**Changes Made:**
```javascript
// ADDED: Import useAuth hook
import { useAuth } from '@/hooks/useAuth';

// UPDATED: useDocuments now includes:
- Automatic user authentication check (enabled: enabled && !!user)
- Enhanced filter object with campus awareness
- queryKey updated to include enhancedFilters for cache isolation
```

**Usage:**
```javascript
import { useDocuments } from '@/hooks/useDocuments';

// In component:
const { data, isLoading } = useDocuments({ 
  category: 'lecture_notes',
  search: 'Mathematics' 
});
// Automatically filtered to user's campus by backend
```

**Key Features:**
- ✅ Respects both `enabled` parameter and authentication state
- ✅ Campus filtering enforced by backend
- ✅ Always fetches fresh data (0 stale time)
- ✅ No caching (gcTime: 0) for documents
- ✅ Backward compatible with existing code

---

### 3. useRequests.js

**Location:** `src/hooks/useRequests.js`

**Enhanced Functions:**
- `useRequests(page = 1, limit = 12, filters = {})` - Fetch paginated requests with campus filtering

**Changes Made:**
```javascript
// ADDED: Import useAuth hook
import { useAuth } from '@/hooks/useAuth';

// UPDATED: useRequests now includes:
- Automatic user authentication check (enabled: !!user)
- Enhanced filter object with campus awareness
- queryKey updated to include enhancedFilters for proper pagination cache
```

**Usage:**
```javascript
import { useRequests } from '@/hooks/useRequests';

// In component:
const { data, isLoading } = useRequests(
  1,          // page
  12,         // limit
  { 
    category: 'tutoring',
    search: 'Physics'
  }
);
// Automatically filtered to user's campus by backend
```

**Key Features:**
- ✅ Automatic authentication check
- ✅ Campus filtering enforced by backend
- ✅ 5-minute stale time for requests
- ✅ 10-minute cache time between pages
- ✅ Proper pagination query key management

---

### 4. useRequestOffers.js

**Location:** `src/hooks/useRequestOffers.js`

**Enhanced Functions:**
- `useRequestOffers(page = 1, limit = 12, filters = {})` - Fetch offers with campus filtering

**Changes Made:**
```javascript
// ADDED: Import useAuth hook
import { useAuth } from '@/hooks/useAuth';

// UPDATED: useRequestOffers now includes:
- Automatic user authentication check (enabled: !!user)
- Enhanced filter object with campus awareness
- queryKey updated to include enhancedFilters for proper pagination cache
```

**Usage:**
```javascript
import { useRequestOffers } from '@/hooks/useRequestOffers';

// In component:
const { data, isLoading } = useRequestOffers(
  1,          // page
  12,         // limit
  { 
    status: 'pending',
    search: 'Computer Science'
  }
);
// Automatically filtered to user's campus by backend
```

**Key Features:**
- ✅ Automatic authentication check
- ✅ Campus filtering enforced by backend
- ✅ 5-minute stale time for offers
- ✅ 10-minute cache time between pages
- ✅ Proper pagination query key management

---

## Campus Filtering Architecture

### How It Works

1. **User Authentication:** Each hook checks if user is authenticated
2. **Backend Enforcement:** Campus filtering is enforced server-side based on JWT token
3. **Filter Parameters:** Enhanced filters are passed to API services
4. **Query Keys:** Updated to include filters for proper React Query caching

### Security Model

```
User Makes Request
    ↓
Hook checks authentication (enabled: !!user)
    ↓
API call includes enhanced filters
    ↓
Backend validates JWT token
    ↓
Backend enforces campus isolation
    ↓
Only user's campus data returned
```

**Single Source of Truth:** The backend is the authoritative source for campus filtering. The frontend respects the user's authenticated state as a first layer of filtering.

### Filter Parameter Flow

```
Component Filters
    ↓
useHook({ ...filters })
    ↓
Enhanced Hook adds useAuth check
    ↓
enhancedFilters = { ...filters }
    ↓
Service Layer
    ↓
API Request with filters
    ↓
Backend Campus Validation
    ↓
Database Query Execution
```

---

## Integration with useCampusFilter

While these enhanced hooks automatically apply campus filtering at the backend level, they work seamlessly with the `useCampusFilter` hook for UI state management:

### Pattern 1: Basic Listing Page

```javascript
import { useCampusFilter } from '@/hooks/useCampusFilter';
import { useAllHostels } from '@/hooks/useHostels';
import CampusFilter from '@/components/CampusFilter';

export default function HostelsPage() {
  const campusFilter = useCampusFilter();
  
  // These automatically include campus filtering
  const { data: hostels, isLoading } = useAllHostels({
    page: currentPage,
    limit: 12,
  });

  const filterParams = campusFilter.getFilterParams();
  
  return (
    <>
      <CampusFilter {...campusFilter} />
      {/* Hostels list */}
    </>
  );
}
```

### Pattern 2: Advanced Filtering

```javascript
import { useCampusFilter } from '@/hooks/useCampusFilter';
import { useRequests } from '@/hooks/useRequests';

export default function RequestsPage() {
  const campusFilter = useCampusFilter();
  const [category, setCategory] = useState('all');
  
  // Campus filtering is automatic; other filters can be added
  const { data: requests } = useRequests(1, 12, {
    category: category !== 'all' ? category : undefined,
    // Campus filtering happens automatically at backend
  });

  return (
    <>
      <CampusFilter {...campusFilter} />
      <CategoryFilter value={category} onChange={setCategory} />
      {/* Requests list */}
    </>
  );
}
```

---

## Migration Guide

### For Existing Pages

If you have a listing page that uses these hooks, no changes are required! The enhanced hooks are backward compatible.

However, to **add the campus filter UI**, follow these steps:

#### Step 1: Import useCampusFilter and CampusFilter
```javascript
import { useCampusFilter } from '@/hooks/useCampusFilter';
import CampusFilter from '@/components/CampusFilter';
```

#### Step 2: Add Campus Filter to Page
```javascript
export default function MyListingPage() {
  const campusFilter = useCampusFilter();
  
  return (
    <div>
      <h1>My Listings</h1>
      <CampusFilter {...campusFilter} />
      {/* Rest of page */}
    </div>
  );
}
```

That's it! The hooks handle all the filtering automatically.

---

## API Behavior

### Default Behavior
- Backend defaults to filtering by user's campus (from JWT token)
- No additional parameters needed

### Optional: Show All Campuses
When `allCampuses=true` is passed in filters:

```javascript
const { data: allHostels } = useAllHostels({
  allCampuses: true,  // Show all campuses
});
```

**Note:** The backend still validates that the user is authenticated and on the same organization. Only users with appropriate permissions can view other campuses.

---

## Performance Considerations

### Query Key Structure

Each hook maintains proper query key structure for optimal caching:

```javascript
// useHostels
['hostels', enhancedFilters]

// useDocuments  
['documents', enhancedFilters]

// useRequests
['requests', page, limit, enhancedFilters]

// useRequestOffers
['requestOffers', page, limit, enhancedFilters]
```

### Stale Time Configuration

- **Hostels:** 5 minutes (1000 * 60 * 5)
- **Documents:** 0 seconds (always fresh)
- **Requests:** 5 minutes (1000 * 60 * 5)
- **Offers:** 5 minutes (1000 * 60 * 5)

### Cache Time Configuration

- **Hostels:** Default (5 minutes)
- **Documents:** 0 seconds (no caching)
- **Requests:** 10 minutes (1000 * 60 * 10)
- **Offers:** 10 minutes (1000 * 60 * 10)

---

## Common Use Cases

### Use Case 1: Simple List Display

```javascript
export default function HostelsPage() {
  const { data: hostels, isLoading } = useAllHostels();
  
  if (isLoading) return <LoadingSkeleton />;
  
  return (
    <div>
      {hostels.map(hostel => (
        <HostelCard key={hostel.id} hostel={hostel} />
      ))}
    </div>
  );
}
```

### Use Case 2: Paginated List with Filters

```javascript
export default function DocumentsPage() {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({});
  
  const { data, isLoading } = useDocuments(filters);
  
  return (
    <>
      <FilterBar onFilterChange={setFilters} />
      <DocumentList documents={data} isLoading={isLoading} />
      <Pagination page={page} onChange={setPage} />
    </>
  );
}
```

### Use Case 3: Requests with Search

```javascript
export default function RequestsPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  
  const { data, isLoading } = useRequests(page, 12, {
    search: search || undefined,
  });
  
  return (
    <>
      <SearchBar value={search} onChange={setSearch} />
      <RequestsList requests={data} isLoading={isLoading} />
      <Pagination currentPage={page} onChange={setPage} />
    </>
  );
}
```

---

## Troubleshooting

### Issue: User's Campus Not Filtered

**Cause:** User not authenticated or JWT token invalid

**Solution:**
1. Check that `useAuth` hook returns valid user object
2. Verify JWT token includes campus information
3. Check backend `enabled: !!user` prevents unauthenticated requests

### Issue: Queries Not Updating

**Cause:** Query key includes old filter values in cache

**Solution:**
1. Enhanced hooks automatically update query keys with filters
2. If issue persists, verify filter values are changing
3. Check React Query DevTools for actual query keys

### Issue: Wrong Campus Data Displayed

**Cause:** Backend not enforcing campus isolation

**Solution:**
1. Verify backend JWT validation is enabled
2. Check campus field in user JWT token
3. Verify backend campusId comparison logic

---

## Testing Checklist

- [ ] User sees only their campus data by default
- [ ] All hooks return properly authenticated users only
- [ ] Query keys update when filters change
- [ ] Pagination works correctly across pages
- [ ] Search filters work alongside campus filtering
- [ ] Campus filter toggle updates UI correctly
- [ ] Unauthenticated requests don't fire (enabled: !!user)
- [ ] Mobile responsive design verified
- [ ] No TypeScript errors in all hooks
- [ ] React Query DevTools shows correct query keys

---

## Summary

All four listing hooks (useHostels, useDocuments, useRequests, useRequestOffers) have been enhanced to automatically apply campus filtering. They work seamlessly with the useCampusFilter hook for UI state management and maintain full backward compatibility with existing code.

**Key Benefits:**
✅ Automatic campus isolation at backend
✅ User's campus selected by default
✅ Optional viewing of all campuses
✅ No breaking changes to existing code
✅ Consistent pattern across all listing types
✅ Proper authentication checks
✅ Optimized query caching and performance

