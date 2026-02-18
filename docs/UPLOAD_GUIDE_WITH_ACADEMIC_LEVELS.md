# Document Upload Guide with Academic Level Selection

**Date**: November 18, 2025  
**Version**: 2.0  
**Status**: ✅ COMPLETE

---

## 📋 Overview

This guide explains how to upload documents with **academic level selection**. When uploading materials to the platform, users must specify which academic level the document is intended for (100-level, 200-level, etc.).

---

## 🎓 Academic Levels Explained

The platform organizes documents by academic levels to help students find materials for their current level of study:

| Level | Name | Description | Examples |
|-------|------|-------------|----------|
| **100** | Foundational/First Year | Introductory courses for new students | Introduction to Programming, Basic Mathematics |
| **200** | Intermediate/Second Year | Second-year courses building on basics | Data Structures, Calculus II |
| **300** | Advanced/Third Year | Upper-level specialized courses | Algorithms, Advanced Programming |
| **400** | Senior/Final Year | Capstone and specialized courses | Operating Systems, Design Projects |
| **500** | Upper/Special | Advanced/graduate-level undergraduate courses | Advanced Topics, Research Methods |
| **postgraduate** | Graduate Level | Master's and PhD level courses | Advanced Research, Thesis Seminars |

---

## 📤 Upload Document with Level Selection

### **Endpoint**
```
POST /api/v1/documents
Authorization: Bearer {token}
Content-Type: multipart/form-data
```

### **Required Fields** ⭐

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `file` | File | PDF/Document file | assignment.pdf |
| `title` | String | Document title | "CS101 Assignment Solutions" |
| `faculty` | ID | Faculty ID | "507f1f77bcf86cd799439011" |
| `department` | ID | Department ID | "507f1f77bcf86cd799439012" |
| **`academicLevel`** | **String** | **Required: Academic level** | **"100"** |

### **Optional Fields**

| Field | Type | Options | Default |
|-------|------|---------|---------|
| `description` | String | Any text | - |
| `category` | String | assignment, note, past-question, project, other | "other" |
| `courseCode` | String | e.g., "CS101" | - |
| `course` | String | e.g., "Introduction to Programming" | - |
| `semester` | String | first, second, summer, all | "all" |
| `academicYear` | String | Format: YYYY/YYYY | - |
| `difficulty` | String | beginner, intermediate, advanced, all | "all" |
| `language` | String | en, fr, es, other | "en" |
| `tags` | Array | Any relevant tags | - |
| `visibility` | String | public, campus, faculty, department, private | "department" |

---

## 🛠️ Complete Upload Examples

### **Example 1: Basic Upload (Minimum Required)**
```bash
curl -X POST http://localhost:5000/api/v1/documents \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -F "file=@lecture_notes.pdf" \
  -F "title=CS101 Lecture Notes" \
  -F "faculty=607f1f77bcf86cd799439011" \
  -F "department=607f1f77bcf86cd799439012" \
  -F "academicLevel=100"
```

**Response**:
```json
{
  "status": "success",
  "message": "Document uploaded successfully",
  "data": {
    "document": {
      "_id": "507f1f77bcf86cd799439099",
      "title": "CS101 Lecture Notes",
      "fileUrl": "https://res.cloudinary.com/...",
      "uploadedBy": {
        "_id": "user_id",
        "fullName": "Student Name",
        "role": "buyer"
      },
      "faculty": {
        "_id": "607f1f77bcf86cd799439011",
        "name": "Faculty of Science",
        "code": "FSCIENCE"
      },
      "department": {
        "_id": "607f1f77bcf86cd799439012",
        "name": "Computer Science",
        "code": "COMP"
      },
      "academicLevel": "100",
      "category": "other",
      "visibility": "department",
      "views": 0,
      "downloads": 0,
      "createdAt": "2025-11-18T10:30:00Z"
    }
  }
}
```

---

### **Example 2: Assignment Solutions for 200-Level**
```bash
curl -X POST http://localhost:5000/api/v1/documents \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -F "file=@assignment_solutions.pdf" \
  -F "title=CS201 Assignment 1 Solutions" \
  -F "faculty=607f1f77bcf86cd799439011" \
  -F "department=607f1f77bcf86cd799439012" \
  -F "academicLevel=200" \
  -F "courseCode=CS201" \
  -F "course=Data Structures" \
  -F "category=assignment" \
  -F "semester=first" \
  -F "academicYear=2024/2025" \
  -F "difficulty=intermediate" \
  -F "tags=[\"assignment\", \"solution\", \"data-structures\"]" \
  -F "visibility=faculty"
```

**Response**:
```json
{
  "status": "success",
  "message": "Document uploaded successfully",
  "data": {
    "document": {
      "_id": "507f1f77bcf86cd799439100",
      "title": "CS201 Assignment 1 Solutions",
      "fileUrl": "https://res.cloudinary.com/...",
      "fileSize": 2048000,
      "fileType": "application/pdf",
      "uploadedBy": { ... },
      "faculty": { ... },
      "department": { ... },
      "category": "assignment",
      "courseCode": "CS201",
      "course": "Data Structures",
      "academicLevel": "200",
      "semester": "first",
      "academicYear": "2024/2025",
      "difficulty": "intermediate",
      "language": "en",
      "visibility": "faculty",
      "uploadStatus": "approved",
      "tags": ["assignment", "solution", "data-structures"],
      "views": 0,
      "downloads": 0,
      "createdAt": "2025-11-18T10:35:00Z"
    }
  }
}
```

---

### **Example 3: Past Questions for 400-Level Final Year**
```bash
curl -X POST http://localhost:5000/api/v1/documents \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -F "file=@past_questions_2024.pdf" \
  -F "title=CS401 Past Questions 2024" \
  -F "faculty=607f1f77bcf86cd799439011" \
  -F "department=607f1f77bcf86cd799439012" \
  -F "academicLevel=400" \
  -F "courseCode=CS401" \
  -F "course=Operating Systems" \
  -F "category=past-question" \
  -F "difficulty=advanced" \
  -F "visibility=public"
```

---

## 📊 Finding Documents by Academic Level

### **Get All 200-Level Documents**
```bash
curl http://localhost:5000/api/v1/documents/level/200 \
  ?department=607f1f77bcf86cd799439012 \
  &sort=trending \
  &limit=20
```

**Response**:
```json
{
  "status": "success",
  "results": 15,
  "total": 45,
  "page": 1,
  "pages": 3,
  "academicLevel": "200",
  "data": {
    "documents": [
      {
        "_id": "...",
        "title": "CS201 Lecture Notes",
        "academicLevel": "200",
        "category": "note",
        "downloads": 120,
        "views": 450
      },
      {
        "_id": "...",
        "title": "Data Structures Assignment",
        "academicLevel": "200",
        "category": "assignment",
        "downloads": 85,
        "views": 250
      }
    ]
  }
}
```

---

### **Get Course Materials for Specific Level**
```bash
# Get all CS201 (200-level) materials
curl http://localhost:5000/api/v1/documents/course/CS201 \
  ?academicLevel=200 \
  &sort=newest
```

---

### **Filter by Multiple Criteria Including Level**
```bash
# Get all 300-level assignments from CS department for first semester
curl http://localhost:5000/api/v1/documents \
  ?department=607f1f77bcf86cd799439012 \
  &academicLevel=300 \
  &category=assignment \
  &semester=first \
  &sort=popular \
  &limit=20
```

---

## ✅ Validation Rules

### **Academic Level Validation**
```
Valid levels: 100, 200, 300, 400, 500, postgraduate

❌ INVALID:
- academicLevel=1st   (must be numeric)
- academicLevel=year1  (must use standard format)
- academicLevel=101    (not a valid level)
- academicLevel=""     (cannot be empty - REQUIRED)

✅ VALID:
- academicLevel=100
- academicLevel=200
- academicLevel=300
- academicLevel=400
- academicLevel=500
- academicLevel=postgraduate
```

### **Other Field Validations**
```javascript
// Title
- Required: true
- Min length: 1 character
- Max length: 200 characters

// Faculty & Department
- Required: true
- Must be valid MongoDB ObjectId
- Department must belong to specified faculty

// Course Code
- Format: "CS101", "MTH201", etc.
- Max length: 20 characters
- Converted to uppercase

// Academic Year
- Format: "YYYY/YYYY" (e.g., "2024/2025")
- Required if academicYear provided

// Semester
- Valid: first, second, summer, all
- Case-sensitive

// Difficulty
- Valid: beginner, intermediate, advanced, all

// Category
- Valid: assignment, note, past-question, project, other
```

---

## 🔍 Error Responses

### **Missing Academic Level**
```bash
curl -X POST http://localhost:5000/api/v1/documents \
  -H "Authorization: Bearer {token}" \
  -F "file=@document.pdf" \
  -F "title=My Document" \
  -F "faculty=607f..." \
  -F "department=607f..."
  # Missing academicLevel!
```

**Response (Error 400)**:
```json
{
  "status": "error",
  "message": "Please specify an academic level. Valid options: 100, 200, 300, 400, 500, postgraduate"
}
```

---

### **Invalid Academic Level**
```bash
curl -X POST http://localhost:5000/api/v1/documents \
  -H "Authorization: Bearer {token}" \
  -F "file=@document.pdf" \
  -F "title=My Document" \
  -F "faculty=607f..." \
  -F "department=607f..." \
  -F "academicLevel=999"  # Invalid level!
```

**Response (Error 400)**:
```json
{
  "status": "error",
  "message": "Invalid academic level. Must be one of: 100, 200, 300, 400, 500, postgraduate"
}
```

---

### **Missing Required Fields**
```bash
curl -X POST http://localhost:5000/api/v1/documents \
  -H "Authorization: Bearer {token}" \
  -F "file=@document.pdf"
  # Missing: title, faculty, department, academicLevel!
```

**Response (Error 400)**:
```json
{
  "status": "error",
  "message": "Title is required; Faculty is required; Department is required; Academic level is required (100, 200, 300, 400, 500, or postgraduate)"
}
```

---

## 🎯 Step-by-Step Upload Process

### **For Students**
1. **Select File** - Choose PDF, DOC, or other document
2. **Enter Title** - Give your document a clear, descriptive title
3. **Choose Faculty** - Select the faculty (e.g., "Faculty of Science")
4. **Choose Department** - Select the department (e.g., "Computer Science")
5. **Choose Your Level** ⭐ - Select which level you're in:
   - 100-level (First year)
   - 200-level (Second year)
   - 300-level (Third year)
   - 400-level (Final year)
   - 500-level (Special/advanced)
   - Postgraduate (Master's/PhD)
6. **Add Course Info** (Optional) - Add course code, course name
7. **Select Category** (Optional) - Assignment, Notes, Past Questions, etc.
8. **Add Tags** (Optional) - Help others find your document
9. **Choose Visibility** (Optional) - Public, Campus, Faculty, Department, or Private
10. **Upload** - Submit!

---

## 📱 Frontend Implementation Example

### **Upload Form HTML**
```html
<form id="uploadForm" enctype="multipart/form-data">
  <!-- File Selection -->
  <div class="form-group">
    <label for="file">Select File *</label>
    <input 
      type="file" 
      id="file" 
      name="file" 
      required 
      accept=".pdf,.doc,.docx,.txt,.ppt,.pptx"
    />
  </div>

  <!-- Title -->
  <div class="form-group">
    <label for="title">Document Title *</label>
    <input 
      type="text" 
      id="title" 
      name="title" 
      required 
      placeholder="e.g., CS101 Lecture Notes"
      maxlength="200"
    />
  </div>

  <!-- Faculty Selection -->
  <div class="form-group">
    <label for="faculty">Faculty *</label>
    <select id="faculty" name="faculty" required onchange="loadDepartments()">
      <option value="">-- Select Faculty --</option>
      <option value="607f1f77bcf86cd799439011">Faculty of Science</option>
      <option value="607f1f77bcf86cd799439012">Faculty of Arts</option>
      <option value="607f1f77bcf86cd799439013">Faculty of Engineering</option>
    </select>
  </div>

  <!-- Department Selection -->
  <div class="form-group">
    <label for="department">Department *</label>
    <select id="department" name="department" required>
      <option value="">-- Select Department --</option>
    </select>
  </div>

  <!-- ACADEMIC LEVEL - REQUIRED ⭐ -->
  <div class="form-group highlighted">
    <label for="academicLevel">Academic Level *</label>
    <select id="academicLevel" name="academicLevel" required>
      <option value="">-- Select Your Academic Level --</option>
      <option value="100">100-Level (First Year)</option>
      <option value="200">200-Level (Second Year)</option>
      <option value="300">300-Level (Third Year)</option>
      <option value="400">400-Level (Final Year)</option>
      <option value="500">500-Level (Advanced/Special)</option>
      <option value="postgraduate">Postgraduate (Master's/PhD)</option>
    </select>
    <small>Required: Select which level this document is for</small>
  </div>

  <!-- Course Information -->
  <div class="form-group">
    <label for="courseCode">Course Code (Optional)</label>
    <input 
      type="text" 
      id="courseCode" 
      name="courseCode" 
      placeholder="e.g., CS101"
    />
  </div>

  <div class="form-group">
    <label for="course">Course Name (Optional)</label>
    <input 
      type="text" 
      id="course" 
      name="course" 
      placeholder="e.g., Introduction to Programming"
    />
  </div>

  <!-- Category -->
  <div class="form-group">
    <label for="category">Category (Optional)</label>
    <select id="category" name="category">
      <option value="">-- Select Category --</option>
      <option value="assignment">Assignment</option>
      <option value="note">Lecture Notes</option>
      <option value="past-question">Past Questions</option>
      <option value="project">Project</option>
      <option value="other">Other</option>
    </select>
  </div>

  <!-- Other Optional Fields -->
  <div class="form-group">
    <label for="difficulty">Difficulty (Optional)</label>
    <select id="difficulty" name="difficulty">
      <option value="all">All Levels</option>
      <option value="beginner">Beginner</option>
      <option value="intermediate">Intermediate</option>
      <option value="advanced">Advanced</option>
    </select>
  </div>

  <div class="form-group">
    <label for="visibility">Who Can Access? (Optional)</label>
    <select id="visibility" name="visibility">
      <option value="department">Department Only (Default)</option>
      <option value="faculty">Faculty Only</option>
      <option value="campus">Campus Only</option>
      <option value="public">Public</option>
      <option value="private">Private (Only Me)</option>
    </select>
  </div>

  <!-- Submit Button -->
  <button type="submit" class="btn btn-primary">
    📤 Upload Document
  </button>
</form>

<style>
  .form-group.highlighted {
    background-color: #fff3cd;
    padding: 15px;
    border-left: 4px solid #ffc107;
    border-radius: 4px;
    margin-bottom: 20px;
  }

  .form-group.highlighted label {
    font-weight: bold;
    color: #856404;
  }

  .form-group.highlighted small {
    display: block;
    margin-top: 5px;
    color: #856404;
  }
</style>
```

---

## 🚀 JavaScript Upload Handler

```javascript
const form = document.getElementById('uploadForm');

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const formData = new FormData(form);
  
  // Validate academicLevel before submission
  const level = formData.get('academicLevel');
  if (!level || level === '') {
    alert('❌ Please select your academic level!');
    return;
  }

  try {
    const response = await fetch('/api/v1/documents', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: formData
    });

    const data = await response.json();

    if (data.status === 'success') {
      alert('✅ Document uploaded successfully!');
      form.reset();
      // Redirect or update page
    } else {
      alert(`❌ Error: ${data.message}`);
    }
  } catch (error) {
    alert(`❌ Upload failed: ${error.message}`);
  }
});
```

---

## 📊 Upload Statistics by Level

Users can view how many documents are available at each level:

```bash
curl http://localhost:5000/api/v1/documents/analytics

Response:
{
  "status": "success",
  "data": {
    "overall": {
      "totalDocuments": 245,
      "totalViews": 12450,
      "totalDownloads": 5320
    },
    "byAcademicLevel": [
      { "_id": "100", "count": 45, "views": 2100 },
      { "_id": "200", "count": 62, "views": 3450 },
      { "_id": "300", "count": 75, "views": 4200 },
      { "_id": "400", "count": 45, "views": 2100 },
      { "_id": "500", "count": 12, "views": 600 },
      { "_id": "postgraduate", "count": 6, "views": 400 }
    ]
  }
}
```

---

## ✅ Checklist for Uploading

Before you upload, make sure you have:

- ✅ Document file ready (PDF, DOC, etc.)
- ✅ Clear, descriptive title
- ✅ Selected your faculty
- ✅ Selected your department
- ✅ **Selected your academic level** ⭐
- ✅ (Optional) Course code and course name
- ✅ (Optional) Document category selected
- ✅ (Optional) Appropriate visibility level set

---

## 📞 Troubleshooting

### **"Academic level is required"**
- **Solution**: Make sure to select your academic level (100-level, 200-level, etc.)

### **"Invalid academic level"**
- **Solution**: Use only valid levels: 100, 200, 300, 400, 500, postgraduate

### **"Department does not belong to the specified faculty"**
- **Solution**: Make sure the department you selected belongs to the faculty you chose

### **"Please specify a faculty"**
- **Solution**: Faculty is required - select one before uploading

### **"Please specify a department"**
- **Solution**: Department is required - select one before uploading

### **File too large**
- **Solution**: Keep files under 50MB

---

## 🎓 Benefits of Academic Levels

By selecting your academic level when uploading:

1. **Better Organization** - Documents are organized by study year
2. **Easier Discovery** - Students find materials for their level
3. **Relevant Content** - 100-level students don't see advanced 400-level materials
4. **Quality Control** - Helps faculty identify and organize course materials
5. **Analytics** - Better tracking of what each level needs
6. **Recommendations** - System can recommend materials appropriate to your level

---

## 🚀 Summary

**Academic Level Selection** is now **REQUIRED** for all document uploads. This ensures:

- ✅ Documents are properly organized by study year
- ✅ Students can easily find materials for their level
- ✅ Better categorization and discovery
- ✅ Improved analytics and statistics
- ✅ More relevant search results

**Valid Academic Levels**:
- 100 (First Year)
- 200 (Second Year)
- 300 (Third Year)
- 400 (Final Year)
- 500 (Advanced/Special)
- postgraduate (Master's/PhD)

---

**Last Updated**: November 18, 2025  
**Version**: 2.0  
**Status**: ✅ Production Ready
