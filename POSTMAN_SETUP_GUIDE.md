# Postman Guide: Creating Faculties and Departments

## Overview

You need to create **Faculties** first, then **Departments** under those faculties.

### Step 0: Find Your Campus ID

**Request:**
```
GET http://localhost:5000/api/v1/campuses
```

**What to do:**
1. Open Postman
2. Create new request
3. Method: `GET`
4. URL: `http://localhost:5000/api/v1/campuses`
5. Click **Send**
6. Copy the `_id` from the response (you'll need this for creating faculties)

**Example Response:**
```json
{
  "status": "success",
  "data": {
    "campuses": [
      {
        "_id": "507f1f77bcf86cd799439011",  // ← Copy this ID
        "name": "Main Campus",
        "code": "MAIN",
        ...
      }
    ]
  }
}
```

---

## Step 1: Create a Faculty

**Endpoint:** `POST /api/v1/faculties`

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```

⚠️ **IMPORTANT:** You must be logged in as an **ADMIN** user. Get your JWT token by logging in first.

**Request Body:**
```json
{
  "name": "Science & Technology",
  "code": "ST",
  "campus": "507f1f77bcf86cd799439011",
  "description": "Faculty of Science and Technology",
  "email": "science@university.edu",
  "phoneNumber": "+234 1 234 5678",
  "website": "https://science.university.edu"
}
```

**Required Fields:**
- `name` - Faculty name (string)
- `code` - Faculty code, e.g., "ST", "ENG" (will be converted to uppercase)
- `campus` - Campus ID (from Step 0)

**Optional Fields:**
- `description` - Faculty description
- `dean` - Dean name/ID
- `email` - Faculty email
- `phoneNumber` - Contact number
- `website` - Faculty website
- `image` - Faculty image URL

**Steps in Postman:**
1. Create new request
2. Method: `POST`
3. URL: `http://localhost:5000/api/v1/faculties`
4. Go to **Headers** tab, add:
   - Key: `Authorization`
   - Value: `Bearer YOUR_JWT_TOKEN`
5. Go to **Body** tab, select **raw** → **JSON**
6. Paste the request body above
7. Click **Send**

**Expected Response (201 Created):**
```json
{
  "status": "success",
  "message": "Faculty created successfully.",
  "data": {
    "faculty": {
      "_id": "607f1f77bcf86cd799439012",  // ← Save this ID for Step 2
      "name": "Science & Technology",
      "code": "ST",
      "campus": "507f1f77bcf86cd799439011",
      ...
    }
  }
}
```

**Copy the `_id` from the response - you'll need it for Step 2!**

---

## Step 2: Create Departments

**Endpoint:** `POST /api/v1/departments`

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Computer Science",
  "code": "CS",
  "faculty": "607f1f77bcf86cd799439012",
  "description": "Department of Computer Science",
  "email": "cs@university.edu",
  "phoneNumber": "+234 1 234 5678",
  "website": "https://cs.university.edu",
  "programLevels": ["100", "200", "300", "400"]
}
```

**Required Fields:**
- `name` - Department name (string)
- `code` - Department code, e.g., "CS", "MATH" (will be uppercase)
- `faculty` - Faculty ID (from Step 1 response)

**Optional Fields:**
- `description` - Department description
- `hod` - Head of Department name/ID
- `email` - Department email
- `phoneNumber` - Contact number
- `website` - Department website
- `image` - Department image URL
- `programLevels` - Available levels (defaults to 100, 200, 300, 400)

**Steps in Postman:**
1. Create new request
2. Method: `POST`
3. URL: `http://localhost:5000/api/v1/departments`
4. Go to **Headers** tab, add:
   - Key: `Authorization`
   - Value: `Bearer YOUR_JWT_TOKEN`
5. Go to **Body** tab, select **raw** → **JSON**
6. Paste the request body (replace faculty ID with the one from Step 1)
7. Click **Send**

**Expected Response (201 Created):**
```json
{
  "status": "success",
  "message": "Department created successfully.",
  "data": {
    "department": {
      "_id": "707f1f77bcf86cd799439013",
      "name": "Computer Science",
      "code": "CS",
      "faculty": "607f1f77bcf86cd799439012",
      ...
    }
  }
}
```

---

## Create Multiple Faculties & Departments

### Faculty 1: Science & Technology

**POST /api/v1/faculties**
```json
{
  "name": "Science & Technology",
  "code": "ST",
  "campus": "507f1f77bcf86cd799439011",
  "description": "Science and Technology Faculty"
}
```

**Departments under Science & Technology:**

1. **POST /api/v1/departments**
```json
{
  "name": "Computer Science",
  "code": "CS",
  "faculty": "FACULTY_ID_FROM_ABOVE",
  "description": "Department of Computer Science"
}
```

2. **POST /api/v1/departments**
```json
{
  "name": "Mathematics",
  "code": "MATH",
  "faculty": "FACULTY_ID_FROM_ABOVE",
  "description": "Department of Mathematics"
}
```

3. **POST /api/v1/departments**
```json
{
  "name": "Physics",
  "code": "PHY",
  "faculty": "FACULTY_ID_FROM_ABOVE",
  "description": "Department of Physics"
}
```

---

### Faculty 2: Engineering

**POST /api/v1/faculties**
```json
{
  "name": "Engineering",
  "code": "ENG",
  "campus": "507f1f77bcf86cd799439011",
  "description": "Faculty of Engineering"
}
```

**Departments under Engineering:**

1. **POST /api/v1/departments**
```json
{
  "name": "Civil Engineering",
  "code": "CE",
  "faculty": "FACULTY_ID_FROM_ABOVE",
  "description": "Department of Civil Engineering"
}
```

2. **POST /api/v1/departments**
```json
{
  "name": "Mechanical Engineering",
  "code": "ME",
  "faculty": "FACULTY_ID_FROM_ABOVE",
  "description": "Department of Mechanical Engineering"
}
```

---

## Get Your JWT Token

If you don't have a JWT token yet:

**Endpoint:** `POST /api/v1/auth/login`

**Body:**
```json
{
  "email": "admin@university.edu",
  "password": "your_password"
}
```

**Response:**
```json
{
  "status": "success",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "data": {
    "user": {
      "role": "admin",
      ...
    }
  }
}
```

Copy the `token` value and use it in the `Authorization: Bearer TOKEN` header.

---

## Verify Everything Worked

After creating faculties and departments, test your frontend:

**GET /api/v1/faculties**
```
http://localhost:5000/api/v1/faculties
```

Should return:
```json
{
  "status": "success",
  "data": {
    "faculties": [
      {
        "_id": "...",
        "name": "Science & Technology",
        "code": "ST",
        ...
      },
      {
        "_id": "...",
        "name": "Engineering",
        "code": "ENG",
        ...
      }
    ]
  }
}
```

**GET /api/v1/departments?faculty=FACULTY_ID**
```
http://localhost:5000/api/v1/departments?faculty=607f1f77bcf86cd799439012
```

Should return departments for that faculty.

---

## Postman Collection Template

You can import this as a Postman collection:

```json
{
  "info": {
    "name": "Faculty & Department Setup",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "1. Get Campus ID",
      "request": {
        "method": "GET",
        "url": "http://localhost:5000/api/v1/campuses"
      }
    },
    {
      "name": "2. Create Faculty",
      "request": {
        "method": "POST",
        "url": "http://localhost:5000/api/v1/faculties",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer YOUR_TOKEN"
          },
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"name\": \"Science & Technology\",\n  \"code\": \"ST\",\n  \"campus\": \"CAMPUS_ID\"\n}"
        }
      }
    },
    {
      "name": "3. Create Department",
      "request": {
        "method": "POST",
        "url": "http://localhost:5000/api/v1/departments",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer YOUR_TOKEN"
          },
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"name\": \"Computer Science\",\n  \"code\": \"CS\",\n  \"faculty\": \"FACULTY_ID\"\n}"
        }
      }
    }
  ]
}
```

---

## Summary

1. ✅ Get campus ID: `GET /campuses`
2. ✅ Create faculty: `POST /faculties` (copy ID from response)
3. ✅ Create departments: `POST /departments` (use faculty ID from step 2)
4. ✅ Reload your frontend
5. ✅ Faculty and department dropdowns should now work!

---

**Quick Reference:**

| What | Method | URL | Auth Required |
|------|--------|-----|---------------|
| Get Campuses | GET | `/api/v1/campuses` | ❌ |
| Create Faculty | POST | `/api/v1/faculties` | ✅ Admin |
| Get Faculties | GET | `/api/v1/faculties` | ❌ |
| Create Department | POST | `/api/v1/departments` | ✅ Admin |
| Get Departments | GET | `/api/v1/departments` | ❌ |

