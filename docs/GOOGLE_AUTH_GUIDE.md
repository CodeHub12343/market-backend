# 🔐 Google Authentication Integration Guide

## Overview
Two-step Google Sign-In flow with campus selection to ensure users select their campus before account creation.

---

## 🔧 Backend Setup

### Environment Variables (`.env` / `config.env`)
```env
GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID_HERE
# If using server-side flow later:
# GOOGLE_CLIENT_SECRET=YOUR_SECRET_HERE
```

Get your `GOOGLE_CLIENT_ID` from [Google Cloud Console](https://console.cloud.google.com/):
1. Create a new project
2. Enable Google+ API
3. Create OAuth 2.0 credentials (Web application)
4. Add authorized JavaScript origins: `http://localhost:3000`, `https://yourdomain.com`
5. Add authorized redirect URIs: `http://localhost:3000/auth/callback`
6. Copy the Client ID to `.env`

### Installed Dependencies
```bash
npm install google-auth-library
```

### Database Models
- `User` — Updated with `googleId` and `provider` fields
- `TempGoogleAuth` — Auto-expires temp signup tokens after 15 minutes

---

## 📡 API Endpoints

### 1. **POST /api/v1/auth/google-verify**
Verify Google ID token and get temp token for campus selection.

**Request:**
```json
{
  "idToken": "eyJhbGciOiJSUzI1NiIsImtpZCI6IiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (New User):**
```json
{
  "status": "success",
  "message": "Please select your campus to complete signup",
  "data": {
    "tempToken": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
    "email": "user@gmail.com",
    "fullName": "John Doe",
    "picture": "https://lh3.googleusercontent.com/..."
  }
}
```

**Response (Existing User):**
```json
{
  "status": "success",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "data": {
    "user": {
      "_id": "507f1f77bcf86cd799439011",
      "fullName": "John Doe",
      "email": "user@gmail.com",
      "campus": "507f1f77bcf86cd799439012",
      "googleId": "118368752375982376598",
      "provider": "google",
      "avatar": { "url": "https://lh3.googleusercontent.com/..." }
    }
  }
}
```

---

### 2. **POST /api/v1/auth/google-complete**
Complete signup by selecting campus.

**Request:**
```json
{
  "tempToken": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
  "campusId": "507f1f77bcf86cd799439012"
}
```

**Response:**
```json
{
  "status": "success",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "data": {
    "user": {
      "_id": "507f1f77bcf86cd799439013",
      "fullName": "John Doe",
      "email": "user@gmail.com",
      "campus": "507f1f77bcf86cd799439012",
      "googleId": "118368752375982376598",
      "provider": "google",
      "isVerified": true,
      "role": "buyer"
    }
  }
}
```

---

## 🎨 Frontend Integration

### Step 1: Install Google Identity Services
```html
<!-- In your HTML head -->
<script src="https://accounts.google.com/gsi/client" async defer></script>
```

### Step 2: Add Sign-In Button
```html
<div id="g_id_onload"
     data-client_id="YOUR_GOOGLE_CLIENT_ID"
     data-callback="handleSignInSuccess">
</div>
<div class="g_id_signin" data-type="standard"></div>
```

### Step 3: Handle Sign-In and Campus Selection (React Example)
```javascript
import { useState } from 'react';

function GoogleAuthFlow() {
  const [step, setStep] = useState('signin'); // 'signin' | 'campus-select' | 'complete'
  const [tempToken, setTempToken] = useState(null);
  const [userData, setUserData] = useState(null);
  const [campuses, setCampuses] = useState([]);
  const [selectedCampus, setSelectedCampus] = useState(null);
  const [loading, setLoading] = useState(false);

  // Step 1: Handle Google Sign-In
  const handleSignInSuccess = async (response) => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/auth/google-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: response.credential })
      });

      const data = await res.json();

      if (data.token) {
        // User already exists and linked, save JWT and redirect
        localStorage.setItem('token', data.token);
        window.location.href = '/dashboard';
      } else if (data.data.tempToken) {
        // New user, proceed to campus selection
        setTempToken(data.data.tempToken);
        setUserData(data.data);
        
        // Fetch list of campuses
        const campusRes = await fetch('/api/v1/campuses');
        const campusData = await campusRes.json();
        setCampuses(campusData.data || []);
        
        setStep('campus-select');
      }
    } catch (error) {
      console.error('Google Sign-In failed:', error);
      alert('Sign-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Handle Campus Selection
  const handleCompleteCampusSelection = async () => {
    if (!selectedCampus) {
      alert('Please select a campus');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/v1/auth/google-complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tempToken,
          campusId: selectedCampus
        })
      });

      const data = await res.json();

      if (data.token) {
        // Account created successfully, save JWT
        localStorage.setItem('token', data.token);
        // Redirect to dashboard
        window.location.href = '/dashboard';
      } else {
        alert(data.message || 'Sign-up failed');
      }
    } catch (error) {
      console.error('Campus selection failed:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // UI: Sign-In Step
  if (step === 'signin') {
    return (
      <div>
        <h2>Sign In with Google</h2>
        <div id="g_id_onload"
             data-client_id={process.env.REACT_APP_GOOGLE_CLIENT_ID}
             data-callback="handleSignInSuccess">
        </div>
        <div className="g_id_signin" data-type="standard"></div>
      </div>
    );
  }

  // UI: Campus Selection Step
  if (step === 'campus-select') {
    return (
      <div style={{ maxWidth: '400px', margin: '0 auto', padding: '20px' }}>
        <h2>Welcome, {userData?.fullName}!</h2>
        <p>Please select your campus to complete registration:</p>
        
        <select 
          value={selectedCampus || ''} 
          onChange={(e) => setSelectedCampus(e.target.value)}
          style={{ width: '100%', padding: '10px', marginBottom: '10px' }}
        >
          <option value="">-- Select Campus --</option>
          {campuses.map((campus) => (
            <option key={campus._id} value={campus._id}>
              {campus.name}
            </option>
          ))}
        </select>

        <button 
          onClick={handleCompleteCampusSelection}
          disabled={loading || !selectedCampus}
          style={{ 
            width: '100%', 
            padding: '10px',
            backgroundColor: selectedCampus ? '#1f2937' : '#d1d5db',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: selectedCampus ? 'pointer' : 'not-allowed'
          }}
        >
          {loading ? 'Creating account...' : 'Complete Signup'}
        </button>
      </div>
    );
  }
}

export default GoogleAuthFlow;
```

---

## 🧪 Testing with cURL

### Test 1: Verify Google Token
```bash
curl -X POST http://localhost:3000/api/v1/auth/google-verify \
  -H "Content-Type: application/json" \
  -d '{
    "idToken": "YOUR_ACTUAL_GOOGLE_ID_TOKEN_HERE"
  }'
```

### Test 2: Complete Campus Selection
```bash
curl -X POST http://localhost:3000/api/v1/auth/google-complete \
  -H "Content-Type: application/json" \
  -d '{
    "tempToken": "TEMP_TOKEN_FROM_STEP_1",
    "campusId": "CAMPUS_ID_HERE"
  }'
```

---

## 🔄 Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    USER CLICKS GOOGLE SIGNIN                     │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    Google OAuth Popup
                              ↓
                  User authenticates with Google
                              ↓
                 Frontend receives ID Token
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  POST /api/v1/auth/google-verify (ID Token)                     │
│  Backend: Verify token with Google, create temp token           │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    ┌─────────┴─────────┐
                    ↓                   ↓
           Existing User?          New User?
                    ↓                   ↓
              Return JWT         Show Campus Picker
                    ↓                   ↓
               Redirect                ↓
              Dashboard        ┌───────────────────┐
                               │ Select Campus    │
                               │ from Dropdown    │
                               └───────────────────┘
                                     ↓
        ┌─────────────────────────────────────────────────────┐
        │  POST /api/v1/auth/google-complete                 │
        │  (Temp Token + Campus ID)                           │
        │  Backend: Create User, Delete Temp Token, Return JWT│
        └─────────────────────────────────────────────────────┘
                              ↓
                       Return JWT
                              ↓
                    Save to localStorage
                              ↓
                      Redirect to Dashboard
```

---

## 🔐 Security Considerations

1. **HTTPS Only**: Always use HTTPS in production; never send tokens over HTTP.
2. **Token Validation**: Backend validates every ID token with Google servers.
3. **Temp Token Expiry**: Temp tokens auto-delete after 15 minutes.
4. **CORS Setup**: Configure CORS to allow requests only from trusted domains.
5. **Password**: Google users get a random password; they can set one in account settings if they want local login.

---

## 🐛 Troubleshooting

### "Invalid or expired Google idToken"
- Ensure `GOOGLE_CLIENT_ID` matches the one in your OAuth settings.
- Check that the frontend is sending the correct `idToken`.
- Verify the token hasn't expired (they're valid for ~1 hour).

### "Campus not found"
- Ensure the `campusId` is a valid MongoDB ObjectId.
- Check that the campus exists in the database.

### "Email already registered"
- User with this email already exists.
- If user wants to link Google: implement account linking flow (not yet implemented).

### Temp token expired
- User took too long to select campus (>15 mins).
- Restart the sign-in process.

---

## 📝 Next Steps

1. Set `GOOGLE_CLIENT_ID` in `.env`
2. Integrate Google Sign-In button on frontend
3. Test the flow with a real Google account
4. Monitor temp token cleanup (auto-deletes after 15 mins)
5. (Optional) Implement account linking to allow Google sign-in for existing local accounts

---

## 📚 Resources

- [Google Identity Services Documentation](https://developers.google.com/identity)
- [google-auth-library NPM](https://www.npmjs.com/package/google-auth-library)
- [OAuth 2.0 Overview](https://developers.google.com/identity/protocols/oauth2)
