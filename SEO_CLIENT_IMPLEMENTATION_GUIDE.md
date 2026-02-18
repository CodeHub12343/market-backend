# 🔍 SEO Implementation Guide - Client Components
## How to Add SEO to Your Existing Client-Side Pages

Your pages use `'use client'`, so we need to add SEO metadata using a custom approach with useEffect and react-helmet-like patterns.

---

## Quick Implementation Steps

### 1. Add SEO Meta Tags to Services Detail Page

**File:** `src/app/(protected)/services/[id]/page.js`

Add this at the top of the component (after imports, before the styled components):

```javascript
// ✅ SEO Meta Tags Helper
function setMetaTags(service) {
  if (typeof window === 'undefined') return; // Skip on server
  
  const title = service?.serviceName || service?.title || 'Service | University Marketplace';
  const description = `Professional service. ${service?.description?.substring(0, 100) || 'Book on University Marketplace'}`;
  const image = service?.images?.[0] ? `${process.env.NEXT_PUBLIC_API_URL}${service.images[0]}` : '/og-service.png';
  
  // Set title
  document.title = title;
  
  // Set or update meta tags
  const updateMeta = (name, content, isProperty = false) => {
    let tag = document.querySelector(isProperty ? `meta[property="${name}"]` : `meta[name="${name}"]`);
    if (!tag) {
      tag = document.createElement('meta');
      if (isProperty) tag.setAttribute('property', name);
      else tag.setAttribute('name', name);
      document.head.appendChild(tag);
    }
    tag.setAttribute('content', content);
  };
  
  updateMeta('description', description);
  updateMeta('og:title', title, true);
  updateMeta('og:description', description, true);
  updateMeta('og:image', image, true);
  updateMeta('og:type', 'business.business', true);
  updateMeta('twitter:card', 'summary_large_image');
  updateMeta('twitter:title', title);
  updateMeta('twitter:description', description);
  updateMeta('twitter:image', image);
}
```

Then in your component, add this useEffect after you fetch the service data:

```javascript
import { useEffect } from 'react';

export default function ServiceDetailPage() {
  const { data: service, isLoading } = useService(serviceId); // Your existing hook
  
  // ✅ Set SEO meta tags when service loads
  useEffect(() => {
    if (service) {
      setMetaTags(service);
    }
  }, [service]);
  
  // ✅ Add schema.org structured data
  useEffect(() => {
    if (service) {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.innerHTML = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Service',
        name: service.serviceName || service.title,
        description: service.description,
        image: service.images?.map(img => `${process.env.NEXT_PUBLIC_API_URL}${img}`),
        serviceType: service.serviceCategory,
        provider: {
          '@type': 'Person',
          name: service.user?.fullName || 'Service Provider',
        },
        aggregateRating: service.reviews?.length > 0 ? {
          '@type': 'AggregateRating',
          ratingValue: (service.reviews.reduce((a, b) => a + b.rating, 0) / service.reviews.length).toFixed(1),
          bestRating: 5,
          worstRating: 1,
          ratingCount: service.reviews.length,
        } : undefined,
      });
      document.head.appendChild(script);
      
      return () => {
        if (script.parentNode) script.parentNode.removeChild(script);
      };
    }
  }, [service]);
  
  // Rest of your component...
}
```

---

### 2. Add SEO Meta Tags to Shops (Products) Detail Page

**File:** `src/app/(protected)/shops/[shopid]/page.js`

Add the same setMetaTags helper, then:

```javascript
useEffect(() => {
  if (shop) {
    const title = `${shop.shopName} | Shop | University Marketplace`;
    const description = `${shop.description?.substring(0, 100) || 'Quality products'} - Shop by ${shop.seller?.fullName || 'campus seller'}`;
    const image = shop.logo || '/og-shop.png';
    
    document.title = title;
    // ... update meta tags as above
  }
}, [shop]);
```

---

### 3. Add SEO Meta Tags to Roommates Detail Page

**File:** `src/app/(protected)/roommates/[id]/page.js`

```javascript
useEffect(() => {
  if (roommate) {
    const title = `${roommate.fullName} | Accommodation | University Marketplace`;
    const description = `${roommate.gender} roommate at ${roommate.location}. ${roommate.bio?.substring(0, 80) || 'Find the perfect roommate'}`;
    const image = roommate.profilePicture || '/og-roommate.png';
    
    document.title = title;
    // ... update meta tags
    
    // Add LodgingBusiness schema
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.innerHTML = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'LodgingBusiness',
      name: roommate.fullName,
      description: roommate.bio,
      address: {
        '@type': 'PostalAddress',
        streetAddress: roommate.location,
        addressCountry: 'NG',
      },
      priceRange: `₦${roommate.price}/month`,
    });
    document.head.appendChild(script);
  }
}, [roommate]);
```

---

## Full SEO Meta Tags Helper Function

Copy this utility and use it in all your client pages:

```javascript
// src/utils/seoMetaTags.js

export function setMetaTags({
  title,
  description,
  image,
  url,
  type = 'website',
  twitterHandle = '@universitymarketplace',
}) {
  if (typeof window === 'undefined') return; // Server-side guard

  // ✅ Set page title
  document.title = title;

  // ✅ Helper to create/update meta tags
  const updateMeta = (name, content, isProperty = false) => {
    let tag = document.querySelector(
      isProperty ? `meta[property="${name}"]` : `meta[name="${name}"]`
    );
    
    if (!tag) {
      tag = document.createElement('meta');
      if (isProperty) tag.setAttribute('property', name);
      else tag.setAttribute('name', name);
      document.head.appendChild(tag);
    }
    
    tag.setAttribute('content', content);
  };

  // ✅ Basic meta tags
  updateMeta('description', description);
  updateMeta('viewport', 'width=device-width, initial-scale=1');

  // ✅ Open Graph tags
  updateMeta('og:title', title, true);
  updateMeta('og:description', description, true);
  updateMeta('og:image', image, true);
  updateMeta('og:type', type, true);
  if (url) updateMeta('og:url', url, true);

  // ✅ Twitter Card tags
  updateMeta('twitter:card', 'summary_large_image');
  updateMeta('twitter:title', title);
  updateMeta('twitter:description', description);
  updateMeta('twitter:image', image);
  updateMeta('twitter:creator', twitterHandle);

  // ✅ Robots meta tags
  updateMeta('robots', 'index, follow');
}

export function addStructuredData(schemaData) {
  if (typeof window === 'undefined') return;

  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.innerHTML = JSON.stringify(schemaData);
  document.head.appendChild(script);

  return () => {
    if (script.parentNode) script.parentNode.removeChild(script);
  };
}
```

Then use it simply:

```javascript
import { setMetaTags, addStructuredData } from '@/utils/seoMetaTags';

export default function ServiceDetail() {
  const { data: service } = useService(id);

  useEffect(() => {
    if (service) {
      setMetaTags({
        title: `${service.serviceName} | ₦${service.price}/${service.durationUnit} | Book`,
        description: `Professional service. ${service.description?.substring(0, 100)}...`,
        image: `${process.env.NEXT_PUBLIC_API_URL}${service.images?.[0]}`,
        url: `${process.env.NEXT_PUBLIC_SITE_URL}/services/${service._id}`,
        type: 'business.business',
      });

      addStructuredData({
        '@context': 'https://schema.org',
        '@type': 'Service',
        name: service.serviceName,
        description: service.description,
        image: service.images?.map(img => `${process.env.NEXT_PUBLIC_API_URL}${img}`),
        // ... rest of schema
      });
    }
  }, [service]);

  // ... rest of component
}
```

---

## Verify Your SEO Implementation

### 1. Check Meta Tags in Browser
```javascript
// Open browser console and run:
document.head.innerHTML
// Look for: <meta property="og:title" content="...">
```

### 2. Test Open Graph Tags
Visit: https://www.opengraphcheck.com

### 3. Validate Structured Data
Visit: https://schema.org/validator

### 4. Check Title & Description
Open DevTools → Elements → Head tag → Look for:
- `<title>` tag
- `<meta name="description">`
- `<meta property="og:title">`

---

## SEO Checklist for Client Pages

- [ ] ✅ Page title dynamically set from data
- [ ] ✅ Meta description (150-160 chars)
- [ ] ✅ Open Graph image
- [ ] ✅ Twitter Card tags
- [ ] ✅ JSON-LD structured data
- [ ] ✅ Breadcrumb schema
- [ ] ✅ Image alt text on all images
- [ ] ✅ Proper heading hierarchy (H1, H2, H3)
- [ ] ✅ Canonical URL (optional for dynamic pages)
- [ ] ✅ Mobile viewport meta tag (already in layout)

---

## Performance Tip

Wrap setMetaTags in useCallback to avoid unnecessary re-renders:

```javascript
import { useCallback, useEffect } from 'react';

export default function ServiceDetail() {
  const { data: service } = useService(id);

  const updateSeoTags = useCallback(() => {
    if (service) {
      setMetaTags({
        title: `${service.serviceName} | Book Now`,
        // ... rest
      });
    }
  }, [service]);

  useEffect(() => {
    updateSeoTags();
  }, [updateSeoTags]);

  // Rest of component
}
```

---

## Next Steps

1. ✅ Add `seoMetaTags.js` utility to `src/utils/`
2. ✅ Add SEO hooks to services/[id]/page.js
3. ✅ Add SEO hooks to shops/[shopid]/page.js
4. ✅ Add SEO hooks to roommates/[id]/page.js
5. ✅ Test in browser DevTools
6. ✅ Submit sitemap to Google Search Console
7. ✅ Monitor Google Search Console for indexing

---

**Status:** Ready to implement
**Estimated Time:** 1-2 hours for all pages
**Expected Results:** Dynamic meta tags on all pages, rich snippets in search results
