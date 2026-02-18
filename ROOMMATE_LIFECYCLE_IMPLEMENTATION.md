# 🏠 Roommate Lifecycle - Complete Implementation Guide

## Overview
This guide provides a complete end-to-end implementation of the roommate feature for your Next.js student marketplace application. The roommate feature allows students to find, create, and manage roommate listings.

---

## 📁 Folder Structure

```
src/
├── app/(protected)/
│   ├── roommates/
│   │   ├── page.js                 # Browse all roommate listings
│   │   ├── new/
│   │   │   └── page.js             # Create new roommate listing
│   │   ├── [id]/
│   │   │   ├── page.js             # View roommate listing details
│   │   │   ├── edit/
│   │   │   │   └── page.js         # Edit roommate listing
│   │   │   └── applicants/
│   │   │       └── page.js         # View applicants for listing
│   │   ├── my-listings/
│   │   │   └── page.js             # User's roommate listings
│   │   ├── applications/
│   │   │   └── page.js             # User's roommate applications
│   │   └── favorites/
│   │       └── page.js             # Favorite roommate listings
│   │
├── components/
│   ├── roommates/
│   │   ├── RoommateCard.jsx        # Roommate listing card
│   │   ├── RoommateForm.jsx        # Create/Edit form
│   │   ├── RoommateGrid.jsx        # Grid layout for cards
│   │   ├── RoommateSearchBar.jsx   # Search & filter
│   │   ├── RoommateFilters.jsx     # Advanced filters
│   │   ├── RoommateImageGallery.jsx# Image carousel
│   │   ├── RoommateDetails.jsx     # Detail view
│   │   ├── RoommateApplicants.jsx  # View applicants
│   │   ├── RoommateApplicationCard.jsx # Application card
│   │   ├── RoommatePreferences.jsx # Preference selector
│   │   ├── RoommateFavoriteButton.jsx # Favorite toggle
│   │   └── RoommateReviews.jsx     # Reviews section
│   │
├── hooks/
│   ├── useRoommates.js             # Fetch roommate listings
│   ├── useRoommateForm.js          # Form management
│   ├── useRoommateSearch.js        # Search & filter
│   ├── useRoommateDetails.js       # Single listing details
│   ├── useRoommateApplications.js  # Manage applications
│   ├── useRoommateFavorites.js     # Favorite listings
│   ├── useRoommateReviews.js       # Reviews management
│   └── useMyRoommates.js           # User's listings
│   │
├── services/
│   ├── roommates.js                # Roommate API service
│   ├── roommateApplications.js     # Applications API service
│   ├── roommateReviews.js          # Reviews API service
│   └── roommateFavorites.js        # Favorites API service
│
└── utils/
    └── roommateValidation.js       # Form validation
```

---

## 📋 Database Schema (Backend Reference)

### Roommate Listing Schema
```javascript
{
  _id: ObjectId,
  user: ObjectId (ref: User),
  title: String,
  description: String,
  accommodationType: String, // studio, 1bd, 2bd, 3bd, shared
  budget: {
    min: Number,
    max: Number,
    currency: String
  },
  amenities: [String], // wifi, ac, furnished, etc.
  preferences: {
    gender: String, // any, male, female
    ageRange: {
      min: Number,
      max: Number
    },
    smoking: Boolean,
    pets: Boolean,
    languages: [String],
    studyLevel: String, // 100, 200, 300, 400
    majors: [String]
  },
  availableFrom: Date,
  duration: String, // semester, year, etc.
  images: [String], // URLs
  location: {
    campus: ObjectId (ref: Campus),
    address: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  amenityHighlights: [String],
  rulesAndPolicies: String,
  applicationDeadline: Date,
  maxApplicants: Number,
  applications: [{
    applicant: ObjectId (ref: User),
    status: String, // pending, accepted, rejected
    message: String,
    appliedAt: Date
  }],
  reviews: [{
    reviewer: ObjectId (ref: User),
    rating: Number,
    comment: String,
    createdAt: Date
  }],
  status: String, // active, filled, archived
  createdAt: Date,
  updatedAt: Date
}
```

---

## 🔗 API Endpoints

```
GET    /api/v1/roommates              # List all roommates
GET    /api/v1/roommates?page=1&limit=12&filters=...
GET    /api/v1/roommates/:id          # Get single listing
POST   /api/v1/roommates              # Create listing
PATCH  /api/v1/roommates/:id          # Update listing
DELETE /api/v1/roommates/:id          # Delete listing

GET    /api/v1/roommates/my-listings  # User's listings
GET    /api/v1/roommates/:id/applicants # View applicants

POST   /api/v1/roommate-applications  # Apply to listing
GET    /api/v1/roommate-applications  # User's applications
PATCH  /api/v1/roommate-applications/:id # Update application status

GET    /api/v1/roommate-favorites     # User's favorites
POST   /api/v1/roommate-favorites/:id # Add to favorites
DELETE /api/v1/roommate-favorites/:id # Remove from favorites

POST   /api/v1/roommate-reviews       # Add review
GET    /api/v1/roommate-reviews/:id   # Get reviews
```

---

## 🎯 Feature Breakdown

### 1. **Browse Roommate Listings**
- View all available roommate listings
- Filter by budget, accommodation type, amenities
- Search by location, campus
- View distance from campus
- See applicant count

### 2. **Create Roommate Listing**
- Upload multiple images
- Set accommodation details
- Define preferences
- Set application deadline
- Publish listing

### 3. **View Listing Details**
- Full image gallery
- Contact seller/lister
- View reviews
- Similar listings
- Apply for listing

### 4. **Manage Applications**
- View pending applications
- Accept/reject applicants
- View applicant profiles
- Send messages

### 5. **User Applications**
- View applications sent
- Track application status
- See application responses

### 6. **Favorites**
- Save favorite listings
- View saved listings
- Quick access

### 7. **Reviews & Ratings**
- Leave reviews
- Rate roommate experience
- View roommate reviews

---

## 📁 Complete File Implementation

### This documentation provides the structure. Implement files in this order:
1. **Services** (API calls)
2. **Hooks** (State management)
3. **Components** (UI)
4. **Pages** (Routes)

Each file is designed to be modular and reusable.

---

## 🚀 Implementation Checklist

- [ ] Create services/roommates.js
- [ ] Create services/roommateApplications.js
- [ ] Create services/roommateReviews.js
- [ ] Create services/roommateFavorites.js
- [ ] Create hooks/useRoommates.js
- [ ] Create hooks/useRoommateForm.js
- [ ] Create hooks/useRoommateApplications.js
- [ ] Create hooks/useRoommateFavorites.js
- [ ] Create components/roommates/RoommateCard.jsx
- [ ] Create components/roommates/RoommateForm.jsx
- [ ] Create components/roommates/RoommateGrid.jsx
- [ ] Create components/roommates/RoommateFilters.jsx
- [ ] Create pages: roommates/page.js
- [ ] Create pages: roommates/new/page.js
- [ ] Create pages: roommates/[id]/page.js
- [ ] Create pages: roommates/my-listings/page.js
- [ ] Create pages: roommates/applications/page.js
- [ ] Create pages: roommates/favorites/page.js

---

## 🔑 Key Features

✅ **Authentication Required** - Protected routes  
✅ **Real-time Updates** - Socket.io integration  
✅ **Image Upload** - Multiple image support  
✅ **Responsive Design** - Mobile-friendly  
✅ **Advanced Filters** - Multiple filter options  
✅ **Search** - Full-text search  
✅ **Reviews & Ratings** - User feedback system  
✅ **Favorite Listings** - Save for later  
✅ **Application Management** - Accept/Reject applicants  
✅ **Campus Integration** - Filter by campus  

---

## 📚 Next Steps

1. Review this structure
2. Create the folder hierarchy
3. Implement files starting with services
4. Test API endpoints
5. Build components incrementally
6. Test complete flow

For detailed file implementations, see the accompanying file templates.
