# 🏠 Roommate Components Guide

## Component Architecture

All components use **Styled Components** for styling and follow your design system with modern black/white theme.

---

## 📋 Component List

### 1. **RoommateCard.jsx**
Displays individual roommate listing in a card format.

**Features:**
- Roommate image gallery with thumbnail carousel
- Budget and accommodation type
- Key amenities
- Status badges
- Favorite button
- Applicant count
- Rating/reviews summary
- Contact button

**Props:**
```javascript
{
  roommate: Object,           // Roommate data
  onFavorite: Function,       // Favorite toggle callback
  onApply: Function,          // Apply callback
  onView: Function,           // View details callback
  isFavorited: Boolean,       // Favorite state
  isLoading: Boolean          // Loading state
}
```

---

### 2. **RoommateForm.jsx**
Complete form for creating/editing roommate listings.

**Features:**
- Multi-step form (Details → Amenities → Preferences → Images)
- Image upload with preview
- Budget range selector
- Preference checkboxes
- Rich text editor for description
- Form validation
- Auto-save drafts

**Props:**
```javascript
{
  initialData: Object,        // For edit mode
  onSubmit: Function,         // Form submission callback
  isLoading: Boolean,         // Submit loading state
  mode: String                // 'create' or 'edit'
}
```

---

### 3. **RoommateGrid.jsx**
Grid layout for displaying multiple roommate cards.

**Features:**
- Responsive grid (2 columns mobile, 3-4 desktop)
- Pagination controls
- Empty state
- Loading skeleton
- Error state

**Props:**
```javascript
{
  roommates: Array,           // Array of roommate objects
  isLoading: Boolean,         // Loading state
  error: Object,              // Error object
  page: Number,               // Current page
  totalPages: Number,         // Total pages
  onPageChange: Function      // Page change callback
}
```

---

### 4. **RoommateSearchBar.jsx**
Search and filter interface for roommate listings.

**Features:**
- Text search
- Quick filters (budget, type, amenities)
- Advanced filter button
- Clear filters
- Search history

**Props:**
```javascript
{
  onSearch: Function,         // Search callback
  onFilter: Function,         // Filter callback
  searchValue: String,        // Current search value
  filters: Object             // Current filters
}
```

---

### 5. **RoommateFilters.jsx**
Advanced filter modal/panel.

**Features:**
- Budget range slider
- Accommodation type checkboxes
- Amenities multi-select
- Gender preference
- Age range slider
- Campus/location filter
- Availability date picker

**Props:**
```javascript
{
  isOpen: Boolean,            // Modal/panel open state
  onClose: Function,          // Close callback
  onApply: Function,          // Apply filters callback
  initialFilters: Object      // Current filters
}
```

---

### 6. **RoommateImageGallery.jsx**
Image carousel for roommate listing details.

**Features:**
- Main image display
- Thumbnail carousel
- Lightbox view
- Image counter
- Smooth transitions

**Props:**
```javascript
{
  images: Array,              // Image URLs
  title: String,              // Image alt text
  onImageSelect: Function     // Image selection callback
}
```

---

### 7. **RoommateDetails.jsx**
Full details view component (not a page).

**Features:**
- Roommate profile info
- Budget and amenities
- Room type and size
- Preferences
- Contact information
- Similar listings
- Reviews section
- Application section

**Props:**
```javascript
{
  roommate: Object,           // Roommate data
  onApply: Function,          // Apply callback
  onFavorite: Function        // Favorite callback
}
```

---

### 8. **RoommateApplicants.jsx**
View and manage applications (for listing owner).

**Features:**
- List of applicants
- Application status
- Accept/reject buttons
- View applicant profile
- Send message button
- Sort and filter

**Props:**
```javascript
{
  roommateId: String,         // Roommate listing ID
  applicants: Array,          // Applicants list
  onAccept: Function,         // Accept callback
  onReject: Function,         // Reject callback
  isLoading: Boolean
}
```

---

### 9. **RoommateApplicationCard.jsx**
Individual application card.

**Features:**
- Applicant profile picture
- Basic info
- Application message
- Application date
- Status badge
- Action buttons

**Props:**
```javascript
{
  application: Object,        // Application data
  onAccept: Function,         // Accept callback
  onReject: Function,         // Reject callback
  isOwner: Boolean            // Is current user the owner
}
```

---

### 10. **RoommatePreferences.jsx**
Preference selector component.

**Features:**
- Gender preference radio buttons
- Age range slider
- Languages multi-select
- Study level dropdown
- Major/course multi-select
- Smoking/pets toggles

**Props:**
```javascript
{
  preferences: Object,        // Current preferences
  onChange: Function,         // Change callback
  disabled: Boolean           // Disabled state
}
```

---

### 11. **RoommateFavoriteButton.jsx**
Favorite toggle button component.

**Features:**
- Heart icon toggle
- Loading state
- Tooltip
- Animation on click

**Props:**
```javascript
{
  roommateId: String,         // Roommate ID
  isFavorited: Boolean,       // Current favorite state
  onToggle: Function,         // Toggle callback
  size: String                // 'small', 'medium', 'large'
}
```

---

### 12. **RoommateReviews.jsx**
Reviews section for roommate profile.

**Features:**
- Review list with pagination
- Star ratings
- Review form
- Sort by rating/date
- Delete review (own)
- Helpful votes

**Props:**
```javascript
{
  roommateId: String,         // Roommate ID
  reviews: Array,             // Reviews list
  onAddReview: Function,      // Add review callback
  onDeleteReview: Function,   // Delete review callback
  isLoading: Boolean
}
```

---

## 🎨 Styling Guidelines

All components use Styled Components with:

**Color Scheme:**
- Primary: `#1a1a1a` (Black)
- Secondary: `#666`
- Border: `#e5e5e5` (Light gray)
- Background: `#f9f9f9`
- Success: `#2e7d32` (Green)
- Warning: `#e65100` (Orange)
- Error: `#c62828` (Red)

**Responsive Breakpoints:**
```
Mobile: < 768px
Tablet: 768px - 1024px
Desktop: > 1024px
```

---

## 📱 Page Components

### Roommates List (`/roommates`)
- Header with search and filters
- Roommate grid
- Pagination
- Empty state

### Create Listing (`/roommates/new`)
- Form with progress steps
- Image upload
- Form validation
- Success confirmation

### Roommate Details (`/roommates/[id]`)
- Full details and images
- Reviews section
- Similar listings
- Apply section
- Contact option

### My Listings (`/roommates/my-listings`)
- Table of user's listings
- Edit/delete actions
- View applicants
- Analytics

### Applications (`/roommates/applications`)
- Sent applications status
- Withdraw option
- View messages

### Favorites (`/roommates/favorites`)
- Grid of saved listings
- Remove from favorites
- Quick apply

---

## 🔄 Data Flow

```
Pages → Components → Hooks → Services → API
  ↓        ↓          ↓       ↓      ↓
User   Display    State      API   Backend
       Data      Management  Call
```

---

## ✅ Implementation Order

1. Create services (roommates.js, etc.)
2. Create hooks (useRoommates, etc.)
3. Create components (RoommateCard → RoommateGrid)
4. Create pages (list, details, create)
5. Add validation
6. Add error handling
7. Add loading states
8. Add analytics

---

## 🧪 Testing Checklist

- [ ] Services return correct data
- [ ] Hooks manage state properly
- [ ] Components render without errors
- [ ] Form validation works
- [ ] Image upload functions
- [ ] Favorites toggle
- [ ] Applications submit
- [ ] Search/filters work
- [ ] Pagination works
- [ ] Responsive on mobile

---

## 📚 Additional Resources

- See ROOMMATE_PAGES_IMPLEMENTATION.md for page details
- See ROOMMATE_VALIDATIONS.md for form validation
- See ROOMMATE_STYLING.md for detailed styling
