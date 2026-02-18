# 🎓 Campus-Based Listing Filtering - Implementation Guide

## Overview

This document describes the comprehensive campus-based filtering system that ensures users only see listings (products, services, events, etc.) from their selected campus by default, with the option to view listings from other campuses.

## Architecture

### 1. Backend (Already Implemented)
- All listing models have a `campus` field
- Backend API endpoints enforce campus filtering by default
- Users can opt-in to see all campuses with `?allCampuses=true` parameter
- Security is enforced server-side via JWT token

### 2. Frontend (Recently Enhanced)

#### Key Components & Hooks

##### `useCampusFilter` Hook
Located: `/src/hooks/useCampusFilter.js`

```javascript
import { useCampusFilter } from '@/hooks/useCampusFilter';

const MyComponent = () => {
  const {
    userCampus,              // User's home campus object
    showAllCampuses,         // Boolean: showing all or just user's
    selectedCampus,          // Selected campus ID when filtering
    toggleAllCampuses,       // Function to toggle between modes
    handleCampusChange,      // Function to change selected campus
    getFilterParams,         // Function to get API params
    campusName               // User's campus name
  } = useCampusFilter();

  // Use in API calls
  const params = {
    ...getFilterParams(),
    // Other filter params
  };
};
```

##### `CampusFilter` Component
Located: `/src/components/common/CampusFilter.jsx`

A reusable UI component for campus filtering:

```javascript
import CampusFilter from '@/components/common/CampusFilter';

<CampusFilter
  showAllCampuses={showAllCampuses}
  selectedCampus={selectedCampus}
  campusName={campusName}
  userCampus={userCampus}
  allCampuses={campusesData}
  onToggleAllCampuses={toggleAllCampuses}
  onCampusChange={handleCampusChange}
  disabled={isLoading}
/>
```

## Usage Examples

### Example 1: Products Listing Page

```javascript
'use client';

import { useState } from 'react';
import { useCampusFilter } from '@/hooks/useCampusFilter';
import { useAllProducts } from '@/hooks/useProducts';
import { useAllCampuses } from '@/hooks/useCampuses'; // Fetch all campuses
import CampusFilter from '@/components/common/CampusFilter';
import ProductGrid from '@/components/ProductGrid';

export default function ProductsPage() {
  const campusFilter = useCampusFilter();
  const { data: allCampuses = [] } = useAllCampuses(); // Get all campuses for selector

  // Products hook automatically handles campus filtering
  const productsFilter = {
    ...campusFilter.getFilterParams(),
    // Any other filters
  };

  const { data: products, isLoading } = useAllProducts(1, 12, productsFilter);

  return (
    <div>
      {/* Campus Filter UI */}
      <CampusFilter
        showAllCampuses={campusFilter.showAllCampuses}
        selectedCampus={campusFilter.selectedCampus}
        campusName={campusFilter.campusName}
        userCampus={campusFilter.userCampus}
        allCampuses={allCampuses}
        onToggleAllCampuses={campusFilter.toggleAllCampuses}
        onCampusChange={campusFilter.handleCampusChange}
        disabled={isLoading}
      />

      {/* Products Grid */}
      <ProductGrid products={products} isLoading={isLoading} />
    </div>
  );
}
```

### Example 2: Services Listing Page

```javascript
'use client';

import { useCampusFilter } from '@/hooks/useCampusFilter';
import { useAllServices } from '@/hooks/useServices';
import CampusFilter from '@/components/common/CampusFilter';

export default function ServicesPage() {
  const campusFilter = useCampusFilter();

  const servicesFilter = {
    ...campusFilter.getFilterParams(),
    status: 'active'
  };

  const { data: services, isLoading } = useAllServices(servicesFilter);

  return (
    <>
      <CampusFilter {...campusFilter} allCampuses={[]} />
      {/* Services content */}
    </>
  );
}
```

## How It Works

### Default Behavior
1. User logs in and their campus is stored from JWT token
2. When viewing any listing page, only items from their campus are shown
3. Campus filter shows "My Campus" with user's campus name
4. Filter parameter: `allCampuses=false` (implicit in backend)

### Viewing All Campuses
1. User clicks "All Campuses" checkbox in CampusFilter component
2. Filter parameters change: `allCampuses=true`
3. All listings from all campuses become visible
4. Optional: User can select specific campus from dropdown to filter further

### Data Flow

```
User Component
    ↓
useCampusFilter Hook (state management)
    ↓
CampusFilter Component (UI) ← User interaction
    ↓
getFilterParams() → { allCampuses: bool, campus?: id }
    ↓
useProducts/useServices/useEvents Hook
    ↓
Services (products.js, services.js, etc.)
    ↓
API Request with filter params
    ↓
Backend (enforces campus filtering)
    ↓
Filtered Results returned to Frontend
```

## API Parameters

### Campus Filtering Parameters

| Parameter | Values | Purpose |
|-----------|--------|---------|
| `allCampuses` | `'true'` or `'false'` | Show listings from all campuses or just user's |
| `campus` | Campus ID (ObjectId) | Filter to specific campus (when allCampuses=true) |

### Example API Calls

```bash
# Default - Show only user's campus products
GET /api/v1/products?page=1&limit=12

# Show all campuses
GET /api/v1/products?page=1&limit=12&allCampuses=true

# Show all campuses but filter to specific one
GET /api/v1/products?page=1&limit=12&allCampuses=true&campus=CAMPUS_ID
```

## Security Considerations

1. **Backend Enforcement**: Campus filtering is enforced server-side via JWT token
2. **User Cannot Bypass**: Even if user manipulates frontend parameters, backend validates
3. **Default to User's Campus**: If no parameters provided, user's campus from JWT is used
4. **Visibility Rules**: Campus filtering works alongside visibility rules (public/private/campus-only)

## Migration Guide

### For Existing Pages

If updating an existing listing page to support campus filtering:

```javascript
// BEFORE
import { useProducts } from '@/hooks/useProducts';

const { data: products } = useProducts(page, limit, filters);

// AFTER
import { useCampusFilter } from '@/hooks/useCampusFilter';
import { useProducts } from '@/hooks/useProducts';
import CampusFilter from '@/components/common/CampusFilter';

const campusFilter = useCampusFilter();
const enhancedFilters = {
  ...filters,
  ...campusFilter.getFilterParams()
};

const { data: products } = useProducts(page, limit, enhancedFilters);

// Add UI
<CampusFilter {...campusFilter} allCampuses={allCampusesData} />
```

## Related Hooks to Create

For complete functionality, also create/ensure these hooks exist:

```javascript
// Fetch all available campuses for the dropdown
export const useAllCampuses = () => {
  return useQuery({
    queryKey: ['allCampuses'],
    queryFn: () => campusService.getAllCampuses(),
    staleTime: 1000 * 60 * 60, // 1 hour - campuses rarely change
  });
};
```

## Testing Campus Filtering

### Manual Testing Steps

1. **Default Behavior**
   - Log in as user from Campus A
   - View Products page
   - Verify only Campus A products shown
   - Campus filter shows "My Campus - Campus A"

2. **View All Campuses**
   - Click "All Campuses" checkbox
   - Verify products from all campuses now visible
   - Campus filter shows "All Campuses"
   - Optional: Select Campus B from dropdown, verify filtered to Campus B only

3. **Switch Campuses**
   - Click off "All Campuses"
   - Verify back to Campus A only
   - Verify filter status text updates

### Expected API Behavior

- Default request should include user's campus in JWT
- With `?allCampuses=true`, backend ignores JWT campus and shows all
- With both `?allCampuses=true&campus=ID`, shows that specific campus

## Future Enhancements

1. **Favorite Campuses**: Let users mark campuses to quickly filter to those
2. **Campus Suggestions**: Show popular items from nearby campuses
3. **Cross-Campus Notifications**: Notify when interesting items appear in other campuses
4. **Campus Analytics**: Show which campuses have most listings

## Troubleshooting

### Issue: User still sees other campus listings
- **Check**: Is user authenticated? Campus filtering only applies to authenticated users
- **Check**: Is backend enforcing campus filter? Verify controller code
- **Check**: Is `allCampuses=true` being sent? User may have accidentally toggled

### Issue: Campus dropdown not showing
- **Check**: Is `allCampuses` toggled to true?
- **Check**: Are all campuses being fetched? Check `useAllCampuses` hook
- **Check**: Is `CampusFilter` receiving `allCampuses` array?

## Summary

The campus filtering system provides:
- ✅ Automatic campus isolation by default
- ✅ Simple toggle to view all campuses
- ✅ Granular filtering to specific campuses
- ✅ Server-side security enforcement
- ✅ Consistent UI across all listing pages
- ✅ Easy integration with existing pages
