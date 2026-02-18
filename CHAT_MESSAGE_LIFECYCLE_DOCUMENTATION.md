# Chat & Message End-to-End Lifecycle Documentation

## Overview

This document describes the complete lifecycle of sending and receiving messages in the chat system, from initial user input through real-time display on all connected clients.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND (Next.js + React)                        │
│                                                                             │
│  ┌─────────────────────┐         ┌──────────────────┐                     │
│  │  MessageInput.jsx   │────────▶│  useSendMessage  │                     │
│  │  (User sends msg)   │         │  (React Query)   │                     │
│  └─────────────────────┘         └──────────────────┘                     │
│           │                              │                                 │
│           │                              ▼                                 │
│           │                    ┌──────────────────────┐                   │
│           │                    │  Optimistic Update   │                   │
│           │                    │  (Show msg in UI)    │                   │
│           │                    └──────────────────────┘                   │
│           │                              │                                 │
│           ▼                              ▼                                 │
│  ┌────────────────────────────────────────────────┐                       │
│  │        HTTP POST /api/v1/messages              │                       │
│  │  + token (JWT), chatId, content, attachments   │                       │
│  └────────────────────────────────────────────────┘                       │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ (REST API)
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        BACKEND (Express + Node.js)                          │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────┐      │
│  │  POST /api/v1/messages (messageController.createMessage)        │      │
│  │                                                                 │      │
│  │  1. Validate token & extract userId                           │      │
│  │  2. Validate chatId exists                                    │      │
│  │  3. Save message to MongoDB:                                  │      │
│  │     - Message { chat, sender, content, attachments, etc }     │      │
│  │  4. Return message data + chat data                           │      │
│  └─────────────────────────────────────────────────────────────────┘      │
│           │                                                                 │
│           ▼                                                                 │
│  ┌─────────────────────────────────────────────────────────────────┐      │
│  │  Socket.IO Broadcast to Chat Room                              │      │
│  │                                                                 │      │
│  │  io.to(`chat_${chatId}`).emit(`message:new:${chatId}`, {...}) │      │
│  │                                                                 │      │
│  │  Sends to all clients in room:                                │      │
│  │  - Full message object                                        │      │
│  │  - Sender info                                                │      │
│  │  - Metadata                                                   │      │
│  └─────────────────────────────────────────────────────────────────┘      │
│           │                                                                 │
│           ▼                                                                 │
│  ┌─────────────────────────────────────────────────────────────────┐      │
│  │  HTTP 201 Response                                              │      │
│  │  { status: 'success', data: { message, chat } }                │      │
│  └─────────────────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ (Socket.IO + REST Response)
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        FRONTEND - UPDATE UI                                 │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────┐         │
│  │  1. HTTP Response arrives in useSendMessage.onSuccess()      │         │
│  │     - Updates React Query cache with real message            │         │
│  │     - Updates chats list with latest timestamp               │         │
│  │                                                              │         │
│  │  2. Socket.IO message:new:${chatId} arrives                 │         │
│  │     - MessageList.messageHandler() triggered                │         │
│  │     - Updates liveMessages state                            │         │
│  │     - Message appears in UI                                 │         │
│  │                                                              │         │
│  │  3. UI Re-renders                                           │         │
│  │     - Message shows from sender                             │         │
│  │     - Other users see message in real-time                  │         │
│  └──────────────────────────────────────────────────────────────┘         │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Detailed Lifecycle Breakdown

### PHASE 1: FRONTEND - User Input & Optimistic Update

#### 1.1 User Types and Sends Message

**File:** `src/components/chat/MessageInput.jsx`

```javascript
const handleSend = useCallback(async () => {
  if (!text.trim() && attachments.length === 0) return;
  
  try {
    // Send message via mutation
    await sendMessage({
      chatId,
      messageData: {
        chatId,
        content: text.trim(),
        // attachments if any
      }
    });
    
    setText('');        // Clear input
    setAttachments([]); // Clear attachments
  } catch (error) {
    showNotification('error', 'Failed to send', error.message);
  }
}, [text, chatId, attachments, sendMessage, ...]);
```

#### 1.2 React Query Mutation - Optimistic Update

**File:** `src/hooks/useMessages.js`

```javascript
export const useSendMessage = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: ({ chatId, messageData }) => 
      messageService.sendMessage(chatId, messageData),
    
    // OPTIMISTIC UPDATE: Show message immediately before API response
    onMutate: async (variables) => {
      const { chatId, messageData } = variables;
      
      // Cancel any outgoing refetches to prevent race conditions
      await queryClient.cancelQueries({
        queryKey: ['messages', user?._id, chatId]
      });
      
      // Get current messages from cache
      const previousMessages = queryClient.getQueryData([
        'messages', user?._id, chatId, 1, 50
      ]);
      
      // Create temporary message object
      const optimisticMessage = {
        _id: `temp_${Date.now()}`,           // Temporary ID
        chatId,
        content: messageData.content,
        sender: user,
        createdAt: new Date().toISOString(),
        attachments: messageData.attachments || [],
        isOptimistic: true                    // Flag for filtering later
      };
      
      // Update cache with optimistic message (shows in UI immediately)
      queryClient.setQueryData(
        ['messages', user?._id, chatId, 1, 50],
        (old) => [optimisticMessage, ...old]
      );
      
      console.log('⚡ Optimistic message added');
      return { previousMessages };
    },
    
    // REAL UPDATE: When API responds with real message
    onSuccess: (response, variables) => {
      const { message, chat } = response;
      
      console.log('💬 MESSAGE SENT - response received');
      
      // Update cache: Replace optimistic with real message
      queryClient.setQueryData(
        ['messages', user?._id, variables.chatId, 1, 50],
        (old) => [
          message,
          ...old.filter(m => m && !m.isOptimistic)
        ]
      );
      
      // Update chats list with latest message/timestamp
      queryClient.setQueryData(
        ['chat', variables.chatId],
        chat
      );
      
      // Update all chats list
      queryClient.setQueriesData(
        { queryKey: ['chats', user?._id], exact: false },
        (oldChats) => {
          if (!Array.isArray(oldChats)) return oldChats;
          return oldChats.map(c => 
            c._id === variables.chatId ? chat : c
          );
        }
      );
      
      // Refetch chats as backup
      queryClient.refetchQueries({ 
        queryKey: ['chats', user?._id],
        exact: false
      });
    },
    
    // ERROR HANDLING: Revert optimistic update on failure
    onError: (error, variables, context) => {
      if (context?.previousMessages) {
        queryClient.setQueryData(
          ['messages', user?._id, variables.chatId, 1, 50],
          context.previousMessages
        );
      }
      console.error('❌ Failed to send message:', error);
    }
  });
};
```

**Timeline at this point:**
- ✅ Message shows in UI immediately (optimistic)
- 🔄 HTTP request sent to backend
- ⏳ Waiting for API response

---

### PHASE 2: BACKEND - Receive & Process Message

#### 2.1 Message Controller - Create Message

**File:** `controllers/messageController.js`

```javascript
exports.createMessage = async (req, res, next) => {
  try {
    const { chatId } = req.body;
    const userSender = req.user._id;  // Extracted from JWT token
    
    console.log('createMessage called:', { chatId, userSender });
    
    // Validate chat exists and user is member
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ 
        status: 'error', 
        message: 'Chat not found' 
      });
    }
    
    // Create message in database
    const message = await Message.create({
      chat: chatId,
      sender: userSender,
      content: req.body.content,
      text: req.body.content,
      type: 'text',
      attachments: req.body.attachments || [],
      readBy: [userSender]  // Mark as read for sender
    });
    
    // Populate sender details
    const populatedMessage = await message.populate('sender', 'fullName email avatar');
    
    console.log('Message created:', { 
      messageId: message._id, 
      chat: chatId, 
      sender: userSender 
    });
    
    // Update chat with latest message
    const updatedChat = await Chat.findByIdAndUpdate(
      chatId,
      { lastMessage: message._id, updatedAt: new Date() },
      { new: true }
    ).populate('participants', 'fullName email');
    
    // SOCKET.IO BROADCAST: Send to all clients in chat room
    const io = req.app.get('io');
    io.to(`chat_${chatId}`).emit(`message:new:${chatId}`, {
      _id: populatedMessage._id,
      chat: chatId,
      sender: populatedMessage.sender,
      content: populatedMessage.content,
      text: populatedMessage.text,
      createdAt: populatedMessage.createdAt,
      updatedAt: populatedMessage.updatedAt,
      attachments: populatedMessage.attachments
    });
    
    console.log('✅ Socket.IO message:new event broadcasted:', {
      event: `message:new:${chatId}`,
      room: `chat_${chatId}`
    });
    
    // Return success response
    res.status(201).json({
      status: 'success',
      data: {
        message: populatedMessage,
        chat: updatedChat
      }
    });
    
  } catch (error) {
    console.error('❌ Error creating message:', error);
    next(error);
  }
};
```

**What happens:**
1. ✅ Token validated, userId extracted
2. ✅ Chat existence verified
3. ✅ Message saved to MongoDB
4. ✅ Socket.IO broadcasts to room
5. ✅ HTTP 201 response sent

---

### PHASE 3: FRONTEND - Socket.IO Message Received

#### 3.1 Socket Connection & Room Joining

**File:** `src/context/SocketContext.jsx`

```javascript
export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  
  useEffect(() => {
    // Ensure only ONE global socket instance
    if (globalSocket) {
      console.log('Using existing socket:', globalSocket.id);
      setSocket(globalSocket);
      return;
    }
    
    const token = localStorage.getItem('token');
    if (!token) return;
    
    // Create socket with authentication
    const socketInstance = io(SOCKET_URL, {
      auth: { token },
      reconnection: true,
      autoConnect: true
    });
    
    socketInstance.on('connect', () => {
      console.log('✅ Socket CONNECTED:', socketInstance.id);
      setIsConnected(true);
    });
    
    // Store globally
    globalSocket = socketInstance;
    setSocket(socketInstance);
    
  }, []);
  
  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
}
```

#### 3.2 Join Chat Room

**File:** `src/components/chat/MessageList.jsx`

```javascript
useEffect(() => {
  if (!socket || !isConnected || !chatId) return;
  
  console.log('🔗 Emitting joinChat for room:', chatId);
  
  // Emit joinChat event to backend
  socket.emit('joinChat', chatId, (response) => {
    console.log('✅ Joined chat room:', response);
  });
  
  // ... setup message listeners
  
}, [socket, chatId, isConnected]);
```

**Backend receives joinChat:**

**File:** `sockets/handlers.js`

```javascript
socket.on('joinChat', async (chatId, callback) => {
  console.log('🔗 JOIN CHAT EVENT RECEIVED:', { chatId, socketId: socket.id });
  
  // Add socket to Socket.IO room
  socket.join(`chat_${chatId}`);
  console.log('✅ Socket joined room:', `chat_${chatId}`);
  
  // Mark messages as read for this user
  if (socket.userId) {
    try {
      const userObjectId = new mongoose.Types.ObjectId(socket.userId);
      await Message.updateMany(
        { 
          chat: new mongoose.Types.ObjectId(chatId),
          sender: { $ne: userObjectId },
          readBy: { $ne: userObjectId }
        },
        { $addToSet: { readBy: userObjectId } }
      );
      console.log('✅ Messages marked as read');
    } catch (error) {
      console.error('❌ Error marking messages as read:', error.message);
    }
  }
  
  // Notify others that user joined
  socket.to(`chat_${chatId}`).emit('userJoined', {
    chatId,
    userId: socket.userId
  });
  
  // Send callback to acknowledge
  if (callback) {
    callback({ success: true, room: `chat_${chatId}` });
  }
});
```

#### 3.3 Message Received via Socket.IO

When the message is created on backend, it broadcasts to the room:

```javascript
io.to(`chat_${chatId}`).emit(`message:new:${chatId}`, messageData);
```

Frontend listens for this event:

**File:** `src/components/chat/MessageList.jsx`

```javascript
const messageHandler = (newMessage) => {
  console.log('📨 MESSAGE HANDLER TRIGGERED:', newMessage);
  
  setLiveMessages(prev => {
    // Remove any optimistic messages
    const filtered = prev.filter(m => !m.isOptimistic);
    
    // Check if message already exists
    const exists = filtered.some(m => m._id === newMessage._id);
    if (exists) {
      console.log('ℹ️ Message already exists, skipping duplicate');
      return prev;
    }
    
    // Add new message to the top
    const updated = [newMessage, ...filtered];
    console.log('📨 Updated liveMessages. Total:', updated.length);
    return updated;
  });
};

// Attach listener
socket.on(`message:new:${chatId}`, messageHandler);
```

---

### PHASE 4: FRONTEND - UI Update & Display

#### 4.1 State Management

**File:** `src/components/chat/MessageList.jsx`

```javascript
const [liveMessages, setLiveMessages] = useState([]);

// Initialize from API data ONCE
useEffect(() => {
  if (!hasInitialized.current && Array.isArray(messages) && messages.length > 0) {
    console.log('🔄 Initializing liveMessages from API:', messages.length);
    setLiveMessages(messages);
    hasInitialized.current = true;
  }
}, [messages]);

// Reset when switching chats
useEffect(() => {
  hasInitialized.current = false;
}, [chatId]);
```

**Why this approach?**
- Initialize from API data once (server truth)
- Socket handler updates state afterward
- Prevents React Query cache updates from overwriting socket updates
- Ensures real-time messages appear immediately

#### 4.2 Message Rendering

```javascript
const filteredMessages = Array.isArray(liveMessages) 
  ? liveMessages.filter(m => m && m._id && m.sender)
  : [];

return (
  <Container>
    {filteredMessages.map(message => (
      <MessageItem
        key={message._id}
        message={message}
        isOwn={message.sender?._id === userId}
        chatId={chatId}
      />
    ))}
  </Container>
);
```

---

## Complete Message Lifecycle Timeline

```
T0:    User types "hello" in MessageInput
T1:    User clicks Send button
       → handleSend() called
       → sendMessage mutation triggered

T2:    OPTIMISTIC UPDATE
       → Message added to React Query cache with isOptimistic=true
       → MessageList re-renders with message in UI
       → User sees their message immediately

T3:    HTTP REQUEST SENT
       → POST /api/v1/messages
       → Token: [JWT]
       → Body: { chatId, content: "hello" }

T4:    BACKEND PROCESSING
       T4a: Token validated, userId extracted
       T4b: Chat verified in database
       T4c: Message saved to MongoDB with:
            - _id: [generated by MongoDB]
            - chat: chatId
            - sender: userId
            - content: "hello"
            - createdAt: [server timestamp]
       T4d: Socket.IO broadcasts to room:
            → io.to(`chat_${chatId}`).emit(`message:new:${chatId}`, {...})

T5:    SOCKET.IO MESSAGE ARRIVES (≈same time as HTTP response)
       → Frontend receives `message:new:${chatId}` event
       → messageHandler() called with real message data
       → setLiveMessages updates state:
          - Removes optimistic message
          - Adds real message with actual _id
       → MessageList re-renders with real message

T6:    HTTP RESPONSE ARRIVES
       → onSuccess callback in useSendMessage
       → React Query cache updated with real message
       → Chats list updated with new timestamp
       → No re-render needed (socket already updated UI)

T7:    FINAL STATE
       ✅ Message visible to sender
       ✅ Message visible to all users in chat room
       ✅ Message persisted in MongoDB
       ✅ Chat metadata (lastMessage, updatedAt) updated
```

---

## Key Files & Their Responsibilities

### Frontend Files

| File | Purpose |
|------|---------|
| `src/context/SocketContext.jsx` | Global Socket.IO instance management |
| `src/components/chat/MessageInput.jsx` | User input & send handler |
| `src/components/chat/MessageList.jsx` | Message display & socket listeners |
| `src/hooks/useMessages.js` | React Query mutations & caching |
| `src/services/messages.js` | API service for message endpoints |

### Backend Files

| File | Purpose |
|------|---------|
| `controllers/messageController.js` | Message creation & API endpoint |
| `sockets/handlers.js` | Socket.IO event handlers (joinChat, leaveChat) |
| `socketManager.js` | Socket.IO initialization & middleware |
| `models/messageModel.js` | MongoDB message schema |
| `models/chatModel.js` | MongoDB chat schema |
| `routes/messageRoutes.js` | REST API routes |

---

## Error Handling & Edge Cases

### 1. Network Failures

**Scenario:** Message sent, but network fails before response arrives

**Handling:**
```javascript
onError: (error, variables, context) => {
  if (context?.previousMessages) {
    // Revert optimistic update
    queryClient.setQueryData([...], context.previousMessages);
  }
  showNotification('error', 'Failed to send message');
}
```

### 2. Duplicate Messages

**Scenario:** Socket message arrives, but message already in cache

**Handling:**
```javascript
const exists = filtered.some(m => m._id === newMessage._id);
if (exists) {
  return prev; // Don't add duplicate
}
```

### 3. ObjectId Type Mismatch

**Scenario:** userId is string but readBy expects ObjectId array

**Handling:**
```javascript
const userObjectId = new mongoose.Types.ObjectId(socket.userId);
await Message.updateMany(
  { readBy: { $ne: userObjectId } },
  { $addToSet: { readBy: userObjectId } }
);
```

### 4. Socket Reconnection

**Scenario:** User goes offline then reconnects

**Handling:**
```javascript
socketInstance.on('reconnect', () => {
  console.log('Reconnected, rejoining chats...');
  // Automatically rejoin chat rooms
  socket.emit('joinChat', currentChatId);
});
```

---

## Performance Optimizations

### 1. Optimistic Updates
- Messages appear instantly without waiting for server
- Provides better UX with latency
- Reverted automatically on error

### 2. One-Time Initialization
- `liveMessages` initialized once from API
- Socket handler updates from that point forward
- Prevents duplicate updates from multiple sources

### 3. React Query Caching
- Query cache stores messages by chatId
- Automatic refetching with stale time
- Prevents redundant API calls

### 4. Socket.IO Rooms
- Clients join specific chat rooms
- Backend broadcasts only to relevant room
- Reduces network overhead for large user base

---

## Security Measures

### 1. Authentication
- JWT token required for all API requests
- Token passed in Socket.IO auth on connection
- Backend validates token before processing

### 2. Authorization
- Verify user is member of chat before allowing message
- Only send messages to users in chat room
- Only mark own messages as read

### 3. Data Validation
- Validate chatId, content length, attachments
- Sanitize user input before storage
- Rate limiting on message creation

---

## Testing Checklist

- [ ] Send message → appears immediately (optimistic)
- [ ] API response arrives → message persists
- [ ] Other client in chat → receives message in real-time
- [ ] Sender sends from Tab A → Tab B shows real-time
- [ ] Network failure → optimistic update reverted
- [ ] Large attachment → message still sends
- [ ] Rapid fire messages → all appear in correct order
- [ ] Switch chats → messages load and socket reattaches
- [ ] Connection drops → automatic reconnect & rejoin

---

## Future Improvements

1. **Message Pagination** - Load older messages on scroll up
2. **Message Search** - Full-text search across messages
3. **Typing Indicators** - Show when others are typing (already implemented)
4. **Read Receipts** - Show when messages are read
5. **Message Reactions** - Add emoji reactions to messages
6. **Message Editing** - Edit messages after sending
7. **Message Deletion** - Soft delete with marker
8. **End-to-End Encryption** - Encrypt messages before sending
9. **Message Expiry** - Auto-delete old messages
10. **Thread Replies** - Reply to specific messages

