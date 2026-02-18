const Presence = require('../models/presenceModel');
const OfflineMessage = require('../models/offlineMessageModel');
const User = require('../models/userModel');
const logger = require('../utils/logger');

class RealTimeManager {
  constructor(io) {
    this.io = io;
    this.onlineUsers = new Map(); // userId -> Set of socket IDs
    this.userSockets = new Map(); // socketId -> userId
    this.typingUsers = new Map(); // chatId -> Set of typing user IDs
  }

  // Handle user connection
  async handleConnection(socket) {
    try {
      const userId = socket.userId;
      if (!userId) {
        console.warn('❌ [REALTIME] handleConnection called with no userId');
        return;
      }

      console.log(`🟢 [REALTIME] Handling connection for user: ${userId}, socket: ${socket.id}`);

      // STEP 1: Track socket in memory
      let userSockets = this.onlineUsers.get(userId) || new Set();
      userSockets.add(socket.id);
      this.onlineUsers.set(userId, userSockets);
      this.userSockets.set(socket.id, userId);
      console.log(`✅ [REALTIME] Tracked socket. Total sockets for user: ${userSockets.size}`);

      // STEP 2: Update presence
      await this.updatePresence(userId, socket, 'online');
      console.log(`✅ [REALTIME] Updated presence to online`);

      // STEP 3: Join user's personal room BEFORE any broadcasts
      socket.join(`user_${userId}`);
      console.log(`✅ [REALTIME] Joined personal room: user_${userId}`);

      // STEP 4: Send presence snapshot IMMEDIATELY after join (CRITICAL for reconciliation)
      try {
        const snapshot = await this.buildPresenceSnapshot(userId);
        socket.emit('presenceSnapshot', snapshot);
        console.log(`📤 [REALTIME] Sent presence snapshot to ${userId} with ${snapshot.onlineMembers.length} online members`);
      } catch (err) {
        console.error(`⚠️ [REALTIME] Error sending presence snapshot:`, err?.message || err);
      }

      // STEP 5: Deliver offline messages
      await this.deliverOfflineMessages(userId);
      console.log(`✅ [REALTIME] Delivered offline messages`);

      // STEP 6: Broadcast online status to friends (happens AFTER snapshot is sent)
      await this.broadcastPresence(userId, 'online');
      console.log(`✅ [REALTIME] Broadcasted online status`);
    } catch (err) {
      console.error('❌ [REALTIME] Error in handleConnection:', err?.message || err);
      console.error('❌ [REALTIME] Full stack:', err?.stack);
      throw err;
    }
  }

  // Handle user disconnection
  async handleDisconnection(socket) {
    const userId = this.userSockets.get(socket.id);
    if (!userId) return;

    // Remove socket tracking
    const userSockets = this.onlineUsers.get(userId);
    if (userSockets) {
      userSockets.delete(socket.id);
      if (userSockets.size === 0) {
        this.onlineUsers.delete(userId);
        // Update presence
        await this.updatePresence(userId, socket, 'offline');
        // Broadcast offline status
        await this.broadcastPresence(userId, 'offline');
      }
    }
    this.userSockets.delete(socket.id);
  }

  // Update user presence (DISABLED - using Socket.IO in-memory tracking instead)
  async updatePresence(userId, socket, status) {
    try {
      // Disabled database operations - using Socket.IO in-memory tracking instead
      // to prevent MongoDB buffering timeout issues
      console.log(`🔵 Presence update (in-memory): ${userId} -> ${status}`);
    } catch (err) {
      logger.error('Error updating presence:', err);
    }
  }

  // Build a presence snapshot for a user's chat members (authoritative state)
  async buildPresenceSnapshot(userId) {
    try {
      const Chat = require('../models/chatModel');
      
      // Get all chats for this user
      const userChats = await Chat.find({ members: userId })
        .select('members')
        .lean()
        .exec();

      if (!userChats || userChats.length === 0) {
        console.log(`🔍 [SNAPSHOT] No chats found for user ${userId}`);
        return { onlineMembers: [] };
      }

      // Collect all unique member IDs
      const memberIds = new Set();
      for (const chat of userChats) {
        if (chat.members && Array.isArray(chat.members)) {
          for (const member of chat.members) {
            const memberId = (member._id || member).toString();
            if (memberId !== userId.toString()) {
              memberIds.add(memberId);
            }
          }
        }
      }

      // Check which members are currently online
      const onlineMembers = [];
      for (const memberId of memberIds) {
        const isOnline = this.isUserOnline(memberId);
        if (isOnline) {
          const normalizedId = (memberId || '').toString().toLowerCase().trim();
          onlineMembers.push(normalizedId);
        }
      }

      console.log(`🔍 [SNAPSHOT] Built snapshot for user ${userId}: ${onlineMembers.length} online members`);
      return { onlineMembers };
    } catch (err) {
      console.error(`❌ [SNAPSHOT] Error building presence snapshot:`, err?.message || err);
      return { onlineMembers: [] };
    }
  }

  // Broadcast presence to friends
  async broadcastPresence(userId, status) {
    try {
      const user = await User.findById(userId).select('friends');
      
      // Broadcast to friends
      if (user?.friends?.length) {
        console.log(`📢 Broadcasting presence to ${user.friends.length} friends`);
        this.io.to(user.friends.map(id => `user_${id}`)).emit('presenceUpdate', {
          userId,
          status
        });
      }
      
      // NEW: Also broadcast to all chat rooms (so chat participants see online status)
      // Get all sockets for this user
      const userSockets = this.onlineUsers.get(userId);
      if (userSockets && userSockets.size > 0) {
        // For each socket, find all rooms it's in and broadcast
        for (const socketId of userSockets) {
          const socket = this.io.sockets.sockets.get(socketId);
          if (socket) {
            // Broadcast to all chat rooms this user is in
            for (const room of socket.rooms) {
              if (room.startsWith('chat_')) {
                console.log(`📢 Broadcasting presence ${status} for user ${userId} to chat room ${room}`);
                this.io.to(room).emit('presenceUpdate', {
                  userId,
                  status
                });
              }
            }
          }
        }
      }
    } catch (err) {
      logger.error('Error broadcasting presence:', err);
    }
  }

  // Store offline message
  async storeOfflineMessage(recipientId, type, content) {
    try {
      await OfflineMessage.create({
        recipient: recipientId,
        type,
        content
      });
    } catch (err) {
      logger.error('Error storing offline message:', err);
    }
  }

  // Deliver offline messages
  async deliverOfflineMessages(userId) {
    try {
      console.log(`🔄 [REALTIME] Fetching offline messages for user: ${userId}`);
      const messages = await OfflineMessage.find({
        recipient: userId,
        delivered: false
      }).sort('createdAt');

      console.log(`📬 [REALTIME] Found ${messages.length} offline messages for user: ${userId}`);

      for (const message of messages) {
        try {
          // Emit message based on type
          this.io.to(`user_${userId}`).emit(message.type, message.content);
          console.log(`✅ [REALTIME] Emitted offline message type: ${message.type}`);
          
          // Mark as delivered
          message.delivered = true;
          await message.save();
        } catch (err) {
          console.error(`❌ [REALTIME] Error delivering message:`, err?.message || err);
        }
      }
    } catch (err) {
      console.error('❌ [REALTIME] Error in deliverOfflineMessages:', err?.message || err);
      console.error('❌ [REALTIME] Full stack:', err?.stack);
      logger.error('Error delivering offline messages:', err);
    }
  }

  // Send notification
  async sendNotification(userId, notification) {
    const userSockets = this.onlineUsers.get(userId);
    
    if (userSockets?.size) {
      // User is online, send directly
      this.io.to(`user_${userId}`).emit('notification', notification);
    } else {
      // User is offline, store for later
      await this.storeOfflineMessage(userId, 'notification', notification);
    }
  }

  // Handle typing indicators
  handleTyping(socket, { chatId, isTyping }) {
    const userId = socket.userId;
    if (!userId || !chatId) return;

    let chatTyping = this.typingUsers.get(chatId) || new Set();
    
    if (isTyping) {
      chatTyping.add(userId);
    } else {
      chatTyping.delete(userId);
    }
    
    this.typingUsers.set(chatId, chatTyping);
    
    // Broadcast to others in chat
    socket.to(`chat_${chatId}`).emit('userTyping', {
      chatId,
      userId,
      isTyping
    });
  }

  // Get online status
  isUserOnline(userId) {
    return this.onlineUsers.has(userId);
  }

  // Get user's active sockets
  getUserSockets(userId) {
    return this.onlineUsers.get(userId) || new Set();
  }

  // Update user status (away, busy, etc.)
  async updateUserStatus(userId, status) {
    try {
      await Presence.findOneAndUpdate(
        { userId },
        { status },
        { upsert: true }
      );

      await this.broadcastPresence(userId, status);
    } catch (err) {
      logger.error('Error updating user status:', err);
    }
  }

  // Clean up inactive sessions
  async cleanupInactiveSessions() {
    try {
      const threshold = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours
      await Presence.updateMany(
        {
          'deviceInfo.lastActive': { $lt: threshold }
        },
        {
          $pull: {
            deviceInfo: { lastActive: { $lt: threshold } }
          }
        }
      );
    } catch (err) {
      logger.error('Error cleaning up inactive sessions:', err);
    }
  }
}

module.exports = RealTimeManager;