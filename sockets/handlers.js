const Chat = require('../models/chatModel');
const Message = require('../models/messageModel');
const User = require('../models/userModel');
const Notification = require('../models/notificationModel');
const mongoose = require('mongoose');

// Store online users and their typing status
const onlineUsers = new Map(); // userId -> Set of socketIds
const typingUsers = new Map(); // chatId -> Set of userIds

// Helper to create and save notification
const createNotification = async (userId, title, message, type, data = {}) => {
  try {
    const notification = await Notification.create({
      user: userId,
      title,
      message,
      type,
      data
    });
    return notification;
  } catch (err) {
    console.error('Error creating notification:', err);
    return null;
  }
};

// Chat handlers
exports.handleChatEvents = (socket, io, realTimeManager) => {
  console.log('📌 handleChatEvents initialized for socket:', socket.id);
  console.log('📌 Socket object check:', {
    hasOn: typeof socket.on === 'function',
    hasJoin: typeof socket.join === 'function',
    userId: socket.userId,
    socketId: socket.id
  });
  
  // Join personal room for direct notifications
  if (socket.userId) {
    console.log('📌 Joining personal room for user:', socket.userId);
    socket.join(`user_${socket.userId}`);
    console.log('📌 Successfully joined personal room');
    
    // ✅ Broadcast presence to all chat members when user connects
    const userIdString = (socket.userId || '').toString().toLowerCase().trim();
    console.log('🔔 [PRESENCE BROADCAST ON CONNECT] Starting for user:', userIdString);
    
    // STEP 1: Broadcast immediately to all connected clients (no delay)
    io.emit('presenceUpdate', {
      userId: userIdString,
      status: 'online'
    });
    console.log('✅ Broadcasted online status to all connected clients');
    
    // STEP 2: Find and notify chat members (with timeout to ensure it happens)
    (async () => {
      try {
        console.log('🔔 [PRESENCE BROADCAST] Querying chats for user:', socket.userId);
        
        // Use a timeout to ensure we don't wait forever
        const chatsPromise = Chat.find({ members: socket.userId })
          .select('members')
          .lean()
          .exec();
        
        const userChats = await Promise.race([
          chatsPromise,
          new Promise((_, reject) => setTimeout(() => reject(new Error('Chat query timeout')), 5000))
        ]);
        
        if (!userChats || userChats.length === 0) {
          console.log('🔔 No chats found for user:', socket.userId);
          return;
        }
        
        console.log('🔔 Found chats:', userChats.length);
        
        // Build set of unique member IDs
        const uniqueMemberIds = new Set();
        for (const chat of userChats) {
          for (const member of chat.members) {
            const memberId = (member._id || member).toString();
            if (memberId !== socket.userId.toString()) {
              uniqueMemberIds.add(memberId);
            }
          }
        }
        
        console.log('🔔 Unique member IDs for targeted broadcast:', Array.from(uniqueMemberIds));
        
        // STEP 3: Emit to each member's personal room for targeted notification
        for (const memberId of uniqueMemberIds) {
          try {
            // Check how many sockets are currently in the user's personal room
            let roomSockets = [];
            try {
              roomSockets = await io.of('/').in(`user_${memberId}`).fetchSockets();
            } catch (err) {
              console.warn('⚠️ [PRESENCE] fetchSockets failed for', memberId, err?.message || err);
            }

            // If no sockets present, retry a few times with short backoff to catch near-simultaneous connects
            if (!roomSockets || roomSockets.length === 0) {
              const retries = [100, 300, 900]; // ms
              let found = false;
              for (let i = 0; i < retries.length; i++) {
                const wait = retries[i];
                await new Promise(res => setTimeout(res, wait));
                try {
                  roomSockets = await io.of('/').in(`user_${memberId}`).fetchSockets();
                } catch (err) {
                  console.warn('⚠️ [PRESENCE RETRY] fetchSockets failed for', memberId, err?.message || err);
                }
                console.log(`🔁 [PRESENCE RETRY] Attempt ${i+1} for user_${memberId}, sockets in room: ${roomSockets?.length || 0}`);
                if (roomSockets && roomSockets.length > 0) {
                  found = true;
                  break;
                }
              }

              if (found) {
                console.log(`✅ [PRESENCE RETRY] Member ${memberId} appeared in room; emitting presenceUpdate`);
                io.to(`user_${memberId}`).emit('presenceUpdate', {
                  userId: userIdString,
                  status: 'online'
                });
                continue; // next member
              }
            }

            console.log(`🔔 Emitting presenceUpdate to user_${memberId} (sockets in room: ${roomSockets.length}) for user`, userIdString);
            io.to(`user_${memberId}`).emit('presenceUpdate', {
              userId: userIdString,
              status: 'online'
            });
          } catch (err) {
            console.warn('⚠️ [PRESENCE] Error emitting to user room', memberId, err?.message || err);
          }
        }
        
        console.log(`✅ Completed targeted broadcast to ${uniqueMemberIds.size} chat members`);

        // ALSO: Send an authoritative snapshot of which of the chat members are currently online
        try {
          const onlineForSocket = [];
          for (const memberId of uniqueMemberIds) {
            let isOnline = false;
            if (realTimeManager && typeof realTimeManager.isUserOnline === 'function') {
              try {
                isOnline = !!realTimeManager.isUserOnline(memberId);
              } catch (err) {
                console.warn('⚠️ [PRESENCE SNAPSHOT] realTimeManager.isUserOnline error for', memberId, err?.message);
                isOnline = false;
              }
            }

            if (!isOnline) {
              try {
                const userSockets = await io.of('/').in(`user_${memberId}`).fetchSockets();
                isOnline = !!(userSockets && userSockets.length > 0);
              } catch (err) {
                console.warn('⚠️ [PRESENCE SNAPSHOT] fetchSockets error for', memberId, err?.message);
                isOnline = false;
              }
            }

            if (isOnline) {
              onlineForSocket.push((memberId || '').toString().toLowerCase().trim());
            }
          }

          if (onlineForSocket.length > 0) {
            console.log(`📤 [PRESENCE SNAPSHOT] Sending ${onlineForSocket.length} online members to socket ${socket.id}`);
            socket.emit('presenceSnapshot', { onlineMembers: onlineForSocket });
          } else {
            console.log(`📤 [PRESENCE SNAPSHOT] No online chat members to send to socket ${socket.id}`);
          }
        } catch (err) {
          console.error('❌ [PRESENCE SNAPSHOT] Error preparing snapshot:', err?.message || err);
        }

        // DEFENSIVE: Ensure every currently-connected socket receives the presenceUpdate
        try {
          console.log('🔁 [PRESENCE BROADCAST] Sending direct per-socket presenceUpdate for user:', userIdString);
          io.sockets.sockets.forEach((s) => {
            try {
              s.emit('presenceUpdate', { userId: userIdString, status: 'online' });
            } catch (e) {
              // ignore per-socket errors
            }
          });
          console.log('✅ [PRESENCE BROADCAST] Direct per-socket presenceUpdate completed');
        } catch (err) {
          console.warn('⚠️ [PRESENCE BROADCAST] Direct broadcast failed:', err?.message || err);
        }
      } catch (err) {
        console.error('❌ Error in presence broadcast:', err.message);
      }
    })();
    
    console.log('🔔 Presence broadcast initiated for user:', socket.userId);
  }

  // ✅ NEW: Get all online chat members on initial connection
  socket.on('getOnlineChatMembers', async (callback) => {
    try {
      console.log('🔍 [GET ONLINE CHAT MEMBERS] Request from user:', socket.userId);
      
      if (!socket.userId) {
        console.warn('⚠️ [GET ONLINE CHAT MEMBERS] No userId found');
        if (callback) callback({ success: false, error: 'No userId' });
        return;
      }

      // Find all chats for this user
      const userChats = await Chat.find({ members: socket.userId })
        .select('members')
        .lean()
        .exec();

      if (!userChats || userChats.length === 0) {
        console.log('🔍 [GET ONLINE CHAT MEMBERS] No chats found for user:', socket.userId);
        if (callback) callback({ success: true, onlineChatMembers: [] });
        return;
      }

      // Collect all unique member IDs from all chats
      const memberIds = new Set();
      for (const chat of userChats) {
        if (chat.members && Array.isArray(chat.members)) {
          for (const member of chat.members) {
            const memberId = member._id?.toString() || member.toString();
            if (memberId !== socket.userId?.toString()) {
              memberIds.add(memberId);
            }
          }
        }
      }

      console.log('🔍 [GET ONLINE CHAT MEMBERS] Found members:', memberIds.size);

      // Check which members have active sockets. Prefer authoritative realTimeManager when available.
      const onlineMemberIds = [];
      for (const memberId of memberIds) {
        try {
          let isOnline = false;
          // First, ask realTimeManager if available (most reliable in-memory source)
          if (realTimeManager && typeof realTimeManager.isUserOnline === 'function') {
            try {
              isOnline = !!realTimeManager.isUserOnline(memberId);
            } catch (err) {
              console.warn('⚠️ [GET ONLINE CHAT MEMBERS] realTimeManager.isUserOnline error for', memberId, err?.message);
              isOnline = false;
            }
          }

          // Fallback to checking sockets in personal room
          if (!isOnline) {
            const userRoomName = `user_${memberId}`;
            const userSockets = await io.of('/').in(userRoomName).fetchSockets();
            isOnline = !!(userSockets && userSockets.length > 0);
          }

          if (isOnline) {
            const normalizedMemberId = (memberId || '').toString().toLowerCase().trim();
            onlineMemberIds.push(normalizedMemberId);
            console.log(`✅ [GET ONLINE CHAT MEMBERS] User ${normalizedMemberId} is ONLINE`);
          }
        } catch (err) {
          console.error(`⚠️ [GET ONLINE CHAT MEMBERS] Error checking socket for ${memberId}:`, err.message);
        }
      }

      console.log(`📤 [GET ONLINE CHAT MEMBERS] Returning ${onlineMemberIds.length} online members to user ${socket.userId}`);
      if (callback) {
        callback({ 
          success: true, 
          onlineChatMembers: onlineMemberIds 
        });
      }
    } catch (error) {
      console.error('❌ [GET ONLINE CHAT MEMBERS] Error:', error.message);
      if (callback) {
        callback({ success: false, error: error.message });
      }
    }
  });

  // CATCH-ALL LISTENER - Debug all events on this socket
  socket.onAny((event, ...args) => {
    console.log('📡 [HANDLERS] SOCKET EVENT RECEIVED:', {
      event,
      socketId: socket.id,
      userId: socket.userId,
      argsCount: args.length
    });
  });

  // Join chat room
  console.log('📌 Registering joinChat listener...');
  socket.on('joinChat', async (chatId, callback) => {
    console.log('🔗 JOIN CHAT EVENT RECEIVED:', { chatId, socketId: socket.id, userId: socket.userId, callbackExists: !!callback });
    if (!chatId) {
      console.warn('⚠️ No chatId provided to joinChat');
      return;
    }
    
    try {
      // ✅ FIRST: Join room IMMEDIATELY (non-blocking)
      socket.join(`chat_${chatId}`);
      console.log('✅ Socket joined room:', `chat_${chatId}`);
      
      // ✅ Get list of other users currently in this chat room
      const chatRoom = io.sockets.adapter.rooms.get(`chat_${chatId}`);
      const otherUserIds = new Set();
      
      if (chatRoom) {
        for (const socketId of chatRoom) {
          const otherSocket = io.sockets.sockets.get(socketId);
          if (otherSocket && otherSocket.userId !== socket.userId) {
            const otherUserIdString = (otherSocket.userId?.toString() || otherSocket.userId).toLowerCase().trim();
            otherUserIds.add(otherUserIdString);
          }
        }
      }
      
      // ✅ ALSO: Query database to get ALL chat members and check if they're online
      const Chat = require('../models/chatModel');
      const chat = await Chat.findById(chatId).select('members');
      
      if (chat && chat.members) {
        for (const member of chat.members) {
          const memberId = (member._id?.toString() || member.toString()).toLowerCase().trim();
          if (memberId !== socket.userId?.toString()?.toLowerCase().trim()) {
            // Check if this user has an active socket
            const userSockets = await io.of('/').in(`user_${member._id}`).fetchSockets();
            if (userSockets.length > 0) {
              otherUserIds.add(memberId);
              console.log(`✅ User ${memberId} is online (has active socket)`);
            }
          }
        }
      }
      
      // ✅ SECOND: Before returning to client, mark messages as read for this user (awaited)
      try {
        if (socket.userId) {
          const userObjectId = typeof socket.userId === 'string'
            ? new mongoose.Types.ObjectId(socket.userId)
            : socket.userId;

          // Remove any raw ObjectId entries (legacy shape)
          await Message.updateMany(
            {
              chat: new mongoose.Types.ObjectId(chatId),
              readBy: userObjectId
            },
            { $pull: { readBy: userObjectId } }
          ).catch(err => console.warn('joinChat: pull raw error', err?.message || err));

          // Add normalized { user, readAt } entries for unread messages
          const updateResult = await Message.updateMany(
            {
              chat: new mongoose.Types.ObjectId(chatId),
              sender: { $ne: userObjectId },
              'readBy.user': { $ne: userObjectId }
            },
            { $push: { readBy: { user: userObjectId, readAt: new Date() } } }
          );

          console.log(`📘 joinChat: user ${socket.userId} marked ${updateResult.modifiedCount || updateResult.nModified || 0} messages as read in chat ${chatId}`);

          // Recompute unreadCount for the chat for all members and emit updates
          const memberIds = (chat && chat.members) ? chat.members.map(m => (m._id ? m._id.toString() : m.toString())) : [];
          try {
            const counts = await Promise.all(memberIds.map(async (memberId) => {
              try {
                const userObj = typeof memberId === 'string' ? new mongoose.Types.ObjectId(memberId) : memberId;
                const unread = await Message.countDocuments({
                  chat: new mongoose.Types.ObjectId(chatId),
                  $and: [ { 'flags.deleted': false }, { $nor: [ { 'readBy.user': userObj }, { readBy: userObj } ] } ]
                });
                return { memberId, unread };
              } catch (err) {
                return { memberId, unread: 0 };
              }
            }));

            for (const c of counts) {
              io.to(`user_${c.memberId}`).emit('unreadCountUpdate', { chatId, unreadCount: c.unread });
            }
          } catch (err) {
            console.warn('joinChat: failed to compute/emit unread counts', err?.message || err);
          }
        }
      } catch (err) {
        console.error('❌ joinChat: error marking messages as read', err?.message || err);
      }

      // ✅ THIRD: Send callback with list of online users
      if (callback) {
        const onlineUsersList = Array.from(otherUserIds);
        console.log(`📤 Sending callback with ${onlineUsersList.length} online users:`, onlineUsersList);
        callback({ 
          success: true, 
          room: `chat_${chatId}`,
          onlineUsers: onlineUsersList
        });
      }

      // ✅ FOURTH: Broadcast presence update to chat room and user room
      const userIdString = (socket.userId?.toString() || socket.userId).toLowerCase().trim();
      console.log('📡 Broadcasting presence update to chat room:', { userId: userIdString, status: 'online' });
      socket.to(`chat_${chatId}`).emit('presenceUpdate', {
        userId: userIdString,
        status: 'online'
      });
      
      // Also broadcast to user's personal room
      socket.to(`user_${socket.userId}`).emit('presenceUpdate', {
        userId: userIdString,
        status: 'online'
      });
      
      // ✅ FOURTH: Mark messages as read in BACKGROUND (non-blocking)
      if (socket.userId) {
        // Don't await - let this happen asynchronously in background
        const userObjectId = typeof socket.userId === 'string' 
          ? new mongoose.Types.ObjectId(socket.userId)
          : socket.userId;
        
        // First remove any raw ObjectId entries
        Message.updateMany(
          {
            chat: new mongoose.Types.ObjectId(chatId),
            readBy: userObjectId
          },
          {
            $pull: { readBy: userObjectId }
          }
        ).then(() => {
          // Then add normalized { user, readAt } entries for messages missing them
          return Message.updateMany(
            {
              chat: new mongoose.Types.ObjectId(chatId),
              sender: { $ne: userObjectId },
              'readBy.user': { $ne: userObjectId }
            },
            {
              $push: { readBy: { user: userObjectId, readAt: new Date() } }
            }
          );
        }).then(() => {
          console.log('✅ Messages marked as read for user (background task):', socket.userId);
        }).catch((error) => {
          console.error('❌ Error marking messages as read:', error.message);
        });
      }
      
    } catch (error) {
      console.error('❌ Error in joinChat:', error.message);
      if (callback) {
        callback({ success: false, error: error.message });
      }
    }
  });
  console.log('✅ joinChat listener successfully registered for socket:', socket.id);

  // Handle explicit logout event
  socket.on('userLogout', async (data, callback) => {
    console.log('🚪 [USER LOGOUT] Logout event received for user:', socket.userId);
    
    if (socket.userId) {
      const userIdString = (socket.userId || '').toString().toLowerCase().trim();
      
      try {
        // Get all chat members for this user
        const userChats = await Chat.find({ members: socket.userId })
          .select('members')
          .lean();
        
        if (userChats && userChats.length > 0) {
          // Build set of unique member IDs
          const uniqueMemberIds = new Set();
          for (const chat of userChats) {
            for (const member of chat.members) {
              const memberId = (member._id || member).toString();
              if (memberId !== socket.userId.toString()) {
                uniqueMemberIds.add(memberId);
              }
            }
          }
          
          console.log('🚪 [USER LOGOUT] Broadcasting offline to chat members:', Array.from(uniqueMemberIds));
          
          // Broadcast offline status to each chat member's personal room
          for (const memberId of uniqueMemberIds) {
            console.log('🚪 [USER LOGOUT] Emitting presenceUpdate (offline) to user_' + memberId);
            io.to(`user_${memberId}`).emit('presenceUpdate', {
              userId: userIdString,
              status: 'offline'
            });
          }
          
          console.log(`✅ [USER LOGOUT] Completed offline broadcast to ${uniqueMemberIds.size} chat members`);
        }
        
        // Also broadcast to all clients
        io.emit('presenceUpdate', {
          userId: userIdString,
          status: 'offline'
        });

        // Clean up realTimeManager state if available to avoid stale online entries
        try {
          if (realTimeManager) {
            console.log('🔧 [USER LOGOUT] Cleaning up realTimeManager for user:', socket.userId);
            // Remove from online users map
            if (typeof realTimeManager.onlineUsers !== 'undefined' && realTimeManager.onlineUsers.has(socket.userId)) {
              realTimeManager.onlineUsers.delete(socket.userId);
            }
            // Remove any socketId -> userId mappings
            if (typeof realTimeManager.userSockets !== 'undefined') {
              const userSockets = realTimeManager.getUserSockets(socket.userId) || new Set();
              for (const sId of userSockets) {
                realTimeManager.userSockets.delete(sId);
              }
            }
          }
        } catch (err) {
          console.warn('⚠️ [USER LOGOUT] Error cleaning realTimeManager state:', err?.message || err);
        }
        
        if (callback) {
          callback({ success: true });
        }
      } catch (error) {
        console.error('❌ [USER LOGOUT] Error:', error.message);
        if (callback) {
          callback({ success: false, error: error.message });
        }
      }
    }
  });
  console.log('✅ userLogout listener successfully registered for socket:', socket.id);

  // Leave chat room
  socket.on('leaveChat', (chatId) => {
    if (!chatId) return;
    socket.leave(`chat_${chatId}`);
    
    // Just leave the room, don't broadcast offline status
    // User is still online (they just viewed the chat list or navigated)
    // Only broadcast offline on actual socket disconnect
    console.log('📤 User left chat room:', chatId, '(still online)');
    
    socket.to(`chat_${chatId}`).emit('userLeft', {
      chatId,
      userId: socket.userId
    });
  });

  // Handle new message
  socket.on('sendMessage', async (payload) => {
    try {
      const { chatId, text, attachments } = payload;
      if (!chatId || !socket.userId) return;

      // Create message
      const message = await Message.create({
        chat: chatId,
        sender: socket.userId,
        text: text || '',
        attachments: attachments || [],
        readBy: [{ user: socket.userId, readAt: new Date() }]
      });

      // Populate sender details
      await message.populate('sender', 'fullName photo');

      // Update chat
      const chat = await Chat.findByIdAndUpdate(
        chatId,
        {
          lastMessage: text || (attachments?.length ? 'Attachment' : ''),
          updatedAt: Date.now()
        },
        { new: true }
      ).populate('members', '_id').populate('participants', 'fullName photo');

      // Emit to chat room with correct event name
      // Frontend listens for: message:new:${chatId}
      io.to(`chat_${chatId}`).emit(`message:new:${chatId}`, {
        _id: message._id,
        chat: message.chat || chatId,
        sender: message.sender,
        text: message.text,
        content: message.text, // Include content alias
        attachments: message.attachments,
        createdAt: message.createdAt,
        readBy: message.readBy
      });

      // ALSO broadcast to ChatList so ALL users see updated last message
      // CRITICAL: Send to all chat members' personal rooms, not just chat room
      // This ensures User B sees the update even if they haven't opened the chat yet
      if (chat && chat.members && chat.members.length > 0) {
        const newMessagePayload = {
          _id: message._id,
          chatId: chatId,
          chat: message.chat || chatId,
          sender: message.sender,
          text: message.text,
          content: message.text, // Include content alias
          attachments: message.attachments,
          createdAt: message.createdAt,
          readBy: message.readBy
        };
        
        // Broadcast to each member's personal room so they get it regardless of where they are
        for (const member of chat.members) {
          // Extract member ID - handle both ObjectId and populated objects
          const memberId = member._id ? member._id.toString() : member.toString();
          io.to(`user_${memberId}`).emit('newMessage', newMessagePayload);
          console.log(`📤 [MESSAGE] Sent newMessage event to user_${memberId}`);
        }
      } else {
        // Fallback: broadcast to chat room if members not available
        console.warn(`⚠️ [MESSAGE] Chat members not available for chat ${chatId}. Members:`, chat?.members);
        io.to(`chat_${chatId}`).emit('newMessage', {
          _id: message._id,
          chatId: chatId,
          chat: message.chat || chatId,
          sender: message.sender,
          text: message.text,
          content: message.text,
          attachments: message.attachments,
          createdAt: message.createdAt,
          readBy: message.readBy
        });
      }

      console.log(`📤 [MESSAGE] Broadcasted to all chat members for chat ${chatId}`);

      // Recompute unread counts per member and emit `unreadCountUpdate` so ChatList stays in sync.
      try {
        const memberIds = (chat && chat.members) ? chat.members.map(m => (m._id ? m._id.toString() : m.toString())) : [];
        const countPromises = memberIds.map(async (memberId) => {
          try {
            const userObjectId = typeof memberId === 'string' ? new mongoose.Types.ObjectId(memberId) : memberId;
            const unread = await Message.countDocuments({
              chat: new mongoose.Types.ObjectId(chatId),
              $and: [ { 'flags.deleted': false }, { $nor: [ { 'readBy.user': userObjectId }, { readBy: userObjectId } ] } ]
            });
            return { memberId, unread };
          } catch (err) {
            return { memberId, unread: 0 };
          }
        });

        const counts = await Promise.all(countPromises);
        for (const c of counts) {
          io.to(`user_${c.memberId}`).emit('unreadCountUpdate', { chatId, unreadCount: c.unread });
        }
      } catch (err) {
        console.warn('Failed to compute/emit unreadCountUpdate after sendMessage:', err?.message || err);
      }

      // Send notifications to offline participants
      chat.participants.forEach(async (participant) => {
        if (participant._id.toString() !== socket.userId) {
          const notification = await createNotification(
            participant._id,
            'New Message',
            `${message.sender.fullName}: ${text || 'Sent an attachment'}`,
            'chat',
            { chatId, messageId: message._id }
          );
          
          // Emit to user's room if they're not in the chat
          if (!io.sockets.adapter.rooms.get(`chat_${chatId}`)?.has(participant._id)) {
            io.to(`user_${participant._id}`).emit('notification', notification);
          }
        }
      });
    } catch (err) {
      console.error('sendMessage error:', err);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  // Handle typing status
  socket.on('typing', ({ chatId, isTyping }) => {
    if (!chatId || !socket.userId) return;

    let chatTyping = typingUsers.get(chatId) || new Set();
    
    if (isTyping) {
      chatTyping.add(socket.userId);
    } else {
      chatTyping.delete(socket.userId);
    }
    
    typingUsers.set(chatId, chatTyping);
    
    const normalizedUserId = (socket.userId || '').toString().toLowerCase().trim();
    
    // Broadcast to others in chat room
    socket.to(`chat_${chatId}`).emit('userTyping', {
      chatId,
      userId: normalizedUserId,
      isTyping
    });
    
    // Also broadcast to sender's user room (for ChatList sidebar in other tabs/windows)
    socket.to(`user_${socket.userId}`).emit('userTyping', {
      chatId,
      userId: normalizedUserId,
      isTyping
    });
  });

  // Handle explicit mark-as-read from client (optimistic clear on open)
  socket.on('markConversationRead', async ({ chatId }, callback) => {
    try {
      if (!chatId || !socket.userId) {
        if (callback) callback({ success: false, error: 'Missing chatId or user' });
        return;
      }

      const userObjectId = typeof socket.userId === 'string'
        ? new mongoose.Types.ObjectId(socket.userId)
        : socket.userId;

      // Normalize any raw ObjectId entries first (remove raw ObjectId form)
      await Message.updateMany(
        {
          chat: new mongoose.Types.ObjectId(chatId),
          readBy: userObjectId
        },
        { $pull: { readBy: userObjectId } }
      ).catch(err => console.warn('markConversationRead: pull raw error', err?.message || err));

      // Add normalized { user, readAt } entries for messages missing them
      const updateResult = await Message.updateMany(
        {
          chat: new mongoose.Types.ObjectId(chatId),
          sender: { $ne: userObjectId },
          'readBy.user': { $ne: userObjectId }
        },
        { $push: { readBy: { user: userObjectId, readAt: new Date() } } }
      );

      console.log(`📘 markConversationRead: user ${socket.userId} marked ${updateResult.modifiedCount || updateResult.nModified || 0} messages as read in chat ${chatId}`);

      // Recompute unread count for this chat (use object id comparison)
      const unreadCount = await Message.countDocuments({
        chat: new mongoose.Types.ObjectId(chatId),
        $and: [ { 'flags.deleted': false }, { $nor: [ { 'readBy.user': userObjectId }, { readBy: userObjectId } ] } ]
      });

      // Notify all chat members of the new unread count
      const chat = await Chat.findById(chatId).select('members');
      if (chat && chat.members && chat.members.length > 0) {
        for (const member of chat.members) {
          const memberId = member._id ? member._id.toString() : member.toString();
          io.to(`user_${memberId}`).emit('unreadCountUpdate', { chatId, unreadCount });
        }
      } else {
        // Fallback: emit to chat room
        io.to(`chat_${chatId}`).emit('unreadCountUpdate', { chatId, unreadCount });
      }

      // Emit messageRead event for UI conveniences (per-user)
      io.to(`chat_${chatId}`).emit('messageRead', { chatId, userId: socket.userId });

      if (callback) callback({ success: true, unreadCount });
    } catch (err) {
      console.error('❌ markConversationRead error:', err.message);
      if (callback) callback({ success: false, error: err.message });
    }
  });

  // Handle message reactions in real-time
  socket.on('addReaction', async ({ messageId, chatId, emoji }) => {
    try {
      if (!messageId || !chatId || !socket.userId || !emoji) return;

      const ALLOWED_REACTIONS = [
        '👍', '❤️', '😂', '😮', '😢', '😡', '🔥', '💯',
        '👏', '🙌', '😍', '😎', '🤔', '🤷', '😅', '💪',
        '🎉', '🚀', '💯', '✨', '👌', '💯', '🙏', '😤'
      ];

      // Validate emoji
      if (!ALLOWED_REACTIONS.includes(emoji)) {
        socket.emit('error', { message: 'Invalid emoji reaction' });
        return;
      }

      // Update message with reaction
      const message = await Message.findById(messageId);
      if (!message) return;

      await message.addReaction(socket.userId, emoji);

      // Broadcast reaction to all users in chat
      socket.to(`chat_${chatId}`).emit('reactionAdded', {
        messageId,
        emoji,
        userId: socket.userId,
        reactions: message.reactions
      });

      console.log(`User ${socket.userId} added reaction ${emoji} to message ${messageId}`);
    } catch (err) {
      console.error('addReaction error:', err);
      socket.emit('error', { message: 'Failed to add reaction' });
    }
  });

  // Handle removing message reactions in real-time
  socket.on('removeReaction', async ({ messageId, chatId, emoji }) => {
    try {
      if (!messageId || !chatId || !socket.userId || !emoji) return;

      const ALLOWED_REACTIONS = [
        '👍', '❤️', '😂', '😮', '😢', '😡', '🔥', '💯',
        '👏', '🙌', '😍', '😎', '🤔', '🤷', '😅', '💪',
        '🎉', '🚀', '💯', '✨', '👌', '💯', '🙏', '😤'
      ];

      // Validate emoji
      if (!ALLOWED_REACTIONS.includes(emoji)) {
        socket.emit('error', { message: 'Invalid emoji reaction' });
        return;
      }

      // Update message by removing reaction
      const message = await Message.findById(messageId);
      if (!message) return;

      await message.removeReaction(socket.userId, emoji);

      // Broadcast reaction removal to all users in chat
      socket.to(`chat_${chatId}`).emit('reactionRemoved', {
        messageId,
        emoji,
        userId: socket.userId,
        reactions: message.reactions
      });

      console.log(`User ${socket.userId} removed reaction ${emoji} from message ${messageId}`);
    } catch (err) {
      console.error('removeReaction error:', err);
      socket.emit('error', { message: 'Failed to remove reaction' });
    }
  });

  // Handle getting all reactions for a message
  socket.on('getReactions', async ({ messageId, chatId }, callback) => {
    try {
      if (!messageId || !chatId || !socket.userId) return;

      const message = await Message.findById(messageId).populate({
        path: 'reactions.users',
        select: 'fullName photo'
      });

      if (!message) {
        if (callback) callback({ error: 'Message not found' });
        return;
      }

      if (callback) {
        callback({
          success: true,
          reactions: message.reactions,
          totalReactions: message.reactionCount
        });
      }
    } catch (err) {
      console.error('getReactions error:', err);
      if (callback) callback({ error: 'Failed to fetch reactions' });
    }
  });
};

// Post interaction handlers
exports.handlePostEvents = (socket, io) => {
  // Handle post likes
  socket.on('likePost', async ({ postId, authorId }) => {
    if (!socket.userId || !postId || !authorId) return;
    
    if (authorId !== socket.userId) {
      const notification = await createNotification(
        authorId,
        'New Like',
        'Someone liked your post',
        'post_like',
        { postId }
      );
      
      io.to(`user_${authorId}`).emit('notification', notification);
    }
  });

  // Handle post comments
  socket.on('commentPost', async ({ postId, authorId, comment }) => {
    if (!socket.userId || !postId || !authorId) return;
    
    if (authorId !== socket.userId) {
      const user = await User.findById(socket.userId).select('fullName');
      const notification = await createNotification(
        authorId,
        'New Comment',
        `${user.fullName} commented: ${comment.substring(0, 50)}...`,
        'post_comment',
        { postId, commentId: comment._id }
      );
      
      io.to(`user_${authorId}`).emit('notification', notification);
    }
  });
};

// Order status handlers
exports.handleOrderEvents = (socket, io) => {
  socket.on('orderStatusChange', async ({ orderId, status, userId }) => {
    if (!orderId || !status || !userId) return;

    const notification = await createNotification(
      userId,
      'Order Update',
      `Your order status has changed to: ${status}`,
      'order_status',
      { orderId, status }
    );
    
    io.to(`user_${userId}`).emit('notification', notification);
  });
};

// Report resolution handlers
exports.handleReportEvents = (socket, io) => {
  socket.on('reportResolved', async ({ reportId, userId, resolution }) => {
    if (!reportId || !userId) return;

    const notification = await createNotification(
      userId,
      'Report Resolution',
      `Your report has been resolved: ${resolution}`,
      'report_resolution',
      { reportId, resolution }
    );
    
    io.to(`user_${userId}`).emit('notification', notification);
  });
};

// Connection management
exports.handleConnection = (socket, io) => {
  const userId = socket.userId;
  if (!userId) return;

  // Add to online users
  let userSockets = onlineUsers.get(userId) || new Set();
  userSockets.add(socket.id);
  onlineUsers.set(userId, userSockets);

  // Broadcast online status
  socket.broadcast.emit('userOnline', { userId });

  // Handle disconnect
  socket.on('disconnect', () => {
    if (socket.userId) {
      const userIdString = (socket.userId?.toString() || socket.userId).toLowerCase().trim();
      
      // Broadcast offline status to all rooms when user actually disconnects
      console.log('👤 User disconnected:', userIdString);
      io.emit('presenceUpdate', {
        userId: userIdString,
        status: 'offline'
      });
      
      const userSockets = onlineUsers.get(socket.userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          onlineUsers.delete(socket.userId);
          socket.broadcast.emit('userOffline', { userId: socket.userId });
        }
      }
    }
  });
};