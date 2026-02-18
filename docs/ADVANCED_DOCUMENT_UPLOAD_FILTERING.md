# Advanced Document Upload & Filtering System Documentation

**Date**: November 18, 2025  
**Status**: ✅ COMPLETE & PRODUCTION READY

---

## 📋 Overview

This document outlines the advanced filtering and sorting system for file uploads in the Student Platform. The system includes:

- ✅ Faculty & Department Management
- ✅ Advanced Document Filtering
- ✅ Multiple Sorting Options
- ✅ Academic Level & Course-Based Organization
- ✅ Analytics & Statistics
- ✅ Full-Text Search

---

## 🏢 Faculty Management System

### 1. Create Faculty (Admin Only)
```
POST /api/v1/faculties
Authorization: Bearer {token}
Role: admin

Request Body:
{
  "name": "Faculty of Science",
  "code": "FSCIENCE",
  "description": "Science faculty description",
  "campus": "campus_id",
  "dean": "user_id (optional)",
  "email": "dean@example.com",
  "phoneNumber": "+234...",
  "website": "https://science.uni.edu",
  "image": {
    "url": "image_url",
    "publicId": "cloudinary_id"
  }
}

Response:
{
  "status": "success",
  "message": "Faculty created successfully.",
  "data": {
    "faculty": {
      "_id": "faculty_id",
      "name": "Faculty of Science",
      "code": "FSCIENCE",
      "campus": "campus_id",
      "documentsCount": 0,
      "departmentsCount": 0,
      "isActive": true,
      "createdAt": "2025-11-18T...",
      "updatedAt": "2025-11-18T..."
    }
  }
}
```

### 2. Get All Faculties
```
GET /api/v1/faculties
Query Parameters:
- campus: campus_id (optional)
- isActive: true|false (default: true)
- page: number (default: 1)
- limit: number (default: 20)
- sort: -createdAt|name|code (default: -createdAt)

Response:
{
  "status": "success",
  "results": 5,
  "total": 5,
  "page": 1,
  "pages": 1,
  "data": {
    "faculties": [...]
  }
}
```

### 3. Get Single Faculty
```
GET /api/v1/faculties/:id

Response:
{
  "status": "success",
  "data": {
    "faculty": {
      "_id": "faculty_id",
      "name": "Faculty of Science",
      "code": "FSCIENCE",
      "description": "...",
      "campus": { name, location },
      "dean": { fullName, email },
      "departments": [
        { name, code, description }
      ],
      "documentsCount": 45,
      "departmentsCount": 3,
      "isActive": true
    }
  }
}
```

### 4. Get Faculty Statistics
```
GET /api/v1/faculties/:facultyId/stats

Response:
{
  "status": "success",
  "data": {
    "faculty": { name, code },
    "documentStats": [
      {
        "_id": "assignment",
        "count": 12,
        "views": 450,
        "downloads": 230
      }
    ],
    "totalDocuments": 45,
    "totalDepartments": 3
  }
}
```

### 5. Search Faculties
```
GET /api/v1/faculties/search
Query Parameters:
- q: search_query (required)
- campus: campus_id (optional)
- page: number (default: 1)
- limit: number (default: 20)

Response:
{
  "status": "success",
  "results": 2,
  "total": 2,
  "page": 1,
  "pages": 1,
  "data": { "faculties": [...] }
}
```

### 6. Update Faculty
```
PATCH /api/v1/faculties/:id
Authorization: Bearer {token}
Role: admin

Request Body:
{
  "name": "Updated name",
  "description": "Updated description",
  "dean": "new_dean_id",
  "email": "new_email@example.com",
  "isActive": true
}

Note: code, campus cannot be updated after creation
```

### 7. Delete Faculty
```
DELETE /api/v1/faculties/:id
Authorization: Bearer {token}
Role: admin

Note: Cannot delete faculty with departments
```

---

## 📂 Department Management System

### 1. Create Department (Admin Only)
```
POST /api/v1/departments
Authorization: Bearer {token}
Role: admin

Request Body:
{
  "name": "Computer Science",
  "code": "COMP",
  "description": "Department of Computer Science",
  "faculty": "faculty_id",
  "hod": "user_id (optional)",
  "email": "hod@example.com",
  "phoneNumber": "+234...",
  "website": "https://comp.uni.edu",
  "programLevels": ["100", "200", "300", "400"],
  "image": {
    "url": "image_url",
    "publicId": "cloudinary_id"
  }
}

Response:
{
  "status": "success",
  "message": "Department created successfully.",
  "data": {
    "department": {
      "_id": "dept_id",
      "name": "Computer Science",
      "code": "COMP",
      "faculty": "faculty_id",
      "campus": "campus_id",
      "documentsCount": 0,
      "isActive": true
    }
  }
}
```

### 2. Get All Departments
```
GET /api/v1/departments
Query Parameters:
- faculty: faculty_id (optional)
- campus: campus_id (optional)
- isActive: true|false (default: true)
- page: number (default: 1)
- limit: number (default: 20)
- sort: -createdAt|name|code
```

### 3. Get Departments by Faculty
```
GET /api/v1/departments/faculty/:facultyId
Query Parameters:
- page: number (default: 1)
- limit: number (default: 20)
- sort: -createdAt

Response:
{
  "status": "success",
  "results": 3,
  "total": 3,
  "page": 1,
  "pages": 1,
  "faculty": {
    "id": "faculty_id",
    "name": "Faculty of Science",
    "code": "FSCIENCE"
  },
  "data": { "departments": [...] }
}
```

### 4. Get Department Statistics
```
GET /api/v1/departments/:departmentId/stats

Response:
{
  "status": "success",
  "data": {
    "department": { name, code, faculty },
    "documentStats": [
      {
        "_id": "assignment",
        "count": 8,
        "views": 320,
        "downloads": 150,
        "avgRating": 4.5
      }
    ],
    "byAcademicLevel": [
      { "_id": "100", "count": 5, "views": 150 }
    ],
    "totalDocuments": 24
  }
}
```

### 5. Search Departments
```
GET /api/v1/departments/search
Query Parameters:
- q: search_query (required)
- faculty: faculty_id (optional)
- page: number (default: 1)
- limit: number (default: 20)
```

### 6. Update Department
```
PATCH /api/v1/departments/:id
Authorization: Bearer {token}
Role: admin

Request Body:
{
  "name": "Updated name",
  "description": "Updated description",
  "hod": "new_hod_id",
  "email": "new_email@example.com",
  "programLevels": ["100", "200", "300", "400", "500"],
  "isActive": true
}

Note: faculty, code cannot be updated after creation
```

### 7. Delete Department
```
DELETE /api/v1/departments/:id
Authorization: Bearer {token}
Role: admin
```

---

## 📚 Advanced Document Upload & Filtering

### 1. Upload Document with Faculty/Department
```
POST /api/v1/documents
Authorization: Bearer {token}
Content-Type: multipart/form-data

Form Data:
- file: PDF/Document file (required)
- title: "Assignment Solutions" (required)
- description: "Solution guide for assignment 1" (optional)
- faculty: faculty_id (required)
- department: department_id (required)
- academicLevel: "100|200|300|400|500|postgraduate" (REQUIRED ⭐)
- category: "assignment|note|past-question|project|other" (default: "other")
- courseCode: "CS101" (optional)
- course: "Introduction to Programming" (optional)
- semester: "first|second|summer|all" (default: "all")
- academicYear: "2024/2025" (optional)
- difficulty: "beginner|intermediate|advanced|all" (default: "all")
- language: "en|fr|es|other" (default: "en")
- tags: "["assignment", "solution"]" (JSON array or comma-separated)
- visibility: "public|campus|faculty|department|private" (default: "department")

Response:
{
  "status": "success",
  "message": "Document uploaded successfully",
  "data": {
    "document": {
      "_id": "doc_id",
      "title": "Assignment Solutions",
      "fileUrl": "https://res.cloudinary.com/...",
      "publicId": "cloudinary_id",
      "fileSize": 2048000,
      "fileType": "application/pdf",
      "campus": { name },
      "faculty": { name, code },
      "department": { name, code },
      "uploadedBy": { fullName, email, role },
      "category": "assignment",
      "courseCode": "CS101",
      "academicLevel": "100",
      "semester": "first",
      "academicYear": "2024/2025",
      "difficulty": "intermediate",
      "visibility": "department",
      "views": 0,
      "downloads": 0,
      "createdAt": "2025-11-18T..."
    }
  }
}
```

### 2. Get All Documents with Filters
```
GET /api/v1/documents
Query Parameters:
- faculty: faculty_id (optional)
- department: department_id (optional)
- category: "assignment|note|past-question|project|other" (optional)
- courseCode: "CS101" (optional)
- academicLevel: "100|200|300|400|500|postgraduate" (optional)
- semester: "first|second|summer|all" (optional)
- academicYear: "2024/2025" (optional)
- difficulty: "beginner|intermediate|advanced" (optional)
- visibility: "public|campus|faculty|department|private" (optional)
- uploadStatus: "pending|approved|rejected" (optional)
- minRating: 3.5 (optional)
- minDownloads: 10 (optional)
- dateFrom: "2025-01-01" (optional)
- dateTo: "2025-12-31" (optional)
- tags: "assignment,solution" (optional - comma-separated)
- sort: "newest|oldest|trending|popular|rated|favorites|downloaded|views|comments|title|size"
- page: 1 (default)
- limit: 20 (default)

Response:
{
  "status": "success",
  "results": 15,
  "total": 150,
  "page": 1,
  "pages": 10,
  "data": { "documents": [...] }
}
```

### 3. Search Documents
```
GET /api/v1/documents/search
Query Parameters:
- q: "search query" (required)
- faculty: faculty_id (optional)
- department: department_id (optional)
- category: category_name (optional)
- page: 1 (default)
- limit: 20 (default)
- sort: -createdAt (default)

Response:
{
  "status": "success",
  "results": 8,
  "total": 45,
  "page": 1,
  "pages": 3,
  "data": { "documents": [...] }
}
```

### 4. Get Documents by Faculty
```
GET /api/v1/documents/faculty/:facultyId
Query Parameters:
- department: department_id (optional)
- category: category_name (optional)
- page: 1 (default)
- limit: 20 (default)
- sort: -createdAt (default)

Response:
{
  "status": "success",
  "results": 45,
  "total": 45,
  "page": 1,
  "pages": 2,
  "faculty": {
    "id": "faculty_id",
    "name": "Faculty of Science",
    "code": "FSCIENCE"
  },
  "data": { "documents": [...] }
}
```

### 5. Get Documents by Department
```
GET /api/v1/documents/department/:departmentId
Query Parameters:
- category: category_name (optional)
- academicLevel: "100|200|300|400" (optional)
- page: 1 (default)
- limit: 20 (default)
- sort: -createdAt (default)

Response:
{
  "status": "success",
  "results": 24,
  "total": 24,
  "page": 1,
  "pages": 1,
  "department": {
    "id": "dept_id",
    "name": "Computer Science",
    "code": "COMP",
    "faculty": "faculty_id"
  },
  "data": { "documents": [...] }
}
```

### 6. Get Documents by Academic Level
```
GET /api/v1/documents/level/:level
Query Parameters:
- level: "100|200|300|400|500|postgraduate" (required)
- department: department_id (optional)
- course: "course_name" (optional)
- semester: "first|second|summer" (optional)
- page: 1 (default)
- limit: 20 (default)
- sort: -createdAt (default)

Response:
{
  "status": "success",
  "results": 32,
  "total": 120,
  "page": 1,
  "pages": 4,
  "academicLevel": "200",
  "data": { "documents": [...] }
}
```

### 7. Get Documents by Course Code
```
GET /api/v1/documents/course/:courseCode
Query Parameters:
- courseCode: "CS101" (required - URL parameter)
- department: department_id (optional)
- academicLevel: "200" (optional)
- page: 1 (default)
- limit: 20 (default)
- sort: -createdAt (default)

Response:
{
  "status": "success",
  "results": 18,
  "total": 45,
  "page": 1,
  "pages": 3,
  "courseCode": "CS101",
  "data": { "documents": [...] }
}
```

### 8. Get Documents by Semester
```
GET /api/v1/documents/semester/:semester
Query Parameters:
- semester: "first|second|summer" (required)
- department: department_id (optional)
- academicYear: "2024/2025" (optional)
- academicLevel: "200" (optional)
- page: 1 (default)
- limit: 20 (default)

Response:
{
  "status": "success",
  "results": 56,
  "total": 156,
  "page": 1,
  "pages": 8,
  "semester": "first",
  "data": { "documents": [...] }
}
```

### 9. Get Trending Documents
```
GET /api/v1/documents/trending
Query Parameters:
- timeframe: "24h|7d|30d|90d|all" (default: "7d")
- faculty: faculty_id (optional)
- department: department_id (optional)
- limit: 20 (default)

Response:
{
  "status": "success",
  "results": 15,
  "timeframe": "7d",
  "data": { "documents": [...] }
}
```

### 10. Get Document Analytics
```
GET /api/v1/documents/analytics
Query Parameters:
- faculty: faculty_id (optional)
- department: department_id (optional)

Response:
{
  "status": "success",
  "data": {
    "overall": {
      "totalDocuments": 245,
      "totalViews": 12450,
      "totalDownloads": 5320,
      "totalFavorites": 890,
      "averageRating": 4.2,
      "totalComments": 340
    },
    "byCategory": [
      {
        "_id": "assignment",
        "count": 80,
        "views": 4500,
        "downloads": 2100
      }
    ],
    "byAcademicLevel": [
      {
        "_id": "100",
        "count": 45,
        "views": 2100
      }
    ]
  }
}
```

---

## 🔗 Sorting Options

The `sort` parameter supports the following values:

| Sort Value | Description |
|-----------|-------------|
| `newest` | Newest documents first (default) |
| `oldest` | Oldest documents first |
| `trending` | Most downloaded documents |
| `popular` | Most viewed documents |
| `rated` | Highest rated documents |
| `favorites` | Most favorited documents |
| `downloaded` | Most downloaded documents |
| `views` | Most viewed documents |
| `comments` | Most commented documents |
| `title` | Sorted by title A-Z |
| `size` | Largest files first |

---

## 🎯 Filtering Combinations

### Example 1: CS Department Assignment Notes for 200-level
```
GET /api/v1/documents?department=dept_id&category=note&academicLevel=200&courseCode=CS101

Filters all notes in CS department for 200-level CS101 course
```

### Example 2: Trending Past Questions by Faculty
```
GET /api/v1/documents/trending?faculty=faculty_id&category=past-question&timeframe=30d

Gets most downloaded past questions in a faculty from last 30 days
```

### Example 3: Advanced Search with Multiple Filters
```
GET /api/v1/documents?faculty=faculty_id&semester=first&academicYear=2024/2025&difficulty=intermediate&minRating=4&sort=popular

Gets intermediate difficulty documents for first semester 2024/2025 with 4+ rating, sorted by views
```

---

## 📊 Model Enhancements

### Document Model New Fields

```javascript
// Faculty & Department Organization
faculty: ObjectId (required)           // Which faculty
department: ObjectId (required)        // Which department

// Academic Information
academicLevel: String                  // 100, 200, 300, 400, 500, postgraduate, general
course: String                         // Course name
courseCode: String                     // e.g., "CS101"
semester: String                       // first, second, summer, all
academicYear: String                   // e.g., "2024/2025"

// Content Classification
difficulty: String                     // beginner, intermediate, advanced, all
language: String                       // en, fr, es, other
uploadStatus: String                   // pending, approved, rejected

// Updated Visibility Levels
visibility: String                     // public, campus, faculty, department, private
```

---

## 🔐 Authorization Levels

| Action | Role | Permission |
|--------|------|-----------|
| View All Documents | Public | ✅ All visibility levels respected |
| Search Documents | Public | ✅ All documents matching criteria |
| Upload Document | Authenticated | ✅ If faculty/department assigned |
| Update Document | Owner/Admin | ✅ Own documents or admin override |
| Delete Document | Owner/Admin | ✅ Own documents or admin override |
| Manage Faculties | Admin | ✅ Create, Update, Delete |
| Manage Departments | Admin | ✅ Create, Update, Delete |
| View Analytics | Admin/Faculty | ✅ Own faculty/department or admin |

---

## 📈 Index Strategy

The following database indexes have been created for optimal performance:

```javascript
documentSchema.index({ campus: 1, faculty: 1, department: 1, createdAt: -1 });
documentSchema.index({ faculty: 1, createdAt: -1 });
documentSchema.index({ department: 1, createdAt: -1 });
documentSchema.index({ courseCode: 1 });
documentSchema.index({ academicLevel: 1 });
documentSchema.index({ semester: 1 });
documentSchema.index({ academicYear: 1 });
documentSchema.index({ uploadStatus: 1 });
```

---

## 🧪 Testing Examples

### Upload Document
```bash
curl -X POST http://localhost:5000/api/v1/documents \
  -H "Authorization: Bearer {token}" \
  -F "file=@document.pdf" \
  -F "title=CS101 Lecture Notes" \
  -F "faculty={facultyId}" \
  -F "department={departmentId}" \
  -F "courseCode=CS101" \
  -F "academicLevel=100" \
  -F "semester=first"
```

### Filter Documents
```bash
curl http://localhost:5000/api/v1/documents \
  ?department={deptId} \
  &academicLevel=200 \
  &semester=first \
  &sort=trending \
  &limit=20
```

### Search Documents
```bash
curl http://localhost:5000/api/v1/documents/search \
  ?q="assignment%20solution" \
  &faculty={facultyId} \
  &page=1
```

---

## 🚀 Features Implemented

✅ **Faculty Management**
- Create, read, update, delete faculties
- Faculty statistics and analytics
- Faculty-level document organization

✅ **Department Management**
- Create, read, update, delete departments
- Department statistics and analytics
- Department-level document organization

✅ **Advanced Filtering**
- Filter by faculty, department, category
- Filter by academic level (100-500, postgraduate)
- Filter by course and course code
- Filter by semester
- Filter by difficulty level
- Filter by academic year
- Filter by upload status
- Date range filtering
- Rating and download thresholds

✅ **Sorting Options**
- Newest/Oldest
- Trending (most downloaded)
- Popular (most viewed)
- Top rated
- Most favorited
- By title and file size

✅ **Search Capabilities**
- Full-text search across documents
- Faceted search with filters
- Search within specific faculty/department
- Search by category

✅ **Analytics**
- Faculty-level analytics
- Department-level analytics
- Document category breakdown
- Academic level statistics
- View/download/favorite tracking

✅ **Visibility Levels**
- Public (entire platform)
- Campus (campus users only)
- Faculty (faculty members only)
- Department (department members only)
- Private (uploader only)

---

## 📝 Database Relationships

```
Campus
├── Faculty (1:Many)
│   ├── Department (1:Many)
│   │   └── Document (1:Many)
│   │       ├── uploadedBy (User)
│   │       ├── viewedBy (User[])
│   │       └── favoritedBy (User[])
│   └── hod (User)
└── dean (User)
```

---

## 🎉 Summary

The advanced document upload and filtering system provides:

- **Hierarchical Organization**: Campus → Faculty → Department → Documents
- **Rich Metadata**: Academic levels, courses, semesters, difficulty levels
- **Flexible Filtering**: 20+ filter combinations
- **Powerful Search**: Full-text search with faceted results
- **Granular Permissions**: 5-level visibility control
- **Comprehensive Analytics**: Faculty and department-level statistics
- **Performance Optimized**: Strategic database indexing

**Total New Endpoints**: 25+
**Total New Fields**: 12+
**Status**: ✅ Production Ready

---

**Implementation Date**: November 18, 2025  
**Last Updated**: November 18, 2025  
**Version**: 1.0
