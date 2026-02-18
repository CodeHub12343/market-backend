# Campus Filtering - Quick Integration Guide

## Quick Start for Other Pages

Use this template to add campus filtering to any listing page in ~5 minutes.

---

## Template: Services Page

File: `/src/app/(protected)/services/page.js`

```javascript
'use client';

import { useState } from 'react';
import { useAllServices } from '@/hooks/useServices';
import { useCampusFilter } from '@/hooks/useCampusFilter';
import { useAllCampuses } from '@/hooks/useCampuses';
import CampusFilter from '@/components/common/CampusFilter';
import ServiceGrid from '@/components/services/ServiceGrid';

export default function ServicesPage() {
  const [filters, setFilters] = useState({
    category: '',
    search: '',
    minPrice: '',
    maxPrice: '',
  });

  // Campus filtering
  const campusFilter = useCampusFilter();
  const { data: allCampuses = [] } = useAllCampuses();

  // Merge campus filter with other filters
  const enhancedFilters = {
    ...filters,
    ...campusFilter.getFilterParams()
  };

  const { data: services, isLoading, error } = useAllServices(enhancedFilters);

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

      {/* Services content */}
      <ServiceGrid services={services} isLoading={isLoading} error={error} />
    </div>
  );
}
```

---

## Template: Events Page

File: `/src/app/(protected)/events/page.js`

```javascript
'use client';

import { useState } from 'react';
import { useAllEvents } from '@/hooks/useEvents';
import { useCampusFilter } from '@/hooks/useCampusFilter';
import { useAllCampuses } from '@/hooks/useCampuses';
import CampusFilter from '@/components/common/CampusFilter';
import EventGrid from '@/components/events/EventGrid';

export default function EventsPage() {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    category: '',
    search: '',
  });

  // Campus filtering
  const campusFilter = useCampusFilter();
  const { data: allCampuses = [] } = useAllCampuses();

  // Merge campus filter with other filters
  const enhancedFilters = {
    ...filters,
    page,
    limit: 12,
    ...campusFilter.getFilterParams()
  };

  const { data, isLoading, error } = useAllEvents(enhancedFilters);

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

      {/* Events content */}
      <EventGrid events={data?.data || []} isLoading={isLoading} error={error} />
    </div>
  );
}
```

---

## 3-Step Implementation

### Step 1: Add Imports
```javascript
import { useCampusFilter } from '@/hooks/useCampusFilter';
import { useAllCampuses } from '@/hooks/useCampuses';
import CampusFilter from '@/components/common/CampusFilter';
```

### Step 2: Initialize Hooks
```javascript
const campusFilter = useCampusFilter();
const { data: allCampuses = [] } = useAllCampuses();
```

### Step 3: Merge Filters & Render
```javascript
const enhancedFilters = {
  ...otherFilters,
  ...campusFilter.getFilterParams()
};

const { data } = useYourListingHook(enhancedFilters);

// In JSX:
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
```

---

## Pages That Need Integration

Priority order:

1. **Services Page** (`/src/app/(protected)/services/page.js`)
   - Same as template above
   - Uses `useAllServices` hook

2. **Events Page** (`/src/app/(protected)/events/page.js`)
   - Same as template above
   - Uses `useAllEvents` hook

3. **Requests Page** (`/src/app/(protected)/requests/page.js`)
   - Uses `useRequests` hook
   - May already have campus filter in service layer

4. **Roommate Listings** (`/src/app/(protected)/roommates/page.js`)
   - Uses roommate service hook
   - Check if hook exists

5. **Documents** (`/src/app/(protected)/documents/page.js`)
   - Uses document service hook
   - May already have campus filter

---

## Verification Checklist

After integrating campus filtering:

- [ ] Page imports `useCampusFilter`, `useAllCampuses`, `CampusFilter`
- [ ] `campusFilter` hook is initialized
- [ ] `allCampuses` data is fetched
- [ ] Filters merged with `campusFilter.getFilterParams()`
- [ ] `CampusFilter` component rendered with all props
- [ ] "My Campus" shows only user's campus listings
- [ ] "All Campuses" shows listings from all campuses
- [ ] Campus dropdown filters correctly when visible
- [ ] Toggle works smoothly (no delays/errors)
- [ ] Mobile responsive on small screens
- [ ] Loading state works properly

---

## What You Get

After integrating campus filtering on a page:

✅ Users see only their campus by default (secure)
✅ Simple toggle to view all campuses
✅ Campus dropdown for granular filtering
✅ Consistent UI across all pages
✅ Mobile-friendly interface
✅ Accessible (ARIA labels, keyboard nav)
✅ No performance impact

---

## Files to Modify

```
High Priority:
  [ ] /src/app/(protected)/services/page.js
  [ ] /src/app/(protected)/events/page.js

Medium Priority:
  [ ] /src/app/(protected)/requests/page.js
  [ ] /src/app/(protected)/roommates/page.js

Low Priority (may already have):
  [ ] /src/app/(protected)/documents/page.js
  [ ] /src/app/(protected)/shops/page.js
```

---

## If Something Goes Wrong

### Error: "Cannot find module useCampusFilter"
- Solution: Check file is in `/src/hooks/useCampusFilter.js`
- Solution: Verify import path: `@/hooks/useCampusFilter`

### Campus filter not showing
- Check: Is `CampusFilter` component imported?
- Check: Is it rendered in JSX?
- Check: Are all props passed correctly?

### Campus filter clicks do nothing
- Check: Are event handlers passed? (`onToggleAllCampuses`, `onCampusChange`)
- Check: Are they actually calling the functions?

### Still seeing all campuses by default
- This is expected! Check browser dev tools → Network
- Verify request includes correct campus parameter
- Problem might be on backend, not frontend

---

## Support

Refer to:
- [CAMPUS_FILTERING_IMPLEMENTATION.md](CAMPUS_FILTERING_IMPLEMENTATION.md) - Full documentation
- [CAMPUS_FILTERING_IMPLEMENTATION_SUMMARY.md](CAMPUS_FILTERING_IMPLEMENTATION_SUMMARY.md) - What was implemented
- Products page example in `/src/app/(protected)/products/page.js` - Real working example

---

## Performance Tips

1. **Cache Campuses**
   - Already set to 1 hour (campuses rarely change)
   - Frontend caches campuses list

2. **Avoid Refetching**
   - Campus parameter changes are handled efficiently
   - React Query keeps cache and refetches smartly

3. **Mobile Optimization**
   - CampusFilter component is mobile-first designed
   - Minimal re-renders when toggling

---

Done! 🎉 Integration should take ~5 minutes per page.
