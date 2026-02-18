# Message Reactions Feature Documentation

## Overview

The Message Reactions feature enables users to quickly express their feelings about messages using emoji reactions. This implementation includes:

- ✅ Real-time Socket.IO updates
- ✅ Emoji validation and sanitization
- ✅ User-friendly error handling
- ✅ Comprehensive reaction statistics
- ✅ Automatic cleanup of zero-count reactions

## Supported Reactions

The following emojis are supported for reactions:

```
👍 ❤️ 😂 😮 😢 😡 🔥 💯
👏 🙌 😍 😎 🤔 🤷 😅 💪
🎉 🚀 ✨ 👌 🙏 😤 🤢 🤮
🥳 😱 🤯 😈 🤡 🎭 😸 😹
😺 😼 😽 🙀 😿 😾 🙈 🙉
🙊 💋 💏 💑 👨‍👩‍👧‍👦
```

## API Endpoints

### 1. Add Reaction to Message

**Endpoint:** `POST /api/v1/messages/:id/reactions`

**Authentication:** Required (JWT)

**Request Body:**
```json
{
  "emoji": "👍"
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "message": { /* full message object */ },
    "reaction": {
      "emoji": "👍",
      "userCount": 3,
      "userReacted": true,
      "reactions": [
        {
          "emoji": "👍",
          "count": 3,
          "users": [
            {
              "id": "user_id_1",
              "fullName": "John Doe",
              "photo": "url_to_photo"
            },
            // ... more users
          ]
        }
      ]
    }
  }
}
```

**Error Responses:**
- `400` - Invalid emoji or missing emoji field
- `404` - Message not found
- `403` - User is not a member of the chat

### 2. Remove Reaction from Message

**Endpoint:** `DELETE /api/v1/messages/:id/reactions`

**Authentication:** Required (JWT)

**Request Body:**
```json
{
  "emoji": "👍"
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "message": { /* full message object */ },
    "reaction": {
      "emoji": "👍",
      "removed": true,
      "remainingCount": 2,
      "reactions": [ /* remaining reactions */ ]
    }
  }
}
```

### 3. Get Reaction Statistics

**Endpoint:** `GET /api/v1/messages/:messageId/reactions/stats`

**Authentication:** Required (JWT)

**Response:**
```json
{
  "status": "success",
  "data": {
    "messageId": "message_id",
    "reactions": [
      {
        "emoji": "👍",
        "count": 5,
        "users": [
          {
            "id": "user_id",
            "fullName": "John Doe",
            "photo": "url"
          }
        ]
      }
    ],
    "stats": {
      "totalReactions": 8,
      "totalUniqueEmojis": 3,
      "reactionBreakdown": {
        "👍": 5,
        "❤️": 2,
        "😂": 1
      },
      "topReactions": [
        { "emoji": "👍", "count": 5 },
        { "emoji": "❤️", "count": 2 }
      ]
    }
  }
}
```

### 4. Get Users for Specific Reaction

**Endpoint:** `GET /api/v1/messages/:messageId/reactions/users?emoji=👍`

**Authentication:** Required (JWT)

**Query Parameters:**
- `emoji` (required) - The emoji to get users for

**Response:**
```json
{
  "status": "success",
  "results": 3,
  "data": {
    "messageId": "message_id",
    "emoji": "👍",
    "users": [
      {
        "id": "user_id_1",
        "fullName": "John Doe",
        "photo": "url"
      },
      {
        "id": "user_id_2",
        "fullName": "Jane Smith",
        "photo": "url"
      }
    ]
  }
}
```

### 5. Get All Allowed Reactions

**Endpoint:** `GET /api/v1/messages/reactions/allowed`

**Authentication:** Required (JWT)

**Response:**
```json
{
  "status": "success",
  "results": 50,
  "data": {
    "reactions": ["👍", "❤️", "😂", "😮", "😢", "😡", "🔥", "💯", ...]
  }
}
```

## Real-Time Socket.IO Events

### Client → Server

#### Add Reaction
```javascript
socket.emit('addReaction', {
  messageId: 'message_id_123',
  chatId: 'chat_id_456',
  emoji: '👍'
});
```

#### Remove Reaction
```javascript
socket.emit('removeReaction', {
  messageId: 'message_id_123',
  chatId: 'chat_id_456',
  emoji: '👍'
});
```

#### Get Reactions
```javascript
socket.emit('getReactions', {
  messageId: 'message_id_123',
  chatId: 'chat_id_456'
}, (response) => {
  if (response.success) {
    console.log('Reactions:', response.reactions);
    console.log('Total:', response.totalReactions);
  }
});
```

### Server → Client

#### Reaction Added (Broadcast)
```javascript
socket.on('reactionAdded', (data) => {
  console.log(`User ${data.userId} added ${data.emoji} reaction`);
  console.log('Current reactions:', data.reactions);
  console.log('Total reactions:', data.reactionCount);
});
```

#### Reaction Removed (Broadcast)
```javascript
socket.on('reactionRemoved', (data) => {
  console.log(`User ${data.userId} removed ${data.emoji} reaction`);
  console.log('Remaining reactions:', data.remainingCount);
  console.log('Current reactions:', data.reactions);
});
```

#### Error Event
```javascript
socket.on('error', (error) => {
  console.error('Reaction error:', error.message);
});
```

## Database Schema

The Message model stores reactions in the following format:

```javascript
reactions: [{
  emoji: String,          // The emoji character
  users: [ObjectId],      // Array of user IDs who reacted
  count: Number           // Number of users who reacted
}]
```

Example document:
```javascript
{
  _id: ObjectId,
  chat: ObjectId,
  sender: ObjectId,
  text: "Hello world!",
  reactions: [
    {
      emoji: "👍",
      users: [userId1, userId2, userId3],
      count: 3
    },
    {
      emoji: "❤️",
      users: [userId2, userId4],
      count: 2
    }
  ]
}
```

## Utility Functions

### reactionValidator.js

This utility module provides helper functions for reaction management:

#### `validateReaction(emoji)`
Validates and sanitizes reaction input.

```javascript
const { valid, error, emoji } = reactionValidator.validateReaction('👍');
if (!valid) {
  console.error(error);
}
```

#### `getReactionStats(reactions)`
Gets statistics from reactions array.

```javascript
const stats = reactionValidator.getReactionStats(message.reactions);
console.log(stats.totalReactions);
console.log(stats.topReactions);
```

#### `hasUserReacted(reactions, emoji, userId)`
Checks if a user has reacted with a specific emoji.

```javascript
const hasReacted = reactionValidator.hasUserReacted(
  message.reactions,
  '👍',
  userId
);
```

#### `formatReactionsForResponse(reactions)`
Formats reactions for API responses with user details.

```javascript
const formatted = reactionValidator.formatReactionsForResponse(
  message.reactions
);
```

## Frontend Integration Examples

### React Example

```javascript
import { useState, useEffect } from 'react';
import { useSocket } from './hooks/useSocket';

function MessageReactions({ message, currentUserId }) {
  const [reactions, setReactions] = useState(message.reactions || []);
  const socket = useSocket();

  const handleAddReaction = (emoji) => {
    socket.emit('addReaction', {
      messageId: message._id,
      chatId: message.chat,
      emoji
    });
  };

  const handleRemoveReaction = (emoji) => {
    socket.emit('removeReaction', {
      messageId: message._id,
      chatId: message.chat,
      emoji
    });
  };

  useEffect(() => {
    socket.on('reactionAdded', (data) => {
      if (data.messageId === message._id) {
        setReactions(data.reactions);
      }
    });

    socket.on('reactionRemoved', (data) => {
      if (data.messageId === message._id) {
        setReactions(data.reactions);
      }
    });

    return () => {
      socket.off('reactionAdded');
      socket.off('reactionRemoved');
    };
  }, [socket, message._id]);

  const hasUserReacted = (emoji) => {
    const reaction = reactions.find(r => r.emoji === emoji);
    return reaction?.users?.some(user => user._id === currentUserId);
  };

  return (
    <div className="reactions">
      {reactions.map(reaction => (
        <button
          key={reaction.emoji}
          className={`reaction ${hasUserReacted(reaction.emoji) ? 'active' : ''}`}
          onClick={() => {
            if (hasUserReacted(reaction.emoji)) {
              handleRemoveReaction(reaction.emoji);
            } else {
              handleAddReaction(reaction.emoji);
            }
          }}
        >
          {reaction.emoji} <span>{reaction.count}</span>
        </button>
      ))}
    </div>
  );
}
```

## Best Practices

1. **Emoji Validation**: Always validate emojis using `reactionValidator.validateReaction()` before processing.

2. **Real-Time Updates**: Use Socket.IO for instant reaction updates rather than polling.

3. **Error Handling**: Handle all error cases gracefully, especially when reactions are removed by other users.

4. **Performance**: Reactions are indexed in MongoDB for fast queries.

5. **User Experience**: Show reaction counts prominently and allow easy adding/removing of reactions.

6. **Cleanup**: Zero-count reactions are automatically removed when the last user removes their reaction.

## Known Limitations

- Maximum 50 allowed emoji reactions (customizable in `reactionValidator.js`)
- Duplicate reactions per user not allowed (a user can only react once per emoji)
- Real-time updates require active Socket.IO connection

## Future Enhancements

- Custom emoji support
- Reaction analytics dashboard
- Reaction-based message filtering
- Animated reaction notifications
- Reaction moderation for offensive content
