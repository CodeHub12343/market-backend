# Roommate Backend Implementation - Complete Documentation

## Overview
Full backend implementation for the roommate feature including models, controllers, routes, and API endpoints.

## Database Models

### 1. RoommateListing Model (`roommateListingModel.js`)
**Status**: Already exists
- Handles roommate listing data
- Fields:
  - Basic info: title, description
  - Room details: roomType, numberOfRooms, accommodation
  - Location: address, city, campus, coordinates
  - Budget: minPrice, maxPrice, currency
  - Preferences: genderPreference, lifestyle
  - Amenities: WiFi, kitchen, AC, etc.
  - Status: active, inactive, closed
  - Images with Cloudinary metadata

### 2. RoommateApplication Model (NEW)
**File**: `models/roommateApplicationModel.js`
- Tracks applications from students to listings
- Fields:
  - roommate: Reference to RoommateListing
  - applicant: Reference to User (who applied)
  - landlord: Reference to User (listing owner)
  - status: pending, approved, rejected, withdrawn
  - message: Why they're interested
  - budget, moveInDate, leaseDuration
  - rating: Optional cleanliness/communication/respectful scores
  - responseMessage: Landlord's response
  - appliedAt timestamp

### 3. RoommateReview Model (NEW)
**File**: `models/roommateReviewModel.js`
- Reviews of roommate experiences
- Fields:
  - roommate: Reference to RoommateListing
  - reviewer: Reference to User
  - landlord: Reference to User (listing owner)
  - rating: 1-5 stars (overall)
  - categories: Cleanliness, Communication, Respectful (each 1-5)
  - comment: Review text
  - images: Optional review images
  - helpfulCount, unhelpfulCount
  - status: pending, approved, rejected
- Auto-updates roommate listing ratings on save/update
- Prevents duplicate reviews (one per user per listing)

### 4. RoomateFavorite Model (NEW)
**File**: `models/roomateFavoriteModel.js`
- User's bookmarked listings
- Fields:
  - user: Reference to User
  - roommate: Reference to RoommateListing
  - notes: User's personal notes
  - savedAt: When it was saved
- Prevents duplicate favorites (one per user per listing)

---

## Controllers

### 1. RoommateListingController (EXISTING)
**File**: `controllers/roommateListingController.js`
- `createRoomateListing()` - Create new listing
- `getAllRoommateListings()` - Browse all listings
- `getRoomateListing()` - Get single listing
- `getMyRoommateListings()` - User's own listings
- `updateRoomateListing()` - Update listing
- `searchRoommateListings()` - Advanced search
- `getNearbyRoommateListings()` - Location-based search

### 2. RoommateApplicationController (NEW)
**File**: `controllers/roommateApplicationController.js`

**Create Application**
```
POST /api/v1/roommate-applications/:roommateId/apply
Body: { message, budget, moveInDate, leaseDuration }
Returns: Application object
```

**Get User's Applications**
```
GET /api/v1/roommate-applications
Query: ?status=pending&type=sent|received|all
Returns: Paginated applications
```

**Get Single Application**
```
GET /api/v1/roommate-applications/:id
Returns: Application object with populated data
```

**Approve Application (Landlord)**
```
PATCH /api/v1/roommate-applications/:id/approve
Body: { responseMessage }
Updates: status = 'approved'
```

**Reject Application (Landlord)**
```
PATCH /api/v1/roommate-applications/:id/reject
Body: { responseMessage }
Updates: status = 'rejected'
```

**Withdraw Application (Applicant)**
```
DELETE /api/v1/roommate-applications/:id
Updates: status = 'withdrawn'
```

**Get Roommate's Applications (Landlord)**
```
GET /api/v1/roommate-applications/roommate/:roommateId/applications
Query: ?status=pending|approved|rejected
Returns: All applications for a listing
```

### 3. RoommateReviewController (NEW)
**File**: `controllers/roommateReviewController.js`

**Create Review**
```
POST /api/v1/roommate-reviews/:roommateId
Body: { 
  rating: 1-5,
  categories: { cleanliness, communication, respectful },
  comment 
}
Returns: Review object
```

**Get Reviews for Roommate**
```
GET /api/v1/roommate-reviews/roommate/:roommateId
Query: ?page=1&limit=10
Returns: Paginated reviews
```

**Get Review Details**
```
GET /api/v1/roommate-reviews/:id
Returns: Single review
```

**Update Review**
```
PATCH /api/v1/roommate-reviews/:id
Body: { rating, categories, comment }
Only reviewer can update
```

**Delete Review**
```
DELETE /api/v1/roommate-reviews/:id
Only reviewer can delete
Auto-updates roommate ratings
```

**Get Review Stats**
```
GET /api/v1/roommate-reviews/stats/:roommateId
Returns: Average ratings, total count, distribution
```

**Mark as Helpful/Unhelpful**
```
POST /api/v1/roommate-reviews/:id/helpful
POST /api/v1/roommate-reviews/:id/unhelpful
Increments counters
```

### 4. RoomateFavoriteController (NEW)
**File**: `controllers/roomateFavoriteController.js`

**Add to Favorites**
```
POST /api/v1/roommate-favorites/:roommateId
Body: { notes }
Returns: Favorite object
```

**Remove from Favorites**
```
DELETE /api/v1/roommate-favorites/:roommateId
Returns: 204 No Content
```

**Get User's Favorites**
```
GET /api/v1/roommate-favorites
Query: ?page=1&limit=12
Returns: Paginated favorite listings
```

**Check if Favorited**
```
GET /api/v1/roommate-favorites/:roommateId/check
Returns: { isFavorited, favorite }
```

**Toggle Favorite**
```
POST /api/v1/roommate-favorites/:roommateId/toggle
Body: { notes }
Returns: Adds if not exists, removes if exists
```

**Update Notes**
```
PATCH /api/v1/roommate-favorites/:roommateId
Body: { notes }
Returns: Updated favorite
```

---

## Routes

### Application Routes
**File**: `routes/roommateApplicationRoutes.js`

```
POST   /                           - Create application
GET    /                           - Get user's applications
GET    /:id                        - Get application details
PATCH  /:id/approve               - Approve (landlord)
PATCH  /:id/reject                - Reject (landlord)
DELETE /:id                       - Withdraw (applicant)
GET    /roommate/:roommateId/applications - Get roommate's apps
```

### Review Routes
**File**: `routes/roommateReviewRoutes.js`

```
POST   /                          - Create review
GET    /roommate/:roommateId      - Get roommate reviews
GET    /stats/:roommateId         - Get review stats
GET    /:id                       - Get review details
PATCH  /:id                       - Update review
DELETE /:id                       - Delete review
POST   /:id/helpful               - Mark helpful
POST   /:id/unhelpful             - Mark unhelpful
```

### Favorite Routes
**File**: `routes/roomateFavoriteRoutes.js`

```
POST   /                          - Add to favorites
GET    /                          - Get user's favorites
GET    /:roommateId/check         - Check if favorited
POST   /:roommateId               - Add to favorites
POST   /:roommateId/toggle        - Toggle favorite
PATCH  /:roommateId               - Update notes
DELETE /:roommateId               - Remove from favorites
```

---

## API Integration in app.js

Added routes to `/app.js`:

```javascript
// Accommodation & Housing
app.use('/api/v1/roommate-listings', roommateListingRouter);
app.use('/api/v1/roommate-applications', require('./routes/roommateApplicationRoutes'));
app.use('/api/v1/roommate-reviews', require('./routes/roommateReviewRoutes'));
app.use('/api/v1/roommate-favorites', require('./routes/roomateFavoriteRoutes'));
```

---

## Data Flow Examples

### Creating an Application
```
Frontend: User clicks "Apply"
  ↓
POST /api/v1/roommate-applications/:roommateId/apply
  ↓
roommateApplicationController.createApplication()
  ├─ Validates roommate exists
  ├─ Checks no existing pending/approved apps
  ├─ Creates application with:
  │  - applicant = current user
  │  - landlord = listing owner
  │  - status = 'pending'
  └─ Returns populated application
  ↓
Frontend: Updates applications list
```

### Approving Application
```
Frontend: Landlord clicks "Approve"
  ↓
PATCH /api/v1/roommate-applications/:id/approve
  ↓
roommateApplicationController.approveApplication()
  ├─ Verifies landlord is owner
  ├─ Sets status = 'approved'
  ├─ Records response date/message
  └─ Returns updated application
  ↓
Frontend: Shows approved status
```

### Creating Review
```
Frontend: User submits review form
  ↓
POST /api/v1/roommate-reviews/:roommateId
  ↓
roommateReviewController.createReview()
  ├─ Validates roommate exists
  ├─ Checks one review per user
  ├─ Creates review with ratings
  └─ Triggers RoommateReview.calcAverageRating()
      ├─ Aggregates all reviews
      ├─ Calculates category averages
      └─ Updates RoommateListing ratings
  ↓
Frontend: Shows review and updated rating
```

### Adding to Favorites
```
Frontend: User clicks heart icon
  ↓
POST /api/v1/roommate-favorites/:roommateId (or toggle)
  ↓
roomateFavoriteController.toggleFavorite()
  ├─ Checks if already favorited
  ├─ Removes if exists, adds if not
  └─ Returns isFavorited status
  ↓
Frontend: Updates heart icon state
```

---

## Middleware & Authentication

All routes in application, review, and favorite controllers require:
- `authMiddleware.protect` - User must be logged in
- Authorization checks:
  - Applications: Applicant can withdraw, Landlord can approve/reject
  - Reviews: Only reviewer can update/delete
  - Favorites: Only owner can manage

---

## Response Format

All endpoints return standardized JSON:

```javascript
// Success
{
  "status": "success",
  "data": { /* data */ },
  "results": 10,
  "total": 50,
  "page": 1,
  "pages": 5
}

// Error
{
  "status": "error",
  "message": "Error description"
}
```

---

## Indexes for Performance

- **Applications**: roommate+status, applicant+status, landlord+status, createdAt
- **Reviews**: roommate+rating, reviewer, roommate+reviewer (unique), createdAt
- **Favorites**: user+roommate (unique), user+savedAt

---

## Status Fields

**Applications**: pending → approved/rejected/withdrawn
**Reviews**: pending → approved (moderation)
**Listings**: active → inactive/closed

---

## Testing with Postman

1. **Create Application**
   ```
   POST http://localhost:4000/api/v1/roommate-applications/:roommateId/apply
   Auth: Bearer token
   Body: { "message": "...", "budget": 50000, "moveInDate": "2026-03-01", "leaseDuration": "12-months" }
   ```

2. **Get My Applications**
   ```
   GET http://localhost:4000/api/v1/roommate-applications?type=sent
   Auth: Bearer token
   ```

3. **Approve Application**
   ```
   PATCH http://localhost:4000/api/v1/roommate-applications/:appId/approve
   Auth: Bearer token
   Body: { "responseMessage": "Welcome!" }
   ```

4. **Create Review**
   ```
   POST http://localhost:4000/api/v1/roommate-reviews/:roommateId
   Auth: Bearer token
   Body: {
     "rating": 5,
     "categories": { "cleanliness": 5, "communication": 4, "respectful": 5 },
     "comment": "Great place!"
   }
   ```

5. **Add to Favorites**
   ```
   POST http://localhost:4000/api/v1/roommate-favorites/:roommateId
   Auth: Bearer token
   Body: { "notes": "Interested, follow up later" }
   ```

---

## Connected Frontend Services

Frontend service layer (`src/services/`) already exists for:
- `roommates.js` - Main CRUD
- `roommateApplications.js` - Applications
- `roommateReviews.js` - Reviews
- `roommateFavorites.js` - Favorites

Frontend hooks (`src/hooks/useRoommates.js`) use React Query for:
- `useRoommates()` - Browse listings
- `useRoommateDetail()` - Single listing
- `useCreateRoommate()` - Create new
- `useUpdateRoommate()` - Update listing
- `useMyRoommates()` - User's listings
- `useFavorites()` - Bookmarked listings

---

## Summary

✅ Models Created:
- RoommateApplication
- RoommateReview  
- RoomateFavorite

✅ Controllers Created:
- RoommateApplicationController
- RoommateReviewController
- RoomateFavoriteController

✅ Routes Created:
- roommateApplicationRoutes
- roommateReviewRoutes
- roomateFavoriteRoutes

✅ Integrated into app.js

Ready for frontend testing with Postman or the Next.js application!
