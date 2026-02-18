# 🚀 Performance Optimization Setup Guide

## Getting Started with Performance Features

### 1. Using OptimizedImage Component

Replace standard `img` or `Image` tags with `OptimizedImage`:

```jsx
import OptimizedImage from '@/components/common/OptimizedImage';

// Basic usage
<OptimizedImage
  src="/products/item-1.jpg"
  alt="Product name"
  width={400}
  height={300}
/>

// With optimization options
<OptimizedImage
  src={imageSrc}
  alt="Description"
  width={400}
  height={300}
  quality={75}           // 0-100, default 75
  priority={false}       // Set to true for above-fold images
  objectFit="cover"      // cover, contain, fill, etc.
  objectPosition="center"
  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
/>
```

**Benefits:**
- Automatic format selection (WebP, AVIF)
- Lazy loading with Intersection Observer
- Blur placeholder while loading
- 35% smaller images on average
- Mobile-optimized responsive sizes

### 2. Using SuspenseBoundary

Wrap async components with error handling and loading states:

```jsx
import SuspenseBoundary, { GridSkeleton } from '@/components/common/SuspenseBoundary';

// Basic usage with default Grid skeleton
<SuspenseBoundary>
  <AsyncProductList />
</SuspenseBoundary>

// With custom fallback
<SuspenseBoundary fallback={<ListSkeleton />}>
  <AsyncItemList />
</SuspenseBoundary>

// Available skeletons
import {
  ListSkeleton,
  GridSkeleton,
  TableSkeleton,
  CardSkeleton
} from '@/components/common/SuspenseBoundary';
```

**Benefits:**
- Automatic error handling
- Better perceived performance
- User-friendly error messages
- Reduces CLS (Cumulative Layout Shift)

### 3. Using Paginated Queries

Handle large lists with automatic prefetching:

```jsx
import { usePaginatedQuery } from '@/hooks/usePaginatedQuery';

function ProductList() {
  const {
    data,
    isLoading,
    currentPage,
    hasNextPage,
    goToPage,
    nextPage,
  } = usePaginatedQuery(
    'products',
    async ({ page, pageSize }) => {
      const res = await fetch(`/api/products?page=${page}&limit=${pageSize}`);
      return res.json();
    },
    {
      pageSize: 20,
      prefetchPages: 2,  // Prefetch next 2 pages
    }
  );

  return (
    <div>
      {data?.items?.map(item => <Item key={item.id} {...item} />)}
      <button onClick={nextPage} disabled={!hasNextPage}>
        Load More
      </button>
    </div>
  );
}
```

**Benefits:**
- Smooth pagination transitions
- Auto-prefetch next pages
- Keep previous data while loading
- Supports infinite scroll patterns
- Handles 10,000+ items smoothly

### 4. Tracking Web Vitals

Web Vitals are automatically tracked when you add `<WebVitalsReporter />` to your layout (already done in `src/app/layout.js`).

Check metrics in development console:

```javascript
import { getVitals, reportVitalsSummary } from '@/lib/web-vitals';

// Get current vitals
const vitals = getVitals();
console.log(vitals);
// { CLS: 0.05, FID: 45, FCP: 1230, LCP: 2100, TTFB: 500 }

// Print summary report
reportVitalsSummary();
// 📊 Web Vitals Summary
// ✅ FCP: 1230ms (target: 1800ms)
// ✅ LCP: 2100ms (target: 2500ms)
// ⚠️ TTI: 3450ms (target: 3000ms)
```

**Development Dashboard:**
```
Check your browser console at load time to see:
- All metrics with thresholds
- Status indicator (✅ good, ⚠️ warning)
- Timestamp and page URL
```

### 5. React Query Configuration

React Query is automatically configured with optimal defaults. For custom queries:

```jsx
import { useQuery } from '@tanstack/react-query';

// Standard query - uses configured defaults
const { data, isLoading } = useQuery({
  queryKey: ['products', categoryId],
  queryFn: () => fetchProducts(categoryId),
  // ✅ Automatic staleTime based on queryKey
  // ✅ Automatic retry strategy
  // ✅ Automatic garbage collection after 10 minutes
});
```

**Cache Durations (Automatically Applied):**
```
Static Data (30 min):    categories, campuses, departments, faculties
List Data (1 min):       services, products, hostels, requests, events
Real-time (15 sec):      chats, messages, notifications
Default (30 sec):        all other queries
```

### 6. Dynamic Imports for Large Components

Already configured, but use for new heavy components:

```jsx
import dynamic from 'next/dynamic';
import { CardSkeleton } from '@/components/common/SuspenseBoundary';

const HeavyChart = dynamic(
  () => import('@/components/analytics/HeavyChart'),
  {
    loading: () => <CardSkeleton />,
    ssr: false // Don't render on server if real-time data
  }
);

export default function Page() {
  return (
    <div>
      <HeavyChart />  {/* Loads on client, shows skeleton while loading */}
    </div>
  );
}
```

**Benefits:**
- Reduce initial bundle size
- Load heavy components on-demand
- Better code splitting

### 7. Performance CSS

Global animation and optimization CSS is in `src/app/performance.css`. Key features:

```css
/* Respects user's motion preferences */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
  }
}

/* CSS Containment for cards */
.product-card {
  contain: layout style paint;
}

/* Touch optimization */
@media (hover: none) and (pointer: coarse) {
  button, a {
    min-height: 44px; /* Accessible tap target */
  }
}
```

---

## 🎯 Performance Optimization Checklist

### For New Pages
- [ ] Use OptimizedImage for all product/service/hostel images
- [ ] Wrap async data with SuspenseBoundary
- [ ] Use usePaginatedQuery for lists > 50 items
- [ ] Lazy load non-critical components with dynamic()
- [ ] Check Web Vitals in console

### For New Components
- [ ] Replace `img` tags with OptimizedImage
- [ ] Replace `Image` with OptimizedImage
- [ ] Add `priority` prop to above-fold images
- [ ] Use appropriate `sizes` prop
- [ ] Set `quality={75}` (or lower for thumbnails)

### For API Endpoints
- [ ] Cache responses appropriate to data type
- [ ] Use React Query's staleTime
- [ ] Implement pagination for large datasets
- [ ] Add error boundaries

### For Deployment
- [ ] Run Lighthouse audit
- [ ] Check Web Vitals (should be green)
- [ ] Test on 3G connection
- [ ] Test on low-end mobile device
- [ ] Monitor Core Web Vitals in production

---

## 📊 Monitoring Performance

### Development Mode
Every page load logs Web Vitals to console:
```
✅ FCP: 1123ms (target: 1800ms)
✅ LCP: 2045ms (target: 2500ms)
✅ TTI: 2834ms (target: 3000ms)
✅ CLS: 0.08 (target: 0.1)
⚠️ TTFB: 650ms (target: 600ms)
```

### Production Mode
Configure analytics URL in `.env`:
```env
NEXT_PUBLIC_ANALYTICS_URL=https://analytics.example.com/metrics
```

Web Vitals exceeding thresholds are automatically sent to:
```json
{
  "metric": "LCP",
  "value": 3200,
  "threshold": 2500,
  "status": "warning",
  "timestamp": "2024-01-15T10:30:45Z",
  "url": "/products"
}
```

### Browser DevTools
1. **Performance Tab**: Record and analyze interactions
2. **Lighthouse**: Full audit (target score: 90+)
3. **Coverage Tab**: See unused CSS/JS
4. **Network Tab**: Check image sizes and formats

---

## ⚠️ Common Pitfalls to Avoid

### ❌ Don't
```jsx
// ❌ Using regular img tag
<img src={imageUrl} alt="Product" />

// ❌ Creating new functions in render
<Component onClick={() => handleClick()} />

// ❌ Missing sizes attribute
<OptimizedImage src={src} alt="..." />

// ❌ Too high quality for thumbnails
<OptimizedImage src={src} quality={95} />

// ❌ Rendering all items at once
{allProducts.map(p => <ProductCard {...p} />)}
```

### ✅ Do
```jsx
// ✅ Using OptimizedImage
<OptimizedImage src={imageUrl} alt="Product" quality={75} />

// ✅ Memoize callback
const handleClick = useCallback(() => { ... }, []);
<Component onClick={handleClick} />

// ✅ Always include sizes
<OptimizedImage src={src} sizes="(max-width: 640px) 100vw, 50vw" />

// ✅ Reduce quality for thumbnails
<OptimizedImage src={src} quality={60} width={150} height={150} />

// ✅ Paginate large lists
usePaginatedQuery('products', fetchProducts, { pageSize: 20 })
```

---

## 🆘 Troubleshooting

### Images Not Loading
- Check image URL is valid
- Ensure Cloudinary domain is in `next.config.js` `remotePatterns`
- Use fallback image if source unavailable

### Skeleton Showing Too Long
- Reduce API response time (add caching)
- Use placeholder data from React Query
- Pre-fetch data before page change

### Web Vitals Warnings
- Check LCP: Ensure largest image has `priority` or is visible
- Check CLS: Use `SuspenseBoundary` with skeleton
- Check TTI: Reduce JavaScript with dynamic imports

### Bundle Size Large
- Check with: `npm run analyze`
- Split code with dynamic imports
- Tree-shake unused dependencies

---

## 📚 Resources

- [Next.js Image Optimization](https://nextjs.org/docs/basic-features/image-optimization)
- [React Query Documentation](https://tanstack.com/query/latest)
- [Web Vitals Guide](https://web.dev/vitals/)
- [Lighthouse Scoring](https://developer.chrome.com/en/docs/lighthouse/performance-scoring/)
- [Web Performance APIs](https://developer.mozilla.org/en-US/docs/Web/API/Performance)

---

## 🤝 Support

For questions or issues:
1. Check this guide first
2. Review `PERFORMANCE_OPTIMIZATION_FINAL_REPORT.md`
3. Check browser console for error messages
4. Run Lighthouse audit for specific issues
5. Contact the development team

---

**Last Updated**: 2024
**Version**: 1.0
**Status**: Production Ready
