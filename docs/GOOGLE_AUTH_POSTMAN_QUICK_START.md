# 🚀 Quick Start: Testing Google Auth in Postman

## Import the Collection

1. Open **Postman**
2. Click **Import** (top left)
3. Select **Upload Files**
4. Choose the file: `GOOGLE_AUTH_POSTMAN_COLLECTION.json`
5. Click **Import**

You'll see 4 pre-built requests ready to test!

---

## Step-by-Step Testing

### ✅ Step 1: Get Campus List
- Click the request: **"1️⃣ Get Campus List"**
- Click **Send**
- Look in the response and **copy one campus `_id`**  
  Example: `"_id": "507f1f77bcf86cd799439012"`

---

### ✅ Step 2: Verify Google Token
- Get a Google ID token:
  1. Go to [Google OAuth Playground](https://developers.google.com/oauthplayground)
  2. Select **Google+ API v1** → `https://www.googleapis.com/auth/userinfo.email`
  3. Click **Authorize APIs**
  4. Click **Exchange authorization code for tokens**
  5. Copy the **id_token** (the long string)

- Click the request: **"2️⃣ Verify Google Token (Step 1)"**
- In the **Body** tab, find this line:
  ```json
  "idToken": "PASTE_YOUR_GOOGLE_ID_TOKEN_HERE"
  ```
- Replace `PASTE_YOUR_GOOGLE_ID_TOKEN_HERE` with your ID token
- Click **Send**

**What to expect:**
- If you're a NEW user, you'll get:
  ```json
  {
    "status": "success",
    "message": "Please select your campus to complete signup",
    "data": {
      "tempToken": "abc123def456...",
      "email": "yourname@gmail.com",
      "fullName": "Your Name",
      "picture": "https://..."
    }
  }
  ```
  **Copy the `tempToken`!**

- If you're an EXISTING user, you'll get:
  ```json
  {
    "status": "success",
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "data": { "user": {...} }
  }
  ```
  **Copy the `token`!** (You're done - skip to Step 4)

---

### ✅ Step 3: Complete Signup with Campus (NEW USERS ONLY)
- Click the request: **"3️⃣ Complete Signup with Campus (Step 2)"**
- In the **Body** tab, replace:
  - `PASTE_TEMP_TOKEN_FROM_STEP_2` → paste your tempToken from Step 2
  - `PASTE_CAMPUS_ID_FROM_STEP_1` → paste campus id from Step 1
  
  Example:
  ```json
  {
    "tempToken": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
    "campusId": "507f1f77bcf86cd799439012"
  }
  ```

- Click **Send**

**What to expect:**
```json
{
  "status": "success",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "data": {
    "user": {
      "_id": "507f1f77bcf86cd799439013",
      "fullName": "Your Name",
      "email": "yourname@gmail.com",
      "campus": "507f1f77bcf86cd799439012",
      "googleId": "118368752375982376598",
      "provider": "google",
      "isVerified": true
    }
  }
}
```

**Copy the `token`!**

---

### ✅ Step 4: Test Your JWT
- Click the request: **"4️⃣ Get User Info (Test Auth)"**
- In the **Headers** tab, find the **Authorization** header
- Replace `PASTE_YOUR_JWT_TOKEN_HERE` with the JWT token from Step 2 or 3
  
  Example:
  ```
  Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
  ```

- Click **Send**

**What to expect:**
```json
{
  "status": "success",
  "data": {
    "user": {
      "_id": "507f1f77bcf86cd799439013",
      "fullName": "Your Name",
      "email": "yourname@gmail.com",
      "campus": "507f1f77bcf86cd799439012",
      "googleId": "118368752375982376598",
      "provider": "google"
    }
  }
}
```

---

## 🎉 Success!

If you got a response in Step 4, your Google authentication is working perfectly! 

You can now:
- Use this JWT for any authenticated request
- Add it to the `Authorization: Bearer` header on other requests
- Use it in your frontend to authenticate users

---

## 🐛 Troubleshooting

| Error | Fix |
|-------|-----|
| "Invalid or expired Google idToken" | Get a fresh ID token from Google OAuth Playground |
| "Campus not found" | Use a valid campusId from Step 1 |
| "Please select a campus" | Make sure campusId is provided in Step 3 |
| "Invalid or expired temp token" | Temp tokens expire after 15 minutes, restart from Step 2 |

---

## 💡 Tips

- **Bookmark this guide** for quick reference
- **Keep your ID token handy** for repeated testing
- **Each temp token is valid for 15 minutes** - if you take too long, restart from Step 2
- **JWT tokens are valid for 90 days** - you can use them for testing authenticated endpoints

---

**Happy Testing! 🚀**
