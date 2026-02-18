# Advanced Document Upload System - Quick Reference

**Last Updated**: November 18, 2025

---

## 🚀 Quick Start

### Upload a Document with Faculty/Department
```bash
curl -X POST http://localhost:5000/api/v1/documents \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@document.pdf" \
  -F "title=CS101 Lecture Notes" \
  -F "faculty=FACULTY_ID" \
  -F "department=DEPT_ID" \
  -F "courseCode=CS101" \
  -F "academicLevel=100" \
  -F "semester=first"
```

### List All Documents with Filters
```bash
GET /api/v1/documents
  ?faculty=FACULTY_ID
  &department=DEPT_ID
  &academicLevel=200
  &semester=first
  &sort=trending
  &limit=20
```

### Search Documents
```bash
GET /api/v1/documents/search
  ?q=linear+algebra
  &faculty=FACULTY_ID
  &limit=10
```

---

## 📚 Faculty Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/v1/faculties` | None | List all faculties |
| GET | `/api/v1/faculties/search` | None | Search faculties |
| GET | `/api/v1/faculties/:id` | None | Get faculty details |
| GET | `/api/v1/faculties/:id/stats` | None | Faculty statistics |
| POST | `/api/v1/faculties` | Admin | Create faculty |
| PATCH | `/api/v1/faculties/:id` | Admin | Update faculty |
| DELETE | `/api/v1/faculties/:id` | Admin | Delete faculty |

---

## 📂 Department Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/v1/departments` | None | List all departments |
| GET | `/api/v1/departments/search` | None | Search departments |
| GET | `/api/v1/departments/:id` | None | Get department details |
| GET | `/api/v1/departments/:id/stats` | None | Department statistics |
| GET | `/api/v1/departments/faculty/:id` | None | Get by faculty |
| POST | `/api/v1/departments` | Admin | Create department |
| PATCH | `/api/v1/departments/:id` | Admin | Update department |
| DELETE | `/api/v1/departments/:id` | Admin | Delete department |

---

## 📚 Document Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/v1/documents` | None | List with filters |
| GET | `/api/v1/documents/search` | None | Full-text search |
| GET | `/api/v1/documents/trending` | None | Trending documents |
| GET | `/api/v1/documents/analytics` | None | Analytics data |
| GET | `/api/v1/documents/faculty/:id` | None | By faculty |
| GET | `/api/v1/documents/department/:id` | None | By department |
| GET | `/api/v1/documents/level/:level` | None | By academic level |
| GET | `/api/v1/documents/course/:code` | None | By course code |
| GET | `/api/v1/documents/semester/:sem` | None | By semester |
| GET | `/api/v1/documents/:id` | None | Get single document |
| POST | `/api/v1/documents` | Auth | Upload document |
| PATCH | `/api/v1/documents/:id` | Auth | Update document |
| DELETE | `/api/v1/documents/:id` | Auth | Delete document |

---

## 🔍 Filter Parameters

### Required for Upload
- `faculty` - Faculty ID (required)
- `department` - Department ID (required)
- `title` - Document title (required)
- `file` - File to upload (required)

### Optional Upload Fields
- `description` - Document description
- `category` - assignment, note, past-question, project, other
- `courseCode` - e.g., "CS101"
- `course` - e.g., "Introduction to Programming"
- `academicLevel` - 100, 200, 300, 400, 500, postgraduate, general
- `semester` - first, second, summer, all
- `academicYear` - e.g., "2024/2025"
- `difficulty` - beginner, intermediate, advanced, all
- `language` - en, fr, es, other
- `tags` - Comma-separated tags
- `visibility` - public, campus, faculty, department, private

### Query/Search Filters
- `faculty` - Filter by faculty ID
- `department` - Filter by department ID
- `category` - Filter by category
- `courseCode` - Filter by course code
- `academicLevel` - Filter by academic level
- `semester` - Filter by semester
- `academicYear` - Filter by academic year
- `difficulty` - Filter by difficulty
- `uploadStatus` - pending, approved, rejected
- `minRating` - Minimum rating (e.g., 3.5)
- `minDownloads` - Minimum downloads
- `dateFrom` - Start date (YYYY-MM-DD)
- `dateTo` - End date (YYYY-MM-DD)
- `tags` - Comma-separated tags
- `visibility` - Filter by visibility level

---

## 🎯 Sort Options

| Sort Value | Description |
|-----------|-------------|
| `newest` | Newest first (default) |
| `oldest` | Oldest first |
| `trending` | Most downloaded |
| `popular` | Most viewed |
| `rated` | Highest rated |
| `favorites` | Most favorited |
| `downloaded` | Most downloads |
| `views` | Most views |
| `comments` | Most comments |
| `title` | Alphabetical |
| `size` | Largest first |

---

## 📊 Common Queries

### Get CS Department Notes (200-level)
```
GET /api/v1/documents
  ?department=DEPT_ID
  &category=note
  &academicLevel=200
  &sort=newest
```

### Get Trending Past Questions
```
GET /api/v1/documents/trending
  ?category=past-question
  &faculty=FACULTY_ID
  &timeframe=30d
```

### Advanced Search
```
GET /api/v1/documents/search
  ?q=assignment
  &faculty=FACULTY_ID
  &minRating=4
  &sort=rated
```

### Get First Semester Documents
```
GET /api/v1/documents
  ?semester=first
  &academicYear=2024/2025
  &department=DEPT_ID
```

### Get Faculty Statistics
```
GET /api/v1/faculties/FACULTY_ID/stats
```

### Get Department Statistics
```
GET /api/v1/departments/DEPT_ID/stats
```

---

## 📈 Visibility Levels

| Level | Who Can See |
|-------|------------|
| `public` | Everyone on platform |
| `campus` | Campus users only |
| `faculty` | Faculty members only |
| `department` | Department members only |
| `private` | Uploader only |

---

## 🎓 Academic Levels

| Level | Typical Year |
|-------|------------|
| `100` | First year |
| `200` | Second year |
| `300` | Third year |
| `400` | Fourth year |
| `500` | Fifth year/Honours |
| `postgraduate` | Masters/PhD |
| `general` | General content |

---

## 📝 Document Categories

- `assignment` - Assignment problems/solutions
- `note` - Lecture notes/study notes
- `past-question` - Exam/quiz past questions
- `project` - Project requirements/samples
- `other` - Other documents

---

## 🛡️ Authorization

### Public Access
- ✅ List/search faculties
- ✅ List/search departments
- ✅ View documents (respecting visibility)
- ✅ View statistics

### Authenticated Users
- ✅ Upload documents (requires faculty/dept)
- ✅ Update own documents
- ✅ Delete own documents
- ✅ Full search with all filters

### Admin Only
- ✅ Create/update/delete faculties
- ✅ Create/update/delete departments
- ✅ Approve uploads
- ✅ Manage all documents

---

## 💡 Best Practices

1. **Always Provide Context**
   - Include `faculty` and `department` when uploading
   - This enables better discovery

2. **Use Academic Metadata**
   - Include `courseCode`, `academicLevel`, `semester`
   - Helps other students find relevant content

3. **Tag Appropriately**
   - Use meaningful tags (e.g., "solution", "notes", "summary")
   - Improves searchability

4. **Set Correct Visibility**
   - Use `faculty` or `department` for class-specific content
   - Use `public` for general resources

5. **Filter Results**
   - Combine multiple filters for precise results
   - Use date ranges to get recent content

---

## 🧪 Example Workflows

### Scenario 1: Student Uploads Assignment Solution
```
1. Get their department: GET /api/v1/departments?faculty=FACULTY_ID
2. Upload document:
   POST /api/v1/documents
   - faculty: FACULTY_ID
   - department: DEPT_ID
   - category: "assignment"
   - courseCode: "CS101"
   - academicLevel: "100"
   - visibility: "department"
   
3. Document is available to department members
```

### Scenario 2: Student Searches for Study Materials
```
1. Find relevant department:
   GET /api/v1/departments/search?q=computer%20science
   
2. Search for notes:
   GET /api/v1/documents/search
   ?q=data structures
   &department=DEPT_ID
   &category=note
   
3. Filter by academic level:
   Add filter: &academicLevel=100
```

### Scenario 3: Faculty Analyzes Document Usage
```
1. Get faculty stats:
   GET /api/v1/faculties/FACULTY_ID/stats
   
2. Get specific department stats:
   GET /api/v1/departments/DEPT_ID/stats
   
3. Get trending documents:
   GET /api/v1/documents/trending?faculty=FACULTY_ID
```

---

## 🐛 Common Issues

### "Faculty not found"
- Check faculty ID is valid
- Ensure faculty belongs to same campus

### "Department does not belong to faculty"
- Verify department faculty matches selected faculty
- Use GET /api/v1/departments/faculty/FACULTY_ID to list valid departments

### Documents not appearing
- Check visibility level and campus/faculty/department
- Verify uploadStatus is "approved"
- Check date range if filtering by date

### Search returns no results
- Try broader search terms
- Check for typos in query
- Ensure documents exist in specified filters

---

## 📞 Support

For issues or questions:
1. Check the documentation
2. Verify all required fields are provided
3. Check authorization/role permissions
4. Review database indexes if performance is slow

---

**Version**: 1.0.0  
**Last Updated**: November 18, 2025  
**Status**: ✅ Production Ready
