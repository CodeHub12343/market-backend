# Hostel & Roommate Listing API Documentation

## Overview

The platform provides a comprehensive accommodation solution for students including:
- **Hostel Listings**: Hostel owners/agents can list their accommodations with images, amenities, room types, and pricing
- **Roommate Needed**: Students can post roommate requirements and find compatible housing partners
- **Search & Filtering**: Advanced search capabilities for finding hostels and roommate matches
- **Reviews & Ratings**: Quality ratings for verified hostels

---

## Hostel Management

### 1. Create Hostel Listing

**Endpoint:** `POST /api/v1/hostels`  
**Authentication:** Required (seller/service_provider/admin)  
**Content-Type:** `multipart/form-data`

**Request Headers:**
```javascript
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Request Body:**
```javascript
{
  "name": "Elite Hostel Campus",
  "description": "Modern hostel with excellent facilities near campus",
  "type": "mixed", // boys, girls, mixed, family
  "hostelClass": "standard", // budget, standard, premium, luxury
  "ownerType": "agency", // individual, agent, agency
  
  "contact": {
    "phoneNumber": "08012345678",
    "alternatePhoneNumber": "08087654321",
    "email": "info@elitehostel.com",
    "whatsapp": "08012345678"
  },
  
  "location": {
    "address": "123 Campus Street, Off Main Road",
    "city": "Lagos",
    "state": "Lagos",
    "campus": "507f1f77bcf86cd799439011", // Campus ID
    "coordinates": {
      "type": "Point",
      "coordinates": [3.3869, 6.5244] // [longitude, latitude]
    },
    "distanceFromCampusKm": 0.5
  },
  
  "amenities": [
    "WiFi",
    "Power Supply",
    "Laundry Service",
    "Kitchen",
    "AC",
    "CCTV",
    "Security Gate",
    "Study Room"
  ],
  
  "roomTypes": [
    {
      "type": "single",
      "price": 50000,
      "currency": "NGN",
      "pricingPeriod": "per-month",
      "availableRooms": 5,
      "occupancy": 1,
      "description": "Spacious single room with private bathroom",
      "amenitiesIncluded": ["WiFi", "AC", "Study Desk"],
      "deposit": 100000,
      "serviceCharge": 5000
    },
    {
      "type": "double",
      "price": 75000,
      "currency": "NGN",
      "pricingPeriod": "per-month",
      "availableRooms": 10,
      "occupancy": 2,
      "description": "Shared room with 2 occupants",
      "amenitiesIncluded": ["WiFi", "AC", "Study Desk", "Balcony"],
      "deposit": 150000,
      "serviceCharge": 7500
    }
  ],
  
  "policies": {
    "visitorPolicy": "limited", // restricted, limited, allowed
    "visitorHours": "9AM-6PM",
    "guestAllowed": false,
    "petPolicy": "not-allowed",
    "cookingPolicy": "Kitchen available on weekends",
    "alcoholPolicy": false,
    "smokingPolicy": false,
    "curfewTime": "10PM",
    "lockoutTime": "Midnight"
  },
  
  "minimumStayDays": 30,
  "bookingAdvanceDays": 0,
  "tags": ["near-campus", "affordable", "secure"]
}
```

**Image Upload:**
```javascript
// Upload via multipart/form-data
// Field name: "images"
// Max 20 images, 10MB each
const formData = new FormData();
formData.append('images', file1);
formData.append('images', file2);
formData.append('name', 'Elite Hostel Campus');
// ... other fields
```

**Response (201 Created):**
```javascript
{
  "status": "success",
  "data": {
    "hostel": {
      "_id": "507f1f77bcf86cd799439011",
      "name": "Elite Hostel Campus",
      "owner": {
        "_id": "507f1f77bcf86cd799439012",
        "fullName": "John Agent",
        "email": "agent@email.com",
        "avatar": "https://..."
      },
      "status": "pending-verification",
      "isVerified": false,
      "images": ["https://...", "https://..."],
      "thumbnail": "https://...",
      "roomTypes": [...],
      "minPrice": 50000,
      "maxPrice": 75000,
      "analytics": {
        "views": 0,
        "favorites": 0,
        "inquiries": 0,
        "bookings": 0
      },
      "createdAt": "2025-11-16T10:00:00.000Z"
    }
  }
}
```

---

### 2. Get All Hostels with Pagination

**Endpoint:** `GET /api/v1/hostels`  
**Authentication:** Optional  

**Query Parameters:**
```javascript
?page=1&limit=10&sort=-createdAt
```

**Response (200 OK):**
```javascript
{
  "status": "success",
  "results": 15,
  "data": {
    "hostels": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "name": "Elite Hostel Campus",
        "type": "mixed",
        "hostelClass": "standard",
        "location": {
          "address": "123 Campus Street",
          "city": "Lagos",
          "distanceFromCampusKm": 0.5
        },
        "minPrice": 50000,
        "maxPrice": 75000,
        "owner": {...},
        "thumbnail": "https://...",
        "ratingsAverage": 4.5,
        "ratingsQuantity": 12,
        "analytics": {...},
        "createdAt": "2025-11-16T10:00:00.000Z"
      }
    ]
  }
}
```

---

### 3. Search Hostels with Filters

**Endpoint:** `GET /api/v1/hostels/search`  
**Authentication:** Optional

**Query Parameters:**
```javascript
?campus=507f1f77bcf86cd799439011
&type=mixed
&minPrice=40000
&maxPrice=100000
&amenities=WiFi,AC,CCTV
&searchText=near+campus
&sortBy=-createdAt
&page=1
&limit=10
```

**Response (200 OK):**
```javascript
{
  "status": "success",
  "results": 8,
  "total": 8,
  "page": 1,
  "pages": 1,
  "data": {
    "hostels": [...]
  }
}
```

---

### 4. Get Single Hostel Details

**Endpoint:** `GET /api/v1/hostels/:id`  
**Authentication:** Optional

**Response (200 OK):**
```javascript
{
  "status": "success",
  "data": {
    "hostel": {
      "_id": "507f1f77bcf86cd799439011",
      "name": "Elite Hostel Campus",
      "description": "Modern hostel with excellent facilities",
      "type": "mixed",
      "owner": {
        "_id": "507f1f77bcf86cd799439012",
        "fullName": "John Agent",
        "email": "agent@email.com",
        "avatar": "https://...",
        "phoneNumber": "08012345678"
      },
      "location": {
        "address": "123 Campus Street",
        "city": "Lagos",
        "campus": "507f1f77bcf86cd799439011",
        "coordinates": {
          "type": "Point",
          "coordinates": [3.3869, 6.5244]
        },
        "distanceFromCampusKm": 0.5
      },
      "amenities": ["WiFi", "AC", "CCTV", "Security Gate"],
      "roomTypes": [
        {
          "type": "single",
          "price": 50000,
          "currency": "NGN",
          "pricingPeriod": "per-month",
          "availableRooms": 5,
          "occupancy": 1
        }
      ],
      "contact": {
        "phoneNumber": "08012345678",
        "whatsapp": "08012345678",
        "email": "info@elitehostel.com"
      },
      "policies": {...},
      "images": ["https://...", "https://..."],
      "ratingsAverage": 4.5,
      "ratingsQuantity": 12,
      "analytics": {
        "views": 245,
        "favorites": 18,
        "inquiries": 32,
        "bookings": 5
      },
      "isVerified": true,
      "status": "active",
      "createdAt": "2025-11-16T10:00:00.000Z"
    }
  }
}
```

---

### 5. Update Hostel

**Endpoint:** `PATCH /api/v1/hostels/:id`  
**Authentication:** Required (owner or admin)  

**Request Body:**
```javascript
{
  "name": "Elite Hostel Campus - Updated",
  "description": "New description",
  "amenities": ["WiFi", "AC", "CCTV"],
  "roomTypes": [...]
  // Only specified fields are updated
}
```

**Response (200 OK):**
```javascript
{
  "status": "success",
  "message": "Hostel updated successfully",
  "data": {
    "hostel": {...}
  }
}
```

---

### 6. Add Images to Hostel

**Endpoint:** `POST /api/v1/hostels/:id/images`  
**Authentication:** Required (owner or admin)  
**Content-Type:** `multipart/form-data`

**Request Body:**
```javascript
// Upload via multipart/form-data
// Field name: "images"
// Max 20 images total per hostel
```

**Response (200 OK):**
```javascript
{
  "status": "success",
  "message": "Images added successfully",
  "data": {
    "hostel": {...}
  }
}
```

---

### 7. Delete Hostel

**Endpoint:** `DELETE /api/v1/hostels/:id`  
**Authentication:** Required (owner or admin)

**Response (204 No Content)**

---

### 8. Get Nearby Hostels (Geolocation)

**Endpoint:** `GET /api/v1/hostels/nearby`  
**Authentication:** Optional

**Query Parameters:**
```javascript
?lng=3.3869
&lat=6.5244
&maxDistance=5000 // meters
```

**Response (200 OK):**
```javascript
{
  "status": "success",
  "results": 5,
  "data": {
    "hostels": [...]
  }
}
```

---

### 9. Get Hostel Ratings/Reviews

**Endpoint:** `GET /api/v1/hostels/:id/ratings`  
**Authentication:** Optional

**Query Parameters:**
```javascript
?page=1&limit=10
```

**Response (200 OK):**
```javascript
{
  "status": "success",
  "results": 8,
  "total": 12,
  "data": {
    "averageRating": 4.5,
    "totalRatings": 12,
    "ratings": [
      {
        "rating": 5,
        "review": "Excellent hostel with great facilities",
        "reviewer": {
          "_id": "507f1f77bcf86cd799439013",
          "fullName": "Jane Student"
        },
        "createdAt": "2025-11-15T10:00:00.000Z"
      }
    ]
  }
}
```

---

### 10. Add Rating to Hostel

**Endpoint:** `POST /api/v1/hostels/:id/ratings`  
**Authentication:** Required

**Request Body:**
```javascript
{
  "rating": 5,
  "review": "Excellent facilities and friendly staff"
}
```

**Response (201 Created):**
```javascript
{
  "status": "success",
  "data": {
    "hostel": {...}
  }
}
```

---

### 11. Verify Hostel (Admin Only)

**Endpoint:** `POST /api/v1/hostels/:id/verify`  
**Authentication:** Required (admin)

**Response (200 OK):**
```javascript
{
  "status": "success",
  "message": "Hostel verified successfully",
  "data": {
    "hostel": {
      "_id": "507f1f77bcf86cd799439011",
      "isVerified": true,
      "status": "active",
      "verifiedAt": "2025-11-16T10:00:00.000Z",
      "verifiedBy": "507f1f77bcf86cd799439012"
    }
  }
}
```

---

## Roommate Listing Management

### 1. Create Roommate Listing

**Endpoint:** `POST /api/v1/roommate-listings`  
**Authentication:** Required  
**Content-Type:** `multipart/form-data`

**Request Body:**
```javascript
{
  "title": "Looking for roommate - Near Campus",
  "description": "I have a spacious double room in a secure apartment near campus",
  "accommodation": "apartment", // hostel, apartment, house, lodge, other
  "roomType": "double", // single, double, triple, shared, other
  "numberOfRooms": 2,
  
  "location": {
    "address": "456 Student Avenue",
    "city": "Lagos",
    "campus": "507f1f77bcf86cd799439011",
    "coordinates": {
      "type": "Point",
      "coordinates": [3.3869, 6.5244]
    },
    "distanceFromCampusKm": 1.2
  },
  
  "budget": {
    "minPrice": 40000,
    "maxPrice": 60000,
    "currency": "NGN",
    "pricingPeriod": "per-month" // per-month, per-semester, per-year
  },
  
  "preferences": {
    "genderPreference": "female", // male, female, any
    "ageRange": {
      "min": 18,
      "max": 25
    },
    "departments": ["Computer Science", "Engineering"],
    "graduationYears": [2025, 2026],
    "studyHabits": "quiet-study", // quiet-study, flexible, casual
    "lifestyleCompatibility": [
      "clean",
      "organized",
      "quiet",
      "non-smoker"
    ],
    "moveInDate": "2025-12-01T00:00:00.000Z",
    "leaseLength": "flexible" // flexible, per-semester, one-year, two-year
  },
  
  "requiredAmenities": [
    "WiFi",
    "AC",
    "Bathroom",
    "Kitchen",
    "Study Desk"
  ],
  
  "contact": {
    "phoneNumber": "08087654321",
    "alternatePhoneNumber": "08012345678",
    "email": "student@email.com",
    "whatsapp": "08087654321",
    "preferredContactMethod": "whatsapp" // call, whatsapp, sms, email
  },
  
  "tags": ["near-campus", "comfortable", "affordable"]
}
```

**Image Upload:**
```javascript
// Max 10 images, 10MB each
const formData = new FormData();
formData.append('images', file1);
formData.append('title', 'Looking for roommate...');
// ... other fields
```

**Response (201 Created):**
```javascript
{
  "status": "success",
  "data": {
    "listing": {
      "_id": "507f1f77bcf86cd799439020",
      "title": "Looking for roommate - Near Campus",
      "poster": {
        "_id": "507f1f77bcf86cd799439013",
        "fullName": "Jane Student",
        "email": "student@email.com",
        "department": "Computer Science",
        "graduationYear": 2025
      },
      "accommodation": "apartment",
      "budget": {
        "minPrice": 40000,
        "maxPrice": 60000,
        "budgetRange": "40000 - 60000 NGN/per-month"
      },
      "preferences": {...},
      "analytics": {
        "views": 0,
        "inquiries": 0,
        "favorites": 0
      },
      "status": "active",
      "expiresAt": "2026-02-14T10:00:00.000Z", // 90 days
      "daysUntilExpiry": 90,
      "createdAt": "2025-11-16T10:00:00.000Z"
    }
  }
}
```

---

### 2. Get All Roommate Listings

**Endpoint:** `GET /api/v1/roommate-listings`  
**Authentication:** Optional

**Query Parameters:**
```javascript
?page=1&limit=10&sort=-createdAt
```

**Response (200 OK):**
```javascript
{
  "status": "success",
  "results": 25,
  "data": {
    "listings": [...]
  }
}
```

---

### 3. Search Roommate Listings

**Endpoint:** `GET /api/v1/roommate-listings/search`  
**Authentication:** Optional

**Query Parameters:**
```javascript
?campus=507f1f77bcf86cd799439011
&gender=female
&minPrice=30000
&maxPrice=70000
&accommodation=apartment
&amenities=WiFi,AC
&searchText=near+campus
&sortBy=-createdAt
&page=1
&limit=10
```

**Response (200 OK):**
```javascript
{
  "status": "success",
  "results": 12,
  "total": 12,
  "page": 1,
  "pages": 1,
  "data": {
    "listings": [...]
  }
}
```

---

### 4. Get Single Roommate Listing

**Endpoint:** `GET /api/v1/roommate-listings/:id`  
**Authentication:** Optional

**Response (200 OK):**
```javascript
{
  "status": "success",
  "data": {
    "listing": {
      "_id": "507f1f77bcf86cd799439020",
      "title": "Looking for roommate - Near Campus",
      "description": "I have a spacious double room...",
      "poster": {
        "_id": "507f1f77bcf86cd799439013",
        "fullName": "Jane Student",
        "email": "student@email.com",
        "avatar": "https://...",
        "phoneNumber": "08087654321",
        "department": "Computer Science"
      },
      "accommodation": "apartment",
      "roomType": "double",
      "location": {
        "address": "456 Student Avenue",
        "city": "Lagos",
        "distanceFromCampusKm": 1.2,
        "coordinates": {...}
      },
      "budget": {
        "minPrice": 40000,
        "maxPrice": 60000,
        "budgetRange": "40000 - 60000 NGN/per-month"
      },
      "preferences": {...},
      "requiredAmenities": ["WiFi", "AC", "Kitchen"],
      "contact": {
        "phoneNumber": "08087654321",
        "whatsapp": "08087654321",
        "preferredContactMethod": "whatsapp"
      },
      "images": ["https://...", "https://..."],
      "analytics": {
        "views": 45,
        "inquiries": 8,
        "favorites": 3
      },
      "status": "active",
      "isActive": true,
      "daysUntilExpiry": 85,
      "createdAt": "2025-11-16T10:00:00.000Z"
    }
  }
}
```

---

### 5. Get My Roommate Listings

**Endpoint:** `GET /api/v1/roommate-listings/my-listings/list`  
**Authentication:** Required

**Response (200 OK):**
```javascript
{
  "status": "success",
  "results": 3,
  "data": {
    "listings": [...]
  }
}
```

---

### 6. Get Matching Listings (Smart Suggestions)

**Endpoint:** `GET /api/v1/roommate-listings/matching/suggestions`  
**Authentication:** Required

**Query Parameters:**
```javascript
?page=1&limit=10
```

**Description:**
Returns roommate listings that match the logged-in user's profile including:
- Same campus
- Compatible gender preference
- Same department (if available)
- Active listings only

**Response (200 OK):**
```javascript
{
  "status": "success",
  "results": 8,
  "total": 8,
  "page": 1,
  "pages": 1,
  "data": {
    "listings": [...]
  }
}
```

---

### 7. Update Roommate Listing

**Endpoint:** `PATCH /api/v1/roommate-listings/:id`  
**Authentication:** Required (poster or admin)

**Request Body:**
```javascript
{
  "title": "Updated title",
  "budget": {...},
  "preferences": {...}
  // Only specified fields are updated
}
```

**Response (200 OK):**
```javascript
{
  "status": "success",
  "message": "Listing updated successfully",
  "data": {
    "listing": {...}
  }
}
```

---

### 8. Add Images to Listing

**Endpoint:** `POST /api/v1/roommate-listings/:id/images`  
**Authentication:** Required (poster or admin)  
**Content-Type:** `multipart/form-data`

**Response (200 OK):**
```javascript
{
  "status": "success",
  "message": "Images added successfully",
  "data": {
    "listing": {...}
  }
}
```

---

### 9. Close Roommate Listing

**Endpoint:** `POST /api/v1/roommate-listings/:id/close`  
**Authentication:** Required (poster or admin)

**Request Body:**
```javascript
{
  "reason": "found-roommate" // found-roommate, expired, no-longer-needed, manual-close
}
```

**Response (200 OK):**
```javascript
{
  "status": "success",
  "message": "Listing closed successfully",
  "data": {
    "listing": {
      "_id": "507f1f77bcf86cd799439020",
      "status": "closed",
      "closedAt": "2025-11-16T10:00:00.000Z",
      "closedReason": "found-roommate"
    }
  }
}
```

---

### 10. Delete Roommate Listing

**Endpoint:** `DELETE /api/v1/roommate-listings/:id`  
**Authentication:** Required (poster or admin)

**Response (204 No Content)**

---

### 11. Register Inquiry (Track Interest)

**Endpoint:** `POST /api/v1/roommate-listings/:id/inquiry`  
**Authentication:** Required

**Description:** Increments the inquiry counter when someone shows interest

**Response (200 OK):**
```javascript
{
  "status": "success",
  "message": "Inquiry registered",
  "data": {
    "inquiryCount": 9
  }
}
```

---

### 12. Get Nearby Roommate Listings (Geolocation)

**Endpoint:** `GET /api/v1/roommate-listings/nearby`  
**Authentication:** Optional

**Query Parameters:**
```javascript
?lng=3.3869
&lat=6.5244
&maxDistance=5000 // meters
```

**Response (200 OK):**
```javascript
{
  "status": "success",
  "results": 8,
  "data": {
    "listings": [...]
  }
}
```

---

## Error Responses

All endpoints follow consistent error handling:

### 400 Bad Request
```javascript
{
  "status": "fail",
  "message": "Missing required fields: name, type, contact, location, roomTypes"
}
```

### 403 Forbidden
```javascript
{
  "status": "fail",
  "message": "You can only update your own listings"
}
```

### 404 Not Found
```javascript
{
  "status": "fail",
  "message": "Hostel not found"
}
```

### 500 Server Error
```javascript
{
  "status": "error",
  "message": "Image upload failed: Connection timeout"
}
```

---

## Best Practices

### For Hostel Owners/Agents:

1. **Complete Setup**: Fill in all required fields including policies and amenities
2. **High-Quality Images**: Use clear, well-lit photos (20 image max)
3. **Accurate Pricing**: Update room prices and availability regularly
4. **Respond to Inquiries**: Active response improves visibility
5. **Get Verified**: Submit hostel for verification to boost credibility
6. **Maintain Ratings**: Encourage students to rate and review

### For Students (Roommate Listings):

1. **Clear Description**: Include room details, location, and lifestyle preferences
2. **Realistic Budget**: Set prices matching market rates
3. **Contact Details**: Provide multiple contact methods
4. **Professional Images**: Show room conditions and amenities
5. **Respond Quickly**: Reply to inquiries promptly
6. **Update Status**: Close listing once roommate is found

### Data Validation:

- **Email:** Valid format required
- **Phone:** Valid phone number format
- **Price:** Must be positive number
- **Coordinates:** Valid longitude/latitude pairs
- **Date:** ISO 8601 format
- **Images:** JPG, PNG only (10MB max each)

---

## Rate Limiting

- Public endpoints: 100 requests/hour
- Authenticated endpoints: 1000 requests/hour
- Image uploads: 50 uploads/hour per user

---

## Frontend Implementation Example (React)

### Create Hostel Listing:
```javascript
import axios from 'axios';

const createHostel = async (hostelData, images) => {
  const formData = new FormData();
  
  // Add images
  images.forEach(img => formData.append('images', img));
  
  // Add other fields
  Object.keys(hostelData).forEach(key => {
    if (key !== 'images') {
      formData.append(key, JSON.stringify(hostelData[key]));
    }
  });
  
  try {
    const response = await axios.post('/api/v1/hostels', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'Authorization': `Bearer ${token}`
      },
      onUploadProgress: (progressEvent) => {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        setUploadProgress(percentCompleted);
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('Hostel creation failed:', error.response.data);
    throw error;
  }
};
```

### Search Hostels:
```javascript
const searchHostels = async (filters) => {
  const params = new URLSearchParams();
  
  if (filters.campus) params.append('campus', filters.campus);
  if (filters.type) params.append('type', filters.type);
  if (filters.minPrice) params.append('minPrice', filters.minPrice);
  if (filters.maxPrice) params.append('maxPrice', filters.maxPrice);
  if (filters.amenities?.length) {
    params.append('amenities', filters.amenities.join(','));
  }
  
  const response = await axios.get(
    `/api/v1/hostels/search?${params.toString()}`
  );
  
  return response.data.data.hostels;
};
```

### Create Roommate Listing:
```javascript
const createRoomateListing = async (listingData, images) => {
  const formData = new FormData();
  
  images.forEach(img => formData.append('images', img));
  
  Object.keys(listingData).forEach(key => {
    if (key !== 'images') {
      formData.append(key, JSON.stringify(listingData[key]));
    }
  });
  
  const response = await axios.post('/api/v1/roommate-listings', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
      'Authorization': `Bearer ${token}`
    }
  });
  
  return response.data;
};
```

---

## Summary

The Hostel & Roommate Listing API provides a complete accommodation solution with:

✅ **Hostel Listings**: Full CRUD, image uploads, ratings, verification  
✅ **Roommate Postings**: Student-friendly interface for finding roommates  
✅ **Advanced Search**: Filter by location, price, amenities, preferences  
✅ **Geolocation**: Find nearby options based on coordinates  
✅ **Analytics**: Track views, inquiries, favorites  
✅ **Smart Matching**: Suggest compatible roommate listings  
✅ **Real-time Updates**: Inquiry tracking and availability updates

