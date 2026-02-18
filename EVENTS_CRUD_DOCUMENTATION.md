# Events CRUD Implementation - Complete Documentation

## Overview

This documentation covers the complete implementation of Event CRUD operations for your Next.js frontend with styled-components. The implementation follows the same patterns as your existing Hostel system for consistency.

## Project Structure

```
src/
├── services/
│   └── events.js                 # API service layer
├── hooks/
│   ├── useEvents.js             # Data fetching hooks
│   └── useEventForm.js          # Form state management
├── components/
│   └── events/
│       ├── EventCard.jsx        # Event card component
│       ├── EventForm.jsx        # Event form component
│       └── EventGrid.jsx        # Event grid layout
└── app/
    └── (protected)/
        └── events/
            ├── page.js          # Events list page
            ├── new/
            │   └── page.js      # Create event page
            └── [id]/
                ├── page.js      # Event detail page
                └── edit/
                    └── page.js  # Edit event page
```

## 1. Service Layer (`src/services/events.js`)

The service layer handles all API communication with the backend.

### Key Functions

#### Fetch Functions
```javascript
// Fetch all events with pagination and filters
fetchEventsPaginated(page, limit, filters)

// Fetch single event by ID
fetchEventById(id)

// Fetch user's created events
fetchMyEvents(params)

// Search events
searchEvents(query, filters)

// Get popular/trending events
getPopularEvents(limit)
getTrendingEvents(limit)
```

#### Mutation Functions
```javascript
// Create event (supports image upload)
createEvent(eventData, bannerImage)

// Update event (supports image upload)
updateEvent(id, eventData, bannerImage)

// Delete event
deleteEvent(id)

// Join/leave event
joinEvent(id)
leaveEvent(id)

// Toggle favorite
toggleFavoriteEvent(id)

// Add rating/comment
addEventRating(id, rating, comment)
addEventComment(id, text)
getEventComments(id, page, limit)
```

### Form Data Handling

For image uploads, the service converts form data to FormData:

```javascript
const formData = new FormData();

// Add event data
Object.keys(eventData).forEach(key => {
  const value = eventData[key];
  if (typeof value === 'object' && value !== null) {
    formData.append(key, JSON.stringify(value));
  } else {
    formData.append(key, value);
  }
});

// Add image file
formData.append('banner', bannerImage);
```

## 2. Custom Hooks (`src/hooks/useEvents.js` & `useEventForm.js`)

### useEvents.js

Data fetching and mutation hooks using React Query:

```javascript
// Fetch hooks
useAllEvents(filters)          // List of events
useEvent(id, enabled)          // Single event
useMyEvents(params)            // User's events
useEventComments(eventId, page)
useSearchEvents(query, filters)
usePopularEvents(limit)
useTrendingEvents(limit)

// Mutation hooks
useCreateEvent()
useUpdateEvent()
useDeleteEvent()
useJoinEvent()
useLeaveEvent()
useToggleFavoriteEvent()
useAddEventRating()
useAddEventComment()
```

All hooks automatically invalidate cache on success.

### useEventForm.js

Form state management hook:

```javascript
const {
  formData,                  // Current form data
  setFormData,
  handleInputChange,         // For basic inputs
  handleNestedChange,        // For nested objects (contactInfo, settings)
  handleTagsChange,          // For comma-separated tags
  previewBanner,             // Banner preview URL
  bannerFile,                // File object
  handleBannerChange,        // File input handler
  removeBanner,              // Clear banner
  validateForm,              // Validate all fields
  errors,                    // Validation errors
  resetForm                  // Reset to initial state
} = useEventForm(initialEvent);
```

## 3. Components

### EventCard.jsx

Displays individual event in a grid:

**Props:**
```javascript
{
  event: {              // Event object
    _id,
    title,
    description,
    date,
    location,
    category,
    bannerUrl,
    attendees,
    capacity,
    tags,
    ...
  },
  isOwner: boolean,     // Show edit/delete buttons
  onDelete: function    // Delete callback
}
```

**Features:**
- Responsive image with hover effect
- Category badge
- Event meta (date, location, attendees)
- Tags display
- Action buttons (View, Edit, Delete)

### EventForm.jsx

Comprehensive form for creating/editing events:

**Props:**
```javascript
{
  initialEvent: object or null,  // For edit mode
  onSubmit: function,            // Form submission handler
  isLoading: boolean,            // Submit loading state
  error: string,                 // Error message
  success: string,               // Success message
  onCancel: function             // Cancel callback
}
```

**Form Sections:**
1. **Event Details** - Title, description, dates, location, category, campus
2. **Attendance** - Capacity, visibility, registration options
3. **Contact Info** - Email, phone, website
4. **Banner Image** - Drag-drop file upload
5. **Settings** - Comments, ratings, sharing, reminders, auto-archive

**Validation:**
- Title: Required, 3-100 characters
- Date: Required, must be in future
- End date: Must be after start date
- Location: Required, 3-200 characters
- Campus: Required, valid ObjectId
- Registration deadline: Must be before event date
- Capacity: Positive integer

### EventGrid.jsx

Grid layout for displaying events:

**Props:**
```javascript
{
  events: array,              // Event objects
  isLoading: boolean,
  error: string,
  pagination: {
    page,
    pages,
    total
  },
  onPageChange: function,
  onDelete: function,
  userOwnedEventIds: array
}
```

**Features:**
- Responsive grid (1-4 columns)
- Empty state
- Loading spinner
- Pagination controls
- Error handling

## 4. Pages

### Events List Page (`/events`)

Displays all events with filtering and search:

```javascript
// Features:
- Paginated event grid
- Category filter dropdown
- Search bar
- Create event button
- Responsive design with gradient header
```

**URL Parameters:**
- `page` - Current page number
- `limit` - Events per page (default: 12)
- `category` - Filter by category
- `search` - Search by title

### Create Event Page (`/events/new`)

Form for creating new events:

```javascript
// Flow:
1. User fills form with event details
2. Optionally uploads banner image
3. Form validates on submit
4. API call with FormData if image present
5. Redirect to events list on success
```

### Event Detail Page (`/events/[id]`)

Display full event information:

```javascript
// Displays:
- Event banner image
- Title and description
- All meta information (date, location, attendees)
- Requirements
- Contact information
- Attendee avatars

// User actions:
- Join/Leave event (if authenticated)
- Toggle favorite
- Edit (if owner)
- Delete (if owner)
```

**Special Fields:**
- `_isOwner` - Computed field from backend
- `_isFavorited` - User has favorited
- `_isAttending` - User is attending

### Edit Event Page (`/events/[id]/edit`)

Form for editing existing events:

```javascript
// Features:
- Pre-populated form with event data
- Can change all fields including banner
- Same validation as create
- Redirect to detail page on success
```

## 5. Data Structures

### Event Form Data

```javascript
{
  // Basic Info
  title: string,                          // Required
  description: string,
  
  // Dates
  date: ISO8601 string,                   // Required
  endDate: ISO8601 string,
  
  // Location
  location: string,                       // Required
  campus: ObjectId string,                // Required
  
  // Details
  category: 'academic' | 'social' | 'sports' | 'entertainment',
  visibility: 'public' | 'campus' | 'private',
  capacity: number,
  
  // Tags & Registration
  tags: string[],
  registrationRequired: boolean,
  registrationDeadline: ISO8601 string,
  requirements: string,
  
  // Contact
  contactInfo: {
    email: string,
    phone: string,
    website: string
  },
  
  // Settings
  settings: {
    allowComments: boolean,
    allowRatings: boolean,
    allowSharing: boolean,
    sendReminders: boolean,
    reminderDays: number,
    autoArchive: boolean,
    archiveAfterDays: number
  },
  
  // Other
  timezone: string,
  bannerFile: File (optional)
}
```

### Event Response Data

```javascript
{
  // IDs and Ownership
  _id: ObjectId,
  createdBy: {
    _id,
    fullName,
    avatar: { url }
  },
  
  // Info
  title: string,
  description: string,
  
  // Dates
  date: ISO8601,
  endDate: ISO8601,
  
  // Location
  location: string,
  campus: { _id, name },
  coordinates: { type, coordinates: [lng, lat] },
  
  // Image
  bannerUrl: string,
  bannerPublicId: string,
  
  // Details
  category: string,
  visibility: string,
  capacity: number,
  status: string,
  archived: boolean,
  
  // Engagement
  attendees: User[],
  favorites: ObjectId[],
  tags: string[],
  ratings: Rating[],
  comments: Comment[],
  
  // User-Specific (computed)
  _isOwner: boolean,
  _isFavorited: boolean,
  _isAttending: boolean,
  _userRating: number,
  
  // Analytics
  views: number,
  analytics: {
    totalViews,
    uniqueViews,
    totalFavorites,
    totalRatings,
    averageRating,
    totalComments,
    attendanceRate,
    engagementScore
  },
  
  // Settings
  registrationRequired: boolean,
  registrationDeadline: ISO8601,
  requirements: string,
  contactInfo: { email, phone, website },
  settings: { allowComments, allowRatings, ... },
  timezone: string,
  
  // Metadata
  createdAt: ISO8601,
  updatedAt: ISO8601,
  __v: number
}
```

## 6. Usage Examples

### Creating an Event

```javascript
import { useCreateEvent } from '@/hooks/useEvents';
import { useEventForm } from '@/hooks/useEventForm';

function CreateEventPage() {
  const createEvent = useCreateEvent();
  const { formData, handleInputChange, validateForm, bannerFile } = useEventForm();

  const handleSubmit = async (formData, bannerImage) => {
    if (!validateForm()) return;
    
    await createEvent.mutateAsync({
      eventData: formData,
      bannerImage
    });
  };

  return <EventForm onSubmit={handleSubmit} />;
}
```

### Fetching Events

```javascript
import { useAllEvents } from '@/hooks/useEvents';

function EventsList() {
  const [filters, setFilters] = useState({ page: 1, category: '' });
  const { data, isLoading } = useAllEvents(filters);

  return (
    <EventGrid
      events={data?.events}
      pagination={data?.pagination}
      isLoading={isLoading}
    />
  );
}
```

### Joining an Event

```javascript
import { useJoinEvent } from '@/hooks/useEvents';

function EventDetail({ eventId }) {
  const joinEvent = useJoinEvent();

  const handleJoin = async () => {
    await joinEvent.mutateAsync(eventId);
  };

  return <button onClick={handleJoin}>Join Event</button>;
}
```

## 7. Styling with styled-components

All components use styled-components for styling. Common patterns:

```javascript
const Button = styled.button`
  padding: 12px 24px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  
  &:hover {
    background: #2563eb;
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

// Responsive
const Container = styled.div`
  padding: 24px;
  
  @media (max-width: 768px) {
    padding: 16px;
  }
`;

// Variants
const Button = styled.button`
  ${props => {
    if (props.variant === 'primary') {
      return `background: #3b82f6; color: white;`;
    }
    if (props.variant === 'danger') {
      return `background: #ef4444; color: white;`;
    }
  }}
`;
```

## 8. Error Handling

All API calls wrapped in try-catch:

```javascript
try {
  const event = await fetchEventById(id);
} catch (error) {
  const message = error.details?.[0]?.message || error.message;
  console.error(message);
}
```

Errors displayed in UI:
```javascript
{error && <ErrorAlert message={error.message} />}
```

## 9. Environment Variables

No additional env variables needed. Uses existing:
- `NEXT_PUBLIC_API_URL` - API base URL
- Auth token automatically included via axios interceptor

## 10. Testing Checklist

- [ ] Create event with image
- [ ] Create event without image
- [ ] Update event and change image
- [ ] Delete event (as owner)
- [ ] List events with pagination
- [ ] Filter events by category
- [ ] Search events by title
- [ ] Join/leave event
- [ ] Toggle favorite
- [ ] View event details
- [ ] Check owner-only buttons
- [ ] Validate form fields
- [ ] Test responsive design on mobile

## 11. Common Issues & Solutions

### Issue: Images not uploading
**Solution:** Ensure FormData format matches backend expectations. Check that `banner` field name matches backend multer configuration.

### Issue: Form data losing nested objects
**Solution:** Explicitly convert objects to JSON strings in FormData:
```javascript
formData.append('contactInfo', JSON.stringify(contactInfo));
```

### Issue: Validation errors not showing
**Solution:** Backend response must include `details` array in error response. Check error handling in API service.

### Issue: Owner actions not showing
**Solution:** Ensure `_isOwner` field is present in event response from backend. Verify event creator matches current user.

## 12. Future Enhancements

- [ ] Add event comments/discussion section
- [ ] Implement event ratings
- [ ] Add attendee management
- [ ] Create recurring events
- [ ] Add calendar view
- [ ] Export events to calendar apps
- [ ] Event reminders/notifications
- [ ] Advanced search filters
- [ ] Event recommendations
- [ ] Social sharing integration
