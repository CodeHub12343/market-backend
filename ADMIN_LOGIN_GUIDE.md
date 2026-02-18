# How to Login as Admin in Postman

## Problem
You got a **403 Forbidden** error when trying to create a faculty:
```json
{
  "status": "error",
  "type": "AuthorizationError",
  "message": "You do not have permission to perform this action.",
  "code": 403
}
```

**Why?** You need to be logged in as an **ADMIN** user and include the JWT token in your request headers.

---

## Solution: Step-by-Step

### Step 1️⃣: Login to Get Admin Token

**Request:**
```
POST http://localhost:5000/api/v1/auth/login
```

**Headers:**
```
Content-Type: application/json
```

**Body (raw JSON):**
```json
{
  "email": "admin@university.edu",
  "password": "your_admin_password"
}
```

**Steps in Postman:**
1. Create a new request
2. Method: **POST**
3. URL: `http://localhost:5000/api/v1/auth/login`
4. Go to **Headers** tab:
   - Key: `Content-Type`
   - Value: `application/json`
5. Go to **Body** tab → **raw** → **JSON**
6. Paste the login credentials
7. Click **Send**

**Expected Response (200 OK):**
```json
{
  "status": "success",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjVlYzExZjJhZjQwYjJkNDM0YzQ0NDBhMiIsImlhdCI6MTU5MzEwNDU5MCwiZXhwIjoxNjAwODgyNTkwfQ.abcdefg...",
  "data": {
    "user": {
      "_id": "5ec11f2af40b2d434c4440a2",
      "name": "Admin User",
      "email": "admin@university.edu",
      "role": "admin",  // ← Important: Must be "admin"
      "isVerified": true,
      "campus": "507f1f77bcf86cd799439011",
      ...
    }
  }
}
```

### Step 2️⃣: Copy the Token

From the response above, **copy the entire `token` value** (the long string starting with `eyJhbGc...`)

### Step 3️⃣: Create Faculty Request (with Token)

Now create a new request to create a faculty:

**Request:**
```
POST http://localhost:5000/api/v1/faculties
```

**Headers:**
```
Authorization: Bearer PASTE_TOKEN_HERE
Content-Type: application/json
```

**Body (raw JSON):**
```json
{
  "name": "Science & Technology",
  "code": "ST",
  "campus": "507f1f77bcf86cd799439011",
  "description": "Faculty of Science and Technology"
}
```

**Steps in Postman:**
1. Create a new request
2. Method: **POST**
3. URL: `http://localhost:5000/api/v1/faculties`
4. Go to **Headers** tab:
   - Key: `Authorization`
   - Value: `Bearer TOKEN_FROM_LOGIN_RESPONSE`
   - Key: `Content-Type`
   - Value: `application/json`
5. Go to **Body** tab → **raw** → **JSON**
6. Paste the faculty data
7. Click **Send** ✅

---

## ⚠️ Important Notes

### 1. User Must Be Admin
- Your user account must have `role: "admin"`
- Check your database or ask the app owner if you have admin access
- Non-admin users will get 403 error

### 2. User Must Be Verified
- You must have verified your email address
- If you get an error about verification, complete email verification first

### 3. Token Expires
- JWT tokens expire (usually after 7 days)
- If you get 401 error, login again to get a fresh token

### 4. Token Format
The authorization header must be exactly:
```
Authorization: Bearer YOUR_TOKEN_HERE
```
Note the word "Bearer" (with capital B) and the space!

---

## What If You Don't Have Admin User?

If you don't have an admin account, you need to:

1. **Check existing users** - ask your app owner or check the database
2. **Create admin account** - direct database access (MongoDB):
```javascript
db.users.insertOne({
  name: "Admin User",
  email: "admin@university.edu",
  password: "HASHED_PASSWORD", // Use bcrypt to hash
  role: "admin",
  isVerified: true,
  campus: "CAMPUS_ID"
})
```

Or use your app's signup endpoint and then manually update the role in MongoDB:
```javascript
db.users.updateOne(
  { email: "admin@university.edu" },
  { $set: { role: "admin" } }
)
```

---

## Quick Reference: Postman Requests

### Request 1: Login
```
POST http://localhost:5000/api/v1/auth/login
Content-Type: application/json

{
  "email": "admin@university.edu",
  "password": "your_password"
}
```

### Request 2: Create Faculty (with token)
```
POST http://localhost:5000/api/v1/faculties
Authorization: Bearer PASTE_YOUR_TOKEN
Content-Type: application/json

{
  "name": "Science & Technology",
  "code": "ST",
  "campus": "CAMPUS_ID",
  "description": "Faculty description"
}
```

### Request 3: Create Department (with token)
```
POST http://localhost:5000/api/v1/departments
Authorization: Bearer PASTE_YOUR_TOKEN
Content-Type: application/json

{
  "name": "Computer Science",
  "code": "CS",
  "faculty": "FACULTY_ID",
  "description": "Department description"
}
```

---

## Postman Environment Variable (Optional)

To make life easier, create a Postman environment variable:

1. Click **Environments** on the left
2. Create a new environment named "Local"
3. Add this variable:
   - Variable: `token`
   - Initial Value: (leave empty)
   - Current Value: (leave empty)
4. In the login request **Tests** tab, add:
```javascript
if (pm.response.code === 200) {
  pm.environment.set("token", pm.response.json().token);
}
```
5. Now use `{{token}}` in Authorization headers: `Bearer {{token}}`

---

## Troubleshooting

### Error: "Incorrect email or password"
- ❌ Wrong email or password
- ✅ Double-check credentials
- ✅ Ask app owner for correct credentials

### Error: "You do not have permission"
- ❌ User is not admin
- ✅ Check user `role` field in database
- ✅ Change role to "admin" in database

### Error: "Please verify your email"
- ❌ Email not verified
- ✅ Check verification email in inbox
- ✅ Click verification link

### Error: "Invalid token" or 401
- ❌ Token expired or invalid
- ✅ Login again to get fresh token
- ✅ Check token format: `Bearer TOKEN` (with space)

### Still Getting 403?
1. Login and check response - is `role: "admin"`?
2. Copy token exactly (no extra spaces)
3. Use format: `Authorization: Bearer TOKEN`
4. Make sure you're creating faculty/departments AFTER authentication

---

## Summary

1. ✅ Login: `POST /auth/login` with email & password
2. ✅ Copy token from response
3. ✅ Add to headers: `Authorization: Bearer TOKEN`
4. ✅ Now create faculties/departments ✨

