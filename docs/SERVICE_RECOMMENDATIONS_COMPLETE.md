# Service Recommendations System - Implementation Complete

## Overview
A comprehensive recommendation system for services enabling discovery of related services, trending services, and personalized recommendations based on user preferences and history.

## Files Created

### 1. Service Layer - API Abstraction
**File:** `src/services/serviceRecommendations.js`
- **Purpose:** API abstraction for all recommendation operations
- **Total Lines:** 280+

**Core Functions:**

#### `getPopularServices(limit=10)`
- Returns trending/popular services for homepage discovery
- Endpoint: `GET /services/popular`
- Cache: 1 hour (stable data)
- Use case: Homepage hero section, discovery sections

#### `getPersonalizedServiceRecommendations(limit=10)`
- Returns ML-based recommendations for logged-in users
- Endpoint: `GET /services/recommendations/personalized`
- Cache: 30 minutes (should be fresh)
- Use case: "Recommended For You" section on detail page
- Requires: Authentication

#### `getRelatedServices(serviceId, limit=6)`
- Returns services similar to specified service
- Endpoint: `GET /services/{serviceId}/related`
- Cache: 1 hour
- Fallback: Uses category-based filtering if unavailable
- Use case: "Related Services" section on detail page

#### `getServicesByCategory(categoryId, excludeServiceId, limit=6)`
- Returns services in same category (fallback for related)
- Endpoint: `GET /services` (with category filter)
- Cache: 1 hour
- Use case: Fallback when related services API unavailable

#### `getFrequentlyBookedTogether(serviceId, limit=6)`
- Returns services frequently booked with specified service
- Endpoint: `GET /services/{serviceId}/frequently-booked`
- Cache: 2 hours
- Use case: Bundle suggestions, cross-selling

#### `markRecommendationAsClicked(recommendationId)`
- Tracks user interaction for ML improvement
- Endpoint: `POST /recommendations/{id}/click`
- Non-blocking: Doesn't throw errors
- Use case: Analytics tracking

#### `dismissRecommendation(recommendationId)`
- Allows users to hide/dismiss recommendations
- Endpoint: `POST /recommendations/{id}/dismiss`
- Non-blocking: Doesn't throw errors
- Use case: Preference feedback for ML

#### `getTrendingServicesByCategory(categoryId, limit=6)`
- Returns trending services within specific category
- Endpoint: `GET /services/trending` (with category)
- Cache: 2 hours
- Use case: Category-specific recommendations

#### `getTopRatedServices(limit=10)`
- Returns highest-rated services (rating >= 4.0)
- Endpoint: `GET /services` (sorted by rating)
- Cache: 2 hours
- Use case: Quality-focused recommendations

#### `getServicesByPriceRange(minPrice, maxPrice, excludeServiceId, limit=6)`
- Returns services in same price range (alternative search)
- Endpoint: `GET /services` (with price filters)
- Cache: 1 hour
- Use case: Budget-conscious recommendations

---

### 2. React Query Hooks - State Management
**File:** `src/hooks/useServiceRecommendations.js`
- **Purpose:** React Query integration for all recommendation queries
- **Total Lines:** 150+

**Hooks Implemented:**

#### `usePopularServices(enabled=true)`
- Query key: `['popularServices']`
- Stale time: 1 hour
- GC time: 24 hours
- Returns: `{ data, isLoading, error }`

#### `usePersonalizedServiceRecommendations(enabled=true)`
- Query key: `['personalizedServiceRecommendations']`
- Stale time: 30 minutes (more fresh than others)
- GC time: 2 hours
- Returns: `{ data, isLoading, error }`

#### `useRelatedServices(serviceId, enabled=true)`
- Query key: `['relatedServices', serviceId]`
- Depends on: serviceId must be provided and truthy
- Stale time: 1 hour
- GC time: 24 hours
- Returns: `{ data, isLoading, error }`

#### `useServicesByCategory(categoryId, excludeServiceId, enabled=true)`
- Query key: `['servicesByCategory', categoryId, excludeServiceId]`
- Stale time: 1 hour
- GC time: 24 hours
- Returns: `{ data, isLoading, error }`

#### `useFrequentlyBookedTogether(serviceId, enabled=true)`
- Query key: `['frequentlyBookedTogether', serviceId]`
- Stale time: 2 hours
- GC time: 24 hours
- Returns: `{ data, isLoading, error }`

#### `useMarkRecommendationAsClicked()`
- Mutation hook for tracking clicks
- Non-blocking: Doesn't update UI or throw errors
- Returns: `{ mutate: (recommendationId) => void }`

#### `useDismissRecommendation()`
- Mutation hook for dismissing recommendations
- Invalidates: personalizedServiceRecommendations, popularServices
- Returns: `{ mutate: (recommendationId) => void }`

#### `useTrendingServicesByCategory(categoryId, enabled=true)`
- Query key: `['trendingServicesByCategory', categoryId]`
- Stale time: 2 hours
- GC time: 24 hours
- Returns: `{ data, isLoading, error }`

#### `useTopRatedServices(enabled=true)`
- Query key: `['topRatedServices']`
- Stale time: 2 hours
- GC time: 24 hours
- Returns: `{ data, isLoading, error }`

#### `useServicesByPriceRange(minPrice, maxPrice, excludeServiceId, enabled=true)`
- Query key: `['servicesByPriceRange', minPrice, maxPrice, excludeServiceId]`
- Stale time: 1 hour
- GC time: 24 hours
- Returns: `{ data, isLoading, error }`

---

### 3. Related Services Component
**File:** `src/components/services/RelatedServices.jsx`
- **Purpose:** Display services related to current service
- **Lines:** 180+

**Props:**
```javascript
{
  serviceId: string,              // Current service ID
  categoryId: string,             // Current service category
  onNavigateToService: (id) => {}, // Navigation callback
}
```

**Features:**
- Fetches related services via `useRelatedServices`
- Falls back to `useServicesByCategory` if no related services
- Horizontal scroll on mobile
- Grid layout on desktop
- Skeleton loading state (3 cards)
- Empty state gracefully hidden
- "View All" link if more than 3 items
- Click navigation to service detail

**Section Header:**
- Title: "Related Services"
- "View All" link with chevron animation

**UI Behavior:**
- Mobile: Horizontal scrolling carousel
- Desktop (1024px+): Auto-fill grid layout
- Responsive cards: 100vw-48px on mobile, 50vw on tablet, 33.3% on desktop

---

### 4. Popular Services Component
**File:** `src/components/services/PopularServices.jsx`
- **Purpose:** Display trending/popular services
- **Lines:** 180+

**Props:**
```javascript
{
  onNavigateToService: (id) => {}, // Navigation callback
}
```

**Features:**
- Fetches popular services via `usePopularServices`
- 1-hour cache (stable trending data)
- Trending badge displayed
- Skeleton loading state (4 cards)
- Empty state gracefully hidden
- "View All" link if more than 3 items
- Trending icon with orange accent (#ff6b35)

**Section Header:**
- Icon: Trending up arrow (orange)
- Title: "Popular Services"
- Badge: "TRENDING" (orange/indigo color scheme)
- "View All" link with animation

**UI Behavior:**
- Same responsive layout as Related Services
- Mobile-first horizontal scroll
- Desktop grid layout

---

### 5. Personalized Recommendations Component
**File:** `src/components/services/PersonalizedServiceRecommendations.jsx`
- **Purpose:** ML-based personalized recommendations for logged-in users
- **Lines:** 180+

**Props:**
```javascript
{
  enabled: boolean,               // Show only if user authenticated
  onNavigateToService: (id) => {}, // Navigation callback
}
```

**Features:**
- Requires authentication (enabled prop)
- Fetches personalized recommendations via `usePersonalizedServiceRecommendations`
- 30-minute cache (fresher than other recommendations)
- Personalized badge displayed
- Sparkles icon with indigo accent (#6366f1)
- Skeleton loading state (4 cards)
- Empty state gracefully hidden
- "View All" link if more than 3 items

**Section Header:**
- Icon: Sparkles (indigo)
- Title: "Recommended For You"
- Badge: "PERSONALIZED" (indigo color scheme)
- "View All" link with animation

**UI Behavior:**
- Same responsive layout as other components
- Conditionally rendered based on user authentication

---

### 6. Service Detail Page Integration
**File:** `src/app/(protected)/services/[id]/page.js` (MODIFIED)
- **Changes Made:**
  - Imported 3 recommendation components
  - Added RelatedServices section after reviews
  - Added PopularServices section for discovery
  - Added PersonalizedServiceRecommendations for logged-in users

**Integration Points:**
```javascript
// After ServiceReviewSection
<RelatedServices
  serviceId={service._id}
  categoryId={service.category?._id || service.category}
  onNavigateToService={(serviceId) => router.push(`/services/${serviceId}`)}
/>

<PopularServices
  onNavigateToService={(serviceId) => router.push(`/services/${serviceId}`)}
/>

<PersonalizedServiceRecommendations
  enabled={!!user}
  onNavigateToService={(serviceId) => router.push(`/services/${serviceId}`)}
/>
```

**Page Flow:**
1. Service details displayed
2. Service image gallery
3. Service options/variants
4. Service reviews section
5. **↓ NEW:**
6. Related services (same category)
7. Popular/trending services
8. Personalized recommendations (if authenticated)

---

## Design System & Styling

### Color Scheme
- **Trending**: Orange (#ff6b35) with light background (#ffe8d6)
- **Personalized**: Indigo (#6366f1) with light background (#e0e7ff)
- **General**: Dark (#1a1a1a), Light backgrounds (#f5f5f5, #f9f9f9)

### Responsive Breakpoints
- **Mobile**: Full-width scroll (100vw - 48px padding)
- **Tablet (640px)**: Half-width (50vw)
- **Desktop (768px)**: One-third width (33.3%)
- **Large Desktop (1024px)**: Grid layout (240px min columns)

### Typography
- Section titles: 18px (mobile), 20px (desktop), weight 700
- Badge text: 11px, weight 700, uppercase, 0.5px letter-spacing
- "View All" link: 13px (mobile), 14px (desktop), weight 600

### Spacing
- Section margins: 32px (mobile), 40px (desktop)
- Card gaps: 12px (mobile), 16px (desktop)
- Padding: 16px (mobile), 0 (desktop)

### Loading States
- Skeleton cards: Same dimensions as actual cards
- Pulse animation: 2s opacity transition
- Show 3-4 skeletons depending on component

---

## Data Flow & Caching

### Query Key Structure
```javascript
['popularServices']
['personalizedServiceRecommendations']
['relatedServices', serviceId]
['frequentlyBookedTogether', serviceId]
['topRatedServices']
['trendingServicesByCategory', categoryId]
['servicesByPriceRange', minPrice, maxPrice, excludeServiceId]
['servicesByCategory', categoryId, excludeServiceId]
```

### Cache Invalidation
- `useDismissRecommendation()` invalidates:
  - `personalizedServiceRecommendations`
  - `popularServices`
- Manual refetch triggers: Page navigation, direct API calls

### Stale Times Strategy
- **1 hour**: Related services, category services, popular services, price range
- **30 minutes**: Personalized recommendations (more dynamic)
- **2 hours**: Frequently booked, trending by category, top-rated

### GC Times
- All queries: 24-hour garbage collection except:
  - Personalized recommendations: 2 hours
  - Mutations: Immediate cleanup

---

## Error Handling & Fallbacks

### Graceful Degradation
1. Related services API fails → Fall back to category-based
2. Personalized recommendations API fails → Show nothing
3. Popular services API fails → Show nothing
4. All fallbacks return empty arrays, never throw errors

### User Experience
- Loading states: Skeleton cards animate smoothly
- Empty states: Sections hidden if no data
- Errors: Non-blocking, sections just don't appear
- No error messages: Seamless experience if recommendation APIs unavailable

### Analytics Tracking
- `markRecommendationAsClicked`: Non-blocking, fire-and-forget
- `dismissRecommendation`: Non-blocking, optimistic UI update
- Never disrupts user flow with tracking errors

---

## API Endpoints Expected

### Endpoints

1. **GET /services/popular?limit=10**
   - Returns: `{ data: { popular: [...] } }`
   - Format: Array of service objects

2. **GET /services/recommendations/personalized?limit=10**
   - Returns: `{ data: { recommendations: [...] } }`
   - Requires: Authentication
   - Format: Array of service objects

3. **GET /services/{id}/related?limit=6**
   - Returns: `{ data: { related: [...] } }`
   - Format: Array of similar service objects

4. **GET /services/{id}/frequently-booked?limit=6**
   - Returns: `{ data: { services: [...] } }`
   - Format: Array of frequently paired services

5. **POST /recommendations/{id}/click**
   - Body: None
   - Returns: `{ data: { tracked: true } }`

6. **POST /recommendations/{id}/dismiss**
   - Body: None
   - Returns: `{ data: { dismissed: true } }`

7. **GET /services/trending?category={id}&limit=6**
   - Returns: `{ data: { services: [...] } }`
   - Format: Array of trending services in category

8. **GET /services?sort=-rating&minRating=4&limit=10**
   - Returns: `{ data: { services: [...] } }`
   - Format: Top-rated services

---

## User Experience Scenarios

### Scenario 1: Browse Service Detail
```
1. User views tutoring service detail page
2. Page loads service info, reviews, recommendations
3. "Related Services" section shows other tutors/educational services
4. "Popular Services" shows trending offerings (makeup, fitness, etc.)
5. "Recommended For You" shows services based on user's booking history
6. User clicks on recommendation → Navigates to that service
```

### Scenario 2: Personalized Discovery
```
1. User authenticated, visits service detail
2. "Recommended For You" section fetches personalized picks (30-min cache)
3. Shows services ML model thinks user would book
4. User dismisses recommendation (doesn't want to see similar)
5. Next personalization request excludes dismissed service
```

### Scenario 3: Category-Based Fallback
```
1. User views niche service with no "related services" API data
2. "Related Services" component silently falls back to category query
3. Shows other services from same category instead
4. User sees quality recommendations without knowing about fallback
```

---

## Performance Optimizations

### Caching
- Popular services cached 1 hour (rarely changes)
- Personalized recommendations cached 30 min (user-specific)
- Related services cached by serviceId (reused across visits)

### Request Prevention
- `enabled` conditions prevent unnecessary API calls
- Query keys with parameters cache separately
- Mutations don't cause full page refetch

### Component Optimization
- Skeleton loaders prevent layout shift
- `onNavigateToService` callback avoids re-renders
- ServiceCard component reused efficiently

### SEO & Performance
- Recommendations load after main content
- Non-blocking tracking (analytics don't block UI)
- Fallbacks ensure core experience works without APIs

---

## Mobile Responsiveness

### Mobile (< 640px)
- Full-width viewport scroll (100vw - padding)
- 16px padding/gap
- Section padding: 16px
- Title font: 18px

### Tablet (640px - 1023px)
- Half-viewport scroll (50vw)
- 16px gaps
- Title font: 20px

### Desktop (1024px+)
- Grid layout: 240px min columns
- Auto-fill grid
- No padding on sides
- 24px gaps

---

## File Structure

```
src/
├── services/
│   └── serviceRecommendations.js      (280+ lines)
├── hooks/
│   └── useServiceRecommendations.js   (150+ lines)
├── components/services/
│   ├── RelatedServices.jsx            (180 lines)
│   ├── PopularServices.jsx            (180 lines)
│   └── PersonalizedServiceRecommendations.jsx (180 lines)
└── app/(protected)/services/[id]/
    └── page.js                         (MODIFIED - added 20 lines)
```

---

## Testing Checklist

- [ ] Related services load on service detail page
- [ ] Related services fall back to category if no API data
- [ ] Popular services display with trending badge
- [ ] Popular services 1-hour cache works (verify after 1hr)
- [ ] Personalized recommendations show only if user authenticated
- [ ] Personalized recommendations hide if user not authenticated
- [ ] Clicking recommendation navigates to service
- [ ] Loading skeletons animate smoothly
- [ ] All sections responsive on mobile/tablet/desktop
- [ ] No console errors
- [ ] Fallback pages work if recommendation APIs unavailable
- [ ] Recommendation sections hidden if no data
- [ ] "View All" link appears only if > 3 items
- [ ] Icons and badges display correctly
- [ ] Touch-friendly card sizes on mobile

---

## Completion Status

✅ Service Recommendations Service Layer - 100% COMPLETE
✅ Service Recommendations Hooks - 100% COMPLETE
✅ Related Services Component - 100% COMPLETE
✅ Popular Services Component - 100% COMPLETE
✅ Personalized Recommendations Component - 100% COMPLETE
✅ Service Detail Page Integration - 100% COMPLETE
✅ Error Handling & Fallbacks - 100% COMPLETE
✅ Mobile Responsive Design - 100% COMPLETE

**Total Code Written:** 1,000+ lines across 6 files

---

## Future Enhancements

1. **Wishlist Integration**
   - Show items from user's wishlist in recommendations
   - "Add to Wishlist" buttons on recommendation cards

2. **Personalized Filters**
   - User preferences: price range, rating threshold
   - Location-based recommendations
   - Time-based (always available services, etc.)

3. **Search-Based Recommendations**
   - "Also searched for" section
   - "Often bought with" section
   - Query suggestions on search page

4. **Analytics Dashboard**
   - Which recommendations get clicked most
   - CTR by position and type
   - User engagement metrics

5. **Advanced ML Features**
   - Collaborative filtering
   - Content-based filtering
   - Hybrid recommendations
   - Cold-start problem handling for new users

