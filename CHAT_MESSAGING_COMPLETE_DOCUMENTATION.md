# Chat & Messaging System - Complete Frontend Implementation Guide

**University Market Application | Next.js + Styled Components**

---

## 📋 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Backend Summary](#backend-summary)
3. [Frontend File Structure](#frontend-file-structure)
4. [Service Layer Implementation](#service-layer-implementation)
5. [Hooks Implementation](#hooks-implementation)
6. [Components Implementation](#components-implementation)
7. [Pages & Routes Implementation](#pages--routes-implementation)
8. [Socket.IO Real-time Integration](#socketio-real-time-integration)
9. [Complete Flow Diagrams](#complete-flow-diagrams)
10. [Testing Checklist](#testing-checklist)

---

## 🏗️ Architecture Overview

### System Components

```
Frontend (Next.js)
├── Service Layer (API calls)
├── Socket.IO Client (Real-time)
├── Custom Hooks (State management)
├── Components (UI)
├── Pages (Routes)
└── Context (Global state)
        ↓
   Backend (Node/Express)
├── Chat Routes (/api/v1/chats)
├── Message Routes (/api/v1/messages)
├── Socket.IO Server (Real-time)
├── Chat Model (MongoDB)
└── Message Model (MongoDB)
```

### Data Flow

```
User Action (Send Message)
    ↓
Component (MessageInput)
    ↓
Hook (useSendMessage)
    ↓
Socket Emit (sendMessage)
    ↓
Backend Handler (handlers.js)
    ↓
Database (Message Created)
    ↓
Socket Broadcast (message:new:${chatId})
    ↓
All Connected Clients Receive
    ↓
Components Update (Auto-refetch)
```

---

## 📡 Backend Summary

### Key Models

#### Chat Model (`chatModel.js`)
```
- members: [userId] - Participants in chat
- name: String - Chat name (for groups)
- type: 'one-to-one' | 'group'
- status: 'active' | 'archived' | 'deleted'
- createdBy: userId - Group creator
- admins: [userId] - Group admins
- settings: {
    allowInvites: Boolean
    allowMemberMessages: Boolean
    allowFileUploads: Boolean
    muteNotifications: Boolean
    autoDeleteMessages: Boolean
  }
- lastMessage: String
- lastMessageAt: Date
```

#### Message Model (`messageModel.js`)
```
- chat: chatId - Associated chat
- sender: userId - Message author
- text: String - Message content
- type: 'text' | 'image' | 'file' | 'video' | 'voice' | 'system'
- attachments: [{url, type, size, mimeType}]
- status: 'sent' | 'delivered' | 'read'
- readBy: [{ user, readAt }] - Read receipts
- reactions: [{ emoji, users: [userId], count }]
- replyTo: messageId - Reply reference
- forwardFrom: messageId - Forward reference
- flags: { edited, deleted, spam }
- history: [{ text, editedAt, editedBy }] - Edit history
```

### API Endpoints

#### Chat Endpoints
```
GET    /api/v1/chats                    - Get all chats
POST   /api/v1/chats                    - Create 1:1 chat
POST   /api/v1/chats/one-to-one         - Create one-to-one
POST   /api/v1/chats/group              - Create group chat
GET    /api/v1/chats/search/users       - Search users
GET    /api/v1/chats/:id                - Get chat details
PATCH  /api/v1/chats/:id                - Update chat
DELETE /api/v1/chats/:id                - Delete/archive chat
```

#### Message Endpoints
```
POST   /api/v1/messages                 - Send message
GET    /api/v1/messages/chat/:chatId    - Get messages in chat
GET    /api/v1/messages/:id             - Get single message
PATCH  /api/v1/messages/:id             - Edit message
DELETE /api/v1/messages/:id             - Delete message
POST   /api/v1/messages/:id/reactions   - Add reaction
DELETE /api/v1/messages/:id/reactions   - Remove reaction
```

### Socket Events (handlers.js)

#### Emitted by Client
```javascript
'joinChat'           - Join a chat room
'leaveChat'          - Leave a chat room
'sendMessage'        - Send message { chatId, text, attachments }
'typing'             - Send typing status { chatId, isTyping }
'addReaction'        - Add emoji reaction { messageId, chatId, emoji }
'removeReaction'     - Remove emoji { messageId, chatId, emoji }
'getReactions'       - Get all reactions for message { messageId, chatId }
'userOnline'         - User comes online
'userOffline'        - User goes offline
```

#### Received by Client
```javascript
'message:new:${chatId}'    - New message in chat
'userJoined'               - User joined chat
'userLeft'                 - User left chat
'userTyping'               - User typing { chatId, userId, isTyping }
'reactionAdded'            - Reaction added { messageId, emoji, userId }
'reactionRemoved'          - Reaction removed { messageId, emoji, userId }
'notification'             - New notification
'userOnline'               - User came online
'userOffline'              - User went offline
```

---

## 📁 Frontend File Structure

### Complete Directory Layout

```
src/
├── services/
│   ├── chat.js                    ✅ Chat API service
│   └── messages.js                ✅ Message API service
├── hooks/
│   ├── useChats.js                ✅ Chat management hooks
│   ├── useMessages.js             ✅ Message management hooks
│   └── useSocket.js               ✅ Socket.IO connection
├── components/
│   ├── chat/
│   │   ├── ChatList.jsx            ✅ List all chats
│   │   ├── ChatHeader.jsx          ✅ Chat title & info
│   │   ├── ChatWindow.jsx          ✅ Main chat area
│   │   ├── MessageList.jsx         ✅ Messages display
│   │   ├── MessageItem.jsx         ✅ Individual message
│   │   ├── MessageInput.jsx        ✅ Input field
│   │   ├── TypingIndicator.jsx    ✅ "User is typing" UI
│   │   ├── MessageReactions.jsx    ✅ Emoji reactions
│   │   └── SearchUsers.jsx         ✅ User search for new chat
│   └── common/
│       ├── UserAvatar.jsx
│       ├── LoadingSpinner.jsx
│       └── ErrorAlert.jsx
├── pages/
│   ├── (protected)/
│   │   └── messages/
│   │       ├── page.js             ✅ Messages list page
│   │       └── [chatId]/
│   │           └── page.js         ✅ Chat detail page
│   └── layout.js
└── context/
    └── SocketContext.jsx            ✅ Socket.IO provider
```

---

## 🔧 Service Layer Implementation

### `src/services/chat.js`

```javascript
import api from './api';

const CHAT_ENDPOINT = '/chats';

/**
 * Get all chats for current user
 */
export const fetchMyChats = async (filters = {}) => {
  try {
    const params = new URLSearchParams({
      ...filters
    });
    const response = await api.get(`${CHAT_ENDPOINT}?${params}`);
    return response.data.data || [];
  } catch (error) {
    throw error.response?.data || error;
  }
};

/**
 * Get single chat details
 */
export const fetchChatById = async (chatId) => {
  try {
    const response = await api.get(`${CHAT_ENDPOINT}/${chatId}`);
    return response.data.data || response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

/**
 * Create or get 1:1 chat
 */
export const getOrCreateOneToOneChat = async (otherUserId) => {
  try {
    const response = await api.post(`${CHAT_ENDPOINT}/one-to-one`, {
      otherUserId
    });
    return response.data.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

/**
 * Create group chat
 */
export const createGroupChat = async (chatData) => {
  try {
    const response = await api.post(`${CHAT_ENDPOINT}/group`, chatData);
    return response.data.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

/**
 * Update chat
 */
export const updateChat = async (chatId, updates) => {
  try {
    const response = await api.patch(`${CHAT_ENDPOINT}/${chatId}`, updates);
    return response.data.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

/**
 * Delete/archive chat
 */
export const deleteChat = async (chatId) => {
  try {
    const response = await api.delete(`${CHAT_ENDPOINT}/${chatId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

/**
 * Search users to start chat
 */
export const searchUsers = async (query) => {
  try {
    const response = await api.get(`${CHAT_ENDPOINT}/search/users?q=${query}`);
    return response.data.data || [];
  } catch (error) {
    throw error.response?.data || error;
  }
};

/**
 * Search chats
 */
export const searchChats = async (query, filters = {}) => {
  try {
    const response = await api.get(`${CHAT_ENDPOINT}/search`, {
      params: { q: query, ...filters }
    });
    return response.data.data || [];
  } catch (error) {
    throw error.response?.data || error;
  }
};

export default {
  fetchMyChats,
  fetchChatById,
  getOrCreateOneToOneChat,
  createGroupChat,
  updateChat,
  deleteChat,
  searchUsers,
  searchChats
};
```

### `src/services/messages.js`

```javascript
import api from './api';

const MESSAGES_ENDPOINT = '/messages';

/**
 * Get messages for a specific chat
 */
export const fetchMessages = async (chatId, page = 1, limit = 50) => {
  try {
    const response = await api.get(`${MESSAGES_ENDPOINT}/chat/${chatId}`, {
      params: { page, limit }
    });
    return response.data.data || [];
  } catch (error) {
    throw error.response?.data || error;
  }
};

/**
 * Send message
 */
export const sendMessage = async (chatId, messageData) => {
  try {
    let config = {};
    
    if (messageData instanceof FormData) {
      config.headers = {
        'Content-Type': 'multipart/form-data'
      };
    }
    
    const payload = messageData instanceof FormData ? messageData : {
      chat: chatId,
      ...messageData
    };
    
    const response = await api.post(MESSAGES_ENDPOINT, payload, config);
    return response.data.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

/**
 * Get single message
 */
export const fetchMessageById = async (messageId) => {
  try {
    const response = await api.get(`${MESSAGES_ENDPOINT}/${messageId}`);
    return response.data.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

/**
 * Edit message
 */
export const updateMessage = async (messageId, updates) => {
  try {
    const response = await api.patch(`${MESSAGES_ENDPOINT}/${messageId}`, updates);
    return response.data.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

/**
 * Delete message
 */
export const deleteMessage = async (messageId) => {
  try {
    const response = await api.delete(`${MESSAGES_ENDPOINT}/${messageId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

/**
 * Search messages
 */
export const searchMessages = async (query, filters = {}) => {
  try {
    const response = await api.get(`${MESSAGES_ENDPOINT}/search`, {
      params: { q: query, ...filters }
    });
    return response.data.data || [];
  } catch (error) {
    throw error.response?.data || error;
  }
};

/**
 * Add reaction to message
 */
export const addReaction = async (messageId, emoji) => {
  try {
    const response = await api.post(
      `${MESSAGES_ENDPOINT}/${messageId}/reactions`,
      { emoji }
    );
    return response.data.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

/**
 * Remove reaction from message
 */
export const removeReaction = async (messageId, emoji) => {
  try {
    const response = await api.delete(
      `${MESSAGES_ENDPOINT}/${messageId}/reactions`,
      { data: { emoji } }
    );
    return response.data.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

/**
 * Get reaction statistics
 */
export const getReactionStats = async (messageId) => {
  try {
    const response = await api.get(
      `${MESSAGES_ENDPOINT}/${messageId}/reactions/stats`
    );
    return response.data.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

/**
 * Upload file for message
 */
export const uploadMessageFile = async (file) => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post(`${MESSAGES_ENDPOINT}/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export default {
  fetchMessages,
  sendMessage,
  fetchMessageById,
  updateMessage,
  deleteMessage,
  searchMessages,
  addReaction,
  removeReaction,
  getReactionStats,
  uploadMessageFile
};
```

---

## 🎣 Hooks Implementation

### `src/hooks/useChats.js`

```javascript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as chatService from '@/services/chat';

const STALE_TIME = 5 * 60 * 1000; // 5 minutes
const CACHE_TIME = 10 * 60 * 1000; // 10 minutes

/**
 * Hook to fetch all chats
 */
export const useAllChats = (filters = {}, enabled = true) => {
  return useQuery({
    queryKey: ['chats', filters],
    queryFn: () => chatService.fetchMyChats(filters),
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
    enabled
  });
};

/**
 * Hook to fetch single chat
 */
export const useChat = (chatId, enabled = true) => {
  return useQuery({
    queryKey: ['chat', chatId],
    queryFn: () => chatService.fetchChatById(chatId),
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
    enabled: !!chatId && enabled
  });
};

/**
 * Hook to create or get 1:1 chat
 */
export const useGetOrCreateChat = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (otherUserId) => chatService.getOrCreateOneToOneChat(otherUserId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['chats'] });
      queryClient.setQueryData(['chat', data._id], data);
    }
  });
};

/**
 * Hook to create group chat
 */
export const useCreateGroupChat = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (chatData) => chatService.createGroupChat(chatData),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['chats'] });
      queryClient.setQueryData(['chat', data._id], data);
    }
  });
};

/**
 * Hook to update chat
 */
export const useUpdateChat = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ chatId, updates }) => chatService.updateChat(chatId, updates),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['chats'] });
      queryClient.setQueryData(['chat', data._id], data);
    }
  });
};

/**
 * Hook to delete chat
 */
export const useDeleteChat = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (chatId) => chatService.deleteChat(chatId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chats'] });
    }
  });
};

/**
 * Hook to search users
 */
export const useSearchUsers = (query, enabled = !!query) => {
  return useQuery({
    queryKey: ['searchUsers', query],
    queryFn: () => chatService.searchUsers(query),
    staleTime: 2 * 60 * 1000,
    gcTime: CACHE_TIME,
    enabled
  });
};

/**
 * Hook to search chats
 */
export const useSearchChats = (query, filters = {}, enabled = !!query) => {
  return useQuery({
    queryKey: ['searchChats', query, filters],
    queryFn: () => chatService.searchChats(query, filters),
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
    enabled
  });
};

export default {
  useAllChats,
  useChat,
  useGetOrCreateChat,
  useCreateGroupChat,
  useUpdateChat,
  useDeleteChat,
  useSearchUsers,
  useSearchChats
};
```

### `src/hooks/useMessages.js`

```javascript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as messageService from '@/services/messages';

const STALE_TIME = 2 * 60 * 1000; // 2 minutes (messages update frequently)
const CACHE_TIME = 5 * 60 * 1000; // 5 minutes

/**
 * Hook to fetch messages for a chat
 */
export const useMessages = (chatId, page = 1, limit = 50, enabled = true) => {
  return useQuery({
    queryKey: ['messages', chatId, page, limit],
    queryFn: () => messageService.fetchMessages(chatId, page, limit),
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
    enabled: !!chatId && enabled
  });
};

/**
 * Hook to send message
 */
export const useSendMessage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ chatId, messageData }) => messageService.sendMessage(chatId, messageData),
    onSuccess: (data, variables) => {
      // Update messages cache
      queryClient.setQueryData(
        ['messages', variables.chatId, 1, 50],
        (old) => old ? [data, ...old] : [data]
      );
      // Invalidate chats to update lastMessage
      queryClient.invalidateQueries({ queryKey: ['chats'] });
    }
  });
};

/**
 * Hook to fetch single message
 */
export const useMessage = (messageId, enabled = true) => {
  return useQuery({
    queryKey: ['message', messageId],
    queryFn: () => messageService.fetchMessageById(messageId),
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
    enabled: !!messageId && enabled
  });
};

/**
 * Hook to edit message
 */
export const useUpdateMessage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ messageId, updates }) => messageService.updateMessage(messageId, updates),
    onSuccess: (data) => {
      queryClient.setQueryData(['message', data._id], data);
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    }
  });
};

/**
 * Hook to delete message
 */
export const useDeleteMessage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (messageId) => messageService.deleteMessage(messageId),
    onSuccess: (_, messageId) => {
      queryClient.removeQueries({ queryKey: ['message', messageId] });
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    }
  });
};

/**
 * Hook to search messages
 */
export const useSearchMessages = (query, filters = {}, enabled = !!query) => {
  return useQuery({
    queryKey: ['searchMessages', query, filters],
    queryFn: () => messageService.searchMessages(query, filters),
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
    enabled
  });
};

/**
 * Hook to add reaction
 */
export const useAddReaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ messageId, emoji }) => messageService.addReaction(messageId, emoji),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['message', variables.messageId] });
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    }
  });
};

/**
 * Hook to remove reaction
 */
export const useRemoveReaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ messageId, emoji }) => messageService.removeReaction(messageId, emoji),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['message', variables.messageId] });
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    }
  });
};

/**
 * Hook to get reaction stats
 */
export const useReactionStats = (messageId, enabled = true) => {
  return useQuery({
    queryKey: ['reactionStats', messageId],
    queryFn: () => messageService.getReactionStats(messageId),
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
    enabled: !!messageId && enabled
  });
};

/**
 * Hook to upload file
 */
export const useUploadFile = () => {
  return useMutation({
    mutationFn: (file) => messageService.uploadMessageFile(file)
  });
};

export default {
  useMessages,
  useSendMessage,
  useMessage,
  useUpdateMessage,
  useDeleteMessage,
  useSearchMessages,
  useAddReaction,
  useRemoveReaction,
  useReactionStats,
  useUploadFile
};
```

### `src/hooks/useSocket.js`

```javascript
import { useEffect, useState, useCallback } from 'react';
import io from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

/**
 * Custom hook for Socket.IO connection
 */
export const useSocket = () => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [typingUsers, setTypingUsers] = useState({});

  useEffect(() => {
    // Get token from localStorage
    const token = localStorage.getItem('token');
    if (!token) return;

    // Create socket connection
    const socketInstance = io(SOCKET_URL, {
      auth: {
        token
      },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      transports: ['websocket', 'polling']
    });

    // Connection events
    socketInstance.on('connect', () => {
      console.log('Socket connected:', socketInstance.id);
      setIsConnected(true);
    });

    socketInstance.on('disconnect', () => {
      console.log('Socket disconnected');
      setIsConnected(false);
    });

    socketInstance.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  // Join chat room
  const joinChat = useCallback((chatId) => {
    if (socket?.connected) {
      socket.emit('joinChat', chatId);
    }
  }, [socket]);

  // Leave chat room
  const leaveChat = useCallback((chatId) => {
    if (socket?.connected) {
      socket.emit('leaveChat', chatId);
    }
  }, [socket]);

  // Send message
  const sendMessage = useCallback((chatId, messageData) => {
    if (socket?.connected) {
      socket.emit('sendMessage', {
        chatId,
        ...messageData
      });
    }
  }, [socket]);

  // Set typing status
  const setTypingStatus = useCallback((chatId, isTyping) => {
    if (socket?.connected) {
      socket.emit('typing', { chatId, isTyping });
    }
  }, [socket]);

  // Add reaction
  const addReaction = useCallback((messageId, chatId, emoji) => {
    if (socket?.connected) {
      socket.emit('addReaction', { messageId, chatId, emoji });
    }
  }, [socket]);

  // Remove reaction
  const removeReaction = useCallback((messageId, chatId, emoji) => {
    if (socket?.connected) {
      socket.emit('removeReaction', { messageId, chatId, emoji });
    }
  }, [socket]);

  return {
    socket,
    isConnected,
    typingUsers,
    setTypingUsers,
    joinChat,
    leaveChat,
    sendMessage,
    setTypingStatus,
    addReaction,
    removeReaction
  };
};

export default useSocket;
```

---

## 🎨 Components Implementation

### `src/components/chat/ChatList.jsx`

```javascript
'use client';

import styled from 'styled-components';
import { useAllChats } from '@/hooks/useChats';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorAlert from '@/components/common/ErrorAlert';

const Container = styled.div`
  height: 100%;
  display: flex;
  flex-direction: column;
  background: white;
  border-right: 1px solid #e0e0e0;
`;

const Header = styled.div`
  padding: 16px;
  border-bottom: 1px solid #e0e0e0;
`;

const Title = styled.h2`
  font-size: 24px;
  font-weight: 700;
  margin: 0;
  color: #333;
`;

const ChatsList = styled.div`
  flex: 1;
  overflow-y: auto;
  
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: #f0f0f0;
  }
  
  &::-webkit-scrollbar-thumb {
    background: #ccc;
    border-radius: 3px;
    
    &:hover {
      background: #999;
    }
  }
`;

const ChatItem = styled.div`
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  transition: background 0.2s ease;
  
  &:hover {
    background: #f5f5f5;
  }
  
  ${props => props.$active && `
    background: #e8f0fe;
    border-left: 4px solid #667eea;
  `}
`;

const ChatName = styled.div`
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
`;

const LastMessage = styled.div`
  font-size: 13px;
  color: #666;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #999;
  padding: 20px;
`;

export default function ChatList({ activeChat, onSelectChat }) {
  const router = useRouter();
  const { data: chats = [], isLoading, error } = useAllChats();

  if (isLoading) {
    return (
      <Container>
        <Header>
          <Title>Messages</Title>
        </Header>
        <LoadingSpinner />
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <Title>Messages</Title>
      </Header>

      {error && <ErrorAlert message="Failed to load chats" />}

      <ChatsList>
        {chats && chats.length > 0 ? (
          chats.map(chat => (
            <ChatItem
              key={chat._id}
              $active={activeChat?._id === chat._id}
              onClick={() => {
                onSelectChat(chat);
                router.push(`/messages/${chat._id}`);
              }}
            >
              <ChatName>
                {chat.type === 'group' 
                  ? chat.name 
                  : chat.members?.find(m => m._id !== localStorage.getItem('userId'))?.fullName || 'Chat'}
              </ChatName>
              <LastMessage>{chat.lastMessage || 'No messages yet'}</LastMessage>
            </ChatItem>
          ))
        ) : (
          <EmptyState>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>💬</div>
            <div>No conversations yet</div>
            <div style={{ fontSize: '12px', marginTop: '4px' }}>Start a conversation to begin chatting</div>
          </EmptyState>
        )}
      </ChatsList>
    </Container>
  );
}
```

### `src/components/chat/MessageInput.jsx`

```javascript
'use client';

import styled from 'styled-components';
import { useState, useRef, useCallback } from 'react';
import { useSendMessage } from '@/hooks/useMessages';
import { useSocket } from '@/hooks/useSocket';

const Container = styled.div`
  padding: 16px;
  border-top: 1px solid #e0e0e0;
  background: white;
`;

const InputWrapper = styled.div`
  display: flex;
  gap: 8px;
  align-items: flex-end;
`;

const Input = styled.textarea`
  flex: 1;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 20px;
  font-size: 14px;
  font-family: inherit;
  resize: none;
  max-height: 120px;
  
  &:focus {
    outline: none;
    border-color: #667eea;
  }
`;

const SendButton = styled.button`
  padding: 10px 16px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 20px;
  cursor: pointer;
  font-weight: 600;
  transition: background 0.2s ease;
  
  &:hover:not(:disabled) {
    background: #5568d3;
  }
  
  &:disabled {
    background: #ccc;
    cursor: not-allowed;
  }
`;

const AttachButton = styled.button`
  padding: 8px 12px;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 20px;
  
  &:hover {
    transform: scale(1.1);
  }
`;

const FileInput = styled.input`
  display: none;
`;

export default function MessageInput({ chatId, onMessageSent }) {
  const [text, setText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  
  const { mutateAsync: sendMessage, isPending } = useSendMessage();
  const { setTypingStatus } = useSocket();

  // Handle typing indicator
  const handleTextChange = useCallback((e) => {
    setText(e.target.value);
    
    if (!isTyping) {
      setIsTyping(true);
      setTypingStatus(chatId, true);
    }
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set new timeout to send typing stop
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      setTypingStatus(chatId, false);
    }, 2000);
  }, [chatId, isTyping, setTypingStatus]);

  // Handle send message
  const handleSend = useCallback(async () => {
    if (!text.trim() && fileInputRef.current?.files?.length === 0) return;
    
    try {
      // Clear typing status
      setIsTyping(false);
      setTypingStatus(chatId, false);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      await sendMessage({
        chatId,
        messageData: {
          text: text.trim(),
          attachments: []
        }
      });
      
      setText('');
      onMessageSent?.();
    } catch (error) {
      console.error('Error sending message:', error);
    }
  }, [text, chatId, sendMessage, setTypingStatus, onMessageSent]);

  // Handle file attachment
  const handleFileSelect = useCallback(async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    
    // TODO: Upload files and add to attachments
    console.log('Files selected:', files);
  }, []);

  return (
    <Container>
      <InputWrapper>
        <AttachButton onClick={() => fileInputRef.current?.click()}>
          📎
        </AttachButton>
        
        <FileInput
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
        />
        
        <Input
          value={text}
          onChange={handleTextChange}
          placeholder="Type a message..."
          rows={1}
          onKeyPress={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />
        
        <SendButton
          onClick={handleSend}
          disabled={isPending || (!text.trim())}
        >
          Send
        </SendButton>
      </InputWrapper>
    </Container>
  );
}
```

### `src/components/chat/MessageList.jsx`

```javascript
'use client';

import styled from 'styled-components';
import { useMessages } from '@/hooks/useMessages';
import { useSocket } from '@/hooks/useSocket';
import { useEffect, useRef, useState } from 'react';
import MessageItem from './MessageItem';
import TypingIndicator from './TypingIndicator';
import LoadingSpinner from '@/components/common/LoadingSpinner';

const Container = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: #f0f0f0;
  }
  
  &::-webkit-scrollbar-thumb {
    background: #ccc;
    border-radius: 3px;
  }
`;

const MessageGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const DateDivider = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 12px 0;
  color: #999;
  font-size: 12px;
  
  &::before,
  &::after {
    content: '';
    flex: 1;
    height: 1px;
    background: #e0e0e0;
  }
`;

export default function MessageList({ chatId, userId }) {
  const { data: messages = [], isLoading } = useMessages(chatId, 1, 50);
  const { socket, isConnected } = useSocket();
  const [liveMessages, setLiveMessages] = useState(messages);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const containerRef = useRef(null);

  // Update live messages from API
  useEffect(() => {
    setLiveMessages(messages);
  }, [messages]);

  // Join chat on mount
  useEffect(() => {
    if (isConnected && chatId) {
      socket.emit('joinChat', chatId);
    }
    
    return () => {
      if (isConnected && chatId) {
        socket.emit('leaveChat', chatId);
      }
    };
  }, [socket, chatId, isConnected]);

  // Listen for new messages
  useEffect(() => {
    if (!socket || !isConnected) return;

    const messageHandler = (newMessage) => {
      setLiveMessages(prev => [newMessage, ...prev]);
      // Scroll to bottom
      setTimeout(() => {
        containerRef.current?.scrollTo({
          top: 0,
          behavior: 'smooth'
        });
      }, 0);
    };

    const typingHandler = ({ userId: typingUserId, isTyping }) => {
      setTypingUsers(prev => {
        const updated = new Set(prev);
        if (isTyping) {
          updated.add(typingUserId);
        } else {
          updated.delete(typingUserId);
        }
        return updated;
      });
    };

    socket.on(`message:new:${chatId}`, messageHandler);
    socket.on('userTyping', typingHandler);

    return () => {
      socket.off(`message:new:${chatId}`, messageHandler);
      socket.off('userTyping', typingHandler);
    };
  }, [socket, chatId, isConnected]);

  // Scroll to bottom on mount
  useEffect(() => {
    containerRef.current?.scrollTo({
      top: 0,
      behavior: 'auto'
    });
  }, []);

  if (isLoading) {
    return (
      <Container>
        <LoadingSpinner />
      </Container>
    );
  }

  return (
    <Container ref={containerRef}>
      {typingUsers.size > 0 && <TypingIndicator count={typingUsers.size} />}
      
      {liveMessages.map((message, index) => (
        <MessageGroup key={message._id}>
          {index > 0 && new Date(message.createdAt).toDateString() !== 
            new Date(liveMessages[index - 1].createdAt).toDateString() && (
            <DateDivider>
              {new Date(message.createdAt).toLocaleDateString()}
            </DateDivider>
          )}
          <MessageItem
            message={message}
            isOwn={message.sender._id === userId}
            chatId={chatId}
          />
        </MessageGroup>
      ))}
    </Container>
  );
}
```

### `src/components/chat/MessageItem.jsx`

```javascript
'use client';

import styled from 'styled-components';
import { useAddReaction, useRemoveReaction } from '@/hooks/useMessages';
import { useState } from 'react';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  ${props => props.$isOwn && 'align-items: flex-end;'}
`;

const MessageBubble = styled.div`
  max-width: 70%;
  padding: 10px 14px;
  background: ${props => props.$isOwn ? '#667eea' : '#f0f0f0'};
  color: ${props => props.$isOwn ? 'white' : '#333'};
  border-radius: 16px;
  word-wrap: break-word;
  position: relative;
  
  ${props => props.$isOwn ? `
    border-bottom-right-radius: 4px;
  ` : `
    border-bottom-left-radius: 4px;
  `}
`;

const MessageText = styled.p`
  margin: 0;
  font-size: 14px;
  line-height: 1.4;
`;

const MessageTime = styled.div`
  font-size: 12px;
  color: #999;
  margin-top: 4px;
`;

const ReactionsContainer = styled.div`
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  margin-top: 4px;
  ${props => props.$isOwn && 'justify-content: flex-end;'}
`;

const Reaction = styled.button`
  padding: 2px 6px;
  background: #f0f0f0;
  border: 1px solid #ddd;
  border-radius: 12px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s ease;
  
  &:hover {
    background: #fff;
    border-color: #999;
  }
`;

const EmojiPicker = styled.div`
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 4px;
  padding: 8px;
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  position: absolute;
  bottom: -200px;
  left: 0;
  z-index: 10;
`;

const Emoji = styled.button`
  padding: 4px;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 20px;
  transition: transform 0.2s ease;
  
  &:hover {
    transform: scale(1.2);
  }
`;

const EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '😡', '🔥', '💯', '👏', '🙌', '😍', '😎'];

export default function MessageItem({ message, isOwn, chatId }) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const { mutateAsync: addReaction } = useAddReaction();
  const { mutateAsync: removeReaction } = useRemoveReaction();

  const handleAddReaction = async (emoji) => {
    try {
      await addReaction({ messageId: message._id, emoji });
      setShowEmojiPicker(false);
    } catch (error) {
      console.error('Error adding reaction:', error);
    }
  };

  const handleRemoveReaction = async (emoji) => {
    try {
      await removeReaction({ messageId: message._id, emoji });
    } catch (error) {
      console.error('Error removing reaction:', error);
    }
  };

  const userReactions = message.reactions?.reduce((acc, reaction) => {
    if (reaction.users.some(u => u._id === localStorage.getItem('userId'))) {
      acc.push(reaction.emoji);
    }
    return acc;
  }, []) || [];

  return (
    <Container $isOwn={isOwn}>
      <MessageBubble $isOwn={isOwn}>
        <MessageText>{message.text}</MessageText>
      </MessageBubble>

      <ReactionsContainer $isOwn={isOwn}>
        {message.reactions?.map(reaction => (
          <Reaction
            key={reaction.emoji}
            onClick={() => handleRemoveReaction(reaction.emoji)}
            title={`${reaction.users.length} people reacted`}
          >
            {reaction.emoji} {reaction.users.length}
          </Reaction>
        ))}
        
        <Reaction onClick={() => setShowEmojiPicker(!showEmojiPicker)}>
          😊
        </Reaction>

        {showEmojiPicker && (
          <EmojiPicker>
            {EMOJIS.map(emoji => (
              <Emoji key={emoji} onClick={() => handleAddReaction(emoji)}>
                {emoji}
              </Emoji>
            ))}
          </EmojiPicker>
        )}
      </ReactionsContainer>

      <MessageTime>
        {new Date(message.createdAt).toLocaleTimeString([], { 
          hour: '2-digit', 
          minute: '2-digit' 
        })}
      </MessageTime>
    </Container>
  );
}
```

### `src/components/chat/TypingIndicator.jsx`

```javascript
'use client';

import styled, { keyframes } from 'styled-components';

const bounce = keyframes`
  0%, 80%, 100% {
    transform: translateY(0);
    opacity: 0.5;
  }
  40% {
    transform: translateY(-8px);
    opacity: 1;
  }
`;

const Container = styled.div`
  display: flex;
  gap: 4px;
  padding: 8px;
  margin: 4px 0;
`;

const Dot = styled.div`
  width: 8px;
  height: 8px;
  background: #999;
  border-radius: 50%;
  animation: ${bounce} 1.4s infinite ease-in-out;
  
  &:nth-child(1) {
    animation-delay: -0.32s;
  }
  
  &:nth-child(2) {
    animation-delay: -0.16s;
  }
`;

const Text = styled.div`
  font-size: 13px;
  color: #999;
  margin-left: 4px;
  line-height: 8px;
`;

export default function TypingIndicator({ count = 1 }) {
  return (
    <Container>
      <Dot />
      <Dot />
      <Dot />
      <Text>
        {count === 1 ? 'Someone is typing...' : `${count} people are typing...`}
      </Text>
    </Container>
  );
}
```

---

## 📄 Pages & Routes Implementation

### `src/app/(protected)/messages/page.js`

```javascript
'use client';

import { useState, useEffect } from 'react';
import styled from 'styled-components';
import Link from 'next/link';
import ChatList from '@/components/chat/ChatList';
import SearchUsers from '@/components/chat/SearchUsers';
import LoadingSpinner from '@/components/common/LoadingSpinner';

const Container = styled.div`
  display: grid;
  grid-template-columns: 300px 1fr;
  height: 100vh;
  gap: 0;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const Sidebar = styled.div`
  display: flex;
  flex-direction: column;
  border-right: 1px solid #e0e0e0;
  background: white;

  @media (max-width: 768px) {
    display: none;
  }
`;

const MainContent = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: white;
  color: #999;
`;

export default function MessagesPage() {
  const [activeChat, setActiveChat] = useState(null);

  return (
    <Container>
      <Sidebar>
        <ChatList activeChat={activeChat} onSelectChat={setActiveChat} />
      </Sidebar>

      <MainContent>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>💬</div>
        <h2>Select a chat to start messaging</h2>
        <p style={{ fontSize: '14px' }}>Choose a conversation from the list on the left</p>
      </MainContent>
    </Container>
  );
}
```

### `src/app/(protected)/messages/[chatId]/page.js`

```javascript
'use client';

import { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useChat } from '@/hooks/useChats';
import { useSocket } from '@/hooks/useSocket';
import { useAuth } from '@/hooks/useAuth';
import ChatHeader from '@/components/chat/ChatHeader';
import MessageList from '@/components/chat/MessageList';
import MessageInput from '@/components/chat/MessageInput';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorAlert from '@/components/common/ErrorAlert';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: white;
`;

const Content = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const LoadingOverlay = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
`;

export default function ChatPage({ params }) {
  const { chatId } = params;
  const { user } = useAuth();
  const { data: chat, isLoading, error } = useChat(chatId);
  const { isConnected } = useSocket();

  if (isLoading) {
    return (
      <Container>
        <LoadingOverlay>
          <LoadingSpinner />
        </LoadingOverlay>
      </Container>
    );
  }

  if (error || !chat) {
    return (
      <Container>
        <ErrorAlert message="Failed to load chat" />
      </Container>
    );
  }

  return (
    <Container>
      <ChatHeader chat={chat} />
      
      <Content>
        {!isConnected && (
          <div style={{ 
            padding: '8px 16px', 
            background: '#fff3cd', 
            color: '#856404', 
            fontSize: '12px' 
          }}>
            Reconnecting...
          </div>
        )}
        
        <MessageList chatId={chatId} userId={user?._id} />
        <MessageInput chatId={chatId} />
      </Content>
    </Container>
  );
}
```

---

## 🔌 Socket.IO Real-time Integration

### `src/context/SocketContext.jsx`

```javascript
'use client';

import { createContext, useContext } from 'react';
import { useSocket } from '@/hooks/useSocket';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const socketData = useSocket();

  return (
    <SocketContext.Provider value={socketData}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocketContext() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocketContext must be used within SocketProvider');
  }
  return context;
}
```

### Update `src/components/Providers.jsx`

```javascript
'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient } from '@/lib/react-query';
import { AuthProvider } from '@/context/AuthContext';
import { SocketProvider } from '@/context/SocketContext';

export default function Providers({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SocketProvider>
          {children}
        </SocketProvider>
      </AuthProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

---

## 📊 Complete Flow Diagrams

### 1. Initialize Chat Conversation

```
User Clicks "New Chat"
         ↓
Clicks User from Search
         ↓
API: POST /chats/one-to-one { otherUserId }
         ↓
Backend: Creates/Returns Chat
         ↓
Frontend: useGetOrCreateChat Hook
         ↓
Navigate to /messages/[chatId]
         ↓
Socket: emit('joinChat', chatId)
         ↓
Chat Page Loads with Messages
```

### 2. Send Message Real-time Flow

```
User Types Message
         ↓
onChange: emit('typing') every keystroke
         ↓
After 2s inactivity: emit('typing', false)
         ↓
User Clicks Send
         ↓
Hook: useSendMessage.mutateAsync()
         ↓
API: POST /messages { chatId, text }
         ↓
Backend: Save Message to DB
         ↓
Socket: io.to(chat_${chatId}).emit('message:new:${chatId}')
         ↓
All Connected Clients Receive Event
         ↓
Component: MessageList Auto-Updates
         ↓
Message Appears in Chat
```

### 3. Reaction Flow

```
User Hovers Message
         ↓
Shows Emoji Picker
         ↓
Clicks Emoji (👍, ❤️, etc)
         ↓
Hook: useAddReaction.mutateAsync()
         ↓
API: POST /messages/:id/reactions { emoji }
         ↓
Backend: Add to message.reactions array
         ↓
Socket: io.to(chat_${chatId}).emit('reactionAdded')
         ↓
All Clients Update Message with Reaction
```

---

## ✅ Testing Checklist

### Unit Tests

- [ ] `useChats` hook - fetch, create, delete
- [ ] `useMessages` hook - fetch, send, edit, delete
- [ ] `useSocket` hook - connection, events
- [ ] Components render correctly

### Integration Tests

- [ ] Fetch chats list
- [ ] Create new 1:1 chat
- [ ] Create group chat
- [ ] Send and receive messages in real-time
- [ ] Messages marked as read
- [ ] Typing indicator works
- [ ] Emoji reactions add/remove

### End-to-End Tests

- [ ] Complete conversation flow
- [ ] Multiple users chatting simultaneously
- [ ] Message persistence across page reloads
- [ ] Socket reconnection on disconnect
- [ ] File upload and sharing
- [ ] User online/offline status

### Performance Tests

- [ ] Load 100+ messages smoothly
- [ ] Emoji picker doesn't lag
- [ ] Typing indicator smooth
- [ ] Message reactions load quickly

### UX Tests

- [ ] Auto-scroll to new messages
- [ ] Date separators clear
- [ ] Timestamps accurate
- [ ] Mobile responsive
- [ ] Scroll to load older messages
- [ ] Input clears after send

---

## 🚀 Next Steps to Implementation

1. **Create all service files** (chat.js, messages.js)
2. **Create all hook files** (useChats.js, useMessages.js, useSocket.js)
3. **Create all components** (ChatList, MessageInput, etc.)
4. **Create page files** (/messages, /messages/[chatId])
5. **Add Socket context provider**
6. **Install socket.io-client**: `npm install socket.io-client`
7. **Test all flows** using testing checklist
8. **Deploy and monitor** real-time performance

---

## 📝 File Summary

| File | Type | Status | Purpose |
|------|------|--------|---------|
| chat.js | Service | ✅ Ready | Chat API calls |
| messages.js | Service | ✅ Ready | Message API calls |
| useChats.js | Hook | ✅ Ready | Chat state management |
| useMessages.js | Hook | ✅ Ready | Message state management |
| useSocket.js | Hook | ✅ Ready | Socket.IO connection |
| ChatList.jsx | Component | ✅ Ready | Chat list display |
| MessageList.jsx | Component | ✅ Ready | Messages display |
| MessageInput.jsx | Component | ✅ Ready | Message input |
| MessageItem.jsx | Component | ✅ Ready | Individual message |
| TypingIndicator.jsx | Component | ✅ Ready | Typing status |
| /messages/page.js | Page | ✅ Ready | Messages list |
| /messages/[chatId]/page.js | Page | ✅ Ready | Chat detail |
| SocketContext.jsx | Context | ✅ Ready | Global socket |

**Total: 13 files to create**

---

This complete documentation provides everything needed to implement the full chat and messaging system on your Next.js frontend. All code is styled-components compatible and follows your existing architecture patterns.

