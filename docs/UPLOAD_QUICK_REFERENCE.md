# Document Upload - Quick Reference

**Version**: 2.0  
**Date**: November 18, 2025

---

## 📋 Upload Requirements

### **REQUIRED Fields** 🔴
These fields MUST be provided for every upload:

| Field | Type | Valid Values | Example |
|-------|------|--------------|---------|
| `file` | File | Any document | assignment.pdf |
| `title` | String | 1-200 chars | "CS101 Assignment Solutions" |
| `faculty` | ID | Valid Faculty ID | 507f1f77bcf86cd799439011 |
| `department` | ID | Valid Department ID | 607f1f77bcf86cd799439012 |
| `academicLevel` | String | 100, 200, 300, 400, 500, postgraduate | **"200"** ⭐ |

### **OPTIONAL Fields** ⚪
These fields enhance your upload but are not required:

| Field | Type | Valid Values | Default |
|-------|------|--------------|---------|
| `description` | String | Any text | - |
| `courseCode` | String | e.g., "CS101" | - |
| `course` | String | e.g., "Data Structures" | - |
| `category` | String | assignment, note, past-question, project, other | "other" |
| `semester` | String | first, second, summer, all | "all" |
| `academicYear` | String | YYYY/YYYY format | - |
| `difficulty` | String | beginner, intermediate, advanced, all | "all" |
| `language` | String | en, fr, es, other | "en" |
| `tags` | Array | Any relevant tags | [] |
| `visibility` | String | public, campus, faculty, department, private | "department" |

---

## 🎓 Academic Levels

When uploading, specify which level your document is for:

```
100          = 1st Year / Foundational
200          = 2nd Year / Intermediate
300          = 3rd Year / Advanced
400          = 4th Year / Senior
500          = Special / Upper-level
postgraduate = Master's / PhD
```

**This field is REQUIRED ⭐**

---

## ✅ Valid Upload Examples

### **Minimal Upload**
```
file: lecture.pdf
title: CS101 Notes
faculty: 507f...
department: 607f...
academicLevel: 100  ⭐ Required
```

### **Comprehensive Upload**
```
file: assignment.pdf
title: CS201 Assignment 1 Solutions
faculty: 507f...
department: 607f...
academicLevel: 200           ⭐ REQUIRED
courseCode: CS201
course: Data Structures
category: assignment
semester: first
academicYear: 2024/2025
difficulty: intermediate
tags: ["assignment", "solution"]
visibility: faculty
```

---

## ❌ Invalid Upload Examples

| Example | Problem | Solution |
|---------|---------|----------|
| Missing `academicLevel` | Level not specified | Add academicLevel: 100-500 or postgraduate |
| `academicLevel: year1` | Invalid format | Use: 100, 200, 300, 400, 500, postgraduate |
| `academicLevel: ""` | Empty level | Select a valid level |
| `academicLevel: 999` | Level doesn't exist | Use valid level |
| Missing `faculty` | Faculty not specified | Select a faculty |
| Missing `department` | Department not specified | Select a department |
| Missing `title` | No document name | Provide descriptive title |

---

## 📤 Upload Flow

```
1. Select File
   ↓
2. Enter Title
   ↓
3. Select Faculty
   ↓
4. Select Department
   ↓
5. SELECT ACADEMIC LEVEL ⭐ (REQUIRED)
   ↓
6. Add Course Info (Optional)
   ↓
7. Add Category (Optional)
   ↓
8. Set Visibility (Optional)
   ↓
9. Upload!
```

---

## 🔍 Error Messages & Solutions

| Error Message | Meaning | Fix |
|---------------|---------|-----|
| "Academic level is required" | You didn't select a level | Choose: 100, 200, 300, 400, 500, or postgraduate |
| "Invalid academic level" | Level value is wrong | Use only: 100, 200, 300, 400, 500, postgraduate |
| "Faculty is required" | No faculty selected | Select a faculty first |
| "Department is required" | No department selected | Select a department first |
| "Title is required" | No title provided | Give your document a name |
| "Please upload a file" | No file selected | Choose a document file |

---

## 💡 Tips for Better Uploads

✅ **DO:**
- ✅ Specify which year/level the content is for (100-500 or postgraduate)
- ✅ Add course code (CS101, MTH201, etc.)
- ✅ Use descriptive titles
- ✅ Add relevant tags
- ✅ Set appropriate visibility
- ✅ Specify difficulty level

❌ **DON'T:**
- ❌ Leave academic level blank (it's required!)
- ❌ Upload to wrong faculty/department
- ❌ Use unclear titles
- ❌ Forget to save/bookmark for later
- ❌ Make everything public if it's sensitive

---

## 📊 Academic Level Descriptions

### **100-Level (First Year)**
- Introductory courses
- Foundation courses
- Basic concepts
- **Examples**: Introduction to Programming, Basic Mathematics, English 101

### **200-Level (Second Year)**
- Intermediate courses
- Building on basics
- Specialized topics begin
- **Examples**: Data Structures, Calculus II, Physics II

### **300-Level (Third Year)**
- Advanced courses
- Specialized focus
- In-depth study
- **Examples**: Algorithms, Advanced Programming, Organic Chemistry

### **400-Level (Final Year)**
- Senior/Capstone courses
- Major projects
- Comprehensive topics
- **Examples**: Operating Systems, Software Engineering, Research Methods

### **500-Level (Advanced/Special)**
- Upper-level courses
- Special topics
- Advanced research
- **Examples**: Advanced Algorithms, Special Topics, Independent Study

### **Postgraduate**
- Master's level
- PhD level
- Research-focused
- **Examples**: Advanced Research, Thesis Seminars, Graduate Topics

---

## 📱 Mobile Upload

On mobile devices, the upload form includes:

1. **File Picker** - Select document from phone
2. **Title Input** - Give document a name
3. **Faculty Dropdown** - Select faculty
4. **Department Dropdown** - Select department
5. **Level Selector** ⭐ - Select your academic level
6. **Category Selector** - Choose document type
7. **Submit Button** - Upload!

---

## 🚀 API Endpoint

```
POST /api/v1/documents
Authorization: Bearer {token}
Content-Type: multipart/form-data

REQUIRED fields:
- file (document file)
- title (string)
- faculty (ID)
- department (ID)
- academicLevel (100, 200, 300, 400, 500, postgraduate) ⭐
```

---

## ✨ Benefits of Proper Academic Level Selection

By choosing the correct academic level:

1. **Better Organization** - Materials grouped by year of study
2. **Easy Discovery** - Find materials for your level
3. **Relevant Results** - No mixing of different level materials
4. **Quality Analytics** - System understands demand by level
5. **Better Recommendations** - Get materials matching your level

---

## 📞 Support

**If upload fails:**
1. Check all REQUIRED fields are filled
2. Verify academic level is selected
3. Ensure faculty/department are valid
4. Check file is not too large
5. Try again or contact support

**Required fields reminder:**
- ✅ File
- ✅ Title
- ✅ Faculty
- ✅ Department
- ✅ Academic Level ⭐

---

**Last Updated**: November 18, 2025  
**Status**: ✅ Production Ready
