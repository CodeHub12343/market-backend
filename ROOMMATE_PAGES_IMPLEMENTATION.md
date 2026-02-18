# 📄 Roommate Pages Implementation Guide

## Page Structure Overview

All pages follow this pattern:
- Client-side component (`'use client'`)
- Use hooks for data management
- Styled components for styling
- Error boundaries
- Loading states

---

## 📍 `/roommates` - Browse Listings

**Purpose:** Display all available roommate listings

**Features:**
- Search bar at top
- Advanced filters sidebar
- Roommate grid
- Pagination
- Campus filter

**Key Hooks:**
- `useRoommates(page, limit, filters)` - Fetch listings
- `useCampusFilter()` - Campus filtering
- `useFavoriteRoommates()` - Check favorites

**Key Components:**
- RoommateSearchBar
- RoommateFilters
- RoommateGrid
- LoadingSpinner
- ErrorAlert

**Code Structure:**
```javascript
'use client'

import { useState } from 'react'
import styled from 'styled-components'
import { useRoommates } from '@/hooks/useRoommates'
import { useRouter } from 'next/navigation'
import RoommateSearchBar from '@/components/roommates/RoommateSearchBar'
import RoommateGrid from '@/components/roommates/RoommateGrid'
import RoommateFilters from '@/components/roommates/RoommateFilters'
import LoadingSpinner from '@/components/common/LoadingSpinner'

const PageContainer = styled.div`
  min-height: 100vh;
  padding: 20px;
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 24px;
`

export default function RoommatesPage() {
  const router = useRouter()
  const [page, setPage] = useState(1)
  const [limit] = useState(12)
  const [filters, setFilters] = useState({})
  
  const { data, isLoading, error } = useRoommates(page, limit, filters)
  
  const roommates = data?.roommates || []
  const totalPages = data?.totalPages || 1
  
  return (
    <PageContainer>
      {/* Sidebar with filters */}
      <aside>
        <RoommateFilters 
          onApply={setFilters}
          initialFilters={filters}
        />
      </aside>
      
      {/* Main content */}
      <main>
        <RoommateSearchBar onSearch={setFilters} />
        {isLoading ? (
          <LoadingSpinner />
        ) : error ? (
          <ErrorAlert message="Failed to load roommates" />
        ) : (
          <RoommateGrid
            roommates={roommates}
            isLoading={isLoading}
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        )}
      </main>
    </PageContainer>
  )
}
```

---

## 📍 `/roommates/new` - Create Listing

**Purpose:** Create a new roommate listing

**Features:**
- Multi-step form (3-4 steps)
- Image upload
- Form validation
- Auto-save drafts
- Success notification

**Key Hooks:**
- `useCreateRoommate()` - Submit form
- `useAuth()` - Get user ID

**Key Components:**
- RoommateForm
- ImageUploader
- Toast notifications

**Steps:**
1. Basic Info (Title, Description, Type)
2. Budget & Details (Price range, Duration, Availability)
3. Amenities & Preferences (Select amenities and preferences)
4. Images (Upload roommate photos)

**Code Structure:**
```javascript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCreateRoommate } from '@/hooks/useRoommates'
import { useToast } from '@/hooks/useToast'
import RoommateForm from '@/components/roommates/RoommateForm'
import styled from 'styled-components'

const PageContainer = styled.div`
  min-height: 100vh;
  background: #f9f9f9;
  padding: 40px 20px;
`

const FormWrapper = styled.div`
  max-width: 800px;
  margin: 0 auto;
  background: white;
  border-radius: 16px;
  padding: 40px;
`

export default function CreateRoommatePage() {
  const router = useRouter()
  const toast = useToast()
  const createRoommate = useCreateRoommate()
  
  const handleSubmit = async (formData) => {
    try {
      await createRoommate.mutateAsync(formData)
      toast.success('Roommate listing created!')
      router.push('/roommates/my-listings')
    } catch (error) {
      toast.error(error?.message || 'Failed to create listing')
    }
  }
  
  return (
    <PageContainer>
      <FormWrapper>
        <h1>Create Roommate Listing</h1>
        <RoommateForm 
          mode="create"
          onSubmit={handleSubmit}
          isLoading={createRoommate.isPending}
        />
      </FormWrapper>
    </PageContainer>
  )
}
```

---

## 📍 `/roommates/[id]` - Listing Details

**Purpose:** View full roommate listing details

**Features:**
- Image gallery with lightbox
- Roommate details
- Amenities list
- Reviews section
- Similar listings
- Contact/Apply section

**Key Hooks:**
- `useRoommateDetails(id)` - Fetch listing
- `useRoommateReviews(id)` - Fetch reviews
- `useApplyToRoommate()` - Submit application
- `useCheckRoommateFavorited(id)` - Check favorite status

**Key Components:**
- RoommateImageGallery
- RoommateDetails
- RoommateReviews
- RelatedRoommates

**Code Structure:**
```javascript
'use client'

import { useParams } from 'next/navigation'
import { useRoommateDetails } from '@/hooks/useRoommates'
import { useRoommateReviews } from '@/hooks/useRoommateReviews'
import { useApplyToRoommate } from '@/hooks/useRoommateApplications'
import { useToast } from '@/hooks/useToast'
import RoommateDetails from '@/components/roommates/RoommateDetails'
import RoommateReviews from '@/components/roommates/RoommateReviews'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import styled from 'styled-components'

const PageContainer = styled.div`
  min-height: 100vh;
  background: white;
`

export default function RoommateDetailsPage() {
  const params = useParams()
  const toast = useToast()
  const { data: roommate, isLoading } = useRoommateDetails(params.id)
  const { data: reviews } = useRoommateReviews(params.id)
  const applyMutation = useApplyToRoommate()
  
  const handleApply = async (applicationData) => {
    try {
      await applyMutation.mutateAsync({
        roommateId: params.id,
        applicationData
      })
      toast.success('Application submitted!')
    } catch (error) {
      toast.error('Failed to submit application')
    }
  }
  
  if (isLoading) return <LoadingSpinner />
  if (!roommate) return <div>Not found</div>
  
  return (
    <PageContainer>
      <RoommateDetails 
        roommate={roommate}
        onApply={handleApply}
      />
      <RoommateReviews 
        roommateId={params.id}
        reviews={reviews}
      />
    </PageContainer>
  )
}
```

---

## 📍 `/roommates/[id]/edit` - Edit Listing

**Purpose:** Edit existing roommate listing

**Features:**
- Pre-fill form with current data
- Same multi-step form as create
- Update validation
- Success notification

**Key Hooks:**
- `useRoommateDetails(id)` - Fetch current data
- `useUpdateRoommate()` - Submit update

**Key Components:**
- RoommateForm (with edit mode)

---

## 📍 `/roommates/my-listings` - My Listings

**Purpose:** Manage user's roommate listings

**Features:**
- Table of user's listings
- Status badges
- Edit button
- Delete button
- View applicants button
- Analytics (views, applications)

**Key Hooks:**
- `useMyRoommates()` - Fetch user's listings
- `useDeleteRoommate()` - Delete listing
- `useRoommateApplicants(id)` - View applicants

**Key Components:**
- Table component
- Action buttons
- Status badges

---

## 📍 `/roommates/applications` - My Applications

**Purpose:** Track applications sent by user

**Features:**
- List of applications
- Status (pending, accepted, rejected)
- View roommate details
- Withdraw application
- Messages

**Key Hooks:**
- `useMyApplications()` - Fetch applications
- `useWithdrawApplication()` - Withdraw app

**Key Components:**
- ApplicationCard
- StatusBadge
- MessageButton

---

## 📍 `/roommates/[id]/applicants` - View Applicants

**Purpose:** Manage applications for a listing (owner only)

**Features:**
- List of applicants
- Accept/reject buttons
- View profile
- Send message
- Sort and filter

**Key Hooks:**
- `useRoommateApplicants(id)` - Fetch applicants
- `useUpdateApplicationStatus()` - Accept/reject

**Key Components:**
- RoommateApplicants
- ApplicationCard
- ActionButtons

---

## 📍 `/roommates/favorites` - Favorite Listings

**Purpose:** View saved roommate listings

**Features:**
- Grid of favorite listings
- Remove from favorites
- Quick apply
- Filter by type/price

**Key Hooks:**
- `useFavoriteRoommates()` - Fetch favorites
- `useToggleRoommateFavorite()` - Remove favorite

**Key Components:**
- RoommateGrid
- FavoriteButton

---

## 📊 Data Flow Diagram

```
User navigates to /roommates
         ↓
  useRoommates() hook calls
         ↓
  roommates service fetches data
         ↓
  API request to /api/v1/roommates
         ↓
  Response with roommate data
         ↓
  Hook returns data
         ↓
  Component renders with data
         ↓
  User sees roommate listings
```

---

## 🔄 State Management Pattern

Each page follows this pattern:

```javascript
const [page, setPage] = useState(1)
const [filters, setFilters] = useState({})

const { data, isLoading, error } = useHook(params)

// Render: loading → error → content
```

---

## ✅ Common Page Elements

### Header
```javascript
const Header = styled.div`
  background: white;
  padding: 24px;
  border-bottom: 1px solid #f0f0f0;
`
```

### Container
```javascript
const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
`
```

### Grid
```javascript
const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
`
```

---

## 📚 File Checklist

- [ ] roommates/page.js
- [ ] roommates/new/page.js
- [ ] roommates/[id]/page.js
- [ ] roommates/[id]/edit/page.js
- [ ] roommates/my-listings/page.js
- [ ] roommates/applications/page.js
- [ ] roommates/[id]/applicants/page.js
- [ ] roommates/favorites/page.js

---

## 🚀 Next Steps

1. Create page files with structure above
2. Import and use components
3. Add styling
4. Test data flow
5. Add error handling
6. Optimize performance
