# How to Create an Admin Account

## Problem
You **cannot signup as admin** through the normal signup endpoint. The signup endpoint always creates regular users.

To get admin access, you must use one of these methods:

---

## Method 1: Signup → Change Role in Database (EASIEST)

### Step 1️⃣: Signup as Regular User

**In Postman:**
```
POST http://localhost:5000/api/v1/auth/signup

Headers:
Content-Type: application/json

Body:
{
  "fullName": "Admin User",
  "email": "admin@university.edu",
  "password": "YourSecurePassword123!",
  "passwordConfirm": "YourSecurePassword123!",
  "campus": "YOUR_CAMPUS_ID"
}
```

**Steps:**
1. Create new POST request
2. URL: `http://localhost:5000/api/v1/auth/signup`
3. Headers: `Content-Type: application/json`
4. Body (raw JSON): Paste the above
5. Click **Send**

**Response (201 Created):**
```json
{
  "status": "success",
  "token": "eyJhbGc...",
  "data": {
    "user": {
      "_id": "507f1f77bcf86cd799439011",
      "fullName": "Admin User",
      "email": "admin@university.edu",
      "role": "user",  // ← Currently "user", we'll change to "admin"
      "isVerified": true,
      "campus": "..."
    }
  }
}
```

### Step 2️⃣: Change Role to Admin in MongoDB

**Using MongoDB Compass or Command Line:**

**Option A: MongoDB Command Line**
```bash
mongosh
use student_db
db.users.updateOne(
  { email: "admin@university.edu" },
  { $set: { role: "admin" } }
)
```

**Option B: MongoDB Compass**
1. Open MongoDB Compass
2. Connect to your database
3. Navigate to: `Database` → `Collections` → `users`
4. Find the user with email `admin@university.edu`
5. Edit the document
6. Change `role` from `"user"` to `"admin"`
7. Click **Update**

**Option C: MongoDB Atlas Web Interface**
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Login to your cluster
3. Click **Collections**
4. Find `users` collection
5. Search for your email
6. Edit the `role` field: `"user"` → `"admin"`
7. Save

### Step 3️⃣: Login with Admin Account

Now login with the admin credentials:

**In Postman:**
```
POST http://localhost:5000/api/v1/auth/login

Headers:
Content-Type: application/json

Body:
{
  "email": "admin@university.edu",
  "password": "YourSecurePassword123!"
}
```

**Response:**
```json
{
  "status": "success",
  "token": "eyJhbGc...",
  "data": {
    "user": {
      "role": "admin"  // ✅ Now admin!
    }
  }
}
```

✅ **You now have an admin account!**

---

## Method 2: Direct MongoDB Insertion (FASTEST)

If you have direct MongoDB access and don't want to signup first:

**Using MongoDB Command Line:**
```bash
mongosh
use student_db
db.users.insertOne({
  "fullName": "Admin User",
  "email": "admin@university.edu",
  "password": "$2b$10$...", // Bcrypt hashed password (see below)
  "role": "admin",
  "isVerified": true,
  "campus": "507f1f77bcf86cd799439011"
})
```

**Problem:** You need a bcrypt-hashed password.

**Solution:** Use Method 1 instead (much easier!)

---

## Method 3: Ask Existing Admin

If someone already has an admin account, ask them to:

1. Login with their admin credentials
2. Create your user account through admin panel (if available)
3. Set your role to admin

---

## Complete Step-by-Step Tutorial

### For Getting Campus ID First:

```
GET http://localhost:5000/api/v1/campuses

Response:
{
  "data": {
    "campuses": [
      {
        "_id": "507f1f77bcf86cd799439011",  // ← Use this
        "name": "Main Campus",
        ...
      }
    ]
  }
}
```

### Step 1: Signup

```
POST http://localhost:5000/api/v1/auth/signup
Content-Type: application/json

{
  "fullName": "Admin User",
  "email": "admin@university.edu",
  "password": "YourSecurePassword123!",
  "passwordConfirm": "YourSecurePassword123!",
  "campus": "507f1f77bcf86cd799439011"
}
```

### Step 2: Update Role in Database

**MongoDB Command:**
```javascript
db.users.updateOne(
  { email: "admin@university.edu" },
  { $set: { role: "admin" } }
)
```

**Or in MongoDB Compass:**
- Find user → Edit → Change `role: "user"` to `role: "admin"` → Update

### Step 3: Login as Admin

```
POST http://localhost:5000/api/v1/auth/login
Content-Type: application/json

{
  "email": "admin@university.edu",
  "password": "YourSecurePassword123!"
}
```

### Step 4: Copy Token

From login response, copy the `token` value

### Step 5: Use Token to Create Faculty

```
POST http://localhost:5000/api/v1/faculties
Authorization: Bearer PASTE_YOUR_TOKEN
Content-Type: application/json

{
  "name": "Science & Technology",
  "code": "ST",
  "campus": "507f1f77bcf86cd799439011"
}
```

✅ **Done! Faculty created successfully!**

---

## Postman Collection Template

Save this as a Postman collection for easy access:

```json
{
  "info": {
    "name": "Admin Setup",
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
      "name": "2. Signup",
      "request": {
        "method": "POST",
        "url": "http://localhost:5000/api/v1/auth/signup",
        "header": [{"key": "Content-Type", "value": "application/json"}],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"fullName\": \"Admin User\",\n  \"email\": \"admin@university.edu\",\n  \"password\": \"YourSecurePassword123!\",\n  \"passwordConfirm\": \"YourSecurePassword123!\",\n  \"campus\": \"CAMPUS_ID\"\n}"
        }
      }
    },
    {
      "name": "3. Login",
      "request": {
        "method": "POST",
        "url": "http://localhost:5000/api/v1/auth/login",
        "header": [{"key": "Content-Type", "value": "application/json"}],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"email\": \"admin@university.edu\",\n  \"password\": \"YourSecurePassword123!\"\n}"
        }
      }
    }
  ]
}
```

---

## Troubleshooting

### Error: "Email already registered"
- ✅ That email already exists
- ✅ Use a different email
- ✅ Or use existing account and change role

### Error: "Missing required fields"
- ✅ Check you have: fullName, email, password, passwordConfirm, campus
- ✅ All fields are required for signup

### Error: "Passwords do not match"
- ✅ password and passwordConfirm must be identical

### MongoDB command not found
- ✅ Install MongoDB: `npm install -g mongodb`
- ✅ Or use MongoDB Compass GUI instead

### Role still shows "user" after update
- ✅ Make sure you logged out and logged back in
- ✅ Or get a fresh token after changing role

---

## Summary

**Easiest Way:**
1. ✅ Signup: `POST /auth/signup`
2. ✅ Update role in MongoDB: change `role: "user"` to `role: "admin"`
3. ✅ Login: `POST /auth/login` with your credentials
4. ✅ Copy token from response
5. ✅ Use token in `Authorization: Bearer TOKEN` header for admin endpoints

**That's it! You're now an admin.** 🎉

