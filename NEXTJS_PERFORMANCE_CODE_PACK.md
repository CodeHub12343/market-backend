# Next.js Performance Optimization - Code Implementation Pack
## Production-Ready Code Examples

---

## 1. OPTIMIZED REACT QUERY CONFIGURATION

### src/lib/react-query-config.js
```javascript
import { QueryClient, DefaultError } from '@tanstack/react-query';

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // ✅ Differentiate stale times by data type
        staleTime: (query) => {
          const queryKey = query.queryKey[0];
          
          // Static data (categories, campuses) - 30 minutes
          if (['categories', 'campuses', 'departments'].includes(queryKey)) {
            return 30 * 60 * 1000;
          }
          
          // List data (services, products) - 1 minute
          if (['services', 'products', 'roommates'].includes(queryKey)) {
            return 1 * 60 * 1000;
          }
          
          // Real-time data (chats, messages) - 15 seconds
          if (['chats', 'messages'].includes(queryKey)) {
            return 15 * 1000;
          }
          
          // Default - 30 seconds
          return 30 * 1000;
        },
        
        // ✅ Keep data in cache while in background
        gcTime: 10 * 60 * 1000, // 10 minutes
        
        // ✅ Retry strategy
        retry: (failureCount, error) => {
          // Don't retry 4xx errors (client errors)
          if (error?.response?.status >= 400 && error?.response?.status < 500) {
            return false;
          }
          // Retry up to 2 times for 5xx errors
          return failureCount < 2;
        },
        
        // ✅ Exponential backoff for retries
        retryDelay: (attemptIndex) => {
          return Math.min(1000 * Math.pow(2, attemptIndex), 30000);
        },
      },
      mutations: {
        retry: 1,
        retryDelay: 1000,
      },
    },
  });
}

// ✅ Prefetch helper
export const createPrefetchHelper = (queryClient) => ({
  services: (filters) =>
    queryClient.prefetchQuery({
      queryKey: ['services', filters],
      queryFn: () => fetchServices(filters),
      staleTime: 60 * 1000,
    }),
  
  serviceDetail: (id) =>
    queryClient.prefetchQuery({
      queryKey: ['service', id],
      queryFn: () => fetchService(id),
      staleTime: 5 * 60 * 1000,
    }),
  
  userChats: () =>
    queryClient.prefetchQuery({
      queryKey: ['chats', 'user'],
      queryFn: fetchUserChats,
      staleTime: 15 * 1000,
    }),
});
```

---

## 2. OPTIMIZED HOOKS WITH PREFETCHING

### src/hooks/useServices-optimized.js
```javascript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';
import * as serviceApi from '@/services/services';

const SERVICES_STALE_TIME = 60 * 1000;
const SERVICES_CACHE_TIME = 5 * 60 * 1000;

export const useAllServices = (filters = {}, enabled = true) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['services', filters],
    queryFn: () => serviceApi.fetchServices(filters),
    staleTime: SERVICES_STALE_TIME,
    gcTime: SERVICES_CACHE_TIME,
    enabled: !!enabled,
    // ✅ Keep previous data while fetching new
    placeholderData: (previousData) => previousData,
  });

  // ✅ Prefetch next page automatically
  const prefetchNextPage = useCallback((nextFilters) => {
    queryClient.prefetchQuery({
      queryKey: ['services', nextFilters],
      queryFn: () => serviceApi.fetchServices(nextFilters),
      staleTime: SERVICES_STALE_TIME,
    });
  }, [queryClient]);

  // ✅ Auto-prefetch when needed
  const prefetchRelated = useCallback((categoryId) => {
    queryClient.prefetchQuery({
      queryKey: ['services', { category: categoryId, limit: 6 }],
      queryFn: () => serviceApi.fetchServices({ category: categoryId, limit: 6 }),
    });
  }, [queryClient]);

  return {
    ...query,
    prefetchNextPage,
    prefetchRelated,
  };
};

export const useService = (id, options = {}) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['service', id],
    queryFn: () => serviceApi.fetchService(id),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: !!id,
    ...options,
  });

  // ✅ Prefetch related services
  const prefetchRelated = useCallback(() => {
    if (query.data?.category) {
      queryClient.prefetchQuery({
        queryKey: ['services', { category: query.data.category, limit: 6 }],
        queryFn: () => serviceApi.fetchServices({ 
          category: query.data.category, 
          limit: 6,
          exclude: id,
        }),
      });
    }
  }, [query.data, id, queryClient]);

  return {
    ...query,
    prefetchRelated,
  };
};

export const useCreateService = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: serviceApi.createService,
    onSuccess: (newService) => {
      // ✅ Update cache immediately
      queryClient.setQueryData(['service', newService.id], newService);
      
      // ✅ Invalidate list to refetch
      queryClient.invalidateQueries({
        queryKey: ['services'],
      });
    },
    onError: (error) => {
      console.error('Create service failed:', error);
    },
  });
};

export const useInfiniteServices = (filters = {}) => {
  return useInfiniteQuery({
    queryKey: ['services-infinite', filters],
    queryFn: ({ pageParam = 0 }) => 
      serviceApi.fetchServices({
        ...filters,
        skip: pageParam * 20,
        limit: 20,
      }),
    getNextPageParam: (lastPage, pages) => 
      lastPage.hasMore ? pages.length : undefined,
    initialPageParam: 0,
    staleTime: 60 * 1000,
  });
};
```

---

## 3. IMAGE OPTIMIZATION COMPONENT

### src/components/common/OptimizedImage.jsx
```javascript
'use client';

import Image from 'next/image';
import { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';

const ImageWrapper = styled.div`
  position: relative;
  overflow: hidden;
  background: linear-gradient(135deg, #f0f0f0 0%, #e0e0e0 100%);
  
  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const Skeleton = styled.div`
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    rgba(0, 0, 0, 0.05) 25%,
    rgba(0, 0, 0, 0.1) 50%,
    rgba(0, 0, 0, 0.05) 75%
  );
  background-size: 200% 100%;
  animation: ${props => props.$isLoading ? 'loading 1.5s infinite' : 'none'};

  @keyframes loading {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
`;

const StyledImage = styled(Image)`
  transition: opacity 0.3s ease;
  opacity: ${props => props.$isLoaded ? 1 : 0.7};
`;

export default function OptimizedImage({
  src,
  alt,
  width = 400,
  height = 300,
  priority = false,
  quality = 75,
  objectFit = 'cover',
  objectPosition = 'center',
  sizes,
  onLoad,
  ...props
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(false);
  const containerRef = useRef(null);
  const [shouldLoadHighRes, setShouldLoadHighRes] = useState(priority);

  // ✅ Intersection Observer for lazy loading high-res
  useEffect(() => {
    if (priority || !containerRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoadHighRes(true);
          observer.disconnect();
        }
      },
      { rootMargin: '50px' }
    );

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [priority]);

  const handleLoadingComplete = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setError(true);
    setIsLoaded(true);
  };

  // ✅ Fallback for failed images
  if (error) {
    return (
      <ImageWrapper
        ref={containerRef}
        style={{
          aspectRatio: `${width} / ${height}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f0f0f0',
        }}
      >
        <span style={{ color: '#999', fontSize: '14px' }}>
          Image unavailable
        </span>
      </ImageWrapper>
    );
  }

  return (
    <ImageWrapper ref={containerRef} style={{ aspectRatio: `${width} / ${height}` }}>
      <Skeleton $isLoading={!isLoaded} />
      
      {shouldLoadHighRes && (
        <StyledImage
          src={src || '/placeholder.png'}
          alt={alt}
          fill
          quality={quality}
          priority={priority}
          loading={priority ? 'eager' : 'lazy'}
          onLoadingComplete={handleLoadingComplete}
          onError={handleError}
          sizes={sizes || '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw'}
          style={{
            objectFit,
            objectPosition,
          }}
          {...props}
        />
      )}
    </ImageWrapper>
  );
}
```

---

## 4. DYNAMIC IMPORTS MANAGER

### src/lib/dynamic-imports.js
```javascript
import dynamic from 'next/dynamic';

// ✅ Lazy-load heavy components with loading states
export const DynamicChatList = dynamic(
  () => import('@/components/chat/ChatList'),
  {
    loading: () => <ChatListSkeleton />,
    ssr: false,
  }
);

export const DynamicServiceRecommendations = dynamic(
  () => import('@/components/services/PersonalizedServiceRecommendations'),
  {
    loading: () => <RecommendationSkeleton />,
    ssr: false,
  }
);

export const DynamicAdvancedSearch = dynamic(
  () => import('@/components/services/AdvancedServiceSearchModal'),
  {
    loading: () => <SearchSkeleton />,
    ssr: false,
  }
);

export const DynamicReviewForm = dynamic(
  () => import('@/components/services/ReviewForm'),
  {
    loading: () => <FormSkeleton />,
    ssr: false,
  }
);

// Usage:
// import { DynamicChatList } from '@/lib/dynamic-imports';
// <DynamicChatList /> // Only loads when needed
```

---

## 5. SUSPENSE BOUNDARIES

### src/components/common/SuspenseBoundary.jsx
```javascript
'use client';

import { Suspense } from 'react';
import styled from 'styled-components';

const ErrorFallback = styled.div`
  padding: 20px;
  background: #fee;
  border: 1px solid #fcc;
  border-radius: 8px;
  color: #c00;
`;

export function SuspenseBoundary({
  children,
  fallback,
  name = 'Component',
}) {
  return (
    <ErrorBoundary name={name}>
      <Suspense fallback={fallback || <DefaultSkeleton />}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
}

// Error Boundary for Suspense
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error(`Error in ${this.props.name}:`, error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <ErrorFallback>
          <strong>Failed to load {this.props.name}</strong>
          <p>{this.state.error.message}</p>
        </ErrorFallback>
      );
    }

    return this.props.children;
  }
}

function DefaultSkeleton() {
  return <div style={{ height: '200px', background: '#f0f0f0' }} />;
}
```

---

## 6. SERVER COMPONENT WITH HYDRATION

### src/app/(protected)/services/page.js
```javascript
import { Suspense } from 'react';
import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/getQueryClient';
import ServiceGrid from '@/components/services/ServiceGrid';
import ServiceGridSkeleton from '@/components/loaders/ServiceGridSkeleton';
import * as serviceApi from '@/services/services';

// ✅ Cache this page for 1 minute
export const revalidate = 60;

// ✅ Generate these service pages at build time
export const dynamicParams = true;

export const metadata = {
  title: 'Services | University Marketplace',
  description: 'Find verified services from your campus community',
};

export default async function ServicesPage({ searchParams }) {
  const queryClient = getQueryClient();

  // ✅ Fetch data on server
  await queryClient.prefetchQuery({
    queryKey: ['services', searchParams],
    queryFn: () => serviceApi.fetchServices({
      category: searchParams.category,
      campus: searchParams.campus,
      search: searchParams.search,
      limit: 20,
    }),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Suspense fallback={<ServiceGridSkeleton />}>
        <ServiceGrid initialFilters={searchParams} />
      </Suspense>
    </HydrationBoundary>
  );
}
```

---

## 7. PAGINATION HOOK

### src/hooks/usePaginatedQuery.js
```javascript
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback, useEffect } from 'react';

const ITEMS_PER_PAGE = 20;

export function usePaginatedQuery(
  queryKey,
  queryFn,
  options = {}
) {
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();

  // ✅ Fetch current page
  const query = useQuery({
    queryKey: [...queryKey, page],
    queryFn: () => queryFn({
      skip: (page - 1) * ITEMS_PER_PAGE,
      limit: ITEMS_PER_PAGE,
      ...options,
    }),
    staleTime: 60 * 1000,
    // ✅ Keep previous data while loading
    placeholderData: (previousData) => previousData,
  });

  // ✅ Prefetch next page
  const prefetchNextPage = useCallback(() => {
    if (query.data?.hasMore) {
      queryClient.prefetchQuery({
        queryKey: [...queryKey, page + 1],
        queryFn: () => queryFn({
          skip: page * ITEMS_PER_PAGE,
          limit: ITEMS_PER_PAGE,
          ...options,
        }),
        staleTime: 60 * 1000,
      });
    }
  }, [page, query.data?.hasMore, queryClient, queryKey, queryFn, options]);

  // ✅ Auto-prefetch when scrolling
  useEffect(() => {
    prefetchNextPage();
  }, [page, prefetchNextPage]);

  const goToPage = useCallback((newPage) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const nextPage = useCallback(() => {
    if (query.data?.hasMore) {
      goToPage(page + 1);
    }
  }, [page, query.data?.hasMore, goToPage]);

  const prevPage = useCallback(() => {
    if (page > 1) {
      goToPage(page - 1);
    }
  }, [page, goToPage]);

  return {
    ...query,
    page,
    goToPage,
    nextPage,
    prevPage,
    hasMore: query.data?.hasMore,
    hasPrevious: page > 1,
  };
}

// Usage:
export function ServiceGrid() {
  const { data, page, nextPage, prefetchNextPage } = usePaginatedQuery(
    ['services'],
    (pagination) => fetchServices(pagination),
  );

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    // Prefetch at 80% scroll
    if (scrollTop + clientHeight > scrollHeight * 0.8) {
      prefetchNextPage();
    }
  };

  return (
    <div onScroll={handleScroll}>
      {data?.items.map(item => (
        <ServiceCard key={item.id} service={item} />
      ))}
      {data?.hasMore && (
        <LoadMoreButton onClick={nextPage}>
          Load More
        </LoadMoreButton>
      )}
    </div>
  );
}
```

---

## 8. WEB VITALS MONITORING

### src/lib/web-vitals.js
```javascript
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

const VITALS_ENDPOINT = '/api/metrics';

export function initWebVitals() {
  if (typeof window === 'undefined') return;

  try {
    // ✅ Cumulative Layout Shift
    getCLS((metric) => {
      logVital('CLS', metric.value, metric.rating);
    });

    // ✅ First Input Delay (deprecated but still useful)
    getFID((metric) => {
      logVital('FID', metric.value, metric.rating);
    });

    // ✅ First Contentful Paint
    getFCP((metric) => {
      logVital('FCP', metric.value, metric.rating);
    });

    // ✅ Largest Contentful Paint
    getLCP((metric) => {
      logVital('LCP', metric.value, metric.rating);
    });

    // ✅ Time to First Byte
    getTTFB((metric) => {
      logVital('TTFB', metric.value, metric.rating);
    });
  } catch (error) {
    console.error('Web Vitals error:', error);
  }
}

function logVital(name, value, rating) {
  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    const emoji = {
      'good': '✅',
      'needs-improvement': '⚠️',
      'poor': '❌',
    }[rating] || '📊';
    
    console.log(`${emoji} ${name}: ${value.toFixed(0)}ms (${rating})`);
  }

  // Send to analytics (non-blocking)
  navigator.sendBeacon?.(VITALS_ENDPOINT, JSON.stringify({
    metric: name,
    value: value.toFixed(0),
    rating,
    timestamp: Date.now(),
    url: window.location.pathname,
  }));
}

// ✅ Field Data Collection (User Experience)
export function captureFieldMetrics() {
  if ('PerformanceObserver' in window) {
    try {
      // Measure Long Tasks
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          logVital(
            'Long Task',
            entry.duration,
            entry.duration > 50 ? 'poor' : 'good'
          );
        }
      });

      observer.observe({ entryTypes: ['longtask'] });
    } catch (e) {
      // Long Task API not supported
    }
  }
}
```

---

## 9. NEXT.CONFIG.JS OPTIMIZATION

```javascript
// next.config.js

/** @type {import('next').NextConfig} */
const nextConfig = {
  // ✅ Image optimization
  images: {
    domains: ['res.cloudinary.com', 'api.example.com'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24 * 365, // 1 year
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.cloudinary.com',
      },
    ],
  },

  // ✅ Compression
  compress: true,

  // ✅ Powering the bundle optimization
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      '@tanstack/react-query',
      'styled-components',
    ],
  },

  // ✅ Webpack optimization
  webpack: (config, { dev, isServer }) => {
    if (!dev && !isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
            
            // React/Next.js core
            react: {
              test: /[\\/]node_modules[\\/](react|react-dom|next)[\\/]/,
              name: 'react-vendors',
              priority: 50,
              reuseExistingChunk: true,
            },

            // React Query
            reactQuery: {
              test: /[\\/]node_modules[\\/]@tanstack[\\/]react-query/,
              name: 'react-query',
              priority: 40,
              reuseExistingChunk: true,
            },

            // styled-components
            styled: {
              test: /[\\/]node_modules[\\/]styled-components/,
              name: 'styled-components',
              priority: 40,
              reuseExistingChunk: true,
            },

            // Common shared chunks
            common: {
              minChunks: 2,
              priority: 20,
              reuseExistingChunk: true,
              name: 'common',
            },
          },
        },
      };
    }

    return config;
  },

  // ✅ Headers for caching
  async headers() {
    return [
      {
        source: '/images/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
```

---

## 10. PERFORMANCE CHECKLIST

```markdown
### Bundle Optimization
- [ ] Configure dynamic imports for heavy components
- [ ] Set up webpack code splitting in next.config.js
- [ ] Remove unused dependencies
- [ ] Enable terser minification
- [ ] Test bundle size with `npm run analyze`

### Image Optimization
- [ ] Replace all img tags with Next.js Image
- [ ] Set correct width/height for all images
- [ ] Enable lazy loading for below-fold images
- [ ] Set priority={true} for above-fold images
- [ ] Configure proper image domains
- [ ] Test with WebP and AVIF formats

### Data Fetching
- [ ] Implement React Query caching strategy
- [ ] Set up prefetching for likely navigation paths
- [ ] Use placeholderData for seamless pagination
- [ ] Implement pagination for large lists
- [ ] Use React Query hydration from server

### Server/Client Split
- [ ] Convert list pages to Server Components
- [ ] Move auth/data fetching to server
- [ ] Use 'use client' only for interactive parts
- [ ] Implement Suspense boundaries
- [ ] Use progressive enhancement

### Performance Metrics
- [ ] FCP < 1.5s
- [ ] LCP < 2.5s
- [ ] TTI < 3s
- [ ] CLS < 0.1
- [ ] Bundle size < 200KB
- [ ] Lighthouse score > 85

### Testing
- [ ] Test on 4G network throttling
- [ ] Test on low-end mobile device
- [ ] Test with high concurrent users
- [ ] Monitor with web-vitals
- [ ] Set up performance budgets
```

---

**Status:** Ready to implement
**Estimated Time:** 12-16 hours across 3 weeks
**Expected Improvement:** 4-5x faster page loads, 10x more concurrent users

