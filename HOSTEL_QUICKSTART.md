# Hostel & Roommate Listings - Quick Start Guide

## 🚀 Getting Started

The Hostel & Roommate Listing feature is now fully implemented and ready to use. This guide walks you through testing and deploying.

---

## ✅ What's Implemented

### 1. **Hostel Management System**
Hostel owners/agents can:
- ✅ List hostels with complete details
- ✅ Upload up to 20 high-quality images
- ✅ Specify room types with pricing and availability
- ✅ Define amenities (WiFi, AC, CCTV, etc.)
- ✅ Set hostel policies (visitors, pets, curfew, etc.)
- ✅ Receive admin verification badges
- ✅ Get ratings and reviews from residents

### 2. **Roommate Listing System**
Students can:
- ✅ Post "Roommate Needed" listings
- ✅ Specify budget range and location
- ✅ Define preferences (gender, department, lifestyle)
- ✅ Upload room images (up to 10)
- ✅ Track inquiries from interested students
- ✅ Auto-expire listings after 90 days or manual close

### 3. **Search & Discovery**
All users can:
- ✅ Search hostels by location, price, type, amenities
- ✅ Search roommate listings by budget, gender, accommodation
- ✅ Find nearby options via geolocation
- ✅ Get smart suggestions (for students logged in)
- ✅ View detailed information and images
- ✅ See ratings and reviews

---

## 📁 Files Created (9 total)

```
models/
├── hostelModel.js                    # Hostel data schema
└── roommateListingModel.js           # Roommate listing schema

middlewares/
└── hostelMiddleware.js               # Image upload & validation

controllers/
├── hostelController.js               # Hostel CRUD operations
└── roommateListingController.js      # Roommate listing operations

routes/
├── hostelRoutes.js                   # Hostel API endpoints
└── roommateListingRoutes.js          # Roommate listing endpoints

docs/
├── HOSTELS_ROOMMATES_API.md          # Complete API documentation
└── HOSTELS_IMPLEMENTATION.md         # Technical implementation details

tests/
├── hostels.test.js                   # Hostel tests (~450 lines)
└── roommateListings.test.js          # Roommate tests (~400 lines)

app.js (UPDATED)                      # Routes registered
```

---

## 🧪 Running Tests

### Prerequisites
```bash
# Install dependencies if not already done
npm install
```

### Run All Tests
```bash
npm test
```

### Run Specific Test Suite
```bash
# Test hostels feature
npm test -- tests/hostels.test.js

# Test roommate listings feature
npm test -- tests/roommateListings.test.js
```

### Test Coverage
```bash
npm test -- --coverage
```

---

## 🔧 Environment Variables

Add to your `.env` file:

```bash
# Cloudinary folder names for organization
CLOUDINARY_HOSTEL_FOLDER=hostels
CLOUDINARY_ROOMMATE_FOLDER=roommate-listings
```

The defaults will use `hostels` and `roommate-listings` if not specified.

---

## 🌐 API Endpoints

### Hostel Endpoints (Public - No Auth)
```
GET  /api/v1/hostels                # Get all hostels
GET  /api/v1/hostels/search         # Advanced search
GET  /api/v1/hostels/nearby         # Find nearby hostels
GET  /api/v1/hostels/:id            # Get single hostel
GET  /api/v1/hostels/:id/ratings    # Get ratings
```

### Hostel Endpoints (Authenticated)
```
POST /api/v1/hostels                # Create hostel (seller only)
GET  /api/v1/hostels/my-hostels/list# My hostels
PATCH /api/v1/hostels/:id           # Update hostel
POST /api/v1/hostels/:id/images     # Add images
DELETE /api/v1/hostels/:id          # Delete hostel
POST /api/v1/hostels/:id/ratings    # Rate hostel
```

### Roommate Endpoints (Public - No Auth)
```
GET  /api/v1/roommate-listings           # Get all listings
GET  /api/v1/roommate-listings/search    # Advanced search
GET  /api/v1/roommate-listings/nearby    # Find nearby
GET  /api/v1/roommate-listings/:id       # Get single listing
```

### Roommate Endpoints (Authenticated)
```
POST /api/v1/roommate-listings                    # Create listing
GET  /api/v1/roommate-listings/my-listings/list  # My listings
GET  /api/v1/roommate-listings/matching/suggestions # Smart matches
PATCH /api/v1/roommate-listings/:id              # Update listing
POST /api/v1/roommate-listings/:id/images        # Add images
POST /api/v1/roommate-listings/:id/close         # Close listing
POST /api/v1/roommate-listings/:id/inquiry       # Register inquiry
DELETE /api/v1/roommate-listings/:id             # Delete listing
```

---

## 📝 Example API Calls (cURL)

### Create a Hostel

```bash
curl -X POST http://localhost:3000/api/v1/hostels \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "name=Elite Hostel Campus" \
  -F "type=mixed" \
  -F "hostelClass=standard" \
  -F "contact[phoneNumber]=08012345678" \
  -F "contact[email]=info@hostel.com" \
  -F "location[address]=123 Campus Street, Lagos" \
  -F "location[city]=Lagos" \
  -F "location[campus]=CAMPUS_ID" \
  -F "location[coordinates][type]=Point" \
  -F "location[coordinates][coordinates][0]=3.3869" \
  -F "location[coordinates][coordinates][1]=6.5244" \
  -F "amenities[]=WiFi" \
  -F "amenities[]=AC" \
  -F "amenities[]=CCTV" \
  -F "roomTypes[0][type]=single" \
  -F "roomTypes[0][price]=50000" \
  -F "roomTypes[0][currency]=NGN" \
  -F "roomTypes[0][pricingPeriod]=per-month" \
  -F "roomTypes[0][availableRooms]=5" \
  -F "roomTypes[0][occupancy]=1" \
  -F "roomTypes[0][deposit]=100000" \
  -F "images=@/path/to/image1.jpg" \
  -F "images=@/path/to/image2.jpg"
```

### Search Hostels

```bash
# Search by type and price
curl "http://localhost:3000/api/v1/hostels/search?type=mixed&minPrice=40000&maxPrice=100000"

# Search with amenities filter
curl "http://localhost:3000/api/v1/hostels/search?amenities=WiFi,AC,CCTV"

# Search by campus and text
curl "http://localhost:3000/api/v1/hostels/search?campus=CAMPUS_ID&searchText=near%20campus"
```

### Create Roommate Listing

```bash
curl -X POST http://localhost:3000/api/v1/roommate-listings \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "title=Looking for roommate - Near Campus" \
  -F "description=Spacious double room in secure apartment" \
  -F "accommodation=apartment" \
  -F "roomType=double" \
  -F "numberOfRooms=2" \
  -F "location[address]=456 Student Avenue, Lagos" \
  -F "location[city]=Lagos" \
  -F "location[campus]=CAMPUS_ID" \
  -F "location[coordinates][type]=Point" \
  -F "location[coordinates][coordinates][0]=3.3869" \
  -F "location[coordinates][coordinates][1]=6.5244" \
  -F "budget[minPrice]=40000" \
  -F "budget[maxPrice]=60000" \
  -F "budget[currency]=NGN" \
  -F "budget[pricingPeriod]=per-month" \
  -F "preferences[genderPreference]=female" \
  -F "preferences[lifestyleCompatibility][]=clean" \
  -F "preferences[lifestyleCompatibility][]=organized" \
  -F "contact[phoneNumber]=08087654321" \
  -F "contact[whatsapp]=08087654321" \
  -F "requiredAmenities[]=WiFi" \
  -F "requiredAmenities[]=AC" \
  -F "images=@/path/to/room1.jpg" \
  -F "images=@/path/to/room2.jpg"
```

### Get Smart Roommate Suggestions

```bash
curl "http://localhost:3000/api/v1/roommate-listings/matching/suggestions?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Find Nearby Listings

```bash
# Find hostels within 5km
curl "http://localhost:3000/api/v1/hostels/nearby?lng=3.3869&lat=6.5244&maxDistance=5000"

# Find roommate listings within 2km
curl "http://localhost:3000/api/v1/roommate-listings/nearby?lng=3.3869&lat=6.5244&maxDistance=2000"
```

---

## 🎯 Frontend Integration (React Example)

### Create Hostel Hook
```javascript
const useCreateHostel = (token) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const createHostel = async (hostelData, images) => {
    setLoading(true);
    try {
      const formData = new FormData();
      
      // Add images
      images.forEach(img => formData.append('images', img));
      
      // Add other fields
      Object.entries(hostelData).forEach(([key, value]) => {
        if (key !== 'images') {
          formData.append(key, 
            typeof value === 'object' ? JSON.stringify(value) : value
          );
        }
      });

      const response = await fetch('/api/v1/hostels', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message);
      }

      const result = await response.json();
      setError(null);
      return result.data.hostel;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { createHostel, loading, error };
};
```

### Search Hostels Component
```javascript
const HostelSearch = () => {
  const [filters, setFilters] = useState({
    type: 'mixed',
    minPrice: '',
    maxPrice: '',
    amenities: []
  });
  const [hostels, setHostels] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value.length > 0) {
        params.append(key, 
          Array.isArray(value) ? value.join(',') : value
        );
      }
    });

    try {
      const response = await fetch(`/api/v1/hostels/search?${params}`);
      const result = await response.json();
      setHostels(result.data.hostels);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="search-container">
      <input
        type="select"
        value={filters.type}
        onChange={(e) => setFilters({...filters, type: e.target.value})}
        placeholder="Hostel Type"
      />
      <input
        type="number"
        value={filters.minPrice}
        onChange={(e) => setFilters({...filters, minPrice: e.target.value})}
        placeholder="Min Price"
      />
      <button onClick={handleSearch} disabled={loading}>
        {loading ? 'Searching...' : 'Search'}
      </button>
      
      <div className="results">
        {hostels.map(hostel => (
          <div key={hostel._id} className="hostel-card">
            <h3>{hostel.name}</h3>
            <p>₦{hostel.minPrice} - ₦{hostel.maxPrice}/month</p>
            <p>Rating: {hostel.ratingsAverage} ⭐</p>
          </div>
        ))}
      </div>
    </div>
  );
};
```

---

## 🔍 Testing Checklist

### Manual Testing Steps

1. **Create Hostel**
   - [ ] Create hostel with all required fields
   - [ ] Upload images (verify Cloudinary storage)
   - [ ] Verify it shows "pending-verification" status
   - [ ] Admin verifies hostel
   - [ ] Verify status changed to "active"

2. **Search Hostels**
   - [ ] Search by type (boys/girls/mixed)
   - [ ] Filter by price range
   - [ ] Filter by amenities
   - [ ] Text search
   - [ ] Pagination works

3. **View Hostel**
   - [ ] Get single hostel details
   - [ ] Verify images load
   - [ ] Check view counter incremented

4. **Rate Hostel**
   - [ ] Add 1-5 star rating
   - [ ] Write review
   - [ ] Verify average rating updated

5. **Create Roommate Listing**
   - [ ] Create with all preferences
   - [ ] Upload room images
   - [ ] Verify "active" status
   - [ ] Check expiry date (90 days)

6. **Search Roommate Listings**
   - [ ] Search by gender preference
   - [ ] Filter by budget
   - [ ] Filter by accommodation type
   - [ ] Get smart suggestions (logged in)

7. **Manage Listings**
   - [ ] Update listing
   - [ ] Close with reason
   - [ ] Register inquiry (increments counter)
   - [ ] Delete listing

8. **Geolocation**
   - [ ] Find nearby hostels
   - [ ] Find nearby roommate listings
   - [ ] Verify distance filtering

---

## 🚨 Common Issues & Solutions

### Issue: Images Not Uploading
**Solution**: 
- Check Cloudinary credentials in `.env`
- Verify file size < 10MB
- Ensure MIME type is `image/*`

### Issue: 403 Forbidden on Update
**Solution**:
- Verify you're the owner of the hostel/listing
- Check token is valid and not expired

### Issue: Validation Errors
**Solution**:
- Ensure all required fields are provided
- Check data types match schema
- Verify enums use correct values

### Issue: Search Returns Empty
**Solution**:
- Ensure hostels are "active" and verified
- Check campus ID matches
- Verify filters are in valid range

---

## 📊 Database Queries

### View Hostels by Status
```javascript
db.hostels.find({ status: "active", isVerified: true }).count()
```

### Find Hostels by Owner
```javascript
db.hostels.find({ owner: ObjectId("...") })
```

### Count Active Roommate Listings
```javascript
db.roommatelistings.find({ status: "active" }).count()
```

### Find Expired Listings
```javascript
db.roommatelistings.find({ expiresAt: { $lt: new Date() }, status: "active" })
```

---

## 📚 Documentation

- **Full API Docs**: `docs/HOSTELS_ROOMMATES_API.md`
- **Implementation Details**: `docs/HOSTELS_IMPLEMENTATION.md`
- **Test Files**: `tests/hostels.test.js`, `tests/roommateListings.test.js`

---

## ✨ Features Summary

| Feature | Hostels | Roommates |
|---------|---------|-----------|
| Create/Update | ✅ | ✅ |
| Delete | ✅ | ✅ |
| Search | ✅ | ✅ |
| Geolocation | ✅ | ✅ |
| Images (max) | 20 | 10 |
| Ratings | ✅ | ❌ |
| Expiration | Manual | Auto (90d) |
| Admin Verify | ✅ | ❌ |
| Analytics | ✅ | ✅ |

---

## 🎉 You're All Set!

The hostel and roommate listing features are ready to use. Start creating listings, searching, and matching students with their perfect accommodations!

### Next Steps:
1. Run tests: `npm test`
2. Review API docs: `docs/HOSTELS_ROOMMATES_API.md`
3. Integrate into frontend
4. Deploy to production

---

**Questions or Issues?** Check the documentation or test files for examples.

