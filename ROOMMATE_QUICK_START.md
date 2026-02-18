# 🚀 Roommate Feature - Quick Start Guide

## 5-Minute Overview

You now have complete documentation and files for the roommate feature. Here's what was created:

---

## 📦 What You Got

### ✅ Documentation Files
1. **ROOMMATE_LIFECYCLE_IMPLEMENTATION.md** - Complete overview
2. **ROOMMATE_COMPONENTS_GUIDE.md** - Component documentation
3. **ROOMMATE_PAGES_IMPLEMENTATION.md** - Page structure guide

### ✅ Service Files
- `src/services/roommates.js` - Roommate API service
- `src/services/roommateApplications.js` - Applications API
- `src/services/roommateFavorites.js` - Favorites API
- `src/services/roommateReviews.js` - Reviews API

### ✅ Hook Files
- `src/hooks/useRoommates.js` - Fetch roommates
- `src/hooks/useRoommateApplications.js` - Manage applications
- `src/hooks/useRoommateFavorites.js` - Manage favorites
- `src/hooks/useRoommateReviews.js` - Manage reviews

---

## 🎯 Quick Start (Step by Step)

### Step 1: Create Folder Structure
```bash
mkdir -p src/app/\(protected\)/roommates/{new,[id]/edit,[id]/applicants,my-listings,applications,favorites}
mkdir -p src/components/roommates
```

### Step 2: Copy Component Templates
You need to create these components in `src/components/roommates/`:
```
RoommateCard.jsx
RoommateForm.jsx
RoommateGrid.jsx
RoommateSearchBar.jsx
RoommateFilters.jsx
RoommateImageGallery.jsx
RoommateDetails.jsx
RoommateApplicants.jsx
RoommateApplicationCard.jsx
RoommatePreferences.jsx
RoommateFavoriteButton.jsx
RoommateReviews.jsx
```

### Step 3: Create Page Files
Create these pages with the structure from ROOMMATE_PAGES_IMPLEMENTATION.md:
```
app/(protected)/roommates/page.js           ✅ Browse
app/(protected)/roommates/new/page.js       ✅ Create
app/(protected)/roommates/[id]/page.js      ✅ Details
app/(protected)/roommates/[id]/edit/page.js ✅ Edit
app/(protected)/roommates/my-listings/page.js
app/(protected)/roommates/applications/page.js
app/(protected)/roommates/[id]/applicants/page.js
app/(protected)/roommates/favorites/page.js
```

### Step 4: Test Services
```bash
npm run dev
# Then test API calls manually
```

---

## 📋 Implementation Checklist

### Phase 1: Setup (Foundation)
- [x] Create services (already created ✅)
- [x] Create hooks (already created ✅)
- [ ] Create folder structure
- [ ] Create page files

### Phase 2: Components
- [ ] RoommateCard
- [ ] RoommateGrid
- [ ] RoommateForm
- [ ] RoommateFilters

### Phase 3: Pages
- [ ] Browse page (/roommates)
- [ ] Details page (/roommates/[id])
- [ ] Create page (/roommates/new)

### Phase 4: Features
- [ ] Search functionality
- [ ] Image upload
- [ ] Applications
- [ ] Favorites
- [ ] Reviews

### Phase 5: Polish
- [ ] Error handling
- [ ] Loading states
- [ ] Form validation
- [ ] Mobile responsive
- [ ] Analytics

---

## 🔗 API Endpoints (Backend)

Make sure your backend has these endpoints:

```
GET    /api/v1/roommates                      # List
GET    /api/v1/roommates/:id                  # Details
POST   /api/v1/roommates                      # Create
PATCH  /api/v1/roommates/:id                  # Update
DELETE /api/v1/roommates/:id                  # Delete

GET    /api/v1/roommates/my-listings          # My listings
GET    /api/v1/roommates/:id/applicants       # Applicants

POST   /api/v1/roommate-applications          # Apply
PATCH  /api/v1/roommate-applications/:id      # Update status
DELETE /api/v1/roommate-applications/:id      # Withdraw

GET    /api/v1/roommate-favorites             # Favorites
POST   /api/v1/roommate-favorites/:id         # Add
DELETE /api/v1/roommate-favorites/:id         # Remove

POST   /api/v1/roommate-reviews               # Create review
GET    /api/v1/roommate-reviews/:id           # Get reviews
```

---

## 💻 Code Example: Simple Component

Here's how to implement one component to get started:

```javascript
// src/components/roommates/RoommateCard.jsx
'use client'

import styled from 'styled-components'
import { Heart, MessageCircle } from 'lucide-react'
import Image from 'next/image'

const Card = styled.div`
  background: white;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid #f0f0f0;
  transition: all 0.2s ease;
  cursor: pointer;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(0,0,0,0.08);
  }
`

const ImageWrapper = styled.div`
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  overflow: hidden;
  background: #f5f5f5;
`

const FavoriteButton = styled.button`
  position: absolute;
  top: 8px;
  right: 8px;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: rgba(255,255,255,0.95);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    transform: scale(1.1);
  }
`

const Content = styled.div`
  padding: 12px;
`

const Title = styled.h3`
  font-size: 14px;
  font-weight: 700;
  margin: 0 0 8px 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const Budget = styled.div`
  font-size: 16px;
  font-weight: 800;
  color: #1a1a1a;
  margin-bottom: 8px;
`

const Footer = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 8px;
  border-top: 1px solid #f0f0f0;
  font-size: 12px;
  color: #666;
`

export default function RoommateCard({ roommate, isFavorited, onFavorite, onApply }) {
  return (
    <Card>
      <ImageWrapper>
        <Image
          src={roommate.images?.[0] || '/placeholder.jpg'}
          alt={roommate.title}
          fill
          style={{ objectFit: 'cover' }}
        />
        <FavoriteButton onClick={() => onFavorite?.(roommate._id)}>
          <Heart
            size={18}
            fill={isFavorited ? '#e53935' : 'none'}
            color={isFavorited ? '#e53935' : '#999'}
          />
        </FavoriteButton>
      </ImageWrapper>
      <Content>
        <Title>{roommate.title}</Title>
        <Budget>₦{roommate.budget?.min?.toLocaleString()}</Budget>
        <Footer>
          <span>🏠 {roommate.accommodationType}</span>
          <button onClick={() => onApply?.(roommate._id)}>
            <MessageCircle size={14} /> Apply
          </button>
        </Footer>
      </Content>
    </Card>
  )
}
```

---

## 🧪 Testing Checklist

### Before Going Live
- [ ] All services return data correctly
- [ ] All hooks work without errors
- [ ] Components render properly
- [ ] Forms validate correctly
- [ ] Image upload works
- [ ] Search/filters function
- [ ] Applications can be submitted
- [ ] Favorites toggle works
- [ ] Mobile responsive
- [ ] No console errors

---

## 📱 Responsive Design Notes

Use these breakpoints (matching your existing codebase):
```javascript
// Mobile
@media (max-width: 768px) {
  grid-template-columns: 1fr;
}

// Tablet
@media (min-width: 768px) and (max-width: 1024px) {
  grid-template-columns: repeat(2, 1fr);
}

// Desktop
@media (min-width: 1024px) {
  grid-template-columns: repeat(3, 1fr);
}
```

---

## 🎨 Color Scheme (Your Existing System)

```javascript
const colors = {
  primary: '#1a1a1a',      // Black
  secondary: '#666',        // Gray
  border: '#e5e5e5',        // Light gray
  background: '#f9f9f9',    // Off white
  success: '#2e7d32',       // Green
  warning: '#e65100',       // Orange
  error: '#c62828'          // Red
}
```

---

## 📚 Documentation Files Reference

| File | Purpose |
|------|---------|
| ROOMMATE_LIFECYCLE_IMPLEMENTATION.md | Overview & structure |
| ROOMMATE_COMPONENTS_GUIDE.md | Component details |
| ROOMMATE_PAGES_IMPLEMENTATION.md | Page implementation |

---

## 🚨 Common Issues & Fixes

### Issue: Services not working
**Fix:** Make sure backend endpoints exist and match the URLs in services

### Issue: Images not uploading
**Fix:** Check `Content-Type: multipart/form-data` in service calls

### Issue: Favorites not persisting
**Fix:** Make sure `roommate-favorites` endpoint is implemented

### Issue: Form validation fails
**Fix:** Create `utils/roommateValidation.js` for form rules

---

## 🔑 Key Files to Create Next

1. **Validation** - `src/utils/roommateValidation.js`
2. **Styling** - Component styles in each component file
3. **Components** - Start with RoommateCard.jsx and RoommateGrid.jsx
4. **Pages** - Create page files with structure from guide

---

## 💡 Pro Tips

1. **Start Small** - Create the browse and details pages first
2. **Test API** - Make sure backend endpoints work before building UI
3. **Reuse Components** - Use your existing components (filters, search, etc)
4. **Copy Patterns** - Follow your existing component patterns (hostels, products)
5. **Mobile First** - Design mobile layout first, then scale up

---

## 🎯 Success Criteria

Your implementation is complete when:
✅ Users can browse roommate listings
✅ Users can create listings
✅ Users can apply to listings
✅ Users can manage applications
✅ Users can add to favorites
✅ Users can leave reviews
✅ Everything is mobile responsive
✅ No console errors

---

## 📞 Support

For questions:
1. Check the detailed guides (ROOMMATE_*_IMPLEMENTATION.md)
2. Look at your existing component patterns (hostels, products)
3. Reference your services for API patterns

**You now have everything needed to implement the complete roommate feature!** 🎉
