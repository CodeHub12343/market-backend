# Chat Enhancement Testing Guide

## Overview

Three major features have been implemented and are ready for testing:
1. ✅ **File Attachment Upload** - Send files with messages
2. ✅ **Toast Notification System** - User feedback and alerts
3. ✅ **Group Chat Creation** - Create group conversations

---

## Setup Instructions

### 1. Root Layout Configuration ✅ DONE
- File: [src/app/layout.js](src/app/layout.js)
- Status: Created with all providers wrapped (QueryClientProvider, AuthProvider, SocketProvider, NotificationProvider)
- No additional setup needed!

### 2. Supporting Libraries ✅ DONE
- [src/lib/react-query.js](src/lib/react-query.js) - React Query configuration
- [src/lib/cookies.js](src/lib/cookies.js) - Cookie management utilities
- [src/hooks/useAuth.js](src/hooks/useAuth.js) - Authentication hook

---

## Feature 1: File Attachment Upload

### Components Modified
- **MessageInput.jsx** - Added file upload functionality with preview

### How It Works
```javascript
// In MessageInput.jsx
const [attachments, setAttachments] = useState([]);

// User selects file → shows preview
// Ctrl+Enter or click Send → uploads with FormData
// Backend receives file via Cloudinary
```

### Files Supported
- Images: jpg, png, gif, webp, bmp
- Documents: pdf, doc, docx, xls, xlsx, ppt, pptx, txt, zip
- Audio: mp3, wav, m4a
- Video: mp4, webm, mov

### Testing Steps

1. **Navigate to Messages**
   - Go to [http://localhost:3000/messages](http://localhost:3000/messages)

2. **Select or Create a Chat**
   - Click on an existing 1:1 chat or create a new one

3. **Open a Chat Detail**
   - Click on the chat to open the detail view

4. **Upload a File**
   - Click the **📎** (paperclip) button in the message input
   - Select a file from your computer
   - You should see a preview thumbnail appear above the input
   - Type a message or leave blank
   - Click **Send** or press **Ctrl+Enter**

5. **Verify Success**
   - Green success toast should appear: "✅ Message sent with 1 file"
   - File should appear in the chat message with download option

6. **Test Multiple Files**
   - Repeat step 4 to add multiple files
   - Send multiple files at once
   - Verify all files appear in the message

### Expected Behavior

**Before Send:**
```
┌─────────────────────────┐
│ [Image Thumbnail] [PDF] │  ← File previews
│ ┌──────────────────────┐│
│ │ Type message here... ││  ← Input
│ │ Ctrl+Enter to send   ││
│ └──────────────────────┘│
│ 📎 ➤                    │  ← Buttons
└─────────────────────────┘
```

**Success Toast:**
```
┌─────────────────────────┐
│ ✅ Message sent        │
│    With 2 files         │
│                    ✕   │  ← Auto-dismisses after 3s
└─────────────────────────┘
```

### Common Issues

| Issue | Solution |
|-------|----------|
| File preview doesn't show | Check browser console for errors; file might be too large |
| Send button disabled | Make sure you have text OR at least one file selected |
| File appears but can't download | Check that Cloudinary URL is valid in message |
| Keyboard shortcut doesn't work | Ctrl+Enter (Windows) or Cmd+Enter (Mac) while message input focused |

---

## Feature 2: Toast Notification System

### Components Involved
- **NotificationContext.jsx** - State management for toasts
- **Toast.jsx** - Toast component with animations
- **Layout.js** - Renders ToastContainer at top-level

### Notification Types

```javascript
// Using in any component:
const { showSuccess, showError, showWarning, showInfo } = useNotification();

// Examples:
showSuccess('Upload Complete', 'File saved successfully', 3000);
showError('Failed', 'Please try again', 4000);
showWarning('Warning', 'Action cannot be undone', 3000);
showInfo('Info', 'This is an informational message', 3000);
```

### Testing Steps

1. **File Upload Success** (already tested in Feature 1)
   - Send message with file attachment
   - Verify green success toast appears in top-right

2. **Send Message Without Attachment**
   - Type a regular message (no file)
   - Send it
   - Should not show a notification (only for file uploads)

3. **Test Error Toast** (requires actual error)
   - Try sending message when not connected to socket
   - Should show red error toast

4. **Toast Auto-Dismiss**
   - Send a message with file
   - Watch green success toast appear
   - After 3 seconds, it should fade out
   - Or click ✕ button to dismiss manually

### Toast Appearance

**Success Toast:**
```
┌─────────────────────────────┐
│ ✅ Message sent            │
│    With 1 file              │  ← Auto-dismiss after 3s
│                        ✕   │
└─────────────────────────────┘
```

**Error Toast:**
```
┌─────────────────────────────┐
│ ❌ Failed to send         │
│    Network error            │  ← Requires manual dismiss or auto-dismiss
│                        ✕   │
└─────────────────────────────┘
```

**Position:** Fixed top-right corner (responsive for mobile)

### Styling Details
- Success: Green (#d4edda) with green border (#28a745)
- Error: Red (#f8d7da) with red border (#dc3545)
- Warning: Yellow (#fff3cd) with yellow border (#ffc107)
- Info: Blue (#d1ecf1) with blue border (#17a2b8)

---

## Feature 3: Group Chat Creation

### Components Involved
- **CreateGroupChatModal.jsx** - Modal form for creating groups
- **MessagesPage.js** - Updated with "+" button to open modal

### How It Works

1. **User clicks "+" button** in messages sidebar
2. **Modal opens** with form fields
3. **User enters:**
   - Group name (required)
   - Description (optional)
   - Select members (minimum 2)
4. **User clicks Create**
5. **New group chat created and user navigated to it**

### Testing Steps

1. **Navigate to Messages**
   - Go to [http://localhost:3000/messages](http://localhost:3000/messages)

2. **Open Create Group Modal**
   - Click the **+** button in the top-right of the sidebar
   - Modal should slide in with backdrop

3. **Fill Group Information**
   - Enter group name: "Study Group"
   - Enter description (optional): "CS101 Study"
   - Press Tab or click in the input

4. **Search and Select Members**
   - In the "Search members" field, type a user's name or email
   - Users matching the search should appear
   - Click checkbox to select
   - Selected members appear in "Selected Members" section below

5. **Add Multiple Members**
   - Search for another user
   - Click checkbox to select
   - Repeat to select 3-4 members total
   - Each selected member shows with an "X" remove button

6. **Validate Form**
   - Try to create with < 2 members (should show error)
   - Try to create with empty group name (should show error)

7. **Create Group**
   - Click **Create Group** button
   - Green success toast should appear
   - Modal closes
   - Page navigates to new group chat

8. **Verify Group Created**
   - New group should appear in chat list
   - Clicking it shows the group conversation
   - Members should be listed in chat header

### Modal Form Validation

```javascript
// Form validation rules:
1. Group name: Required, min 1 character
2. Members: Minimum 2 required
3. No duplicate members allowed

// Error messages:
- "Group name is required"
- "Select at least 2 members"
```

### Modal Features

**Layout:**
```
┌──────────────────────────────┐
│ Create Group Chat        ✕   │  ← Close button
├──────────────────────────────┤
│ Group Name *                 │
│ ┌─────────────────────────┐  │
│ │ Study Group             │  │
│ └─────────────────────────┘  │
│                              │
│ Description                  │
│ ┌─────────────────────────┐  │
│ │ Optional group purpose  │  │
│ └─────────────────────────┘  │
│                              │
│ Search members *             │
│ ┌─────────────────────────┐  │
│ │ Type to search...       │  │
│ └─────────────────────────┘  │
│ [☑] John Doe john@uni.com   │  ← Checkboxes
│ [☑] Jane Smith jane@uni.com │
│ [ ] Bob Wilson bob@uni.com  │
│                              │
│ Selected Members: 2          │
│ ✕ John Doe                  │  ← Remove buttons
│ ✕ Jane Smith                │
│                              │
│                     [Cancel] [Create Group] │
└──────────────────────────────┘
```

### Testing Error Cases

1. **Close Modal**
   - Click ✕ button or click backdrop
   - Modal should close

2. **Validation Errors**
   - Click Create with empty form
   - Should show: "Group name is required"
   - Should show: "Select at least 2 members"

3. **Search Not Working**
   - If users don't appear, check backend API
   - Verify `/api/v1/users/search` endpoint exists

---

## End-to-End Testing Scenario

### Scenario: Create Group and Send File

1. **Start at Messages page**
   ```
   Sidebar shows list of 1:1 chats
   ```

2. **Create Group Chat**
   ```
   Click "+" → Modal opens
   Enter name: "Project Team"
   Search for 3 members → Select
   Click Create → Green toast appears
   Modal closes → Navigate to group chat
   ```

3. **Send Message with File in Group**
   ```
   In group chat detail view
   Click 📎 button → Select file
   Preview shows → Type message
   Press Ctrl+Enter → Green success toast
   File appears in chat
   ```

4. **Verify Real-time Updates**
   ```
   Open second browser/incognito window
   Log in as different user
   Both users should see:
   - New group chat appeared in list
   - File message in real-time
   ```

---

## Monitoring & Debugging

### Browser Console Logs

**File Upload:**
```
📝 Attachments updated: [...]
📤 Sending message with formData
📤 Payload being sent: FormData
✅ Message sent successfully
📬 New message notification: ...
```

**Notification System:**
```
🔔 Notification added: {type, title, message}
🔔 Toast rendered with ID: 12345
🔔 Auto-dismissing toast after 3000ms
```

**Group Creation:**
```
🔄 Creating group chat: {name, description, memberIds}
✅ Group created: ID 12345
🔄 Navigating to /messages/12345
```

### Network Requests to Monitor

**Feature 1 - File Upload:**
```
POST /api/v1/messages
Headers: Content-Type: multipart/form-data
Body: FormData with chatId, content, attachments
Response: { status: 'success', data: { message } }
```

**Feature 3 - Group Creation:**
```
POST /api/v1/chats/group
Headers: Content-Type: application/json
Body: { name, description, memberIds }
Response: { status: 'success', data: { chat } }
```

---

## Known Limitations & Future Improvements

### Current Limitations
1. Group users list is hardcoded placeholder - needs API integration
2. File previews are client-side only - backend needs to store file URLs
3. No file size validation on client (backend validates)
4. No drag-and-drop support yet

### Future Enhancements
1. **Drag-and-drop file upload**
2. **File size limit display** (e.g., "Max 10MB")
3. **Multiple selection improvements** (Select All, Deselect All)
4. **Group member management** (Add/Remove after creation)
5. **Typing indicators for file uploads**
6. **File download progress** for large files
7. **Image thumbnail generation** for previews
8. **Voice message recording**

---

## Rollback Instructions

If something goes wrong, these files can be safely removed or reset:

1. **Root Layout** → Delete `src/app/layout.js` (will cause errors, recreate immediately)
2. **Notification System** → Remove NotificationProvider from layout.js
3. **Toast Component** → Safe to remove, notifications will fail silently
4. **Group Modal** → Remove from imports in `src/app/(protected)/messages/page.js`

---

## Testing Checklist

### ✅ File Upload Feature
- [ ] Click paperclip button
- [ ] Select single file
- [ ] See preview thumbnail
- [ ] Send message (Ctrl+Enter)
- [ ] See green success toast
- [ ] File appears in chat
- [ ] Select multiple files
- [ ] Send multiple files at once
- [ ] Toast shows correct file count

### ✅ Notification System
- [ ] Success toast appears green
- [ ] Toast auto-dismisses after 3 seconds
- [ ] Click X to manually dismiss
- [ ] Toast appears in top-right
- [ ] Multiple toasts stack vertically
- [ ] Toast animation smooth (slide-in/out)
- [ ] Different notification types work

### ✅ Group Chat Creation
- [ ] Click "+" button in sidebar
- [ ] Modal opens with form
- [ ] Type group name
- [ ] Add optional description
- [ ] Search for members works
- [ ] Checkboxes select/deselect
- [ ] Selected members show below
- [ ] Can remove selected member with X
- [ ] Create button creates group
- [ ] New group appears in chat list
- [ ] Navigate to group chat on creation
- [ ] Error toast on validation failure

### ✅ Integration
- [ ] All three features work together
- [ ] No console errors
- [ ] Socket.IO events fire correctly
- [ ] Files persist after page reload
- [ ] Group chats persist after page reload
- [ ] Multiple users see updates in real-time

---

## Support

If you encounter issues:

1. **Check browser console** for error messages
2. **Check network tab** for failed requests
3. **Verify backend APIs** are running and accessible
4. **Look for TODO comments** in code for incomplete sections
5. **Check this guide's "Common Issues"** sections

---

**Status: ✅ READY FOR TESTING** 🚀
