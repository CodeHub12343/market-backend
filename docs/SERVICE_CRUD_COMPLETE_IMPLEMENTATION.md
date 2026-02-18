# Service CRUD Implementation Guide - Next.js Frontend

## Overview

Complete CRUD (Create, Read, Update, Delete) implementation for the Service feature in your Next.js application with styled-components. This guide covers all layers: services, hooks, components, and pages.

## File Structure

```
src/
├── app/(protected)/services/
│   ├── page.js                 # List all services
│   ├── new/
│   │   └── page.js            # Create new service
│   └── [id]/
│       ├── page.js            # Service detail/view
│       └── edit/
│           └── page.js        # Edit service
├── components/services/
│   ├── ServiceCard.jsx        # Service display card
│   ├── ServiceForm.jsx        # Form for create/edit
│   └── ServiceGrid.jsx        # Grid layout component
├── hooks/
│   ├── useServices.js         # Services queries and mutations
│   └── useServiceForm.js      # Form state management
└── services/
    └── services.js            # API service calls
```

## 1. API Service Layer (services/services.js)

**Purpose**: Handles all API calls to the backend

**Key Functions**:

```javascript
// Fetch operations
getAllServices(params)      // List with filtering/pagination
getMyServices()             // Current user's services
getServiceById(id)          // Single service details
searchServices(query)       // Search by query
getServicesByCategory(id)   // Filter by category
getServicesByProvider(id)   // Filter by provider

// CRUD operations
createService(serviceData)  // Create new
updateService(id, updates)  // Update existing
deleteService(id)          // Delete

// Reviews
rateService(id, ratingData)
getServiceReviews(id)

// Advanced
filterServices(filters)    // Complex filtering
getServiceStats(id)        // Statistics
```

**Usage Example**:
```javascript
import { getAllServices, createService } from '@/services/services';

// Fetch services
const response = await getAllServices({ 
  page: 1, 
  limit: 10,
  sort: '-createdAt'
});

// Create service
const newService = await createService({
  title: 'House Cleaning',
  description: '...',
  price: 50,
  category: 'cleaning',
  // ... other fields
});
```

## 2. Custom Hooks Layer (hooks/)

### useServices.js

**Queries** (Read operations):

```javascript
// Fetch all services with React Query
const { data, isLoading, error } = useAllServices({
  page: 1,
  limit: 12,
  sort: '-createdAt'
});

// Fetch user's own services
const { data: myServices } = useMyServices();

// Fetch single service
const { data: service } = useService(serviceId);

// Search
const { data: results } = useSearchServices(query);

// Filter by category
const { data } = useServicesByCategory(categoryId);
```

**Mutations** (Write operations):

```javascript
// Create service
const createMutation = useCreateService();
await createMutation.mutateAsync(serviceData);

// Update service
const updateMutation = useUpdateService();
await updateMutation.mutateAsync({ id: serviceId, updates });

// Delete service
const deleteMutation = useDeleteService();
await deleteMutation.mutateAsync(serviceId);

// Rate service
const rateMutation = useRateService();
await rateMutation.mutateAsync({ serviceId, ratingData });
```

### useServiceForm.js

**Form State Management**:

```javascript
const form = useServiceForm(initialService);

// Form data
form.formData              // Current form state
form.errors               // Validation errors
form.submitting           // Is submitting
form.isCreating          // Create in progress
form.isUpdating          // Update in progress

// Handlers
form.handleInputChange(event)
form.handleImageChange(event)
form.handleAddTag(tag)
form.handleRemoveTag(tag)
form.handleSubmit(event)
form.resetForm()
```

## 3. Components Layer

### ServiceCard.jsx

Displays a single service in card format.

**Props**:
```javascript
<ServiceCard 
  service={service}           // Service object
  onEdit={handleEdit}         // Edit callback
  onDelete={handleDelete}     // Delete callback
/>
```

**Features**:
- Image display with fallback
- Price and duration
- Provider info and avatar
- Ratings and reviews count
- Tags
- Availability status
- Hover effects and animations

### ServiceForm.jsx

Form for creating or editing services.

**Props**:
```javascript
<ServiceForm 
  initialService={null}       // null for create, service obj for edit
  onSuccess={handleSuccess}   // Callback after save
/>
```

**Features**:
- Auto-fill when editing
- Image upload with preview
- Tag management
- Form validation
- Error messages
- Loading states
- Character counts

### ServiceGrid.jsx

Grid layout for displaying multiple services.

**Props**:
```javascript
<ServiceGrid 
  services={[]}              // Array of services
  loading={false}            // Loading state
  error={null}               // Error object
  title="Services"           // Grid title
  pagination={pagination}    // Pagination info
  onPageChange={handlePage}  // Page change handler
  onFilterChange={handleFilter}  // Filter handler
/>
```

## 4. Pages Layer

### /services - List Page

**Features**:
- Display all services in grid
- Search functionality
- Sort options (newest, price, rating)
- Pagination
- Empty state
- Loading states
- Create button

**URL**: `/services`

**Example**:
```javascript
export default function ServicesPage() {
  const [filters, setFilters] = useState({
    page: 1,
    limit: 12,
    sort: '-createdAt'
  });

  const { data, isLoading } = useAllServices(filters);
  
  return <ServiceGrid services={data?.data?.services} .../>;
}
```

### /services/new - Create Page

**Features**:
- Service creation form
- Image upload
- Category selection
- Tag management
- Form validation
- Success redirect

**URL**: `/services/new`

**Example**:
```javascript
export default function CreateServicePage() {
  const router = useRouter();

  const handleSuccess = () => {
    router.push('/services');
  };

  return <ServiceForm onSuccess={handleSuccess} />;
}
```

### /services/[id] - Detail Page

**Features**:
- Full service details
- Provider info card
- Reviews section
- Rating form
- Edit/Delete buttons (if owner)
- Book/Message buttons (if not owner)
- Related info

**URL**: `/services/694297c13189dfd884e552d4`

### /services/[id]/edit - Edit Page

**Features**:
- Pre-filled form with existing data
- Same validation as create
- Update mutation
- Success redirect to detail

**URL**: `/services/694297c13189dfd884e552d4/edit`

## 5. CRUD Operations

### CREATE - Add New Service

```javascript
// 1. Navigate to form
<Link href="/services/new">Create Service</Link>

// 2. Fill form
// 3. Submit triggers useCreateService mutation
// 4. Auto-refetch queries
// 5. Redirect to /services
```

**Form Fields**:
- Title (required, 5-100 chars)
- Description (required, 20-2000 chars)
- Category (required)
- Price (required, positive number)
- Duration (required, positive number)
- Duration Unit (hour, day, week, month, fixed)
- Location (optional)
- Image (required for new)
- Availability (available, unavailable, on-demand)
- Tags (optional, array)
- Allow Offers (boolean)
- Allow Messages (boolean)

### READ - View Services

```javascript
// List all services
GET /api/v1/services?page=1&limit=12&sort=-createdAt

// Single service
GET /api/v1/services/{id}

// User's services
GET /api/v1/services/me

// Search
GET /api/v1/services?search=query

// By category
GET /api/v1/services?category={categoryId}

// With filters
GET /api/v1/services?
  minPrice=10&
  maxPrice=100&
  minRating=4&
  sort=price
```

### UPDATE - Edit Service

```javascript
// Navigate to edit
<Link href={`/services/${id}/edit`}>Edit</Link>

// Form pre-fills with current data
// Edit fields
// Submit triggers useUpdateService mutation
// Redirect to detail page
```

**Allowed Updates**:
```javascript
{
  title: string,
  description: string,
  category: string (ObjectId),
  price: number,
  duration: number,
  durationUnit: string,
  location: string,
  availability: string,
  tags: array,
  allowOffers: boolean,
  allowMessages: boolean
}
```

### DELETE - Remove Service

```javascript
// Only owner can delete
if (user._id === service.provider._id) {
  <Button onClick={handleDelete}>Delete</Button>
}

// Confirmation dialog
// DELETE /api/v1/services/{id}
// Refetch queries
// Redirect to /services
```

## 6. Data Flow

### Create Flow
```
ServiceForm
    ↓
useServiceForm (state management)
    ↓
handleSubmit()
    ↓
useCreateService (mutation)
    ↓
services.createService() (API call)
    ↓
POST /api/v1/services
    ↓
Backend creates service
    ↓
Success callback
    ↓
Invalidate queries (auto-refetch)
    ↓
Redirect to /services
```

### Read Flow
```
Component mounts
    ↓
useAllServices() (query hook)
    ↓
services.getAllServices() (API call)
    ↓
GET /api/v1/services
    ↓
Backend returns data
    ↓
Cache data with React Query
    ↓
Render component
    ↓
Component displays services
```

### Update Flow
```
Edit page loads
    ↓
useService(id) fetches current data
    ↓
ServiceForm pre-fills
    ↓
User edits fields
    ↓
handleSubmit()
    ↓
useUpdateService (mutation)
    ↓
services.updateService() (API call)
    ↓
PATCH /api/v1/services/{id}
    ↓
Backend updates service
    ↓
Invalidate queries
    ↓
Redirect to detail page
```

### Delete Flow
```
Detail page
    ↓
User clicks Delete
    ↓
Confirmation dialog
    ↓
handleDelete()
    ↓
useDeleteService (mutation)
    ↓
services.deleteService() (API call)
    ↓
DELETE /api/v1/services/{id}
    ↓
Backend deletes service
    ↓
Invalidate queries
    ↓
Redirect to /services
```

## 7. Common Tasks

### Show loading spinner while fetching
```javascript
const { data, isLoading } = useAllServices();

if (isLoading) {
  return <LoadingSpinner />;
}
```

### Handle errors
```javascript
const { data, error, isError } = useAllServices();

if (isError) {
  return <ErrorAlert message={error.message} />;
}
```

### Search services
```javascript
const [query, setQuery] = useState('');

const { data: results } = useSearchServices(query, {}, !!query);

const handleSearch = (text) => {
  setQuery(text);
};
```

### Filter by category
```javascript
const { data: services } = useServicesByCategory(categoryId);
```

### Paginate results
```javascript
const [page, setPage] = useState(1);

const { data } = useAllServices({ page, limit: 12 });

const handlePageChange = (newPage) => {
  setPage(newPage);
  window.scrollTo({ top: 0 });
};
```

### Add tags to form
```javascript
const [tagInput, setTagInput] = useState('');

const handleAddTag = () => {
  form.handleAddTag(tagInput.trim());
  setTagInput('');
};
```

### Upload service image
```javascript
const handleImageChange = (e) => {
  const file = e.target.files[0];
  form.handleImageChange({ target: { files: [file] } });
};
```

## 8. Validation

### Frontend Validation (useServiceForm)

```javascript
// Title: 5-100 characters
// Description: 20-2000 characters
// Category: Required
// Price: Positive number, max 999999
// Duration: Positive number
// Duration Unit: Required
// Image: Required for new services
```

### Error Messages
```javascript
if (form.errors.title) {
  <ErrorMessage>{form.errors.title}</ErrorMessage>
}
```

## 9. API Integration

### Backend Endpoints

```
GET    /api/v1/services              # List all
GET    /api/v1/services/me           # My services
GET    /api/v1/services/{id}         # Single
POST   /api/v1/services              # Create
PATCH  /api/v1/services/{id}         # Update
DELETE /api/v1/services/{id}         # Delete

GET    /api/v1/services/{id}/stats   # Stats
POST   /api/v1/service-reviews       # Rate
GET    /api/v1/service-reviews       # Reviews
```

### Query Parameters

```
page:limit        # Pagination (default: 1, 10)
sort:string       # Sort field (e.g., -createdAt, price)
search:string     # Search query
category:id       # Filter by category
provider:id       # Filter by provider
minPrice:number   # Price range
maxPrice:number
minRating:number  # Rating range
maxRating:number
availability:string  # Filter by availability
```

## 10. Styling Notes

### Key Styled Components

All components use `styled-components` for styling:

```javascript
import styled from 'styled-components';

// Responsive design
@media (max-width: 768px) {
  // Mobile styles
}

// Hover effects and transitions
transition: all 0.3s ease;

// Color scheme
Primary: #007bff
Success: #28a745
Error: #dc3545
Background: #f5f5f5
```

## 11. Testing Checklist

- [ ] Create new service - verify redirect to /services
- [ ] View service details - verify all data displays
- [ ] Edit service - verify form pre-fills and saves
- [ ] Delete service - verify confirmation and redirect
- [ ] Search services - verify results
- [ ] Filter by category - verify results
- [ ] Pagination - verify page switching
- [ ] Image upload - verify display
- [ ] Form validation - verify error messages
- [ ] Only owner can edit/delete - verify authorization
- [ ] Rate service - verify review displays
- [ ] Empty states - verify messaging

## 12. Environment Setup

Ensure `.env.local` has:
```
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api/v1
```

## 13. Troubleshooting

**Services not loading**:
- Check backend is running
- Verify API endpoint in services.js
- Check network tab in DevTools

**Form not validating**:
- Check useServiceForm.js validation logic
- Verify field names match

**Images not displaying**:
- Check image path format
- Verify backend serves static files
- Check file permissions

**Mutations not working**:
- Check authentication token
- Verify endpoint routes on backend
- Check request body format

**Pagination not working**:
- Verify page parameter is sent
- Check backend pagination logic
- Verify limit parameter

This completes the full CRUD implementation for Services. All features are production-ready with proper error handling, validation, and user feedback.
