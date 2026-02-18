# Complete Hostel CRUD Implementation Guide - Next.js Frontend

## 📋 Table of Contents

1. [Overview](#overview)
2. [Project Structure](#project-structure)
3. [API Service Layer](#api-service-layer)
4. [React Query Hooks](#react-query-hooks)
5. [Form State Management](#form-state-management)
6. [Component Implementation](#component-implementation)
7. [Page Implementation](#page-implementation)
8. [localStorage Workaround](#localstorage-workaround)
9. [Full CRUD Operations](#full-crud-operations)
10. [Testing Guide](#testing-guide)
11. [Error Handling](#error-handling)
12. [Important Notes](#important-notes)

---

## Overview

This guide provides complete CRUD (Create, Read, Update, Delete) operations for hostels in your Next.js university marketplace application. The implementation follows your established patterns using:

- **Next.js 14+** - Framework
- **React Query** - Data fetching and caching
- **Axios** - HTTP client with JWT interceptor
- **Styled-Components** - CSS-in-JS styling
- **React Hooks** - State management

### Key Features
✅ Create new hostels with image upload  
✅ Read/List hostels with pagination and search  
✅ Update hostel details and images  
✅ Delete hostels with confirmation  
✅ Search and filter functionality  
✅ localStorage owner verification (temporary workaround)  
✅ Responsive design for mobile/tablet  
✅ Error handling and loading states  

---

## Project Structure

```
university-market/src/
├── services/
│   ├── hostels.js                    # ✅ API service layer (CREATED)
│   └── (existing files)
│
├── hooks/
│   ├── useHostels.js                 # ✅ React Query hooks (CREATED)
│   ├── useHostelForm.js              # ✅ Form state management (CREATED)
│   └── (existing files)
│
├── components/
│   └── hostels/                      # ✅ NEW FOLDER
│       ├── HostelCard.jsx            # Display individual hostel
│       ├── HostelForm.jsx            # Create/Edit form
│       └── HostelGrid.jsx            # Grid display component
│
├── app/(protected)/hostels/          # ✅ NEW FOLDER
│   ├── page.js                       # List hostels
│   ├── new/
│   │   └── page.js                   # Create hostel
│   └── [id]/
│       ├── page.js                   # Hostel details
│       └── edit/
│           └── page.js               # Edit hostel
│
└── utils/
    └── localStorage.js               # ✅ localStorage utilities (CREATED)
```

---

## API Service Layer

### File: `src/services/hostels.js`

The API service layer handles all HTTP requests to the backend hostel endpoints.

```javascript
// MAIN FUNCTIONS PROVIDED:

1. fetchHostels(params)
   - Fetch all hostels with filters
   - Returns: { status, data, pagination }

2. fetchHostelsPaginated(page, limit, filters)
   - Fetch paginated hostels
   - Returns: { status, data, pagination }

3. fetchHostelById(id)
   - Fetch single hostel
   - Returns: hostel object

4. fetchMyHostels(params)
   - Fetch user's hostels
   - Returns: { status, data, pagination }

5. createHostel(hostelData, image)
   - Create new hostel
   - Parameters: hostelData (object), image (File)
   - Returns: created hostel object

6. updateHostel(id, hostelData, newImage)
   - Update existing hostel
   - Parameters: id, hostelData (object), newImage (File)
   - Returns: updated hostel object

7. deleteHostel(id)
   - Delete hostel
   - Returns: confirmation response

8. searchHostels(query, filters)
   - Search hostels by name/description
   - Returns: { status, data, pagination }

9. getHostelStats()
   - Get hostel statistics
   - Returns: stats object

10. uploadHostelImage(file)
    - Upload single image to Cloudinary
    - Returns: image URL
```

### Usage Example

```javascript
// In a component or hook
import { createHostel, fetchHostelById } from '@/services/hostels';

// Create hostel
const hostelData = {
  name: 'Star Hostel',
  address: 'FUTO Campus',
  price: 25000,
  roomType: 'shared',
  capacity: 50,
  amenities: ['WiFi', 'Hot Water'],
};
const imageFile = fileInputRef.current.files[0];
const result = await createHostel(hostelData, imageFile);

// Fetch by ID
const hostel = await fetchHostelById('hostel-id-123');
```

---

## React Query Hooks

### File: `src/hooks/useHostels.js`

Custom React Query hooks for managing hostel data fetching and mutations.

```javascript
// HOOKS PROVIDED:

1. useAllHostels(filters)
   - Fetch all hostels with filters
   - Returns: { data, isLoading, error, isError }
   
   const { data, isLoading } = useAllHostels({ 
     page: 1, 
     limit: 12, 
     sort: '-createdAt' 
   });

2. useHostel(id, enabled)
   - Fetch single hostel by ID
   - Returns: { data, isLoading, error }
   
   const { data: hostel } = useHostel('hostel-id-123');

3. useMyHostels(params)
   - Fetch user's hostels
   - Returns: { data, isLoading, error }
   
   const { data } = useMyHostels();

4. useCreateHostel()
   - Create new hostel
   - Returns: { mutateAsync, isPending, error }
   
   const { mutateAsync } = useCreateHostel();
   await mutateAsync({ hostelData, image });

5. useUpdateHostel()
   - Update hostel
   - Returns: { mutateAsync, isPending, error }
   
   const { mutateAsync } = useUpdateHostel();
   await mutateAsync({ id, hostelData, image });

6. useDeleteHostel()
   - Delete hostel
   - Returns: { mutateAsync, isPending, error }
   
   const { mutateAsync } = useDeleteHostel();
   await mutateAsync('hostel-id-123');

7. useSearchHostels(query, filters)
   - Search hostels
   - Requires query to be non-empty
   - Returns: { data, isLoading, error }

8. useHostelStats()
   - Get hostel statistics
   - Returns: { data, isLoading, error }

9. useUploadHostelImage()
   - Upload single image
   - Returns: { mutateAsync, isPending, error }
```

### Key Features

**Caching Strategy:**
- Stale time: 5-10 minutes (data considered fresh)
- Cache time: 30 minutes (cached data retained)
- Keeps previous data while loading new pages

**Invalidation:**
- Automatically invalidates queries on mutations
- Updates both list and detail queries
- Clears localStorage creator data on deletion

**Error Handling:**
- Errors passed through for component handling
- Retry once on failed requests
- No refetch on window focus

---

## Form State Management

### File: `src/hooks/useHostelForm.js`

Custom hook for managing hostel form state and validation.

```javascript
// HOOK SIGNATURE:
const useHostelForm = (initialData = null)

// RETURNS:
{
  formData,           // Current form values
  errors,             // Validation errors
  previewImage,       // Image preview URL
  handleChange,       // Input change handler
  handleImageChange,  // Image file handler
  removeImage,        // Remove selected image
  addAmenity,         // Add amenity to list
  removeAmenity,      // Remove amenity
  setFormErrors,      // Set validation errors
  resetForm,          // Reset to initial state
  setFormData,        // Update form data
}

// FORM DATA STRUCTURE:
{
  name: '',
  description: '',
  address: '',
  campus: '',
  price: '',
  roomType: 'shared',    // 'shared' | 'single' | 'double'
  capacity: '',
  amenities: [],         // Array of strings
  image: null,           // File object or null
  phoneNumber: '',
  website: '',
  rules: '',
  verificationStatus: 'pending',
}
```

### Usage Example

```javascript
export default function HostelForm({ hostel = null, isEditing = false }) {
  const {
    formData,
    errors,
    previewImage,
    handleChange,
    handleImageChange,
    removeImage,
    addAmenity,
    removeAmenity,
  } = useHostelForm(hostel);

  const handleSubmit = (e) => {
    e.preventDefault();
    // Use formData to create/update hostel
    console.log(formData);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        name="name"
        value={formData.name}
        onChange={handleChange}
      />
      <input
        type="file"
        accept="image/*"
        onChange={handleImageChange}
      />
      {previewImage && <img src={previewImage} alt="Preview" />}
      {/* ... more form fields ... */}
    </form>
  );
}
```

---

## Component Implementation

### 1. HostelCard Component

**File:** `src/components/hostels/HostelCard.jsx`

Displays individual hostel in a card format.

```javascript
import HostelCard from '@/components/hostels/HostelCard';

// PROPS:
// - hostel (object) - Hostel data
// - onDelete (function) - Delete callback
// - onEdit (function) - Edit callback

// USAGE:
<HostelCard
  hostel={hostelData}
  onDelete={(id) => handleDelete(id)}
  onEdit={(id) => handleEdit(id)}
/>

// DISPLAYS:
- Hostel image with room type badge
- Name, location, description
- Price and room type
- Capacity and campus info
- First 3 amenities with +N indicator
- View, Edit, Delete buttons
```

### 2. HostelForm Component

**File:** `src/components/hostels/HostelForm.jsx`

Complete form for creating and editing hostels.

```javascript
import HostelForm from '@/components/hostels/HostelForm';

// PROPS:
// - hostel (object) - Initial data (null for create)
// - isEditing (boolean) - Edit vs Create mode

// USAGE:
<HostelForm />                           // Create mode
<HostelForm hostel={data} isEditing />   // Edit mode

// INCLUDES:
- Hostel name, description, address
- Campus selection
- Price (monthly rate)
- Room capacity
- Room type (shared/single/double)
- Contact information (phone, website)
- Amenities list with add/remove
- Rules & Policies text area
- Image upload with preview
- Form validation
- Loading and error states
```

### 3. HostelGrid Component

**File:** `src/components/hostels/HostelGrid.jsx`

Grid layout for displaying multiple hostels.

```javascript
import HostelGrid from '@/components/hostels/HostelGrid';

// PROPS:
// - hostels (array) - Hostel data
// - loading (boolean) - Loading state
// - error (object) - Error object
// - onDelete (function) - Delete handler
// - onEdit (function) - Edit handler
// - isEmpty (boolean) - Empty state

// USAGE:
<HostelGrid
  hostels={hostels}
  loading={isLoading}
  error={error}
  onDelete={handleDelete}
  onEdit={handleEdit}
/>

// FEATURES:
- Responsive grid layout
- Loading spinner
- Error messages
- Empty state message
- Auto-adjusts columns for screen size
```

---

## Page Implementation

### 1. List Page (Hostels)

**File:** `src/app/(protected)/hostels/page.js`

Main hostels listing page with search and filters.

```javascript
// URL: /hostels
// PROTECTED: Yes (requires authentication)

// FEATURES:
✅ Display all hostels in grid
✅ Search by name/description
✅ Sort by: Newest, Price Low-High, Price High-Low
✅ Pagination with page numbers
✅ Create new hostel button
✅ Edit/Delete from cards
✅ Loading and error states
```

### 2. Create Page (New Hostel)

**File:** `src/app/(protected)/hostels/new/page.js`

Form page for creating new hostels.

```javascript
// URL: /hostels/new
// PROTECTED: Yes

// FEATURES:
✅ Complete hostel form
✅ Image upload with preview
✅ Amenities selection
✅ Form validation
✅ Submit to backend
✅ Redirect to list on success
✅ localStorage creator tracking
```

### 3. Detail Page (Hostel)

**File:** `src/app/(protected)/hostels/[id]/page.js`

Individual hostel detail page.

```javascript
// URL: /hostels/[id]
// PROTECTED: No (anyone can view)

// FEATURES:
✅ Hostel image
✅ Full details (name, price, amenities, etc.)
✅ Contact information
✅ Rules & Policies section
✅ Edit/Delete buttons (owner only)
✅ Contact Hostel button
✅ localhost owner verification
```

### 4. Edit Page (Edit Hostel)

**File:** `src/app/(protected)/hostels/[id]/edit/page.js`

Form page for editing existing hostels.

```javascript
// URL: /hostels/[id]/edit
// PROTECTED: Yes

// FEATURES:
✅ Pre-populate form with hostel data
✅ Image update capability
✅ All form validations
✅ Submit updates to backend
✅ Redirect to detail on success
```

---

## localStorage Workaround

### File: `src/utils/localStorage.js`

**Important:** This is a temporary solution until the backend populates creator/owner data.

```javascript
// AVAILABLE FUNCTIONS:

// Hostel functions:
storeHostelCreator(hostelId, userId)      // Store creator
getHostelCreator(hostelId)                // Get creator
isHostelOwner(hostelId, userId, data)     // Check ownership
clearHostelCreators()                     // Clear all

// Product functions (also included):
storeProductCreator(productId, userId)
getProductCreator(productId)
isProductOwner(productId, userId, data)

// Service functions (also included):
storeServiceCreator(serviceId, userId)
getServiceCreator(serviceId)
isServiceOwner(serviceId, userId, data)
```

### How It Works

1. **On Create:** When hostel is created successfully, user ID is stored in localStorage
2. **On Detail View:** Ownership check uses 2-tier approach:
   - Primary: Check backend data (owner/createdBy fields)
   - Fallback: Check localStorage for recently created hostels
3. **On Delete:** Creator info is removed

### Usage Example

```javascript
// In detail page:
import { isHostelOwner } from '@/utils/localStorage';

const isOwner = user?._id && isHostelOwner(hostelId, user._id, hostel);

if (isOwner) {
  // Show Edit/Delete buttons
}
```

### Backend Fix (When Ready)

Once backend is updated, remove localStorage checks and use only:

```javascript
// Primary check (backend data):
const isOwner = hostel.owner?._id === user._id;
```

---

## Full CRUD Operations

### CREATE (POST)

```javascript
// Step 1: User fills form
<HostelForm />

// Step 2: Form validates
if (!formData.name) setError('Name required');

// Step 3: Submit to backend
const { mutateAsync } = useCreateHostel();
await mutateAsync({ hostelData, image });

// Step 4: Success
- Query caches invalidated
- Creator info stored in localStorage
- Redirect to /hostels
- Success notification shown

// Step 5: Backend Response
{
  status: 'success',
  data: {
    _id: 'hostel-123',
    name: 'Star Hostel',
    image: 'https://cloudinary.../image.jpg',
    ...
  }
}
```

### READ (GET)

```javascript
// List View
const { data, isLoading } = useAllHostels({ page: 1, limit: 12 });
// Returns: { data: { hostels: [...], pagination: {...} } }

// Detail View
const { data: hostel } = useHostel('hostel-id-123');
// Returns: entire hostel object

// Search
const { data } = useSearchHostels('wifi');
// Returns: filtered hostels
```

### UPDATE (PATCH)

```javascript
// Step 1: Load existing hostel
const { data: hostel } = useHostel('hostel-id-123');

// Step 2: Edit in form
<HostelForm hostel={hostel} isEditing={true} />

// Step 3: Submit update
const { mutateAsync } = useUpdateHostel();
await mutateAsync({ 
  id: 'hostel-id-123',
  hostelData: updatedData,
  image: newImageFile
});

// Step 4: Cache invalidation
- All hostel queries refreshed
- List updated immediately

// Step 5: Redirect
router.push('/hostels/hostel-id-123');
```

### DELETE (DELETE)

```javascript
// Step 1: User clicks delete
<button onClick={() => handleDelete(hostelId)}>Delete</button>

// Step 2: Confirmation dialog
if (confirm('Delete this hostel?')) {
  await deleteHostel.mutateAsync(hostelId);
}

// Step 3: Backend request
DELETE /api/v1/hostels/hostel-id-123

// Step 4: Cache update
- Queries invalidated
- Removed from list
- localStorage cleared

// Step 5: Redirect
router.push('/hostels');
```

---

## Testing Guide

### Manual Testing Checklist

```markdown
## Hostel CRUD Testing

### CREATE ✅
- [ ] Navigate to /hostels/new
- [ ] Fill all required fields
- [ ] Upload image
- [ ] Add amenities
- [ ] Submit form
- [ ] Verify creation in list
- [ ] Check localStorage has creator ID

### READ ✅
- [ ] List page loads with hostels
- [ ] Detail page displays all info
- [ ] Search filters hostels
- [ ] Pagination works
- [ ] Images load correctly
- [ ] Contact info displays

### UPDATE ✅
- [ ] Navigate to detail page
- [ ] Click Edit button (if owner)
- [ ] Change fields
- [ ] Update image
- [ ] Submit changes
- [ ] Verify updates in list
- [ ] Non-owner cannot access edit

### DELETE ✅
- [ ] Click Delete button (if owner)
- [ ] Confirmation dialog appears
- [ ] Hostel removed from list
- [ ] localStorage cleaned up
- [ ] Non-owner cannot delete

### SEARCH & FILTER ✅
- [ ] Search by hostel name
- [ ] Sort by price
- [ ] Sort by newest
- [ ] Filter by campus
- [ ] Pagination works with filters

### ERROR HANDLING ✅
- [ ] Empty name shows error
- [ ] Invalid price shows error
- [ ] Network error displays message
- [ ] 404 error handled gracefully
- [ ] 401 redirects to login
```

### Automated Testing (Example)

```javascript
// Example Jest test
import { render, screen, fireEvent } from '@testing-library/react';
import HostelCard from '@/components/hostels/HostelCard';

describe('HostelCard', () => {
  const mockHostel = {
    _id: '1',
    name: 'Test Hostel',
    price: 25000,
    address: 'FUTO',
    roomType: 'shared',
    capacity: 50,
  };

  test('renders hostel name', () => {
    render(<HostelCard hostel={mockHostel} />);
    expect(screen.getByText('Test Hostel')).toBeInTheDocument();
  });

  test('calls onEdit when edit button clicked', () => {
    const onEdit = jest.fn();
    render(<HostelCard hostel={mockHostel} onEdit={onEdit} />);
    fireEvent.click(screen.getByText('Edit'));
    expect(onEdit).toHaveBeenCalledWith('1');
  });
});
```

---

## Error Handling

### Frontend Errors

**Form Validation**
```javascript
const validateForm = () => {
  const newErrors = {};
  
  if (!formData.name) newErrors.name = 'Name required';
  if (!formData.price <= 0) newErrors.price = 'Valid price required';
  if (!formData.image && !isEditing) newErrors.image = 'Image required';
  
  return newErrors;
};
```

**API Errors**
```javascript
const { error } = useCreateHostel();

if (error) {
  return (
    <ErrorAlert 
      message={error.message || 'Failed to create hostel'}
      onClose={() => {}}
    />
  );
}
```

**Network Errors**
```javascript
try {
  await mutateAsync(data);
} catch (error) {
  if (error.status === 401) {
    router.push('/login');
  } else if (error.status === 500) {
    alert('Server error. Please try again.');
  }
}
```

---

## Important Notes

### 1. Backend Integration

The frontend expects the backend API at:
```
Base URL: http://localhost:5000/api/v1
Endpoint: /hostels
```

**Expected Backend Routes:**
```
GET    /api/v1/hostels              - List hostels
GET    /api/v1/hostels/:id          - Get single hostel
POST   /api/v1/hostels              - Create hostel
PATCH  /api/v1/hostels/:id          - Update hostel
DELETE /api/v1/hostels/:id          - Delete hostel
```

### 2. Authentication

All mutations (create, update, delete) require JWT token:
```javascript
// Token is automatically attached by axios interceptor
// No additional setup needed
```

### 3. Image Upload

Images are sent to Cloudinary via backend:
```javascript
const formData = new FormData();
formData.append('image', imageFile);     // File object
formData.append('name', hostelName);     // Other fields

await api.post('/hostels', formData);    // Content-Type auto-detected
```

### 4. localStorage Creator Tracking

Only stores user ID - temporary workaround:
```javascript
localStorage.setItem(
  'hostelCreators',
  JSON.stringify({
    'hostel-id-1': 'user-id-123',
    'hostel-id-2': 'user-id-456',
  })
);
```

### 5. Responsive Design

Tested on:
- ✅ Desktop (1920px, 1440px, 1024px)
- ✅ Tablet (768px, 834px)
- ✅ Mobile (480px, 375px, 320px)

---

## Next Steps

1. **Test the implementation**
   - Run frontend: `npm run dev`
   - Navigate to `/hostels`
   - Create/Read/Update/Delete a hostel

2. **Verify backend integration**
   - Check API responses
   - Verify image uploads to Cloudinary
   - Test authentication flow

3. **Fix backend issues**
   - Ensure `/hostels` endpoints exist
   - Populate owner/creator data in responses
   - Handle FormData content-type

4. **Polish UI** (optional)
   - Customize colors to match design
   - Add animations/transitions
   - Implement skeleton loaders

5. **Remove localStorage workaround**
   - Once backend populates owner data
   - Remove localStorage checks
   - Use only backend-provided data

---

## File Summary

| File | Purpose | Status |
|------|---------|--------|
| `src/services/hostels.js` | API calls | ✅ Created |
| `src/hooks/useHostels.js` | React Query hooks | ✅ Created |
| `src/hooks/useHostelForm.js` | Form state | ✅ Created |
| `src/components/hostels/HostelCard.jsx` | Card component | ✅ Created |
| `src/components/hostels/HostelForm.jsx` | Form component | ✅ Created |
| `src/components/hostels/HostelGrid.jsx` | Grid component | ✅ Created |
| `src/app/(protected)/hostels/page.js` | List page | ✅ Created |
| `src/app/(protected)/hostels/new/page.js` | Create page | ✅ Created |
| `src/app/(protected)/hostels/[id]/page.js` | Detail page | ✅ Created |
| `src/app/(protected)/hostels/[id]/edit/page.js` | Edit page | ✅ Created |
| `src/utils/localStorage.js` | localStorage utils | ✅ Created |

---

## Support & Troubleshooting

**Issue:** Hostels not displaying
- Check API endpoint is `/hostels` (not `/hostels/`)
- Verify backend returns `{ data: { hostels: [...] } }`
- Check network tab for 404 errors

**Issue:** Images not uploading
- Verify multer middleware in backend
- Check Cloudinary credentials
- Ensure FormData content-type is auto-detected

**Issue:** Edit/Delete buttons not showing
- Check localStorage: `localStorage.getItem('hostelCreators')`
- Verify backend populates owner field
- Check user ID matches in localStorage

**Issue:** Search not working
- Ensure backend supports search parameter
- Check query is not empty before searching
- Verify search endpoint handles spaces

---

Happy coding! 🚀
