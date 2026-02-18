# Complete Roommate Lifecycle Implementation Guide

**Last Updated:** January 13, 2026  
**Status:** Production Ready ✅  
**Coverage:** Full end-to-end roommate feature with advanced filtering, image uploads, and real-time updates

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Backend API Reference](#backend-api-reference)
3. [Frontend Architecture](#frontend-architecture)
4. [Service Layer Implementation](#service-layer-implementation)
5. [Custom Hooks](#custom-hooks)
6. [React Components](#react-components)
7. [Pages & Routes](#pages--routes)
8. [Complete Lifecycle Walkthrough](#complete-lifecycle-walkthrough)
9. [Features & Capabilities](#features--capabilities)
10. [Styling & UI/UX](#styling--uiux)
11. [Best Practices](#best-practices)
12. [Troubleshooting](#troubleshooting)

---

## Overview

The roommate module enables students to:
- **Create** roommate listings with detailed requirements
- **Search** and filter roommate opportunities
- **View** roommate details and contact information
- **Manage** their own roommate listings (CRUD)
- **Track** analytics (views, favorites, contacts)
- **Filter** by campus, gender preference, budget, amenities, and accommodation type

### Technology Stack
- **Frontend:** Next.js 14+ (App Router)
- **Styling:** Styled Components
- **State Management:** React Query (TanStack Query)
- **HTTP Client:** Axios
- **Image Upload:** Cloudinary
- **Form Handling:** React Hook Form + Custom validation
- **Responsive:** Mobile-first design with Styled Components media queries

### File Structure
```
src/
├── services/roommates.js           # API service layer
├── hooks/
│   ├── useRoommates.js            # Query/mutation hooks
│   └── useRoommateForm.js         # Form state management
├── components/roommates/
│   ├── RoommateCard.jsx           # Card component
│   ├── RoommateGrid.jsx           # Grid layout
│   ├── RoommateForm.jsx           # Create/edit form
│   ├── RoommateFilters.jsx        # Filter UI
│   └── filters/
│       ├── BudgetRangeFilter.jsx
│       ├── GenderPreferenceFilter.jsx
│       ├── AccommodationFilter.jsx
│       ├── AmenitiesFilter.jsx
│       └── CampusFilter.jsx
└── app/(protected)/
    └── roommates/
        ├── page.js                # Browse listings
        ├── [id]/
        │   └── page.js           # View details
        ├── new/
        │   └── page.js           # Create listing
        ├── [id]/edit/
        │   └── page.js           # Edit listing
        └── my-listings/
            └── page.js           # User's listings
```

---

## Backend API Reference

### Endpoints Overview

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| `POST` | `/api/v1/roommate-listings` | ✅ | Create listing |
| `GET` | `/api/v1/roommate-listings` | ❌ | Get all listings |
| `GET` | `/api/v1/roommate-listings/search/advanced` | ❌ | Advanced search |
| `GET` | `/api/v1/roommate-listings/me` | ✅ | Get my listings |
| `GET` | `/api/v1/roommate-listings/:id` | ❌ | Get single listing |
| `PATCH` | `/api/v1/roommate-listings/:id` | ✅ | Update listing |
| `DELETE` | `/api/v1/roommate-listings/:id` | ✅ | Delete listing |
| `POST` | `/api/v1/roommate-listings/:id/images` | ✅ | Add images |
| `DELETE` | `/api/v1/roommate-listings/:id/images/:imageId` | ✅ | Remove image |

### Request/Response Schema

#### Create Listing Request
```javascript
POST /api/v1/roommate-listings
Content-Type: multipart/form-data

{
  title: "Looking for roommate in Ife campus",
  description: "Seeking a responsible, quiet roommate...",
  accommodation: "apartment",           // apartment, hostel, lodge, other
  roomType: "shared",                   // shared, single, ensuite
  numberOfRooms: 2,
  
  location: {
    campus: "63a1b2c3d4e5f6g7h8i9j0k1",
    address: "123 Main Street, Ife",
    coordinates: { latitude: 7.2419, longitude: 4.7594 }
  },
  
  budget: {
    minPrice: 50000,
    maxPrice: 150000,
    currency: "NGN"
  },
  
  preferences: {
    genderPreference: "any",            // any, male, female
    ageRange: { min: 18, max: 30 },
    academicLevel: "100-400L",
    discipline: ["Engineering", "Science"]
  },
  
  requiredAmenities: ["WiFi", "Generator", "Kitchen"],
  
  contact: {
    phone: "08012345678",
    whatsapp: "08012345678",
    email: "user@example.com"
  },
  
  tags: ["quiet-person", "clean", "studious"],
  
  images: [File, File, ...]            // FormData files
}
```

#### Response
```javascript
{
  "status": "success",
  "data": {
    "listing": {
      "_id": "63a1b2c3d4e5f6g7h8i9j0k1",
      "title": "Looking for roommate in Ife campus",
      "description": "Seeking a responsible, quiet roommate...",
      "accommodation": "apartment",
      "roomType": "shared",
      "numberOfRooms": 2,
      "location": {
        "campus": {...},
        "address": "123 Main Street, Ife",
        "coordinates": { "type": "Point", "coordinates": [4.7594, 7.2419] }
      },
      "budget": {
        "minPrice": 50000,
        "maxPrice": 150000,
        "currency": "NGN"
      },
      "preferences": {
        "genderPreference": "any",
        "ageRange": { "min": 18, "max": 30 },
        "academicLevel": "100-400L",
        "discipline": ["Engineering", "Science"]
      },
      "requiredAmenities": ["WiFi", "Generator", "Kitchen"],
      "contact": {
        "phone": "08012345678",
        "whatsapp": "08012345678",
        "email": "user@example.com"
      },
      "tags": ["quiet-person", "clean", "studious"],
      "images": ["https://..."],
      "images_meta": [{
        "url": "https://...",
        "public_id": "roommate-listings/...",
        "uploadedAt": "2026-01-13T10:00:00Z"
      }],
      "poster": {
        "_id": "...",
        "fullName": "John Doe",
        "email": "john@example.com"
      },
      "status": "active",
      "analytics": {
        "views": 45,
        "favorites": 8,
        "contacts": 12,
        "lastViewed": "2026-01-13T10:30:00Z"
      },
      "createdAt": "2026-01-12T10:00:00Z",
      "updatedAt": "2026-01-13T10:00:00Z"
    }
  }
}
```

#### Search Parameters
```
GET /api/v1/roommate-listings/search/advanced?
  campus=63a1b2c3d4e5f6g7h8i9j0k1&
  gender=female&
  minPrice=40000&
  maxPrice=200000&
  accommodation=apartment&
  amenities=WiFi,Generator&
  searchText=looking%20for%20quiet&
  sortBy=-createdAt&
  order=desc&
  page=1&
  limit=12
```

### Filtering Capabilities

| Filter | Type | Example |
|--------|------|---------|
| **campus** | ObjectId | `63a1b2c3d4e5f6g7h8i9j0k1` |
| **gender** | String | `male`, `female`, `any` |
| **minPrice** | Number | `40000` |
| **maxPrice** | Number | `200000` |
| **accommodation** | String | `apartment`, `hostel`, `lodge`, `other` |
| **amenities** | CSV | `WiFi,Generator,Kitchen` |
| **searchText** | String | `quiet roommate engineer` |
| **sortBy** | String | `-createdAt`, `createdAt`, `price`, `-price` |
| **page** | Number | `1` (1-indexed) |
| **limit** | Number | `12` (default, max 50) |

---

## Frontend Architecture

### Data Flow

```
User Action
    ↓
React Component
    ↓
Custom Hook (useRoommates)
    ↓
Service Layer (roommates.js)
    ↓
Axios (HTTP Request)
    ↓
Backend API
    ↓
MongoDB Database
    ↓
[Response Data Flow Reversed]
    ↓
React Query Cache
    ↓
Component Re-render
```

### State Management Pattern

- **Server State:** React Query (API responses)
- **Form State:** React Hook Form + Custom hooks
- **UI State:** React useState (filters, UI toggles)
- **Global State:** AuthContext (current user)

---

## Service Layer Implementation

### Create `src/services/roommates.js`

```javascript
import api from './api';

const ROOMMATES_ENDPOINT = '/roommate-listings';

/**
 * Fetch all roommate listings with pagination
 */
export const getAllRoommates = async (params = {}) => {
  try {
    const response = await api.get(ROOMMATES_ENDPOINT, { params });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to fetch roommate listings' };
  }
};

/**
 * Fetch current user's roommate listings
 */
export const getMyRoommates = async () => {
  try {
    const response = await api.get(`${ROOMMATES_ENDPOINT}/me`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to fetch your listings' };
  }
};

/**
 * Fetch single roommate listing by ID
 */
export const getRoommateById = async (id) => {
  try {
    const response = await api.get(`${ROOMMATES_ENDPOINT}/${id}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to fetch roommate listing' };
  }
};

/**
 * Create new roommate listing
 */
export const createRoommate = async (formData) => {
  try {
    const config = {};
    if (formData instanceof FormData) {
      config.headers = { 'Content-Type': 'multipart/form-data' };
    }
    
    const response = await api.post(ROOMMATES_ENDPOINT, formData, config);
    return response.data.data.listing;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to create roommate listing' };
  }
};

/**
 * Update roommate listing
 */
export const updateRoommate = async (id, updates) => {
  try {
    const config = {};
    if (updates instanceof FormData) {
      config.headers = { 'Content-Type': 'multipart/form-data' };
    }
    
    const response = await api.patch(`${ROOMMATES_ENDPOINT}/${id}`, updates, config);
    return response.data.data.listing;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to update roommate listing' };
  }
};

/**
 * Delete roommate listing
 */
export const deleteRoommate = async (id) => {
  try {
    const response = await api.delete(`${ROOMMATES_ENDPOINT}/${id}`);
    return response.status === 204;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to delete roommate listing' };
  }
};

/**
 * Search roommate listings with advanced filters
 */
export const searchRoommates = async (filters = {}) => {
  try {
    const queryParams = {
      ...(filters.campus && { campus: filters.campus }),
      ...(filters.gender && { gender: filters.gender }),
      ...(filters.minPrice && { minPrice: filters.minPrice }),
      ...(filters.maxPrice && { maxPrice: filters.maxPrice }),
      ...(filters.accommodation && { accommodation: filters.accommodation }),
      ...(filters.amenities && { amenities: filters.amenities }),
      ...(filters.searchText && { searchText: filters.searchText }),
      ...(filters.sortBy && { sortBy: filters.sortBy }),
      ...(filters.page && { page: filters.page }),
      ...(filters.limit && { limit: filters.limit })
    };

    const response = await api.get(`${ROOMMATES_ENDPOINT}/search/advanced`, {
      params: queryParams
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to search roommate listings' };
  }
};

/**
 * Add images to roommate listing
 */
export const addRoommateImages = async (id, formData) => {
  try {
    const response = await api.post(
      `${ROOMMATES_ENDPOINT}/${id}/images`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return response.data.data.listing;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to add images' };
  }
};

/**
 * Remove image from roommate listing
 */
export const removeRoommateImage = async (id, imageIndex) => {
  try {
    const response = await api.delete(
      `${ROOMMATES_ENDPOINT}/${id}/images/${imageIndex}`
    );
    return response.data.data.listing;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to remove image' };
  }
};

/**
 * Get roommate statistics (views, contacts, etc.)
 */
export const getRoommateStats = async (id) => {
  try {
    const response = await api.get(`${ROOMMATES_ENDPOINT}/${id}/stats`);
    return response.data.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to fetch statistics' };
  }
};

/**
 * Mark roommate as favorite
 */
export const toggleRoommateFavorite = async (id) => {
  try {
    const response = await api.post(`${ROOMMATES_ENDPOINT}/${id}/favorite`);
    return response.data.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to update favorite status' };
  }
};

export default {
  getAllRoommates,
  getMyRoommates,
  getRoommateById,
  createRoommate,
  updateRoommate,
  deleteRoommate,
  searchRoommates,
  addRoommateImages,
  removeRoommateImage,
  getRoommateStats,
  toggleRoommateFavorite
};
```

---

## Custom Hooks

### Create `src/hooks/useRoommates.js`

```javascript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as roommateService from '@/services/roommates';
import { useCallback } from 'react';

/**
 * Hook to fetch all roommate listings
 */
export const useAllRoommates = (params = {}, enabled = true) => {
  return useQuery({
    queryKey: ['roommates', params],
    queryFn: () => roommateService.getAllRoommates(params),
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

/**
 * Hook to fetch current user's roommate listings
 */
export const useMyRoommates = (enabled = true) => {
  return useQuery({
    queryKey: ['myRoommates'],
    queryFn: roommateService.getMyRoommates,
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

/**
 * Hook to fetch single roommate listing
 */
export const useRoommate = (id, enabled = true) => {
  return useQuery({
    queryKey: ['roommate', id],
    queryFn: () => roommateService.getRoommateById(id),
    enabled: !!id && enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

/**
 * Hook to create roommate listing
 */
export const useCreateRoommate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: roommateService.createRoommate,
    onSuccess: (newRoommate) => {
      queryClient.invalidateQueries({ queryKey: ['roommates'] });
      queryClient.invalidateQueries({ queryKey: ['myRoommates'] });
      queryClient.setQueryData(['roommate', newRoommate._id], newRoommate);
    },
    onError: (error) => {
      console.error('Create roommate error:', error);
    }
  });
};

/**
 * Hook to update roommate listing
 */
export const useUpdateRoommate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }) => roommateService.updateRoommate(id, updates),
    onSuccess: (updatedRoommate) => {
      queryClient.setQueryData(['roommate', updatedRoommate._id], updatedRoommate);
      queryClient.invalidateQueries({ queryKey: ['roommates'] });
      queryClient.invalidateQueries({ queryKey: ['myRoommates'] });
    },
    onError: (error) => {
      console.error('Update roommate error:', error);
    }
  });
};

/**
 * Hook to delete roommate listing
 */
export const useDeleteRoommate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: roommateService.deleteRoommate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roommates'] });
      queryClient.invalidateQueries({ queryKey: ['myRoommates'] });
    },
    onError: (error) => {
      console.error('Delete roommate error:', error);
    }
  });
};

/**
 * Hook for advanced roommate search
 */
export const useSearchRoommates = (filters = {}, enabled = true) => {
  return useQuery({
    queryKey: ['roommatesSearch', filters],
    queryFn: () => roommateService.searchRoommates(filters),
    enabled,
    staleTime: 3 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

/**
 * Hook to add images to roommate listing
 */
export const useAddRoommateImages = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, formData }) => roommateService.addRoommateImages(id, formData),
    onSuccess: (updatedRoommate) => {
      queryClient.setQueryData(['roommate', updatedRoommate._id], updatedRoommate);
      queryClient.invalidateQueries({ queryKey: ['roommates'] });
    },
  });
};

/**
 * Hook to remove image from roommate listing
 */
export const useRemoveRoommateImage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, imageIndex }) => roommateService.removeRoommateImage(id, imageIndex),
    onSuccess: (updatedRoommate) => {
      queryClient.setQueryData(['roommate', updatedRoommate._id], updatedRoommate);
      queryClient.invalidateQueries({ queryKey: ['roommates'] });
    },
  });
};

/**
 * Hook to fetch roommate statistics
 */
export const useRoommateStats = (id, enabled = !!id) => {
  return useQuery({
    queryKey: ['roommateStats', id],
    queryFn: () => roommateService.getRoommateStats(id),
    enabled,
    staleTime: 10 * 60 * 1000,
  });
};

/**
 * Hook to toggle roommate favorite
 */
export const useToggleRoommateFavorite = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: roommateService.toggleRoommateFavorite,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['roommates'] });
    },
    onError: (error) => {
      console.error('Toggle favorite error:', error);
    }
  });
};

export default {
  useAllRoommates,
  useMyRoommates,
  useRoommate,
  useCreateRoommate,
  useUpdateRoommate,
  useDeleteRoommate,
  useSearchRoommates,
  useAddRoommateImages,
  useRemoveRoommateImage,
  useRoommateStats,
  useToggleRoommateFavorite
};
```

### Create `src/hooks/useRoommateForm.js`

```javascript
import { useState, useCallback } from 'react';
import { useUpdateRoommate, useCreateRoommate } from './useRoommates';

/**
 * Hook for managing roommate form state and submission
 */
export const useRoommateForm = (initialRoommate = null) => {
  const [formData, setFormData] = useState(
    initialRoommate || {
      title: '',
      description: '',
      accommodation: 'apartment',
      roomType: 'shared',
      numberOfRooms: 1,
      location: {
        campus: '',
        address: '',
        coordinates: { latitude: 0, longitude: 0 }
      },
      budget: {
        minPrice: '',
        maxPrice: '',
        currency: 'NGN'
      },
      preferences: {
        genderPreference: 'any',
        ageRange: { min: 18, max: 30 },
        academicLevel: '',
        discipline: []
      },
      requiredAmenities: [],
      contact: {
        phone: '',
        whatsapp: '',
        email: ''
      },
      tags: [],
      images: [],
      imagePreview: []
    }
  );

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const createRoommateMutation = useCreateRoommate();
  const updateRoommateMutation = useUpdateRoommate();

  const handleInputChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  }, [errors]);

  const handleImageChange = useCallback((e) => {
    const files = Array.from(e.target.files || []);
    
    // Validate file count (max 10 images)
    if (files.length + formData.images.length > 10) {
      setErrors(prev => ({
        ...prev,
        images: 'Cannot exceed 10 images total'
      }));
      return;
    }

    // Validate each file
    const validFiles = [];
    files.forEach(file => {
      if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
        setErrors(prev => ({
          ...prev,
          images: 'Invalid image format. Use JPEG, PNG, WebP, or GIF.'
        }));
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        setErrors(prev => ({
          ...prev,
          images: 'Image must be smaller than 5MB'
        }));
        return;
      }

      validFiles.push(file);
    });

    setFormData(prev => ({
      ...prev,
      images: [...prev.images, ...validFiles]
    }));

    // Create previews
    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        setFormData(prev => ({
          ...prev,
          imagePreview: [...prev.imagePreview, event.target.result]
        }));
      };
      reader.readAsDataURL(file);
    });

    setErrors(prev => ({
      ...prev,
      images: null
    }));
  }, [formData.images.length]);

  const handleAddTag = useCallback((tag) => {
    if (tag && !formData.tags.includes(tag)) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tag]
      }));
    }
  }, [formData.tags]);

  const handleRemoveTag = useCallback((tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  }, []);

  const handleAddAmenity = useCallback((amenity) => {
    if (amenity && !formData.requiredAmenities.includes(amenity)) {
      setFormData(prev => ({
        ...prev,
        requiredAmenities: [...prev.requiredAmenities, amenity]
      }));
    }
  }, [formData.requiredAmenities]);

  const handleRemoveAmenity = useCallback((amenityToRemove) => {
    setFormData(prev => ({
      ...prev,
      requiredAmenities: prev.requiredAmenities.filter(a => a !== amenityToRemove)
    }));
  }, []);

  const validateForm = useCallback(() => {
    const newErrors = {};

    if (!formData.title?.trim()) {
      newErrors.title = 'Title is required';
    } else if (formData.title.length < 10) {
      newErrors.title = 'Title must be at least 10 characters';
    } else if (formData.title.length > 150) {
      newErrors.title = 'Title must be less than 150 characters';
    }

    if (!formData.description?.trim()) {
      newErrors.description = 'Description is required';
    } else if (formData.description.length < 30) {
      newErrors.description = 'Description must be at least 30 characters';
    } else if (formData.description.length > 2000) {
      newErrors.description = 'Description must be less than 2000 characters';
    }

    if (!formData.accommodation) {
      newErrors.accommodation = 'Accommodation type is required';
    }

    if (!formData.location?.campus) {
      newErrors.campus = 'Please select a campus';
    }

    if (!formData.budget?.minPrice) {
      newErrors.minPrice = 'Minimum price is required';
    } else if (isNaN(formData.budget.minPrice) || parseFloat(formData.budget.minPrice) <= 0) {
      newErrors.minPrice = 'Minimum price must be a positive number';
    }

    if (!formData.budget?.maxPrice) {
      newErrors.maxPrice = 'Maximum price is required';
    } else if (isNaN(formData.budget.maxPrice) || parseFloat(formData.budget.maxPrice) <= 0) {
      newErrors.maxPrice = 'Maximum price must be a positive number';
    }

    if (formData.budget?.minPrice && formData.budget?.maxPrice) {
      if (parseFloat(formData.budget.minPrice) > parseFloat(formData.budget.maxPrice)) {
        newErrors.budget = 'Minimum price cannot exceed maximum price';
      }
    }

    if (!initialRoommate && formData.images.length === 0) {
      newErrors.images = 'At least one image is required';
    }

    if (!formData.contact?.phone?.trim()) {
      newErrors.phone = 'Phone number is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, initialRoommate]);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);

    try {
      const formDataToSubmit = new FormData();
      
      // Add basic fields
      formDataToSubmit.append('title', formData.title);
      formDataToSubmit.append('description', formData.description);
      formDataToSubmit.append('accommodation', formData.accommodation);
      formDataToSubmit.append('roomType', formData.roomType);
      formDataToSubmit.append('numberOfRooms', parseInt(formData.numberOfRooms));
      
      // Add location
      formDataToSubmit.append('location[campus]', formData.location.campus);
      formDataToSubmit.append('location[address]', formData.location.address);
      
      // Add budget
      formDataToSubmit.append('budget[minPrice]', parseFloat(formData.budget.minPrice));
      formDataToSubmit.append('budget[maxPrice]', parseFloat(formData.budget.maxPrice));
      formDataToSubmit.append('budget[currency]', formData.budget.currency);
      
      // Add preferences
      formDataToSubmit.append('preferences[genderPreference]', formData.preferences.genderPreference);
      formDataToSubmit.append('preferences[ageRange][min]', formData.preferences.ageRange.min);
      formDataToSubmit.append('preferences[ageRange][max]', formData.preferences.ageRange.max);
      formDataToSubmit.append('preferences[academicLevel]', formData.preferences.academicLevel);
      formDataToSubmit.append('preferences[discipline]', JSON.stringify(formData.preferences.discipline));
      
      // Add amenities
      formDataToSubmit.append('requiredAmenities', JSON.stringify(formData.requiredAmenities));
      
      // Add contact
      formDataToSubmit.append('contact[phone]', formData.contact.phone);
      formDataToSubmit.append('contact[whatsapp]', formData.contact.whatsapp);
      formDataToSubmit.append('contact[email]', formData.contact.email);
      
      // Add tags
      formDataToSubmit.append('tags', JSON.stringify(formData.tags));
      
      // Add images
      formData.images.forEach((image) => {
        formDataToSubmit.append('images', image);
      });

      if (initialRoommate) {
        // Update existing listing
        await updateRoommateMutation.mutateAsync({
          id: initialRoommate._id,
          updates: formDataToSubmit
        });
      } else {
        // Create new listing
        await createRoommateMutation.mutateAsync(formDataToSubmit);
      }
    } catch (error) {
      setErrors({
        submit: error.message || 'Failed to save roommate listing'
      });
    } finally {
      setSubmitting(false);
    }
  }, [formData, initialRoommate, validateForm, createRoommateMutation, updateRoommateMutation]);

  const resetForm = useCallback(() => {
    setFormData(
      initialRoommate || {
        title: '',
        description: '',
        accommodation: 'apartment',
        roomType: 'shared',
        numberOfRooms: 1,
        location: { campus: '', address: '' },
        budget: { minPrice: '', maxPrice: '', currency: 'NGN' },
        preferences: {
          genderPreference: 'any',
          ageRange: { min: 18, max: 30 },
          academicLevel: '',
          discipline: []
        },
        requiredAmenities: [],
        contact: { phone: '', whatsapp: '', email: '' },
        tags: [],
        images: [],
        imagePreview: []
      }
    );
    setErrors({});
  }, [initialRoommate]);

  return {
    formData,
    errors,
    submitting,
    isCreating: createRoommateMutation.isPending,
    isUpdating: updateRoommateMutation.isPending,
    handleInputChange,
    handleImageChange,
    handleAddTag,
    handleRemoveTag,
    handleAddAmenity,
    handleRemoveAmenity,
    handleSubmit,
    resetForm,
    setFormData,
    setErrors
  };
};

export default useRoommateForm;
```

---

## React Components

### Create `src/components/roommates/RoommateCard.jsx`

```javascript
import React, { useState } from 'react';
import styled from 'styled-components';
import Link from 'next/link';
import { Heart, MapPin, Wallet, Users, Star } from 'lucide-react';

const Card = styled.div`
  background: #ffffff;
  border: 1px solid #f0f0f0;
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  height: 100%;

  &:hover {
    border-color: #e5e5e5;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
    transform: translateY(-4px);
  }

  @media (max-width: 768px) {
    border-radius: 8px;
  }
`;

const ImageContainer = styled.div`
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1;
  background: #f5f5f5;
  overflow: hidden;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.3s ease;
  }

  &:hover img {
    transform: scale(1.05);
  }
`;

const PlaceholderImage = styled.div`
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999;
  font-size: 48px;
`;

const AccommodationBadge = styled.div`
  position: absolute;
  top: 12px;
  left: 12px;
  padding: 6px 12px;
  background: #1a1a1a;
  color: #ffffff;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const FavoriteButton = styled.button`
  position: absolute;
  top: 12px;
  right: 12px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.95);
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 10;
  transition: all 0.2s ease;

  &:hover {
    background: #ffffff;
    transform: scale(1.1);
  }

  svg {
    width: 20px;
    height: 20px;
    color: ${props => props.$isFavorite ? '#ff4444' : '#999'};
    fill: ${props => props.$isFavorite ? '#ff4444' : 'none'};
  }
`;

const ContentContainer = styled.div`
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1;

  @media (max-width: 768px) {
    padding: 12px;
    gap: 10px;
  }
`;

const Title = styled.h3`
  font-size: 15px;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const Description = styled.p`
  font-size: 13px;
  color: #666;
  margin: 0;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const MetaRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 12px;
  color: #666;
  padding-top: 8px;
  border-top: 1px solid #f0f0f0;

  @media (max-width: 768px) {
    gap: 10px;
    font-size: 11px;
  }
`;

const MetaItem = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;

  svg {
    width: 14px;
    height: 14px;
    stroke-width: 2;
  }
`;

const PriceSection = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 12px;
  border-top: 1px solid #f0f0f0;
  margin-top: auto;
`;

const BudgetRange = styled.div`
  display: flex;
  align-items: baseline;
  gap: 4px;
`;

const PriceAmount = styled.span`
  font-size: 16px;
  font-weight: 700;
  color: #1a1a1a;

  @media (max-width: 768px) {
    font-size: 14px;
  }
`;

const PriceCurrency = styled.span`
  font-size: 12px;
  color: #999;
`;

const RatingBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: #fff8e1;
  border-radius: 4px;
  border: 1px solid #ffe082;
`;

const RatingStars = styled.div`
  display: flex;
  gap: 1px;

  svg {
    width: 12px;
    height: 12px;
    color: #ffc107;
    fill: #ffc107;
  }
`;

const RatingText = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: #1a1a1a;
`;

const ViewDetailsButton = styled(Link)`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px 16px;
  background: #1a1a1a;
  color: #ffffff;
  border-radius: 8px;
  text-decoration: none;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-top: 12px;

  &:hover {
    background: #333333;
    transform: translateY(-2px);
  }
`;

const ViewCountContainer = styled.div`
  font-size: 11px;
  color: #ccc;
  display: flex;
  align-items: center;
  gap: 4px;
`;

export default function RoommateCard({ roommate, onFavoriteToggle }) {
  const [isFavorite, setIsFavorite] = useState(false);

  if (!roommate || typeof roommate !== 'object') return null;

  const handleFavoriteClick = (e) => {
    e.preventDefault();
    setIsFavorite(!isFavorite);
    onFavoriteToggle?.(roommate._id, !isFavorite);
  };

  return (
    <Card>
      <ImageContainer>
        {roommate.images && Array.isArray(roommate.images) && roommate.images.length > 0 ? (
          <img src={String(roommate.images[0])} alt={String(roommate.title || 'Roommate listing')} />
        ) : (
          <PlaceholderImage>🏠</PlaceholderImage>
        )}
        {roommate.accommodation && (
          <AccommodationBadge>{String(roommate.accommodation).toUpperCase()}</AccommodationBadge>
        )}
        <FavoriteButton
          $isFavorite={isFavorite}
          onClick={handleFavoriteClick}
          title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Heart />
        </FavoriteButton>
      </ImageContainer>

      <ContentContainer>
        <div>
          <Title>{String(roommate.title || 'Untitled Listing')}</Title>
          {roommate.description && String(roommate.description).trim() && (
            <Description>{String(roommate.description)}</Description>
          )}
        </div>

        {(roommate.location?.campus || roommate.numberOfRooms) && (
          <MetaRow>
            {roommate.location?.campus && (
              <MetaItem>
                <MapPin />
                <span>{typeof roommate.location.campus === 'object' ? String(roommate.location.campus.name) : String(roommate.location.campus)}</span>
              </MetaItem>
            )}
            {roommate.numberOfRooms && (
              <MetaItem>
                <Users />
                <span>{Number(roommate.numberOfRooms)} rooms</span>
              </MetaItem>
            )}
            {roommate.analytics?.views && (
              <ViewCountContainer>
                👁 {Number(roommate.analytics.views)} views
              </ViewCountContainer>
            )}
          </MetaRow>
        )}

        <PriceSection>
          {roommate.budget && (
            <BudgetRange>
              <PriceAmount>₦{Number(roommate.budget.minPrice || 0).toLocaleString()}</PriceAmount>
              <PriceCurrency>-</PriceCurrency>
              <PriceAmount>₦{Number(roommate.budget.maxPrice || 0).toLocaleString()}</PriceAmount>
            </BudgetRange>
          )}
          {roommate.ratings?.average && (
            <RatingBadge>
              <RatingStars>
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    fill={i < Math.round(Number(roommate.ratings.average)) ? '#ffc107' : '#f0f0f0'}
                  />
                ))}
              </RatingStars>
              <RatingText>{Number(roommate.ratings.average).toFixed(1)}</RatingText>
            </RatingBadge>
          )}
        </PriceSection>

        {roommate._id && (
          <ViewDetailsButton href={`/roommates/${roommate._id}`}>
            View Details
          </ViewDetailsButton>
        )}
      </ContentContainer>
    </Card>
  );
}
```

### Create `src/components/roommates/RoommateGrid.jsx`

```javascript
import React from 'react';
import styled from 'styled-components';
import RoommateCard from './RoommateCard';
import { AlertCircle, Home } from 'lucide-react';

const GridWrapper = styled.div`
  width: 100%;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
  width: 100%;

  @media (min-width: 768px) {
    gap: 20px;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  }

  @media (min-width: 1024px) {
    gap: 24px;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  }

  @media (min-width: 1440px) {
    grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  }
`;

const LoadingContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
  width: 100%;

  @media (min-width: 768px) {
    gap: 20px;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  }

  @media (min-width: 1024px) {
    gap: 24px;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  }
`;

const SkeletonCard = styled.div`
  background: #ffffff;
  border: 1px solid #f0f0f0;
  border-radius: 12px;
  overflow: hidden;
  height: 100%;
  display: flex;
  flex-direction: column;

  &::before {
    content: '';
    display: block;
    aspect-ratio: 1 / 1;
    background: linear-gradient(90deg, #f0f0f0 25%, #e5e5e5 50%, #f0f0f0 75%);
    background-size: 200% 100%;
    animation: shimmer 2s infinite;
  }

  &::after {
    content: '';
    flex: 1;
    background: #f9f9f9;
    animation: shimmerContent 2s infinite;
  }

  @keyframes shimmer {
    0% {
      background-position: 200% 0;
    }
    100% {
      background-position: -200% 0;
    }
  }

  @keyframes shimmerContent {
    0%, 100% {
      opacity: 0.7;
    }
    50% {
      opacity: 0.9;
    }
  }
`;

const EmptyState = styled.div`
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
  background: #f9f9f9;
  border-radius: 12px;
  border: 1px dashed #e5e5e5;

  @media (min-width: 768px) {
    padding: 80px 40px;
  }
`;

const EmptyIcon = styled.div`
  width: 80px;
  height: 80px;
  background: #f5f5f5;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;

  svg {
    width: 48px;
    height: 48px;
    color: #ccc;
  }
`;

const EmptyTitle = styled.h3`
  font-size: 18px;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0 0 8px 0;

  @media (min-width: 768px) {
    font-size: 20px;
  }
`;

const EmptyText = styled.p`
  font-size: 14px;
  color: #999;
  margin: 0;
  max-width: 400px;

  @media (min-width: 768px) {
    font-size: 15px;
  }
`;

const ErrorContainer = styled.div`
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #fff5f5;
  border: 1px solid #fde2e2;
  border-radius: 8px;
  color: #c92a2a;

  svg {
    width: 20px;
    height: 20px;
    flex-shrink: 0;
  }

  @media (min-width: 768px) {
    padding: 20px;
    font-size: 15px;
  }
`;

const ErrorText = styled.span`
  font-size: 14px;
  font-weight: 500;

  @media (min-width: 768px) {
    font-size: 15px;
  }
`;

const PaginationContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  margin-top: 32px;
  padding: 0 16px;

  @media (min-width: 768px) {
    gap: 12px;
    margin-top: 40px;
    padding: 0;
  }
`;

const PaginationButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 36px;
  height: 36px;
  padding: 0 8px;
  background: ${props => props.$active ? '#1a1a1a' : '#ffffff'};
  color: ${props => props.$active ? '#ffffff' : '#1a1a1a'};
  border: 1px solid ${props => props.$active ? '#1a1a1a' : '#e5e5e5'};
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  opacity: ${props => props.disabled ? 0.5 : 1};
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    border-color: #1a1a1a;
    background: ${props => props.$active ? '#1a1a1a' : '#f9f9f9'};
    transform: translateY(-1px);
  }

  @media (min-width: 768px) {
    min-width: 40px;
    height: 40px;
    font-size: 15px;
  }
`;

export default function RoommateGrid({
  roommates = [],
  loading = false,
  error = null,
  pagination = null,
  onPageChange,
  onFavoriteToggle
}) {
  if (loading && !roommates.length) {
    return (
      <GridWrapper>
        <LoadingContainer>
          {[...Array(6)].map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </LoadingContainer>
      </GridWrapper>
    );
  }

  return (
    <GridWrapper>
      <Grid>
        {error && (
          <ErrorContainer>
            <AlertCircle />
            <ErrorText>{error.message || 'Failed to load roommate listings'}</ErrorText>
          </ErrorContainer>
        )}

        {roommates.length > 0 ? (
          roommates.map(roommate => (
            <RoommateCard
              key={roommate._id}
              roommate={roommate}
              onFavoriteToggle={onFavoriteToggle}
            />
          ))
        ) : (
          <EmptyState>
            <EmptyIcon>
              <Home />
            </EmptyIcon>
            <EmptyTitle>No Roommate Listings Found</EmptyTitle>
            <EmptyText>
              {error
                ? 'Unable to load listings. Please try again later.'
                : 'No roommate opportunities available yet. Check back soon!'}
            </EmptyText>
          </EmptyState>
        )}
      </Grid>

      {pagination && pagination.pages > 1 && (
        <PaginationContainer>
          <PaginationButton
            disabled={pagination.page === 1}
            onClick={() => onPageChange?.(1)}
            title="First page"
          >
            ⟨⟨
          </PaginationButton>

          <PaginationButton
            disabled={pagination.page === 1}
            onClick={() => onPageChange?.(pagination.page - 1)}
            title="Previous page"
          >
            ⟨
          </PaginationButton>

          <span style={{ color: '#999', fontSize: '14px', margin: '0 8px' }}>
            Page {pagination.page} of {pagination.pages}
          </span>

          <PaginationButton
            disabled={pagination.page === pagination.pages}
            onClick={() => onPageChange?.(pagination.page + 1)}
            title="Next page"
          >
            ⟩
          </PaginationButton>

          <PaginationButton
            disabled={pagination.page === pagination.pages}
            onClick={() => onPageChange?.(pagination.pages)}
            title="Last page"
          >
            ⟩⟩
          </PaginationButton>
        </PaginationContainer>
      )}
    </GridWrapper>
  );
}
```

This documentation is comprehensive. Due to length limitations, I'll continue in the next message with:
- RoommateForm.jsx (create/edit component)
- RoommateFilters.jsx (advanced filtering)
- All page implementations
- Complete lifecycle walkthrough

Would you like me to continue with the remaining components and pages?