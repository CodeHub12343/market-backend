# Request & Offer Lifecycle - Complete Implementation Guide

## Table of Contents

1. [Project Overview](#project-overview)
2. [Folder Structure](#folder-structure)
3. [Service Layer Reference](#service-layer-reference)
4. [Custom Hooks Reference](#custom-hooks-reference)
5. [Component Reference](#component-reference)
6. [Page Routes Reference](#page-routes-reference)
7. [Data Structures](#data-structures)
8. [Usage Flows](#usage-flows)
9. [Integration Guide](#integration-guide)
10. [Styling Details](#styling-details)
11. [Testing Checklist](#testing-checklist)
12. [Troubleshooting](#troubleshooting)

---

## 1. Project Overview

This implementation provides a complete **Request & Offer Marketplace Lifecycle** for a university market platform where:

- **Requesters** post requests for items/services they need
- **Sellers** browse requests and make offers
- **Requesters** review offers and accept/reject them
- **Sellers** track their sent offers and status

### Key Features

✅ **Request Management**: Create, edit, view, delete, close requests  
✅ **Offer System**: Send offers on requests with pricing and messages  
✅ **Status Tracking**: Track request and offer statuses throughout lifecycle  
✅ **Search & Filter**: Find requests by category, status, budget  
✅ **User Roles**: Support both requester and seller perspectives  
✅ **Responsive Design**: Styled-components with mobile-friendly layouts  
✅ **Real-time Updates**: React Query cache invalidation on mutations  

---

## 2. Folder Structure

```
src/
├── services/
│   ├── requests.js              # Request API service
│   ├── requestOffers.js         # Request-based offer API service
│   └── offers.js                # Shop offer API service (existing)
│
├── hooks/
│   ├── useRequests.js           # Request queries & mutations
│   ├── useRequestForm.js        # Request form state management
│   ├── useRequestOffers.js      # Offer queries & mutations
│   ├── useOfferForm.js          # Offer form state management
│   └── (existing hooks...)
│
├── components/
│   ├── requests/
│   │   ├── RequestCard.jsx      # Request card component
│   │   ├── RequestForm.jsx      # Request creation/edit form
│   │   └── RequestGrid.jsx      # Grid layout with pagination
│   │
│   ├── offers/
│   │   ├── RequestOfferCard.jsx # Offer card component
│   │   ├── RequestOfferForm.jsx # Offer creation form
│   │   ├── OfferCard.jsx        # Shop offer card (existing)
│   │   └── (existing components...)
│   │
│   └── (other components...)
│
└── app/
    └── (protected)/
        ├── requests/
        │   ├── page.js                    # Requests list page
        │   ├── new/page.js               # Create request page
        │   └── [id]/
        │       ├── page.js               # Request detail page
        │       ├── edit/page.js          # Edit request page
        │       └── make-offer/page.js    # Make offer page
        │
        ├── my-offers/page.js             # Sent offers page (seller view)
        ├── received-offers/page.js       # Received offers page (requester view)
        └── (other pages...)
```

---

## 3. Service Layer Reference

### 3.1 Request Service (`services/requests.js`)

**Endpoint Base**: `/api/v1/requests`

```javascript
import * as requestService from '@/services/requests';

// Fetch
requestService.fetchRequestsPaginated(page, limit, filters)
requestService.fetchRequestById(id)
requestService.fetchMyRequests()
requestService.searchRequests(query, filters)
requestService.getTrendingRequests()
requestService.getRequestsByCategory(category)
requestService.getRequestsByStatus(status)
requestService.fetchRequestOffers(requestId)

// Mutations
requestService.createRequest(requestData)
requestService.updateRequest(id, updateData)
requestService.deleteRequest(id)
requestService.closeRequest(id, closureData)
requestService.reopenRequest(id)
requestService.toggleFavoriteRequest(id)
```

### 3.2 Request Offer Service (`services/requestOffers.js`)

**Endpoint Base**: `/api/v1/offers`

```javascript
import * as offerService from '@/services/requestOffers';

// Fetch
offerService.fetchRequestOffersPaginated(page, limit, filters)
offerService.fetchRequestOfferById(id)
offerService.fetchMySentOffers()
offerService.fetchOffersForRequest(requestId)
offerService.searchRequestOffers(query, filters)
offerService.getTrendingRequestOffers()
offerService.getOffersByCategory(category)

// Mutations
offerService.createRequestOffer(offerData)
offerService.updateRequestOffer(id, updateData)
offerService.deleteRequestOffer(id)
offerService.acceptRequestOffer(id)
offerService.rejectRequestOffer(id)
```

---

## 4. Custom Hooks Reference

### 4.1 Request Hooks (`hooks/useRequests.js`)

```javascript
import {
  useRequests,
  useRequest,
  useMyRequests,
  useSearchRequests,
  useTrendingRequests,
  useRequestOffers,
  useCreateRequest,
  useUpdateRequest,
  useDeleteRequest,
  useCloseRequest,
  useReopenRequest,
  useToggleFavoriteRequest
} from '@/hooks/useRequests';

// Query Example
const { data: requestsData, isLoading, error } = useRequests(page, 12, filters);
// Returns: { requests: [], pagination: { currentPage, totalPages } }

// Mutation Example
const createMutation = useCreateRequest();
await createMutation.mutateAsync(requestData);
```

**Configuration**:
- Stale Time: 5 minutes
- Cache Time: 10 minutes
- Auto cache invalidation on mutations

### 4.2 Request Form Hook (`hooks/useRequestForm.js`)

```javascript
import { useRequestForm } from '@/hooks/useRequestForm';

const {
  formData,           // Form state object
  handleInputChange,  // Input change handler
  handleNestedChange, // Nested object updater
  validateForm,       // Validation function
  errors,             // Form errors object
  resetForm,          // Reset to initial state
  tag,                // Current tag input
  setTag,             // Set tag input
  addTag,             // Add tag to list
  removeTag           // Remove tag from list
} = useRequestForm(initialRequest, userCampus);

// formData structure:
{
  title: string,
  description: string,
  category: string,
  budget: { min: number, max: number },
  location: { address: string, campus: string },
  requiredDate: string (ISO date),
  documents: [],
  tags: string[],
  specifications: string
}
```

### 4.3 Offer Hooks (`hooks/useRequestOffers.js`)

```javascript
import {
  useRequestOffers,
  useRequestOffer,
  useMySentOffers,
  useOffersForRequest,
  useSearchRequestOffers,
  useTrendingRequestOffers,
  useCreateRequestOffer,
  useUpdateRequestOffer,
  useDeleteRequestOffer,
  useAcceptRequestOffer,
  useRejectRequestOffer
} from '@/hooks/useRequestOffers';

// Query Example
const { data: offers = [] } = useOffersForRequest(requestId);

// Mutation Example
const acceptMutation = useAcceptRequestOffer();
await acceptMutation.mutateAsync(offerId);
```

### 4.4 Offer Form Hook (`hooks/useOfferForm.js`)

```javascript
import { useOfferForm } from '@/hooks/useOfferForm';

const {
  formData,           // Form state
  handleInputChange,  // Change handler
  validateForm,       // Validation
  errors,             // Validation errors
  resetForm,          // Reset form
  messageCharCount,   // Current char count
  messageCharLimit    // Max char limit (500)
} = useOfferForm(initialOffer);

// formData structure:
{
  request: string,          // Request ID
  amount: number,           // Offer price
  message: string,          // Offer message
  availability: string      // Delivery timeframe
}
```

---

## 5. Component Reference

### 5.1 RequestCard Component

**Props**:
```javascript
<RequestCard
  request={object}         // Request data object
  onDelete={function}      // Optional delete handler
  onClose={function}       // Optional close handler
  showActions={boolean}    // Show action buttons
/>
```

**Features**:
- Category badge with color coding
- Status badge (open/pending/accepted/closed)
- Budget range display
- Location and required date
- Tags display (max 3 + counter)
- Offer count
- Time since posted

### 5.2 RequestForm Component

**Props**:
```javascript
<RequestForm
  initialRequest={object}    // For editing (null for create)
  onSubmit={function}        // Form submission handler
  isLoading={boolean}        // Submit loading state
  error={string}             // Error message
  success={string}           // Success message
  onCancel={function}        // Cancel handler
/>
```

**Sections**:
1. **What Do You Need?** - Title, description, category
2. **Budget Range** - Min/max budget inputs
3. **Location & Timeline** - Address, campus, required date
4. **Tags** - Add/remove tags for filtering
5. **Additional Info** - Specifications/details

### 5.3 RequestGrid Component

**Props**:
```javascript
<RequestGrid
  requests={array}              // Array of request objects
  isLoading={boolean}           // Loading state
  error={string}                // Error message
  currentPage={number}          // Current page number
  totalPages={number}           // Total pages
  onPageChange={function}       // Pagination handler
  userOwnedRequests={array}     // User's request IDs
  userFavorites={array}         // User's favorite request IDs
/>
```

**Features**:
- Responsive grid (280px minimum)
- Empty states
- Loading spinner
- Pagination with page numbers
- Error handling

### 5.4 RequestOfferCard Component

**Props**:
```javascript
<RequestOfferCard
  offer={object}              // Offer data
  isRequesterView={boolean}   // Show as requester (true) or seller (false)
  onAccept={function}         // Accept offer handler
  onReject={function}         // Reject offer handler
  onDelete={function}         // Delete/withdraw handler
/>
```

**Features**:
- Offer amount display
- Seller info with rating
- Offer message preview
- Availability badge
- Status badge
- Action buttons (context-based)
- Time posted

### 5.5 RequestOfferForm Component

**Props**:
```javascript
<RequestOfferForm
  request={object}           // Request being offered on
  onSubmit={function}        // Form submission handler
  isLoading={boolean}        // Loading state
  error={string}             // Error message
  success={string}           // Success message
  onCancel={function}        // Cancel handler
/>
```

**Sections**:
1. **Your Offer** - Offer amount with live preview
2. **Availability** - When can you deliver
3. **Your Message** - Describe the offer (char counter)

---

## 6. Page Routes Reference

### 6.1 Requests Pages

#### `/requests` - List All Requests
- Gradient header with "Post Request" button
- Filter by search, category, status
- Paginated grid of request cards
- Empty states

**Key Components**:
```javascript
import { useRequests } from '@/hooks/useRequests';
import RequestGrid from '@/components/requests/RequestGrid';
```

#### `/requests/new` - Create Request
- Form to post new request
- Auto-fill user's campus
- Loading overlay during submission
- Redirect to list on success

**Key Hooks**:
```javascript
const createRequestMutation = useCreateRequest();
```

#### `/requests/[id]` - Request Detail
- Full request details with description, specs
- Location, budget, timeline info
- Offers section (only for requester's own requests)
- Seller/requester actions (edit, delete, close)
- About requester sidebar

**Key Data**:
- Request object with all details
- Associated offers list
- Requester info
- Status indicators

#### `/requests/[id]/edit` - Edit Request
- Pre-filled form with existing data
- Same validation as create
- Only accessible by request owner
- Preserves unfilled optional fields

#### `/requests/[id]/make-offer` - Make Offer
- Request summary sidebar
- Offer form (amount, message, availability)
- Links to request details

**Key Hooks**:
```javascript
const { data: request } = useRequest(params.id);
const createOfferMutation = useCreateRequestOffer();
```

### 6.2 Offer Pages

#### `/my-offers` - My Sent Offers (Seller View)
- Tabbed interface: All, Pending, Accepted, Rejected
- Offer cards with seller perspective
- Withdraw pending offers
- View offer details

**Key Hooks**:
```javascript
const { data: offers } = useMySentOffers();
```

#### `/received-offers` - Received Offers (Requester View)
- Group offers by request
- Show offer count per request
- Accept/reject actions
- View seller details

**Key Hooks**:
```javascript
const { data: myRequests } = useMyRequests();
const acceptMutation = useAcceptRequestOffer();
const rejectMutation = useRejectRequestOffer();
```

---

## 7. Data Structures

### 7.1 Request Object

```javascript
{
  _id: string,                     // MongoDB ID
  title: string,                   // Request title
  description: string,             // Detailed description
  category: 'electronics' | 'books' | 'furniture' | 'clothing' | 'food' | 'services' | 'other',
  requester: {
    _id: string,
    fullName: string,
    avatar: string,
    rating: number
  },
  budget: {
    min: number,                  // Minimum budget
    max: number                   // Maximum budget
  },
  location: {
    address: string,
    campus: {
      _id: string,
      name: string
    }
  },
  requiredDate: Date,             // When needed by
  documents: [string],            // Document URLs
  tags: [string],                 // Searchable tags
  specifications: string,         // Additional requirements
  status: 'open' | 'pending' | 'accepted' | 'closed',
  offers: [
    {
      _id: string,
      amount: number,
      message: string,
      seller: object,
      status: 'pending' | 'accepted' | 'rejected',
      createdAt: Date
    }
  ],
  favorites: [string],            // User IDs who favorited
  createdAt: Date,
  updatedAt: Date
}
```

### 7.2 Offer Object

```javascript
{
  _id: string,                    // MongoDB ID
  request: {
    _id: string,
    title: string,
    budget: { min: number, max: number }
  },
  seller: {
    _id: string,
    fullName: string,
    avatar: string,
    rating: number,
    reviews: number
  },
  amount: number,                 // Offer price
  message: string,                // Offer description
  availability: 'immediate' | 'few-days' | 'one-week' | 'two-weeks',
  status: 'pending' | 'accepted' | 'rejected',
  settings: object,               // Additional settings
  history: [
    {
      action: string,
      timestamp: Date,
      user: string,
      details: string
    }
  ],
  createdAt: Date,
  updatedAt: Date
}
```

---

## 8. Usage Flows

### 8.1 Complete Request Creation Flow

```javascript
// 1. User navigates to /requests/new
// 2. RequestForm component loads with useRequestForm hook

const handleSubmit = async (formData) => {
  // 3. Form validates data (client-side)
  const submitData = {
    title: formData.title,
    description: formData.description,
    category: formData.category,
    budget: formData.budget,
    location: formData.location,
    requiredDate: new Date(formData.requiredDate),
    tags: formData.tags
  };

  // 4. Call mutation
  const result = await createRequestMutation.mutateAsync(submitData);

  // 5. Success -> invalidate caches -> redirect to /requests
  // Cache keys invalidated:
  // - ['requests']
  // - ['myRequests']
  // - ['trendingRequests']
};
```

### 8.2 Complete Offer Lifecycle Flow

```
// SELLER PERSPECTIVE:
1. Browse /requests page
2. Click "Make Offer" on a request
3. Navigate to /requests/[id]/make-offer
4. Fill RequestOfferForm (amount, message, availability)
5. Submit -> createRequestOfferMutation
6. Offer created with status='pending'
7. Redirect to /my-offers
8. Monitor status (pending -> accepted/rejected)

// REQUESTER PERSPECTIVE:
1. Posted a request on /requests/new
2. Sellers make offers -> visible on request detail
3. User can see offers count
4. Navigate to /received-offers to manage
5. Accept offer -> status='accepted', request closes
6. Reject offer -> status='rejected'
7. Can re-open request if needed

// POST-ACCEPTANCE:
1. Chat/message between requester and seller
2. Arrange delivery/completion
3. Mark request as complete (close)
4. Leave rating/review
```

### 8.3 Search & Filter Flow

```javascript
// User on /requests page
// Applies filters:
const [searchQuery, setSearchQuery] = useState('');
const [selectedCategory, setSelectedCategory] = useState('electronics');
const [selectedStatus, setSelectedStatus] = useState('open');

// Hook automatically fetches with new filters:
const { data } = useRequests(currentPage, 12, {
  category: selectedCategory,
  status: selectedStatus
  // search param handled separately
});

// Results update in real-time as filters change
```

---

## 9. Integration Guide

### 9.1 Adding to Navigation

**Bottom Navigation** (`bottom-nav.jsx`):
```javascript
const navItems = [
  // ... existing items
  {
    label: 'Requests',
    href: '/requests',
    icon: '📋'
  },
  {
    label: 'My Offers',
    href: '/my-offers',
    icon: '📨'
  },
  {
    label: 'Received',
    href: '/received-offers',
    icon: '📩'
  }
];
```

### 9.2 Adding to Dashboard

**Dashboard** (`(protected)/dashboard/page.js`):
```javascript
import { useMyRequests } from '@/hooks/useRequests';
import { useMySentOffers } from '@/hooks/useRequestOffers';

export default function Dashboard() {
  const { data: myRequests } = useMyRequests();
  const { data: mySentOffers } = useMySentOffers();

  return (
    <Dashboard>
      <Card>
        <h3>Active Requests ({myRequests?.length || 0})</h3>
        <RequestGrid requests={myRequests?.slice(0, 3)} />
        <Link href="/requests">View All</Link>
      </Card>

      <Card>
        <h3>Pending Offers ({mySentOffers?.filter(o => o.status === 'pending').length || 0})</h3>
        {/* Offer cards */}
      </Card>
    </Dashboard>
  );
}
```

### 9.3 Backend Endpoint Requirements

Ensure your backend implements these endpoints:

**Requests**:
- `GET /api/v1/requests` - List with filters
- `GET /api/v1/requests/:id` - Get single
- `POST /api/v1/requests` - Create
- `PATCH /api/v1/requests/:id` - Update
- `DELETE /api/v1/requests/:id` - Delete
- `PATCH /api/v1/requests/:id/close` - Close request
- `GET /api/v1/requests/:id/offers` - Get offers for request

**Offers**:
- `GET /api/v1/offers` - List with filters
- `GET /api/v1/offers/:id` - Get single
- `POST /api/v1/offers` - Create
- `PATCH /api/v1/offers/:id` - Update
- `DELETE /api/v1/offers/:id` - Delete
- `POST /api/v1/offers/:id/accept` - Accept
- `POST /api/v1/offers/:id/reject` - Reject

---

## 10. Styling Details

### 10.1 Color Scheme

```javascript
// Primary Colors
const colors = {
  primary: '#667eea',          // Blue
  secondary: '#764ba2',        // Purple
  success: '#155724',          // Green
  danger: '#721c24',           // Red
  warning: '#856404',          // Amber
  info: '#004085',             // Dark Blue
  light: '#f9fafb',            // Light Gray
  border: '#d1d5db'            // Border Gray
};
```

### 10.2 Category Colors

```javascript
const categoryColors = {
  electronics: { bg: '#e3f2fd', color: '#1976d2' },
  books: { bg: '#f3e5f5', color: '#7b1fa2' },
  furniture: { bg: '#e8f5e9', color: '#388e3c' },
  clothing: { bg: '#fce4ec', color: '#c2185b' },
  food: { bg: '#fff3e0', color: '#f57c00' },
  services: { bg: '#f1f8e9', color: '#689f38' },
  other: { bg: '#eceff1', color: '#455a64' }
};
```

### 10.3 Status Colors

```javascript
const statusColors = {
  open: { bg: '#d4edda', color: '#155724' },
  pending: { bg: '#fff3cd', color: '#856404' },
  accepted: { bg: '#cce5ff', color: '#004085' },
  closed: { bg: '#f8d7da', color: '#721c24' }
};
```

### 10.4 Responsive Breakpoints

```javascript
// Mobile-first approach
const breakpoints = {
  mobile: '0px',
  tablet: '768px',
  desktop: '1024px',
  wide: '1280px'
};

// Grid responsive
grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
```

---

## 11. Testing Checklist

### 11.1 Request Creation
- [ ] Form validates all required fields
- [ ] Optional fields correctly omitted from submission
- [ ] Budget min < max validation works
- [ ] Required date must be in future
- [ ] Tags add/remove functionality works
- [ ] Campus auto-fills from user profile
- [ ] Success redirects to requests list
- [ ] Validation errors display correctly

### 11.2 Request Listing
- [ ] Pagination loads correct page
- [ ] Filters work independently
- [ ] Search finds requests by title/description
- [ ] Category filter narrows results
- [ ] Status filter shows correct items
- [ ] Empty state displays when no results
- [ ] Loading spinner shows during fetch
- [ ] Cards display all info correctly

### 11.3 Request Detail
- [ ] Full details display correctly
- [ ] Offers section shows all offers
- [ ] Offer count accurate
- [ ] Owner can edit/delete own requests
- [ ] Owner can close requests
- [ ] Non-owners see "Make Offer" button
- [ ] Requester info displays correctly
- [ ] Back navigation works

### 11.4 Make Offer
- [ ] Form validates amount > 0
- [ ] Form validates message 10-500 chars
- [ ] Availability dropdown works
- [ ] Form submits correctly
- [ ] Cache invalidation triggers
- [ ] Redirects to request detail
- [ ] Offer appears in offers list
- [ ] Error handling works

### 11.5 My Offers
- [ ] All offers display
- [ ] Tab filtering works (pending, accepted, rejected)
- [ ] Offer count accurate per tab
- [ ] Can withdraw pending offers
- [ ] View details link works
- [ ] Seller info displays
- [ ] Status badges correct
- [ ] Empty states show correct message

### 11.6 Received Offers
- [ ] Only shows offers for user's requests
- [ ] Grouped by request correctly
- [ ] Offer count per request accurate
- [ ] Accept/reject buttons work
- [ ] Status changes reflected
- [ ] Cache invalidation works
- [ ] Seller info displays
- [ ] Empty state shows when no offers

### 11.7 Mobile Responsiveness
- [ ] Cards stack on small screens
- [ ] Forms are mobile-friendly
- [ ] Navigation works on mobile
- [ ] Buttons are tap-friendly
- [ ] Pagination works on mobile
- [ ] No horizontal scroll
- [ ] Text is readable on small screens

### 11.8 Performance
- [ ] Initial page load < 2s
- [ ] Pagination doesn't reload unnecessarily
- [ ] Search debounces correctly
- [ ] Cache invalidation is efficient
- [ ] No memory leaks in components
- [ ] Images load quickly

### 11.9 Error Handling
- [ ] Network errors display messages
- [ ] Validation errors are clear
- [ ] Loading states prevent duplicate submissions
- [ ] Errors have retry options
- [ ] Console has no warnings

---

## 12. Troubleshooting

### Issue: "Cannot find module" errors

**Solution**:
```javascript
// Check imports use correct paths
import { useRequests } from '@/hooks/useRequests';  // ✅ Correct
import { useRequests } from '../hooks/useRequests'; // ❌ Wrong

// Ensure @ alias is configured in jsconfig.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

### Issue: Form validation not working

**Solution**:
```javascript
// Ensure validateForm is called before submission
const handleSubmit = (e) => {
  e.preventDefault();
  
  if (!validateForm()) {  // ✅ Call validation
    return;
  }
  
  onSubmit(formData);
};
```

### Issue: Pagination not updating

**Solution**:
```javascript
// Ensure currentPage state updates trigger re-fetch
const [currentPage, setCurrentPage] = useState(1);
const { data } = useRequests(currentPage, 12, filters); // ✅ currentPage as dependency

// When filters change, reset to page 1
const handleFilterChange = (filter) => {
  setCurrentPage(1);  // ✅ Reset page
  setFilter(filter);
};
```

### Issue: Mutations not invalidating cache

**Solution**:
```javascript
// Ensure QueryClient is properly configured
// In Providers.jsx or lib/react-query.js
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 5 * 60 * 1000 },
    mutations: { onError: (err) => console.error(err) }
  }
});
```

### Issue: Images not showing in cards

**Solution**:
```javascript
// Ensure image URLs are correct
{request.image ? (
  <img src={request.image} alt={request.title} />
) : (
  <PlaceholderGradient>
    {/* Fallback content */}
  </PlaceholderGradient>
)}
```

### Issue: Form state not resetting after submit

**Solution**:
```javascript
// Call resetForm after successful submission
const handleSubmit = async (data) => {
  try {
    await mutation.mutateAsync(data);
    resetForm();  // ✅ Reset state
    router.push('/next-page');
  } catch (err) {
    setError(err.message);
  }
};
```

---

## Quick Reference: Common Tasks

### Task: Add a new request filter

```javascript
// 1. Add filter state
const [newFilter, setNewFilter] = useState('');

// 2. Include in hook dependency
const { data } = useRequests(page, limit, {
  category: selectedCategory,
  newFilter: newFilter  // ✅ Add here
});

// 3. Add UI control
<FilterSelect
  value={newFilter}
  onChange={(e) => {
    setNewFilter(e.target.value);
    setCurrentPage(1);  // Reset pagination
  }}
>
  {/* Options */}
</FilterSelect>
```

### Task: Add status to request listing

**Backend requirement**: Ensure `/requests` endpoint returns status field

```javascript
// The RequestCard component already displays status
<StatusBadge status={request.status}>
  {request.status}
</StatusBadge>
```

### Task: Customize offer card appearance

```javascript
const CustomOfferCard = styled(Card)`
  // Override default styles
  border-left-color: #your-color;
  
  // Or use component props
  ${props => props.highlighted && `
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.2);
  `}
`;
```

---

## Conclusion

This complete implementation provides a production-ready request and offer system for your university marketplace. All components are styled, responsive, and follow React best practices with hooks and React Query for state management.

For any questions or customizations needed, refer to the specific section in this documentation.

Happy coding! 🚀
