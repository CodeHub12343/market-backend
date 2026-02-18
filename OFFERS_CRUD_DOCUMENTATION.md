# Offers CRUD Implementation Guide

Complete documentation for implementing full CRUD (Create, Read, Update, Delete) operations for Offers in your Next.js frontend with React Query and styled-components.

---

## 📋 Table of Contents

1. [Project Structure](#project-structure)
2. [Service Layer](#service-layer)
3. [Custom Hooks](#custom-hooks)
4. [Form Hook](#form-hook)
5. [Components](#components)
6. [Pages & Routes](#pages--routes)
7. [Data Structures](#data-structures)
8. [Usage Examples](#usage-examples)
9. [Styling Guide](#styling-guide)
10. [Error Handling](#error-handling)
11. [Testing Checklist](#testing-checklist)
12. [Common Issues & Solutions](#common-issues--solutions)

---

## Project Structure

```
src/
├── services/
│   └── offers.js                 # API calls for offers
├── hooks/
│   ├── useOffers.js             # React Query hooks
│   └── useOfferForm.js          # Form state management
├── components/offers/
│   ├── OfferCard.jsx            # Individual offer card
│   ├── OfferForm.jsx            # Offer creation/edit form
│   └── OfferGrid.jsx            # Responsive grid layout
└── app/(protected)/offers/
    ├── page.js                   # Offers list page
    ├── new/
    │   └── page.js              # Create offer page
    └── [id]/
        ├── page.js              # Offer detail page
        └── edit/
            └── page.js          # Edit offer page
```

---

## Service Layer

**File:** `src/services/offers.js`

The service layer handles all API communication with the backend using axios.

### Available Functions

```javascript
// Fetch Functions
fetchOffersPaginated(page, limit, filters)  // Get all offers with pagination
fetchOfferById(id)                           // Get single offer
fetchMyOffers(params)                        // Get user's own offers
searchOffers(query, filters)                 // Search offers
getTrendingOffers(limit)                     // Get trending offers
getPopularOffers(limit)                      // Get popular offers

// Mutation Functions
createOffer(offerData, image)                // Create new offer
updateOffer(id, offerData, image)            // Update existing offer
deleteOffer(id)                              // Delete offer
claimOffer(id)                               // Claim an offer (user action)
unclaimOffer(id)                             // Unclaim an offer
toggleFavoriteOffer(id)                      // Add/remove from favorites
```

### Usage Example

```javascript
import { createOffer, fetchOfferById } from '@/services/offers';

// Create offer with image
const newOffer = await createOffer(
  {
    title: 'Buy 1 Get 1 Free',
    description: 'On all burgers',
    shop: 'shopId123',
    discount: { type: 'percentage', value: 50 },
    startDate: '2025-12-20T10:00',
    endDate: '2025-12-25T23:59'
  },
  imageFile
);

// Fetch single offer
const offer = await fetchOfferById('offerId123');
```

---

## Custom Hooks

**File:** `src/hooks/useOffers.js`

React Query hooks for managing offer data with automatic caching and invalidation.

### Fetch Hooks (Read Operations)

```javascript
// Get all offers with pagination
const { data, isLoading, error } = useAllOffers(page, limit, filters);

// Get single offer
const { data: offer } = useOffer(id);

// Get user's offers
const { data: myOffers } = useMyOffers();

// Search offers
const { data: searchResults } = useSearchOffers(query, filters);

// Get trending offers
const { data: trending } = useTrendingOffers(limit);

// Get popular offers
const { data: popular } = usePopularOffers(limit);
```

### Mutation Hooks (Write Operations)

```javascript
// Create offer
const createOffer = useCreateOffer();
await createOffer.mutateAsync({ offerData, image });

// Update offer
const updateOffer = useUpdateOffer();
await updateOffer.mutateAsync({ id, offerData, image });

// Delete offer
const deleteOffer = useDeleteOffer();
await deleteOffer.mutateAsync(id);

// Claim offer
const claimOffer = useClaimOffer();
await claimOffer.mutateAsync(id);

// Unclaim offer
const unclaimOffer = useUnclaimOffer();
await unclaimOffer.mutateAsync(id);

// Toggle favorite
const toggleFavorite = useToggleFavoriteOffer();
await toggleFavorite.mutateAsync(id);
```

### Hook Usage Example

```javascript
import { useAllOffers, useCreateOffer } from '@/hooks/useOffers';

export default function OffersComponent() {
  const { data: offersData, isLoading } = useAllOffers(1, 12);
  const createOffer = useCreateOffer();

  const handleCreate = async () => {
    try {
      await createOffer.mutateAsync({
        offerData: { /* ... */ },
        image: fileInput
      });
      // Success - component re-fetches automatically
    } catch (error) {
      console.error(error);
    }
  };

  if (isLoading) return <LoadingSpinner />;
  
  return (
    <div>
      {offersData?.offers?.map(offer => (
        <OfferCard key={offer._id} offer={offer} />
      ))}
    </div>
  );
}
```

---

## Form Hook

**File:** `src/hooks/useOfferForm.js`

Manages form state for creating and editing offers.

### State Management

```javascript
const {
  formData,                 // Current form values
  handleInputChange,        // For simple input changes
  handleNestedChange,       // For nested object changes (discount, location)
  previewImage,            // Image preview URL
  imageFile,               // File object for upload
  handleImageChange,       // Handle image selection
  removeImage,             // Clear image
  validateForm,            // Validate form data
  errors,                  // Validation errors
  resetForm                // Reset to initial state
} = useOfferForm(initialOffer, userCampus);
```

### Form Data Structure

```javascript
{
  title: string,                          // Offer title
  description: string,                    // Offer description
  shop: string (ObjectId),               // Shop ID
  category: string,                       // food|technology|fashion|beauty|general|other
  startDate: string (datetime-local),    // Start date/time
  endDate: string (datetime-local),      // End date/time
  discount: {
    type: 'percentage'|'flat',          // Discount type
    value: number                        // Discount value
  },
  location: {
    address: string,                     // Physical location
    campus: string (ObjectId)            // Campus ID
  },
  termsConditions: string,               // Optional terms
  maxClaims: number,                     // Max claims limit (optional)
  visibility: 'public'|'campus'|'private' // Visibility level
}
```

### Form Hook Usage

```javascript
import { useOfferForm } from '@/hooks/useOfferForm';

export default function CreateOfferForm() {
  const {
    formData,
    handleInputChange,
    handleNestedChange,
    validateForm,
    errors
  } = useOfferForm();

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      // Show validation errors
      return;
    }

    // Submit form
    onSubmit(formData, imageFile);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        name="title"
        value={formData.title}
        onChange={handleInputChange}
      />
      <input
        type="number"
        value={formData.discount.value}
        onChange={(e) => handleNestedChange('discount', 'value', e.target.value)}
      />
    </form>
  );
}
```

---

## Components

### OfferCard Component

**File:** `src/components/offers/OfferCard.jsx`

Displays a single offer with discount badge, metadata, and action buttons.

#### Props

```typescript
interface OfferCardProps {
  offer: Offer;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onClaim: (id: string) => void;
  onFavorite: (id: string) => void;
  isOwner?: boolean;
  isClaimed?: boolean;
  isFavorited?: boolean;
  isLoading?: boolean;
}
```

#### Usage

```jsx
<OfferCard
  offer={offer}
  onView={() => router.push(`/offers/${offer._id}`)}
  onEdit={() => router.push(`/offers/${offer._id}/edit`)}
  onDelete={() => deleteOffer.mutate(offer._id)}
  onClaim={() => claimOffer.mutate(offer._id)}
  onFavorite={() => toggleFavorite.mutate(offer._id)}
  isOwner={offer._isOwner}
  isClaimed={offer._isClaimed}
  isFavorited={offer._isFavorited}
/>
```

#### Features

- Responsive grid card layout
- Image with discount badge overlay
- Category color-coded badge
- Expiration indicator ("Expired" badge if date passed)
- Meta information (location, dates, claims)
- Owner/User action buttons
- Hover effects and animations

---

### OfferForm Component

**File:** `src/components/offers/OfferForm.jsx`

Complete form for creating and editing offers with image upload.

#### Props

```typescript
interface OfferFormProps {
  initialOffer?: Offer | null;
  onSubmit: (offerData: object, imageFile: File) => void;
  isLoading?: boolean;
  error?: string | null;
  success?: string | null;
  onCancel?: () => void;
}
```

#### Usage

```jsx
<OfferForm
  initialOffer={offer}
  onSubmit={handleSubmit}
  isLoading={isLoading}
  error={error?.message}
  onCancel={() => router.back()}
/>
```

#### Form Sections

1. **Offer Details**
   - Title (required)
   - Description
   - Shop selection (required)
   - Category

2. **Discount & Duration**
   - Discount type (percentage/flat)
   - Discount value (required)
   - Start date/time (required)
   - End date/time (required)
   - Max claims

3. **Location**
   - Address (required)
   - Campus (required)

4. **Image Upload**
   - Drag & drop file upload
   - Image preview
   - Remove button

5. **Additional Info**
   - Terms & conditions
   - Visibility (public/campus/private)

---

### OfferGrid Component

**File:** `src/components/offers/OfferGrid.jsx`

Responsive grid layout displaying multiple offers with pagination.

#### Props

```typescript
interface OfferGridProps {
  offers: Offer[];
  isLoading?: boolean;
  error?: Error | null;
  onView?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onClaim?: (id: string) => void;
  onFavorite?: (id: string) => void;
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  userOwnedOffers?: string[];
  userClaimedOffers?: string[];
  userFavorites?: string[];
}
```

#### Features

- Auto-fill responsive grid (minmax 280px)
- Pagination controls (Previous, numbered pages, Next)
- Empty state message
- Loading spinner
- Error display
- Smooth page transitions

---

## Pages & Routes

### List Page

**Route:** `/offers`
**File:** `src/app/(protected)/offers/page.js`

Display all offers with search, filtering, and pagination.

**Features:**
- Gradient header with create button
- Search input for offer titles
- Category filter dropdown
- Offers grid with pagination
- Responsive design

### Create Page

**Route:** `/offers/new`
**File:** `src/app/(protected)/offers/new/page.js`

Create a new offer with form validation.

**Features:**
- OfferForm component without initial data
- Loading overlay during submission
- Auto-redirect to offers list on success
- Error display

### Detail Page

**Route:** `/offers/[id]`
**File:** `src/app/(protected)/offers/[id]/page.js`

View complete offer details with user actions.

**Features:**
- Banner image display
- Discount badge
- All offer metadata
- Location & duration info
- User-specific actions:
  - **For users:** Claim/Unclaim, Favorite
  - **For owners:** Edit, Delete
- Terms & conditions section
- Related offer suggestions

### Edit Page

**Route:** `/offers/[id]/edit`
**File:** `src/app/(protected)/offers/[id]/edit/page.js`

Edit an existing offer (owner only).

**Features:**
- Pre-populated form with existing data
- Image upload/replacement
- Save and redirect to detail page
- Cancel returns to detail page

---

## Data Structures

### Offer Model

```javascript
{
  _id: ObjectId,
  title: String,              // Offer title
  description: String,        // Long description
  shop: ObjectId,            // Reference to Shop
  category: String,          // food|technology|fashion|beauty|general|other
  startDate: Date,           // When offer starts
  endDate: Date,             // When offer expires
  discount: {
    type: String,            // 'percentage' or 'flat'
    value: Number            // Discount amount
  },
  location: {
    address: String,         // Physical location
    campus: ObjectId         // Reference to Campus
  },
  imageUrl: String,          // Cloudinary URL
  imagePublicId: String,     // Cloudinary public_id
  termsConditions: String,   // Optional terms
  maxClaims: Number,         // Max claims allowed
  claimedBy: [ObjectId],    // Users who claimed
  favorites: [ObjectId],     // Users who favorited
  visibility: String,        // 'public'|'campus'|'private'
  createdBy: ObjectId,       // Creator (shop owner)
  createdAt: Date,
  updatedAt: Date,
  
  // Computed fields (from controller)
  _isOwner: Boolean,         // Is current user the owner
  _isClaimed: Boolean,       // Has current user claimed
  _isFavorited: Boolean      // Is in user's favorites
}
```

### API Response Structure

```javascript
// List endpoint response
{
  success: true,
  data: {
    offers: [{ /* offer objects */ }],
    totalOffers: 24,
    totalPages: 2,
    currentPage: 1,
    limit: 12
  }
}

// Single offer response
{
  success: true,
  data: { /* offer object */ }
}

// Error response
{
  success: false,
  message: "Error description",
  statusCode: 400
}
```

---

## Usage Examples

### Complete Create Flow

```javascript
'use client';

import { useCreateOffer } from '@/hooks/useOffers';
import { useRouter } from 'next/navigation';
import OfferForm from '@/components/offers/OfferForm';

export default function CreateOfferPage() {
  const router = useRouter();
  const createOffer = useCreateOffer();

  const handleSubmit = async (offerData, imageFile) => {
    try {
      const newOffer = await createOffer.mutateAsync({
        offerData,
        image: imageFile
      });
      
      // Success! Redirect
      router.push(`/offers/${newOffer._id}`);
    } catch (error) {
      console.error('Creation failed:', error.message);
    }
  };

  return (
    <OfferForm
      onSubmit={handleSubmit}
      isLoading={createOffer.isPending}
      error={createOffer.error?.message}
    />
  );
}
```

### Complete List Flow

```javascript
'use client';

import { useState } from 'react';
import { useAllOffers } from '@/hooks/useOffers';
import { useRouter } from 'next/navigation';
import OfferGrid from '@/components/offers/OfferGrid';

export default function OffersPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState('');

  const { data, isLoading, error } = useAllOffers(
    page,
    12,
    category ? { category } : {}
  );

  const handleView = (id) => {
    router.push(`/offers/${id}`);
  };

  return (
    <OfferGrid
      offers={data?.offers || []}
      isLoading={isLoading}
      error={error}
      onView={handleView}
      currentPage={page}
      totalPages={data?.totalPages || 1}
      onPageChange={setPage}
    />
  );
}
```

### Complete Detail Flow

```javascript
'use client';

import { useOffer, useClaimOffer, useDeleteOffer } from '@/hooks/useOffers';
import { useParams, useRouter } from 'next/navigation';

export default function OfferDetailPage() {
  const params = useParams();
  const router = useRouter();
  
  const { data: offer } = useOffer(params.id);
  const claimOffer = useClaimOffer();
  const deleteOffer = useDeleteOffer();

  const handleClaim = async () => {
    await claimOffer.mutateAsync(params.id);
  };

  const handleDelete = async () => {
    if (confirm('Delete this offer?')) {
      await deleteOffer.mutateAsync(params.id);
      router.push('/offers');
    }
  };

  if (!offer) return <LoadingSpinner />;

  const isOwner = offer._isOwner;
  const isClaimed = offer._isClaimed;

  return (
    <div>
      <h1>{offer.title}</h1>
      <p>Save {offer.discount.value}{offer.discount.type === 'percentage' ? '%' : '₦'}</p>
      
      {isOwner && (
        <button onClick={handleDelete}>Delete Offer</button>
      )}
      
      {!isOwner && (
        <button onClick={handleClaim}>
          {isClaimed ? 'Unclaim' : 'Claim'}
        </button>
      )}
    </div>
  );
}
```

---

## Styling Guide

### Color Scheme

**Primary:** `#667eea` (Purple)
**Secondary:** `#764ba2` (Dark Purple)
**Success:** `#10b981` (Green)
**Error:** `#ef4444` (Red)
**Warning:** `#f59e0b` (Amber)
**Background:** `#f9fafb` (Light Gray)
**Border:** `#e5e7eb` (Medium Gray)
**Text:** `#1f2937` (Dark)

### Category Colors

```javascript
{
  'food': { bg: '#fef3c7', text: '#92400e' },
  'technology': { bg: '#dbeafe', text: '#1e40af' },
  'fashion': { bg: '#fce7f3', text: '#be185d' },
  'beauty': { bg: '#fce7f3', text: '#be185d' },
  'general': { bg: '#e0e7ff', text: '#3730a3' },
  'other': { bg: '#f3f4f6', text: '#374151' }
}
```

### Responsive Breakpoints

- **Mobile:** < 480px (single column)
- **Tablet:** 480px - 768px (2 columns)
- **Desktop:** > 768px (3+ columns)

---

## Error Handling

### Common Validation Errors

```javascript
// Title validation
if (!formData.title.trim()) {
  errors.title = 'Offer title is required';
}

// Date validation
if (new Date(formData.endDate) <= new Date(formData.startDate)) {
  errors.endDate = 'End date must be after start date';
}

// Discount validation
if (!formData.discount.value || isNaN(formData.discount.value)) {
  errors.discountValue = 'Discount must be a valid number';
}
```

### API Error Handling

```javascript
const createOffer = useCreateOffer();

try {
  await createOffer.mutateAsync({ offerData, image });
} catch (error) {
  if (error.statusCode === 400) {
    // Validation error
    console.log(error.message);
  } else if (error.statusCode === 401) {
    // Unauthorized
    redirectToLogin();
  } else if (error.statusCode === 403) {
    // Forbidden
    showError('You cannot create this offer');
  } else if (error.statusCode === 500) {
    // Server error
    showError('Server error. Please try again later');
  }
}
```

---

## Testing Checklist

### Create Offer
- [ ] Form validation works (required fields)
- [ ] Image upload and preview works
- [ ] Form resets after successful creation
- [ ] Redirect to detail page works
- [ ] Error message displays on failure

### List Offers
- [ ] Page loads with paginated offers
- [ ] Search functionality works
- [ ] Category filter works
- [ ] Pagination buttons work
- [ ] Loading spinner shows during fetch

### View Offer
- [ ] All fields display correctly
- [ ] Image loads properly
- [ ] Discount badge shows correctly
- [ ] Expired offers show "Expired" badge
- [ ] Action buttons visible to appropriate users

### Claim Offer
- [ ] Non-owners can claim offers
- [ ] Claimed offer shows different button state
- [ ] Can unclaim claimed offers
- [ ] Cannot claim expired offers
- [ ] Claim count updates

### Edit Offer
- [ ] Form pre-fills with existing data
- [ ] Image can be replaced
- [ ] Changes save correctly
- [ ] Redirect to detail page works

### Delete Offer
- [ ] Confirmation dialog appears
- [ ] Offer deletes on confirm
- [ ] Redirect to list works
- [ ] Only owners can delete

### Favorites
- [ ] Can favorite offers
- [ ] Can unfavorite offers
- [ ] Favorite button reflects state
- [ ] Favorites persist across sessions

---

## Common Issues & Solutions

### Issue: Images not uploading

**Solution:**
Check that `Content-Type: multipart/form-data` header is set and file is appended to FormData correctly.

```javascript
const formData = new FormData();
formData.append('image', imageFile); // File object, not string
```

### Issue: Form loses focus on change

**Solution:**
Ensure `handleInputChange` doesn't cause unnecessary re-renders. Use event delegation properly.

```javascript
const handleInputChange = (e) => {
  const { name, value } = e.target;
  setFormData(prev => ({
    ...prev,
    [name]: value
  }));
};
```

### Issue: Pagination resets filter

**Solution:**
Reset page to 1 when filter changes, and pass filters to hook.

```javascript
const handleFilterChange = (category) => {
  setCategory(category);
  setCurrentPage(1); // Reset to page 1
};

useAllOffers(currentPage, 12, { category });
```

### Issue: Images show as broken

**Solution:**
Check Cloudinary URL is correct and image was uploaded successfully.

```javascript
// Add fallback image
<img src={offer.imageUrl || '/placeholder.jpg'} alt={offer.title} />
```

### Issue: Cannot edit other users' offers

**Solution:**
Check `isOwner` flag and only show edit button to owners.

```javascript
{isOwner && (
  <Button onClick={onEdit}>Edit</Button>
)}
```

---

## Next Steps

1. ✅ Integrate offers into navigation menu
2. ✅ Add offers shortcut to home/dashboard
3. ✅ Create "My Offers" page for shop owners
4. ✅ Add offer search to global search
5. ✅ Implement offer notifications/reminders
6. ✅ Add offer sharing features
7. ✅ Create analytics for offer performance
8. ✅ Add bulk operations (create multiple offers)

---

**Created:** December 2025
**Last Updated:** December 2025
**Status:** Production Ready ✅
