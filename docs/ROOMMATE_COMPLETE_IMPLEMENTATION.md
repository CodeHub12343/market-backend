# Roommate Lifecycle Implementation - Complete Guide

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Backend API Reference](#backend-api-reference)
4. [Frontend Components](#frontend-components)
5. [Page Implementations](#page-implementations)
6. [Data Flow](#data-flow)
7. [Features & Capabilities](#features--capabilities)
8. [Styling Guide](#styling-guide)
9. [Best Practices](#best-practices)
10. [Common Issues & Solutions](#common-issues--solutions)
11. [Testing Checklist](#testing-checklist)
12. [Deployment Notes](#deployment-notes)

---

## Overview

The Roommate Listing feature is a comprehensive marketplace for students to find and manage roommate connections on campus. It combines a full CRUD backend with a rich React frontend built with Next.js 14+ App Router.

### Tech Stack
- **Frontend**: Next.js 14+, React 18+, Styled Components
- **State Management**: React Query (TanStack Query) v5
- **HTTP Client**: Axios with custom interceptors
- **Image Upload**: Cloudinary
- **Backend**: Express.js, MongoDB, Mongoose ODM
- **Real-time**: Socket.IO (for future chat/notifications)

### Key Features
- ✅ Create, read, update, delete roommate listings
- ✅ Advanced filtering (budget, gender, amenities, location, etc.)
- ✅ Full-text search with autocomplete
- ✅ Image upload & gallery (up to 10 images per listing)
- ✅ Favorites/wishlist functionality
- ✅ View counts & analytics
- ✅ Responsive design (mobile-first)
- ✅ Error handling & loading states
- ✅ Pagination & lazy loading

---

## Architecture

### Frontend Structure
```
src/
├── app/(protected)/roommates/
│   ├── page.jsx                    # Browse all roommates
│   ├── new/page.jsx                # Create new listing
│   ├── [id]/
│   │   ├── page.jsx                # View listing details
│   │   └── edit/page.jsx           # Edit listing
│   └── my-listings/page.jsx        # User's listings
├── components/roommates/
│   ├── RoommateCard.jsx            # Card component
│   ├── RoommateGrid.jsx            # Grid layout
│   ├── RoommateForm.jsx            # Form (create/edit)
│   └── RoommateFilters.jsx         # Filter UI
├── hooks/
│   └── useRoommates.js             # React Query hooks
└── services/
    └── roommates.js                # API service layer
```

### Data Flow Diagram
```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser/Client                            │
├─────────────────────────────────────────────────────────────────┤
│                      React Components                            │
│   ┌──────────────────────────────────────────────────────────┐  │
│   │ Pages: Browse, Create, Edit, Details, My Listings        │  │
│   │ Components: Card, Grid, Form, Filters                    │  │
│   └──────────────────────────────────────────────────────────┘  │
│                           ↓                                       │
│                  React Query Hooks                              │
│   ┌──────────────────────────────────────────────────────────┐  │
│   │ useRoommates, useMyRoommates, useRoommate, etc.          │  │
│   │ Cached state, automatic refetching, error handling       │  │
│   └──────────────────────────────────────────────────────────┘  │
│                           ↓                                       │
│                   API Service Layer                             │
│   ┌──────────────────────────────────────────────────────────┐  │
│   │ roommates.js: HTTP calls with Axios                       │  │
│   │ - GET/POST/PATCH/DELETE requests                         │  │
│   │ - Cloudinary image upload integration                    │  │
│   │ - Error transformation                                    │  │
│   └──────────────────────────────────────────────────────────┘  │
│                           ↓                                       │
├─────────────────────────────────────────────────────────────────┤
│                    Network (HTTPS/REST)                         │
└─────────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│                       Backend Server                             │
├─────────────────────────────────────────────────────────────────┤
│                    Express.js Routes                             │
│   ┌──────────────────────────────────────────────────────────┐  │
│   │ /api/v1/roommates routes (with auth middleware)          │  │
│   └──────────────────────────────────────────────────────────┘  │
│                           ↓                                       │
│                   Route Handlers                                │
│   ┌──────────────────────────────────────────────────────────┐  │
│   │ roommateListingController.js                              │  │
│   │ - getAllRoommateListings, createRoomateListing, etc.      │  │
│   │ - Input validation, business logic                        │  │
│   └──────────────────────────────────────────────────────────┘  │
│                           ↓                                       │
│                  MongoDB Database                               │
│   ┌──────────────────────────────────────────────────────────┐  │
│   │ Roommate collection with indexed fields                   │  │
│   │ - Text index on title & description                      │  │
│   │ - Indexes on campus, user, createdAt                     │  │
│   └──────────────────────────────────────────────────────────┘  │
│                           ↓                                       │
│                    Cloudinary                                    │
│   ┌──────────────────────────────────────────────────────────┐  │
│   │ Image storage & optimization                              │  │
│   └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Backend API Reference

### Base URL
```
/api/v1/roommates
```

### Endpoints

#### 1. Get All Roommates
```http
GET /api/v1/roommates?page=1&limit=12&sort=-createdAt
```

**Query Parameters:**
- `page` (number): Page number for pagination
- `limit` (number): Items per page
- `sort` (string): Sort field with direction (-fieldName)
- `campus` (string): Filter by campus
- `accommodation` (string): Filter by accommodation type
- `genderPreference` (string): Filter by gender preference
- `minPrice` (number): Minimum budget
- `maxPrice` (number): Maximum budget
- `amenities` (string[]): Required amenities

**Response:**
```json
{
  "status": "success",
  "results": 25,
  "data": {
    "roommates": [
      {
        "_id": "640a4b2e3f5e1a2b3c4d5e6f",
        "title": "Seeking Quiet Roommate - Ife Campus",
        "description": "Looking for a quiet, studious roommate...",
        "user": {
          "_id": "640a4b2e3f5e1a2b3c4d5e6a",
          "firstName": "John",
          "lastName": "Doe",
          "profileImage": "https://..."
        },
        "budget": {
          "minPrice": 40000,
          "maxPrice": 200000
        },
        "location": {
          "campus": "ife-main",
          "address": "123 Main Street, Ife"
        },
        "accommodation": "apartment",
        "roomType": "shared",
        "numberOfRooms": 2,
        "preferences": {
          "genderPreference": "any",
          "ageRange": {
            "min": 18,
            "max": 30
          },
          "academicLevel": "200L"
        },
        "requiredAmenities": ["WiFi", "Generator", "Security"],
        "contact": {
          "phone": "08012345678",
          "whatsapp": "08012345678",
          "email": "user@example.com"
        },
        "images": [
          "https://res.cloudinary.com/...",
          "https://res.cloudinary.com/..."
        ],
        "tags": ["quiet", "studious", "clean"],
        "views": 245,
        "favorites": 12,
        "active": true,
        "isFavored": false,
        "createdAt": "2024-01-10T10:30:00Z",
        "updatedAt": "2024-01-11T14:45:00Z"
      }
    ],
    "pagination": {
      "total": 156,
      "pages": 13,
      "page": 1,
      "limit": 12
    }
  }
}
```

#### 2. Search Roommates
```http
GET /api/v1/roommates/search/advanced?query=quiet&campus=ife-main
```

**Query Parameters:**
- `query` (string): Search term
- `campus` (string): Campus filter
- `genderPreference` (string): Gender filter
- `minPrice` (number): Min budget
- `maxPrice` (number): Max budget
- `accommodation` (string): Accommodation type
- `amenities` (string[]): Required amenities
- `sortBy` (string): Sort field
- `page` (number): Page number
- `limit` (number): Items per page

**Response:** Same as Get All Roommates

#### 3. Get Single Roommate
```http
GET /api/v1/roommates/:id
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "roommate": { /* Full roommate object */ }
  }
}
```

#### 4. Get My Roommate Listings
```http
GET /api/v1/roommates/me
```

**Headers:**
```
Authorization: Bearer <token>
```

**Response:** Array of user's roommate listings

#### 5. Create Roommate Listing
```http
POST /api/v1/roommates
```

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "title": "Seeking Quiet Roommate - Ife Campus",
  "description": "Looking for a quiet, studious roommate...",
  "budget": {
    "minPrice": 40000,
    "maxPrice": 200000
  },
  "location": {
    "campus": "ife-main",
    "address": "123 Main Street, Ife"
  },
  "accommodation": "apartment",
  "roomType": "shared",
  "numberOfRooms": 2,
  "preferences": {
    "genderPreference": "any",
    "ageRange": {
      "min": 18,
      "max": 30
    },
    "academicLevel": "200L"
  },
  "requiredAmenities": ["WiFi", "Generator", "Security"],
  "contact": {
    "phone": "08012345678",
    "whatsapp": "08012345678",
    "email": "user@example.com"
  },
  "tags": ["quiet", "studious", "clean"]
}
```

**Response:** Created roommate object with `_id`

#### 6. Add Roommate Images
```http
POST /api/v1/roommates/:id/images
```

**Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Form Data:**
- `images` (file[]): Image files (up to 10 images)

**Response:** Updated roommate with image URLs

#### 7. Remove Roommate Image
```http
DELETE /api/v1/roommates/:id/images/:imageIndex
```

**Headers:**
```
Authorization: Bearer <token>
```

**Response:** Updated roommate object

#### 8. Update Roommate Listing
```http
PATCH /api/v1/roommates/:id
```

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:** Same as create (all fields optional)

**Response:** Updated roommate object

#### 9. Delete Roommate Listing
```http
DELETE /api/v1/roommates/:id
```

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "status": "success",
  "message": "Roommate listing deleted successfully"
}
```

#### 10. Toggle Favorite
```http
POST /api/v1/roommates/:id/favorite
```

**Headers:**
```
Authorization: Bearer <token>
```

**Response:** Updated roommate with `isFavored` flag

#### 11. Get Roommate Stats
```http
GET /api/v1/roommates/:id/stats
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "stats": {
      "views": 245,
      "favorites": 12,
      "contacts": 8,
      "lastViewed": "2024-01-11T14:45:00Z"
    }
  }
}
```

---

## Frontend Components

### 1. RoommateCard.jsx
Individual listing card with image carousel, details, and action buttons.

**Props:**
```javascript
{
  roommate: {
    _id: string,
    title: string,
    budget: { minPrice: number, maxPrice: number },
    location: { campus: string, address: string },
    images: string[],
    views: number,
    isFavored: boolean,
    user: { firstName: string, lastName: string }
  },
  onFavorite: (id: string) => void,
  onView: (id: string) => void
}
```

**Features:**
- Image carousel with thumbnail navigation
- Hover effects and animations
- Favorite button with loading state
- View count display
- Budget and location info
- Creator profile snippet

---

### 2. RoommateGrid.jsx
Responsive grid layout for displaying multiple roommate cards.

**Props:**
```javascript
{
  roommates: Roommate[],
  isLoading: boolean,
  isError: boolean,
  error: Error,
  onPageChange: (page: number) => void,
  currentPage: number,
  totalPages: number
}
```

**Features:**
- Responsive columns (1 mobile, 2 tablet, 3+ desktop)
- Loading skeletons
- Empty state handling
- Error boundary
- Pagination controls
- Infinite scroll option (optional)

---

### 3. RoommateForm.jsx
Create/edit form with full field validation and image upload.

**Props:**
```javascript
{
  initialRoommate: Roommate | null,
  onSuccess: () => void
}
```

**Form Sections:**
1. **Basic Information**
   - Title (0-150 chars)
   - Description (0-2000 chars)

2. **Location & Accommodation**
   - Campus selection
   - Accommodation type
   - Room type
   - Address

3. **Budget**
   - Min price (₦)
   - Max price (₦)
   - Number of rooms

4. **Preferences**
   - Gender preference
   - Age range (min-max)
   - Academic level

5. **Amenities**
   - Multi-select chips
   - WiFi, Generator, Kitchen, Parking, etc.

6. **Contact Information**
   - Phone number
   - WhatsApp number
   - Email address

7. **Images**
   - Drag-drop upload area
   - Multiple image support (max 10)
   - Image preview with remove button

8. **Tags**
   - Add/remove custom tags
   - Tag input field

**Features:**
- Real-time validation
- Character count display
- Image preview & management
- Loading states
- Error message display
- Auto-save to draft (optional)

---

### 4. RoommateFilters.jsx
Advanced filtering UI with sticky positioning.

**Props:**
```javascript
{
  filters: {
    campus?: string,
    genderPreference?: string,
    budgetRange?: { min?: number, max?: number },
    accommodation?: string,
    amenities?: string[]
  },
  onFilterChange: (filters: object) => void,
  hasActiveFilters: boolean,
  onClearFilters: () => void
}
```

**Filter Components:**
1. Campus dropdown
2. Gender preference dropdown
3. Budget range (min-max inputs)
4. Accommodation type dropdown
5. Amenities multi-select
6. Active filter tags with remove button
7. Clear all button

**Features:**
- Mobile collapse/expand
- Active filter display
- Clear individual filters
- Clear all filters button
- Responsive design

---

## Page Implementations

### 1. /roommates (Browse)
**File:** `src/app/(protected)/roommates/page.jsx`

**Features:**
- Search bar with real-time search
- Filter sidebar with sticky positioning
- Result count display
- Sort dropdown (newest, oldest, price-low, price-high)
- Grid layout with pagination
- Loading skeletons
- Empty states
- Create listing button (header)

**State Management:**
```javascript
const [searchQuery, setSearchQuery] = useState('');
const [filters, setFilters] = useState({});
const [sortBy, setSortBy] = useState('recent');
const [currentPage, setCurrentPage] = useState(1);

const { data, isLoading, error } = useSearchRoommates({
  query: searchQuery,
  ...filters,
  sortBy,
  page: currentPage,
  limit: 12
});
```

---

### 2. /roommates/new (Create)
**File:** `src/app/(protected)/roommates/new/page.jsx`

**Features:**
- Full page form layout
- Back button
- Title bar
- Form component with all fields
- Submit & cancel buttons
- Success redirect to my-listings

**Flow:**
1. User fills form fields
2. Client-side validation
3. Image upload to Cloudinary
4. Submit to `/api/v1/roommates`
5. Redirect to `/roommates/my-listings` on success

---

### 3. /roommates/[id] (Details)
**File:** `src/app/(protected)/roommates/[id]/page.jsx`

**Features:**
- Full-screen image gallery
- Title & basic info
- Budget display
- Location details
- Amenities section
- Tags section
- Preferences section
- Contact information
- Message button (if not owner)
- Edit/Delete buttons (if owner)
- Share button
- Favorite button
- View count

**Layout:**
```
┌─────────────────────────────────────────┐
│ Back | Share | Favorite | Edit | Delete │
├─────────────────────────────────────────┤
│                                         │
│  Image Gallery (responsive grid)        │
│                                         │
├─────────────────────────────────────────┤
│ Description                 │ Details   │
│ • About                     │ Card      │
│ • Tags                      │ • Title   │
│ • Amenities                 │ • Price   │
│ • Preferences               │ • Location│
│                             │ • Message │
│                             │ • Contact │
└─────────────────────────────────────────┘
```

**Features:**
- Image carousel with zoom
- Sticky details card (desktop)
- Responsive layout
- Owner verification
- Contact method links

---

### 4. /roommates/[id]/edit (Edit)
**File:** `src/app/(protected)/roommates/[id]/edit/page.jsx`

**Features:**
- Same form as create
- Pre-populated with existing data
- Loading state for fetching data
- Error handling
- Redirect to details on success

**Flow:**
1. Fetch roommate data via `useRoommate(id)`
2. Load into form component as `initialRoommate`
3. Submit updates to `PATCH /api/v1/roommates/:id`
4. Redirect to details page

---

### 5. /roommates/my-listings (My Listings)
**File:** `src/app/(protected)/roommates/my-listings/page.jsx`

**Features:**
- Grid of user's listings
- Status badge (Active/Inactive)
- View/Edit/Delete actions
- Stats cards (Total, Active, Views)
- Empty state with create button
- Create listing button (header)

**Layout:**
```
┌──────────────────────────────────────────────────────┐
│ My Roommate Listings          [+ Create Listing]     │
├──────────────────────────────────────────────────────┤
│ [Total: 3]  [Active: 2]  [Views: 145]                │
├──────────────────────────────────────────────────────┤
│  ┌─────────┐  ┌─────────┐  ┌─────────┐              │
│  │ Listing │  │ Listing │  │ Listing │              │
│  │   [A]   │  │   [B]   │  │   [C]   │              │
│  │[View]   │  │[View]   │  │[View]   │              │
│  │[Edit]   │  │[Edit]   │  │[Edit]   │              │
│  │[Delete] │  │[Delete] │  │[Delete] │              │
│  └─────────┘  └─────────┘  └─────────┘              │
└──────────────────────────────────────────────────────┘
```

**Features:**
- Owner-only access
- Status badges
- Quick stats
- One-click actions
- Confirmation dialogs for delete
- Responsive grid layout

---

## Features & Capabilities

### 1. Search Functionality
- Full-text search on title & description
- Real-time suggestions (debounced)
- Search preserves other filters

### 2. Advanced Filtering
- **Campus**: Ife Main, Ife Annex
- **Gender Preference**: Any, Male, Female
- **Budget Range**: Min-max price filter
- **Accommodation Type**: Apartment, Hostel, Lodge
- **Amenities**: Multi-select (WiFi, Generator, Kitchen, etc.)
- **Academic Level**: 100L, 200L, 300L, 400L
- **Age Range**: Min-max age filter

### 3. Image Management
- Upload up to 10 images per listing
- Cloudinary integration
- Image optimization & transformation
- Gallery with preview thumbnails
- Drag-drop upload support
- Remove individual images

### 4. Favorites/Wishlist
- Add/remove from favorites
- Persist to backend
- Display favorite status
- Filter by favorites (future)

### 5. Contact Methods
- Phone call integration
- WhatsApp direct link
- Email contact
- In-app messaging (future)

### 6. Analytics
- View counts
- Favorite counts
- Contact request tracking
- Last viewed timestamp

### 7. Tags & Preferences
- Custom tags for categorization
- Searchable amenities
- Gender & age preferences
- Academic level matching

---

## Styling Guide

### Design System

**Colors:**
```javascript
const Colors = {
  primary: '#1a1a1a',      // Dark text/buttons
  background: '#ffffff',    // White background
  lightBg: '#f9f9f9',      // Light gray background
  border: '#e5e5e5',       // Light borders
  error: '#c00',           // Error red
  success: '#4CAF50',      // Success green
  text: {
    primary: '#1a1a1a',
    secondary: '#666666',
    tertiary: '#999999'
  }
};
```

**Typography:**
```javascript
const Typography = {
  h1: { fontSize: '28px', fontWeight: 700 },
  h2: { fontSize: '24px', fontWeight: 700 },
  h3: { fontSize: '16px', fontWeight: 700 },
  body: { fontSize: '14px', fontWeight: 400 },
  caption: { fontSize: '12px', fontWeight: 500 }
};
```

**Spacing:**
```javascript
const Spacing = {
  xs: '4px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '20px',
  xxl: '24px'
};
```

**Breakpoints:**
```javascript
const Breakpoints = {
  mobile: '0px',
  tablet: '640px',
  lg: '1024px'
};
```

### Responsive Behavior

All components use mobile-first CSS media queries:

```javascript
// Mobile (default)
display: grid;
grid-template-columns: 1fr;

// Tablet (@640px)
@media (min-width: 640px) {
  grid-template-columns: repeat(2, 1fr);
}

// Desktop (@1024px)
@media (min-width: 1024px) {
  grid-template-columns: repeat(3, 1fr);
}
```

### Component Styling Examples

**Buttons:**
```javascript
const Button = styled.button`
  padding: 12px 16px;
  background: ${props => props.primary ? '#1a1a1a' : '#f9f9f9'};
  color: ${props => props.primary ? '#fff' : '#1a1a1a'};
  border: 1px solid ${props => props.primary ? 'transparent' : '#e5e5e5'};
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background: ${props => props.primary ? '#333' : '#f0f0f0'};
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;
```

**Form Inputs:**
```javascript
const Input = styled.input`
  width: 100%;
  padding: 14px 16px;
  border: none;
  background: #f8f8f8;
  border-radius: 12px;
  font-size: 16px;
  outline: none;
  transition: all 0.2s ease;

  &:focus {
    background: #ffffff;
    box-shadow: 0 0 0 2px rgba(26, 26, 26, 0.1);
  }
`;
```

---

## Best Practices

### 1. State Management with React Query
```javascript
// ✅ GOOD: Using React Query hooks
const { data, isLoading, error, refetch } = useRoommates();

// ❌ BAD: Manual state management
const [roommates, setRoommates] = useState([]);
useEffect(() => {
  fetch('/api/roommates').then(r => r.json()).then(setRoommates);
}, []);
```

### 2. Form Validation
```javascript
// ✅ GOOD: Validate before submit
const handleSubmit = (e) => {
  e.preventDefault();
  const errors = validateForm(formData);
  if (Object.keys(errors).length > 0) {
    setErrors(errors);
    return;
  }
  submitForm();
};

// ❌ BAD: No validation
const handleSubmit = (e) => {
  e.preventDefault();
  submitForm();
};
```

### 3. Error Handling
```javascript
// ✅ GOOD: Display user-friendly errors
if (isError) {
  return (
    <ErrorMessage>
      <AlertCircle />
      {error?.message || 'Something went wrong'}
    </ErrorMessage>
  );
}

// ❌ BAD: No error handling
if (isError) {
  return null; // Silent failure
}
```

### 4. Loading States
```javascript
// ✅ GOOD: Show loading feedback
if (isLoading) {
  return <LoadingSkeletons />;
}

// ❌ BAD: No loading state
return <Component data={data} />;
```

### 5. Image Optimization
```javascript
// ✅ GOOD: Optimize on upload
const optimizedUrl = `${imageUrl}?w=500&h=400&fit=crop&q=80`;

// ❌ BAD: Use raw image
const url = imageUrl;
```

### 6. Debounced Search
```javascript
// ✅ GOOD: Debounce search input
const [searchQuery, setSearchQuery] = useState('');
const debouncedQuery = useDebounce(searchQuery, 500);

useEffect(() => {
  refetch();
}, [debouncedQuery]);

// ❌ BAD: Fetch on every keystroke
const handleSearch = (value) => {
  setSearchQuery(value);
  refetch(); // Too many requests!
};
```

### 7. Cache Management
```javascript
// ✅ GOOD: Invalidate cache after mutation
const { mutate: createRoommate } = useCreateRoommate();

const handleCreate = () => {
  createRoommate(data, {
    onSuccess: () => {
      queryClient.invalidateQueries('roommates');
    }
  });
};

// ❌ BAD: Manual refetch
const handleCreate = async () => {
  await api.post('/roommates', data);
  refetch(); // Might be stale
};
```

---

## Common Issues & Solutions

### Issue 1: Images Not Uploading
**Problem:** Cloudinary uploads failing with 401/403 error

**Solution:**
```javascript
// Check credentials in config
const CLOUDINARY_CONFIG = {
  cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  uploadPreset: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET
};

// Verify environment variables are set
console.log('Cloud Name:', process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME);
```

### Issue 2: Search Not Working
**Problem:** Search results empty or outdated

**Solution:**
```javascript
// Clear cache on search
const handleSearch = (value) => {
  setSearchQuery(value);
  queryClient.invalidateQueries('roommates');
};

// Add debouncing
const debouncedSearch = useDebounce(searchQuery, 300);
```

### Issue 3: Form Validation Errors
**Problem:** Form won't submit with confusing error messages

**Solution:**
```javascript
// Validate field-by-field
const validateForm = (data) => {
  const errors = {};
  
  if (!data.title?.trim()) {
    errors.title = 'Title is required';
  }
  if (data.title.length > 150) {
    errors.title = 'Title cannot exceed 150 characters';
  }
  
  return errors;
};

// Display field-level errors
{errors.title && (
  <ErrorMessage>{errors.title}</ErrorMessage>
)}
```

### Issue 4: Pagination Not Working
**Problem:** Page navigation buttons not updating results

**Solution:**
```javascript
// Reset to page 1 on filter change
const handleFilterChange = (newFilters) => {
  setFilters(newFilters);
  setCurrentPage(1); // ← Important!
};

// Update hook params when page changes
const { data } = useSearchRoommates({
  ...filters,
  page: currentPage
});
```

### Issue 5: Favorites Not Persisting
**Problem:** Favorite status resets on refresh

**Solution:**
```javascript
// Ensure token is sent with request
const headers = {
  'Authorization': `Bearer ${localStorage.getItem('token')}`
};

// Use authenticated API call
api.post(`/roommates/${id}/favorite`, {}, { headers });
```

---

## Testing Checklist

### Create Listing
- [ ] Fill all required fields
- [ ] Upload 1-10 images
- [ ] Add multiple tags
- [ ] Submit successfully
- [ ] Redirect to my-listings
- [ ] New listing appears in list

### Search & Filter
- [ ] Search by keyword works
- [ ] Campus filter works
- [ ] Gender preference filter works
- [ ] Budget range filter works
- [ ] Amenities filter works
- [ ] Multiple filters combined work
- [ ] Clear filters resets all

### View Listing
- [ ] Image gallery displays
- [ ] All details visible
- [ ] Contact info shown
- [ ] Favorite button works
- [ ] View count updates
- [ ] Preferences displayed

### Edit Listing
- [ ] Prepopulates with existing data
- [ ] Update fields successfully
- [ ] Add/remove images
- [ ] Submit saves changes
- [ ] Redirect to details

### Delete Listing
- [ ] Confirmation dialog appears
- [ ] Deletes from database
- [ ] Removes from my-listings
- [ ] Confirmation message shown

### Mobile Responsiveness
- [ ] Images resize properly
- [ ] Filters collapse on mobile
- [ ] Buttons are tappable (48px+)
- [ ] Text is readable
- [ ] No horizontal scroll

### Error Handling
- [ ] Show error on API failure
- [ ] Display validation errors
- [ ] Handle missing data gracefully
- [ ] Retry mechanism works

---

## Deployment Notes

### Environment Variables
```env
# .env.local
NEXT_PUBLIC_API_BASE_URL=https://api.example.com/api/v1
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your_upload_preset

# Backend
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/db
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
JWT_SECRET=your_jwt_secret
```

### Performance Optimization
1. **Image Optimization**
   - Use Cloudinary transformations for responsive images
   - Set appropriate widths & quality levels

2. **Code Splitting**
   - Use dynamic imports for heavy components
   - Lazy load images below the fold

3. **Caching Strategy**
   - Cache GET requests (default 5 minutes)
   - Invalidate on POST/PATCH/DELETE
   - Use stale-while-revalidate for faster UX

4. **Database Indexing**
   - Index on `user._id` for my-listings query
   - Index on `campus`, `accommodation`, `createdAt`
   - Text index on `title` & `description` for search

### SEO Considerations
- Add meta tags to details page
- Use semantic HTML structure
- Implement Open Graph tags for sharing
- Add sitemap for listings

### Security
- All mutations require authentication
- Validate input on backend
- Sanitize user-generated content
- Rate limit API endpoints
- Use HTTPS only
- Implement CORS properly

---

## Quick Start Guide

### For Frontend Developers

1. **Install dependencies:**
```bash
npm install
```

2. **Set up environment variables:**
```bash
cp .env.example .env.local
```

3. **Start development server:**
```bash
npm run dev
```

4. **Test the feature:**
   - Visit `http://localhost:3000/roommates`
   - Create a new listing
   - Search and filter
   - Edit/delete your listings

### For Backend Developers

1. **Install dependencies:**
```bash
npm install
```

2. **Ensure MongoDB is running:**
```bash
mongod
```

3. **Set up database indexes:**
```javascript
// In your DB initialization
db.roommates.createIndex({ user: 1 });
db.roommates.createIndex({ campus: 1 });
db.roommates.createIndex({ title: 'text', description: 'text' });
```

4. **Test API endpoints:**
```bash
# Get all roommates
curl http://localhost:5000/api/v1/roommates

# Create roommate (requires auth token)
curl -X POST http://localhost:5000/api/v1/roommates \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{ "title": "..." }'
```

---

**Last Updated:** January 13, 2026  
**Version:** 1.0.0  
**Status:** Production Ready
