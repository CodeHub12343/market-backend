# Profile System - Complete Frontend Implementation Guide

## 📋 Overview

This is a complete end-to-end profile system for your Next.js application with the following features:

- **View Profile** - Display own or other users' profiles
- **Edit Profile** - Update personal information
- **Profile Stats** - Show posts, followers, following counts & profile completion
- **Follow/Unfollow** - Follow other users
- **Block/Unblock** - Block users from viewing your profile
- **Settings** - Manage preferences and privacy
- **Account Management** - Delete/deactivate account

## 🗂️ File Structure

```
src/
├── services/
│   └── profile.js                 # API service calls
├── hooks/
│   ├── useProfile.js              # Fetch user profile
│   ├── useProfileStats.js         # Get profile stats
│   ├── useFollowing.js            # Follow/unfollow logic
│   └── useBlocking.js             # Block/unblock logic
├── components/profile/
│   ├── ProfileHeader.jsx          # Profile header with user info
│   ├── ProfileStats.jsx           # Stats display component
│   ├── FollowButton.jsx           # Follow/unfollow button
│   └── ProfileForm.jsx            # Edit profile form
└── app/(protected)/profile/
    ├── page.js                    # View profile page
    ├── edit/page.js               # Edit profile page
    └── settings/page.js           # Settings page
```

## 🚀 Quick Start

### 1. Set Up API Service

The `profile.js` service is already created with all endpoints:

```javascript
import * as profileService from '@/services/profile';

// Fetch current user's profile
const profile = await profileService.getMyProfile();

// Get any user's public profile
const userProfile = await profileService.getUserProfile(userId);

// Update profile
await profileService.updateProfile({ fullName, bio, ... });

// Follow/unfollow
await profileService.followUser(userId);
await profileService.unfollowUser(userId);

// Block/unblock
await profileService.blockUser(userId);
await profileService.unblockUser(userId);
```

### 2. Use Hooks in Components

```javascript
'use client';

import { useProfile } from '@/hooks/useProfile';
import { useProfileStats } from '@/hooks/useProfileStats';
import { useFollowUser } from '@/hooks/useFollowing';

export function MyComponent() {
  const { profile, isLoading } = useProfile();
  const { stats } = useProfileStats();
  const { follow, unfollow } = useFollowUser();

  return (
    // Your JSX
  );
}
```

### 3. Add Navigation Links

Update your navigation/header to include profile links:

```javascript
<Link href="/profile">My Profile</Link>
<Link href="/profile/edit">Edit Profile</Link>
<Link href="/profile/settings">Settings</Link>
```

## 📱 Component Details

### ProfileHeader
Displays user's basic information and avatar.

**Props:**
- `userId` - (optional) User ID to view. If not provided, shows current user
- `onEditClick` - Callback when edit button is clicked

**Usage:**
```javascript
<ProfileHeader userId="user123" onEditClick={() => router.push('/profile/edit')} />
```

### ProfileStats
Shows statistics: posts, followers, following, reviews, profile completion.

**Props:**
- `userId` - User ID for stats
- `onStatClick` - Callback when a stat is clicked

**Usage:**
```javascript
<ProfileStats onStatClick={(stat) => console.log(stat)} />
```

### FollowButton
Button to follow/unfollow a user.

**Props:**
- `userId` - User to follow (required)
- `initialFollowing` - Whether user is already following
- `onFollowChange` - Callback when follow status changes

**Usage:**
```javascript
<FollowButton 
  userId="user123" 
  initialFollowing={false}
  onFollowChange={(userId, isFollowing) => console.log(isFollowing)}
/>
```

### ProfileForm
Form to edit profile information.

**Props:**
- `onSave` - Callback when profile is saved
- `onCancel` - Callback when cancelled

**Usage:**
```javascript
<ProfileForm 
  onSave={() => router.push('/profile')}
  onCancel={() => router.back()}
/>
```

## 🔗 Pages & Routes

### /profile
View your profile with stats.

```javascript
// Route: /profile
// Shows: Profile header, stats, follow button
```

### /profile?id=userId
View another user's profile.

```javascript
// Route: /profile?id=694a4720a7a850104f712162
// Shows: Public profile of another user
```

### /profile/edit
Edit your profile information.

```javascript
// Route: /profile/edit
// Shows: Profile form to edit info, upload avatar, etc.
```

### /profile/settings
Manage account settings and preferences.

```javascript
// Route: /profile/settings
// Shows: Notification settings, privacy, account deletion
```

## 🎨 Styling

All components use `styled-components`. Customize the theme by modifying color variables:

```javascript
// Current theme colors
const primaryColor = '#667eea';
const primaryDark = '#764ba2';
const dangerColor = '#ff6b6b';
const successColor = '#1b8a1b';
const lightGray = '#f0f0f0';
const borderColor = '#e0e0e0';
```

To change colors globally, update the color values in each component's styled declarations.

## 📡 API Endpoints Used

All backend endpoints (already implemented):

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/v1/profile/me` | Get current user's profile |
| GET | `/api/v1/profile/users/:id` | Get public profile |
| PATCH | `/api/v1/profile/me` | Update profile |
| POST | `/api/v1/profile/me/avatar` | Upload avatar |
| DELETE | `/api/v1/profile/me/avatar` | Delete avatar |
| PATCH | `/api/v1/profile/me/preferences` | Update preferences |
| GET | `/api/v1/profile/me/stats` | Get profile stats |
| GET | `/api/v1/profile/users/:id/followers` | Get followers list |
| GET | `/api/v1/profile/users/:id/following` | Get following list |
| POST | `/api/v1/profile/users/:id/follow` | Follow user |
| DELETE | `/api/v1/profile/users/:id/follow` | Unfollow user |
| POST | `/api/v1/profile/users/:id/block` | Block user |
| DELETE | `/api/v1/profile/users/:id/block` | Unblock user |
| DELETE | `/api/v1/profile/me` | Delete account |

## 🔐 Authentication

All protected routes require authentication via the `protect` middleware. The user must be logged in.

Current user info available via:
```javascript
import { useAuth } from '@/hooks/useAuth';

const { user, token } = useAuth();
console.log(user._id); // Current user ID
```

## 📝 Data Model

### User Profile Structure
```javascript
{
  _id: "694a4720a7a850104f712162",
  fullName: "John Doe",
  email: "john@example.com",
  phoneNumber: "+1234567890",
  bio: "Student at university",
  department: "Computer Science",
  graduationYear: 2024,
  avatar: {
    url: "https://...",
    publicId: "cloudinary_id"
  },
  campus: {
    _id: "...",
    name: "Main Campus"
  },
  socialLinks: [],
  preferences: {
    emailNotifications: true,
    pushNotifications: true,
    profileVisibility: "public",
    language: "en",
    currency: "USD"
  },
  followers: ["user_id_1", "user_id_2"],
  following: ["user_id_3"],
  blockedUsers: ["user_id_4"],
  createdAt: "2024-12-01T10:00:00Z",
  lastLogin: "2024-12-24T07:42:17Z",
  isActive: true
}
```

## 🔄 Data Flow

### Viewing a Profile
1. User navigates to `/profile` or `/profile?id=userId`
2. `useProfile()` hook fetches data via `profileService.getMyProfile()` or `getUserProfile()`
3. Components render profile header, stats, follow button
4. Data cached by React Query for 5 minutes

### Editing Profile
1. User clicks "Edit Profile"
2. Routes to `/profile/edit`
3. `ProfileForm` loads current data via `useProfile()`
4. User updates form and clicks "Save"
5. `updateProfile()` sends data to backend
6. Query cache invalidated, data refetched

### Following a User
1. User clicks "Follow" button
2. `useFollowUser()` sends POST to `/profile/users/:id/follow`
3. Followers/following lists updated
4. Button state toggled to "Following"

### Settings Management
1. User navigates to `/profile/settings`
2. Current preferences loaded
3. User changes toggle/select values
4. `updatePreferences()` sends data
5. Changes applied immediately

## 🐛 Common Issues & Solutions

### Profile not loading
**Problem:** Profile shows "Loading..." indefinitely

**Solution:** Ensure token is valid
```javascript
const { user: currentUser } = useAuth();
console.log(currentUser); // Should have _id
```

### Follow button not updating
**Problem:** Follow/unfollow doesn't reflect in UI

**Solution:** Ensure mutations are invalidating correct query keys
```javascript
queryClient.invalidateQueries({ queryKey: ['following', userId] });
```

### Avatar not uploading
**Problem:** Avatar upload fails

**Solution:** Make sure the avatar object has correct structure
```javascript
const avatar = {
  url: 'https://...',
  publicId: 'cloudinary_id' // optional
};
```

## 🚨 Production Checklist

- [ ] Test all routes with different users
- [ ] Verify privacy settings work (private/public profiles)
- [ ] Test follow/unfollow functionality
- [ ] Test account deletion with password confirmation
- [ ] Ensure avatar upload works with Cloudinary
- [ ] Test on mobile devices
- [ ] Add error boundaries around profile components
- [ ] Implement avatar image compression before upload
- [ ] Add confirmation dialogs for destructive actions
- [ ] Set up proper error logging

## 📚 Related Documentation

- Backend Profile API: See `controllers/profileController.js`
- Authentication: See `AuthContext.jsx` and `useAuth()` hook
- Styled Components: https://styled-components.com/docs
- React Query: https://tanstack.com/query/latest

## ✨ Future Enhancements

- [ ] Profile verification badges
- [ ] User search functionality
- [ ] Profile feed/activity stream
- [ ] Profile themes/customization
- [ ] Social media links integration
- [ ] Profile views counter
- [ ] User recommendations
- [ ] Profile analytics dashboard
