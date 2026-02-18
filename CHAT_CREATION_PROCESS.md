# Chat Creation Process Walkthrough

## Overview
The chat creation process in your application supports two types of chats:
1. **1:1 (One-to-One) Chats** - Direct messages between two users
2. **Group Chats** - Group conversations with multiple members

---

## Part 1: 1:1 Chat Creation Flow

### Step 1: User Initiates Chat
**Where it starts:** Any component that needs to start a chat with a user

**Example scenarios:**
- Click "Message" button on a user's profile
- Click message icon on a roommate listing
- Click a user in search results
- Click a user card anywhere in the app

**Code trigger:**
```javascript
// Component imports the hook
import { useGetOrCreateChat } from '@/hooks/useChats';

// Inside component
const createChatMutation = useGetOrCreateChat();

// User clicks message button
const handleStartChat = async (otherUserId) => {
  createChatMutation.mutate(otherUserId, {
    onSuccess: (chat) => {
      // Navigate to chat
      router.push(`/messages/${chat._id}`);
    },
    onError: (error) => {
      // Show error to user
      toast.error(error.message);
    }
  });
};
```

### Step 2: Frontend Hook Execution
**File:** [`src/hooks/useChats.js`](src/hooks/useChats.js) - `useGetOrCreateChat()` hook

```javascript
export const useGetOrCreateChat = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (otherUserId) => 
      chatService.getOrCreateOneToOneChat(otherUserId),
    
    onSuccess: (data) => {
      console.log('💬 NEW 1:1 CHAT CREATED - updating chat list');
      
      // Invalidate and refetch chats to show new chat
      queryClient.invalidateQueries({ 
        queryKey: ['chats', user?._id],
        exact: false
      });
      
      // Refetch chats
      queryClient.refetchQueries({ 
        queryKey: ['chats', user?._id],
        exact: false
      }).then(() => {
        console.log('✅ ChatList updated with new 1:1 chat');
      });
      
      // Cache the new chat
      queryClient.setQueryData(['chat', user?._id, data._id], data);
    }
  });
};
```

**What happens:**
1. Mutation receives `otherUserId` parameter
2. Calls API service function `getOrCreateOneToOneChat(otherUserId)`
3. On success, invalidates chat list cache
4. Refetches chats to show new chat in ChatList
5. Caches the new chat data

### Step 3: API Service Call
**File:** [`src/services/chat.js`](src/services/chat.js) - `getOrCreateOneToOneChat()` function

```javascript
export const getOrCreateOneToOneChat = async (userId) => {
  try {
    console.log('📤 Creating 1:1 chat with userId:', userId);
    
    // Make POST request to backend
    const response = await api.post(`/chats/one-to-one`, {
      userId
    });
    
    // Extract chat from response
    const chatData = response.data?.data?.chat;
    
    if (!chatData) {
      throw new Error('Failed to create chat - response structure incorrect');
    }
    
    if (!chatData._id) {
      throw new Error('Failed to create chat - chat has no _id');
    }
    
    console.log('✅ Chat created with ID:', chatData._id);
    return chatData;
  } catch (error) {
    console.error('❌ Error creating chat:', error);
    throw error.response?.data || error;
  }
};
```

**What it does:**
1. Makes HTTP POST request to `POST /api/v1/chats/one-to-one`
2. Sends the other user's ID in request body
3. Extracts chat data from response: `response.data.data.chat`
4. Validates that chat has `_id` field
5. Returns chat object or throws error

### Step 4: Backend Controller Logic
**File:** [`controllers/chatController.js`](controllers/chatController.js) - `getOrCreateOneToOneChat()` handler

```javascript
exports.getOrCreateOneToOneChat = catchAsync(async (req, res, next) => {
  const { userId } = req.body;
  if (!userId) return next(new AppError('userId is required', 400));

  // 1. Validate other user exists
  const otherUser = await User.findById(userId);
  if (!otherUser) return next(new AppError('User not found', 404));

  // 2. Try to find existing 1:1 chat between these two users
  let chat = await Chat.findOne({
    members: { $all: [req.user.id, userId] },      // Both users in members
    $expr: { $eq: [{ $size: '$members' }, 2] },   // Exactly 2 members
    status: 'active'                                 // Chat is active
  });

  // 3. If no chat exists, create new one
  if (!chat) {
    chat = await Chat.create({
      members: [req.user.id, userId],
      createdBy: req.user.id,
      type: 'one-to-one'
    });
  }

  // 4. Populate member details (name, email, photo, campus, role)
  await chat.populate('members', 'fullName email photo campus role');

  // 5. Emit real-time event to both users
  const io = req.app.get('io');
  if (io && chat?.members?.length > 0) {
    // Build online status for each member
    const onlineMap = {};
    for (const member of chat.members) {
      const memberId = member._id.toString();
      const sockets = await io.of('/').in(`user_${memberId}`).fetchSockets();
      onlineMap[memberId] = !!(sockets && sockets.length > 0);
    }

    // Send newChat event to both users' rooms
    const payload = { chat: chat.toObject(), onlineMap };
    for (const member of chat.members) {
      const memberId = member._id.toString();
      io.to(`user_${memberId}`).emit('newChat', payload);
    }
  }

  // 6. Send response to frontend
  res.status(200).json({ status: 'success', data: { chat } });
});
```

**Backend flow:**
1. Extract `userId` from request body
2. Verify the other user exists in database
3. Query database for existing chat:
   - Find where `members` array contains both users
   - Ensure exactly 2 members (not a group)
   - Status is 'active'
4. If chat doesn't exist, create one with:
   - Both users as members
   - Current user as creator
   - Type = 'one-to-one'
5. Populate member information (names, profiles, campus, role)
6. Emit Socket.IO event `newChat` to both users' rooms
7. Return chat object in response

### Step 5: Real-Time Updates via Socket.IO
**File:** [`src/context/SocketContext.jsx`](src/context/SocketContext.jsx)

When backend emits `newChat` event:

```javascript
// Backend emits: io.to(`user_${memberId}`).emit('newChat', payload)

// Frontend listens
socket.on('newChat', (payload) => {
  // payload = { chat: {...}, onlineMap: {...} }
  console.log('📬 Received newChat event:', payload);
  
  // Update React Query cache
  queryClient.setQueryData(['chats'], (oldChats) => {
    if (!oldChats) return [payload.chat];
    return [payload.chat, ...oldChats];
  });
});
```

### Step 6: UI Updates
**File:** [`src/components/chat/ChatList.jsx`](src/components/chat/ChatList.jsx)

```javascript
export default function ChatList() {
  // 1. Fetch all chats for current user
  const { data: chats, isLoading } = useAllChats();
  
  // 2. Monitor for new chats from socket events
  useEffect(() => {
    socket?.on('newChat', (payload) => {
      // Chat list automatically updates from cache
      queryClient.refetchQueries(['chats']);
    });
    
    return () => socket?.off('newChat');
  }, [socket, queryClient]);

  // 3. Render chat list
  return (
    <Container>
      <ChatsList>
        {chats?.map(chat => (
          <ChatItem
            key={chat._id}
            $active={selectedChatId === chat._id}
            onClick={() => router.push(`/messages/${chat._id}`)}
          >
            <ChatName>{chat.name || getOtherUserName(chat)}</ChatName>
            {/* Unread count, last message, etc */}
          </ChatItem>
        ))}
      </ChatsList>
    </Container>
  );
}
```

### Complete 1:1 Chat Creation Sequence Diagram

```
User clicks "Message" button
           ↓
Component calls createChatMutation.mutate(userId)
           ↓
useGetOrCreateChat hook (useChats.js)
           ↓
chatService.getOrCreateOneToOneChat(userId)
           ↓
POST /api/v1/chats/one-to-one { userId }
           ↓
Backend Controller:
  - Verify user exists
  - Check if chat exists
  - Create chat if needed
  - Populate member data
  - Emit Socket.IO 'newChat' event
  - Return chat object
           ↓
Frontend receives response
           ↓
useGetOrCreateChat onSuccess:
  - Invalidate ['chats', userId] query
  - Refetch chats list
  - Cache new chat
           ↓
Component navigates to /messages/{chatId}
           ↓
useChat hook loads chat details
           ↓
UI renders ChatList + ChatWindow
           ↓
Socket.IO event 'newChat' emitted to other user
           ↓
Other user's ChatList automatically updates (in real-time)
```

---

## Part 2: Group Chat Creation Flow

### Step 1: User Creates Group Chat
**Example:** User clicks "Create Group Chat" button

```javascript
import { useCreateGroupChat } from '@/hooks/useChats';

const CreateGroupChatModal = () => {
  const createGroupMutation = useCreateGroupChat();

  const handleCreateGroup = (formData) => {
    createGroupMutation.mutate({
      name: formData.groupName,        // "Project Team A"
      memberIds: formData.selectedIds, // ['user1', 'user2', 'user3']
      description: formData.description,
      settings: formData.settings,
      tags: formData.tags
    });
  };

  return (
    <form onSubmit={handleCreateGroup}>
      {/* Form fields */}
    </form>
  );
};
```

### Step 2: Frontend Hook (useCreateGroupChat)
**File:** [`src/hooks/useChats.js`](src/hooks/useChats.js)

```javascript
export const useCreateGroupChat = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (chatData) => chatService.createGroupChat(chatData),
    onSuccess: (data) => {
      console.log('💬 NEW GROUP CHAT CREATED - updating chat list');
      
      // Invalidate chats cache
      queryClient.invalidateQueries({ 
        queryKey: ['chats', user?._id],
        exact: false
      });
      
      // Refetch to show new group
      queryClient.refetchQueries({ 
        queryKey: ['chats', user?._id],
        exact: false
      }).then(() => {
        console.log('✅ ChatList updated with new group chat');
      });
      
      queryClient.setQueryData(['chat', user?._id, data._id], data);
    }
  });
};
```

### Step 3: API Service Call
**File:** [`src/services/chat.js`](src/services/chat.js)

```javascript
export const createGroupChat = async (chatData) => {
  try {
    const response = await api.post(`/chats/group`, chatData);
    return response.data.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};
```

### Step 4: Backend Controller
**File:** [`controllers/chatController.js`](controllers/chatController.js)

```javascript
exports.createGroupChat = catchAsync(async (req, res, next) => {
  const { name, memberIds, description, settings, tags } = req.body;
  
  // 1. Validate input
  if (!name || !Array.isArray(memberIds) || memberIds.length < 2) {
    return next(new AppError(
      'Provide name and memberIds (array, min 2 other members)', 
      400
    ));
  }

  // 2. Verify all members exist
  const members = await User.find({ _id: { $in: memberIds } });
  if (members.length !== memberIds.length) {
    return next(new AppError('One or more users not found', 400));
  }

  // 3. Create group (always add current user)
  const allMembers = Array.from(new Set([req.user.id, ...memberIds]));
  const chat = await Chat.create({
    name,
    description,
    members: allMembers,
    createdBy: req.user.id,
    admins: [req.user.id],          // Creator is admin
    type: 'group',
    settings: settings || {},
    tags: tags || []
  });

  // 4. Populate member info
  await chat.populate('members', 'fullName email photo campus role');

  // 5. Emit Socket.IO event to all members
  const io = req.app.get('io');
  if (io && chat?.members?.length > 0) {
    const onlineMap = {};
    for (const member of chat.members) {
      const memberId = member._id.toString();
      const sockets = await io.of('/').in(`user_${memberId}`).fetchSockets();
      onlineMap[memberId] = !!(sockets && sockets.length > 0);
    }
    
    const payload = { chat: chat.toObject(), onlineMap };
    for (const member of chat.members) {
      const memberId = member._id.toString();
      io.to(`user_${memberId}`).emit('newChat', payload);
    }
  }

  // 6. Send response
  res.status(201).json({ status: 'success', data: { chat } });
});
```

---

## Part 3: Key Data Structures

### Chat Model
```javascript
{
  _id: ObjectId,
  
  // Basic info
  name: String,              // e.g., "Project Team A" (for groups)
  description: String,       // Group description
  
  // Members
  members: [UserId],         // Array of user IDs in this chat
  createdBy: UserId,         // User who created the chat
  admins: [UserId],          // Group admins (for groups)
  
  // Status
  type: 'one-to-one' | 'group',
  status: 'active' | 'archived',
  
  // Settings
  settings: {
    allowNotifications: Boolean,
    allowImages: Boolean,
    // ... other settings
  },
  tags: [String],
  
  // Metadata
  createdAt: Date,
  updatedAt: Date,
  
  // Virtual: lastMessage, unreadCount (computed)
}
```

### Response Structure
```javascript
// Backend response
{
  status: 'success',
  data: {
    chat: {
      _id: '...',
      name: '...',
      members: [
        { _id: '...', fullName: '...', email: '...', photo: '...', campus: '...' },
        // ... more members
      ],
      createdBy: { ... },
      type: 'one-to-one',
      status: 'active',
      createdAt: '2024-01-14T...',
      updatedAt: '2024-01-14T...'
    }
  }
}
```

---

## Part 4: React Query Cache Keys

### Cache invalidation patterns:
```javascript
// After creating any chat (1:1 or group):

// 1. Invalidate chats list
queryClient.invalidateQueries({ 
  queryKey: ['chats', userId]
});

// 2. Invalidate all chat-related queries
queryClient.invalidateQueries({ 
  queryKey: ['chats']
});

// 3. Set specific chat in cache
queryClient.setQueryData(['chat', userId, chatId], chatData);
```

### Query keys used:
```javascript
['chats', userId]              // All chats for user
['chat', chatId]               // Single chat details
['searchChats', query]         // Chat search results
['searchUsers', query]         // User search for inviting
['requestOffers', requestId]   // Offers on requests (unrelated)
```

---

## Part 5: Common Patterns in Your App

### Pattern 1: Message Button → Chat Creation
```javascript
// In user profile, roommate card, etc.
<Button 
  onClick={() => createChatMutation.mutate(otherUserId)}
>
  Message
</Button>
```

### Pattern 2: Chat List Auto-Updates
```javascript
// Automatic updates via:
// 1. React Query: queryClient.invalidateQueries()
// 2. Socket.IO: socket.on('newChat')
// 3. Component re-renders with latest data
```

### Pattern 3: Loading States
```javascript
const { mutate, isPending } = useGetOrCreateChat();

<Button disabled={isPending}>
  {isPending ? 'Creating...' : 'Message'}
</Button>
```

### Pattern 4: Error Handling
```javascript
mutate(userId, {
  onSuccess: (chat) => {
    router.push(`/messages/${chat._id}`);
  },
  onError: (error) => {
    toast.error(error.message || 'Failed to create chat');
  }
});
```

---

## Part 6: Socket.IO Real-Time Events

### Events emitted by backend:
```javascript
// When 1:1 or group chat is created
io.to(`user_${memberId}`).emit('newChat', {
  chat: {...},
  onlineMap: {
    'userId1': true,   // online
    'userId2': false   // offline
  }
});

// When new message arrives
io.to(`chat_${chatId}`).emit('newMessage', {
  message: {...},
  chatId: '...'
});

// When user goes online/offline
io.to(`chat_${chatId}`).emit('userOnline', { userId, status });
```

### Frontend listeners:
```javascript
socket.on('newChat', (payload) => {
  // Update chat list
});

socket.on('newMessage', (payload) => {
  // Update messages for current chat
});

socket.on('userOnline', (payload) => {
  // Update online status indicators
});
```

---

## Part 7: Troubleshooting Chat Creation

### Issue: Chat doesn't appear in list after creation

**Diagnosis:**
```javascript
// Check if mutation succeeded
createChatMutation.isPending   // Should be false after success
createChatMutation.isError     // Should be false

// Check React Query cache
queryClient.getQueryData(['chats', userId])  // Should have new chat

// Check Socket.IO connection
socket.connected  // Should be true
```

**Solution:**
```javascript
// Manual refetch if needed
queryClient.refetchQueries({ 
  queryKey: ['chats', userId] 
});

// Or force reload chats
const { refetch } = useAllChats();
refetch();
```

### Issue: Duplicate chats in list

**Cause:** Both mutation success and Socket.IO event updating cache

**Solution:** Socket.IO event listener should check if chat already exists
```javascript
socket.on('newChat', (payload) => {
  queryClient.setQueryData(['chats', userId], (oldChats) => {
    // Check if chat already exists
    const chatExists = oldChats?.some(c => c._id === payload.chat._id);
    if (chatExists) return oldChats;  // Don't add duplicate
    
    return [payload.chat, ...oldChats];
  });
});
```

### Issue: Other user doesn't see new chat immediately

**Cause:** Socket.IO event not received (usually network issue)

**Solution:**
1. Check Socket.IO connection: `socket.connected`
2. Verify user is in correct room: `user_${userId}`
3. Check browser console for socket errors
4. Fallback: Chat list refetches every 5 minutes (stale time)

---

## Summary

**Chat Creation involves:**
1. ✅ User clicks "Message" button
2. ✅ Frontend mutation calls API
3. ✅ Backend checks for existing chat or creates new one
4. ✅ Response returns chat object
5. ✅ Frontend invalidates cache & refetches chats
6. ✅ Socket.IO emits event to both users
7. ✅ Chat lists update in real-time
8. ✅ User can navigate to `/messages/{chatId}` to send first message

**Key files:**
- **Service:** `src/services/chat.js`
- **Hooks:** `src/hooks/useChats.js`
- **Controller:** `controllers/chatController.js`
- **UI:** `src/components/chat/ChatList.jsx`
- **Model:** `models/chatModel.js`
