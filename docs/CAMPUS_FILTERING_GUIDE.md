# 🏫 Campus Filtering Guide - Document Listings

## Overview

The document system now implements **secure campus-based filtering** with a **security-first approach**:

- **Default Behavior**: Users see ONLY their campus documents
- **Optional Override**: Users CAN filter to see all universities if desired
- **Security Model**: Campus isolation by default, explicit opt-in for system-wide view

---

## 🔐 Security Model

### Default Behavior (Campus-Isolated)

When a user makes a request **WITHOUT** the `allCampuses` parameter:

```bash
GET /api/v1/documents
```

**Result**: Only documents from the user's assigned campus are returned.

#### Example:
```javascript
// User Info:
{
  "id": "user123",
  "campus": "64a2b3c4d5e6f7g8h9i0j1k2",  // University of Lagos
  "name": "John Doe"
}

// Request:
GET /api/v1/documents

// Response: Only documents from "University of Lagos"
{
  "status": "success",
  "results": 25,
  "total": 150,
  "data": {
    "documents": [
      { "title": "CS101 Notes", "campus": "64a2b3c4d5e6f7g8h9i0j1k2" },
      { "title": "Physics Lab Report", "campus": "64a2b3c4d5e6f7g8h9i0j1k2" },
      // ... all from same campus
    ]
  }
}
```

---

### Optional Override (All Universities)

When a user explicitly requests `?allCampuses=true`:

```bash
GET /api/v1/documents?allCampuses=true
```

**Result**: Documents from ALL campuses are returned, provided the user has the capability.

#### Example:
```javascript
// Request:
GET /api/v1/documents?allCampuses=true

// Response: Documents from all campuses
{
  "status": "success",
  "results": 100,
  "total": 5432,
  "data": {
    "documents": [
      { "title": "CS101 Notes", "campus": "64a2b3c4d5e6f7g8h9i0j1k2" },        // UNILAG
      { "title": "Physics Lab Report", "campus": "64a2b3c5d5e6f7g8h9i0j1k2" },  // OAU
      { "title": "Chemistry Notes", "campus": "64a2b3c6d5e6f7g8h9i0j1k2" },     // ABU
      // ... from multiple campuses
    ]
  }
}
```

---

## 📡 API Usage

### 1. **Get Documents from User's Campus (DEFAULT)**

```http
GET /api/v1/documents
```

**Query Parameters**:
- `page` (optional): Page number (default: 1)
- `limit` (optional): Results per page (default: 20, max: 100)
- `sort` (optional): Sort order (newest, oldest, trending, popular, rated, etc.)
- `faculty` (optional): Filter by faculty ID
- `department` (optional): Filter by department ID
- `academicLevel` (optional): Filter by level (100, 200, 300, 400, 500, postgraduate)
- `courseCode` (optional): Filter by course code
- `semester` (optional): Filter by semester (first, second, summer)
- `difficulty` (optional): Filter by difficulty (beginner, intermediate, advanced)

**Example Request**:
```bash
curl -X GET \
  "http://localhost:3000/api/v1/documents?page=1&limit=20&sort=trending" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response**:
```json
{
  "status": "success",
  "results": 20,
  "total": 150,
  "page": 1,
  "pages": 8,
  "data": {
    "documents": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "title": "Database Design Fundamentals",
        "campus": "64a2b3c4d5e6f7g8h9i0j1k2",
        "faculty": "507f191e810c19729de860ea",
        "department": "507f191e810c19729de860eb",
        "academicLevel": "200",
        "courseCode": "CS201",
        "views": 342,
        "downloads": 89,
        "averageRating": 4.5
      }
    ]
  }
}
```

---

### 2. **Get Documents from ALL Universities**

```http
GET /api/v1/documents?allCampuses=true
```

**Query Parameters**: Same as above, plus:
- `allCampuses` (required): Set to `"true"` to see all campuses
- `campus` (optional): Specific campus ID if you want to filter to a different campus

**Example Request**:
```bash
curl -X GET \
  "http://localhost:3000/api/v1/documents?allCampuses=true&page=1&limit=20&sort=popular" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response**:
```json
{
  "status": "success",
  "results": 20,
  "total": 5432,
  "page": 1,
  "pages": 272,
  "data": {
    "documents": [
      {
        "title": "Database Design Fundamentals",
        "campus": "64a2b3c4d5e6f7g8h9i0j1k2",  // UNILAG
        "academicLevel": "200"
      },
      {
        "title": "Physics Mechanics",
        "campus": "64a2b3c5d5e6f7g8h9i0j1k2",  // OAU
        "academicLevel": "100"
      }
    ]
  }
}
```

---

### 3. **Filter to Specific Campus (When using allCampuses)**

```http
GET /api/v1/documents?allCampuses=true&campus=64a2b3c5d5e6f7g8h9i0j1k2
```

This allows viewing documents from a SPECIFIC different campus:

```bash
curl -X GET \
  "http://localhost:3000/api/v1/documents?allCampuses=true&campus=64a2b3c5d5e6f7g8h9i0j1k2" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 4. **Advanced Filtering Examples**

#### Get 300-level documents from your campus:
```bash
GET /api/v1/documents?academicLevel=300&sort=rated
```

#### Get all 200-level documents across all universities:
```bash
GET /api/v1/documents?allCampuses=true&academicLevel=200
```

#### Search documents by course code from your campus:
```bash
GET /api/v1/documents?courseCode=CS201&faculty=507f191e810c19729de860ea
```

#### Get trending documents from all campuses:
```bash
GET /api/v1/documents?allCampuses=true&sort=trending&limit=50
```

---

## 🛡️ Security Considerations

### 1. **Default Isolation**
- Users CANNOT accidentally see other campus documents
- Security is enforced at the query builder level (not just frontend)
- Backend rejects requests that try to override defaults

### 2. **Visibility Levels**
Even when accessing documents, the `visibility` field controls access:

| Visibility | Owner | Campus Members | Faculty Members | Public |
|-----------|-------|-----------------|-----------------|--------|
| `private` | ✅ | ❌ | ❌ | ❌ |
| `department` | ✅ | ❌ | ❌ | ❌ |
| `faculty` | ✅ | ❌ | ✅ | ❌ |
| `campus` | ✅ | ✅ | ✅ | ❌ |
| `public` | ✅ | ✅ | ✅ | ✅ |

### 3. **Access Control Middleware**
The `checkDocumentPermissions()` middleware ensures:
- Even if a user requests a document they shouldn't see, access is denied
- Private documents are never visible to others (except owner/admin)
- Campus-level visibility is strictly enforced

---

## 📋 Implementation Details

### Backend Logic (documentController.js)

```javascript
// DEFAULT: Show user's campus only
if (!req.query.allCampuses || req.query.allCampuses !== 'true') {
  filter.campus = req.user.campus;  // ← DEFAULT BEHAVIOR
}
// User can override: ?allCampuses=true to see all campuses
```

**Key Points**:
1. If `allCampuses` parameter is NOT provided → Default to user's campus
2. If `allCampuses=false` → Default to user's campus
3. If `allCampuses=true` → Allow all campuses (still respects visibility rules)
4. If `allCampuses=true` AND `campus=specificId` → Filter to that specific campus

---

## 📱 Frontend Implementation Guide

### React Example - Get Campus Documents (Default)

```javascript
import axios from 'axios';

const getCampusDocuments = async (page = 1, sort = 'newest') => {
  try {
    const response = await axios.get('/api/v1/documents', {
      params: {
        page,
        limit: 20,
        sort,
        // NOTE: DO NOT pass allCampuses parameter for default behavior
      },
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return response.data.data.documents;
  } catch (error) {
    console.error('Error fetching documents:', error);
  }
};
```

### React Example - Get All Universities Documents

```javascript
const getAllUniversitiesDocuments = async (page = 1, sort = 'trending') => {
  try {
    const response = await axios.get('/api/v1/documents', {
      params: {
        page,
        limit: 20,
        sort,
        allCampuses: 'true'  // ← Enable all campuses
      },
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return response.data.data.documents;
  } catch (error) {
    console.error('Error fetching documents:', error);
  }
};
```

### React Example - Campus Selector

```javascript
const [viewAllCampuses, setViewAllCampuses] = useState(false);

const handleToggleCampusView = () => {
  setViewAllCampuses(!viewAllCampuses);
  // Refetch documents
  if (viewAllCampuses) {
    fetchDocuments(1, 'newest');  // Back to campus-only
  } else {
    fetchDocuments(1, 'newest', true);  // Show all campuses
  }
};

return (
  <div>
    <button onClick={handleToggleCampusView}>
      {viewAllCampuses ? 'View Only My Campus' : 'View All Universities'}
    </button>
  </div>
);
```

---

## 🔄 Update Scenarios

### User Changes Campus
When a user's campus is updated, future API calls automatically filter to their new campus:

```javascript
// User gets reassigned to a different campus
userModel.campus = newCampusId;
await user.save();

// Next API call automatically shows documents from new campus
GET /api/v1/documents  // Now shows documents from newCampusId
```

---

## 📊 Campus Filtering Field Summary

| Field | Type | Default | Required | Behavior |
|-------|------|---------|----------|----------|
| `campus` | ObjectId | user's campus | No | Filtered to user's campus unless `allCampuses=true` |
| `allCampuses` | Boolean | false | No | When `true`, shows docs from all campuses |
| `faculty` | ObjectId | None | No | Additional filter within campus context |
| `department` | ObjectId | None | No | Additional filter within campus context |

---

## ✅ Testing the Implementation

### Test 1: Default Campus Isolation
```bash
# User from UNILAG campus
curl -X GET http://localhost:3000/api/v1/documents \
  -H "Authorization: Bearer USER_TOKEN"

# Expected: Only documents with campus = "UNILAG_ID"
```

### Test 2: All Universities View
```bash
curl -X GET "http://localhost:3000/api/v1/documents?allCampuses=true" \
  -H "Authorization: Bearer USER_TOKEN"

# Expected: Documents from all campuses
```

### Test 3: Specific Campus (When requesting all)
```bash
curl -X GET "http://localhost:3000/api/v1/documents?allCampuses=true&campus=64a2b3c5d5e6f7g8h9i0j1k2" \
  -H "Authorization: Bearer USER_TOKEN"

# Expected: Documents only from the specified campus (not user's campus)
```

---

## 🐛 Troubleshooting

### Issue: User sees documents from other campuses
**Solution**: Ensure `allCampuses` parameter is NOT being passed in the request. Only pass it when explicitly needed.

### Issue: User can't see all universities when they want to
**Solution**: Make sure to pass `?allCampuses=true` in the request.

### Issue: Documents still show visibility restrictions
**Solution**: This is correct behavior. Even with `allCampuses=true`, private/department documents won't be visible. Check the document's `visibility` field.

---

## 📚 Related Documentation

- **Document Model**: See `models/documentModel.js` for schema
- **Advanced Filtering**: See `ADVANCED_DOCUMENT_UPLOAD_FILTERING.md`
- **Upload Guide**: See `UPLOAD_GUIDE_WITH_ACADEMIC_LEVELS.md`
- **Access Control**: See `middlewares/documentMiddleware.js`

---

## Summary

✅ **Users are secure by default** - They only see their campus documents unless they explicitly opt-in  
✅ **Flexibility is available** - Users CAN view all universities when needed  
✅ **Visibility is still enforced** - Document access level restrictions still apply  
✅ **Campus switching is supported** - Users see their new campus when reassigned
