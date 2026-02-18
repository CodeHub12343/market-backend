// src/controllers/messageController.js
const Message = require('../models/messageModel');
const Chat = require('../models/chatModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const reactionValidator = require('../utils/reactionValidator');

// Create message with file upload support
exports.createMessage = catchAsync(async (req, res, next) => {
  const chatId = req.body.chatId || req.body.chat || req.params.chatId;
  const content = req.body.content || req.body.text;
  console.log('createMessage called:', { chatId, content, userSender: req.user.id });
  
  let attachments = [];

  // Handle file uploads if present
  if (req.uploadedFiles && req.uploadedFiles.length > 0) {
    // Files are already uploaded to cloudinary by the upload middleware
    attachments = req.uploadedFiles.map(file => {
      let fileType = 'file';
      if (file.resource_type === 'image') fileType = 'image';
      else if (file.resource_type === 'video') fileType = 'video';
      else if (file.resource_type === 'audio') fileType = 'audio';

      return {
        url: file.url,
        public_id: file.public_id,
        type: fileType,
        size: file.bytes,
        originalName: file.original_filename,
        mimeType: file.format
      };
    });
  }

  if (!chatId || (!content && attachments.length === 0)) {
    return next(new AppError('chatId (or chat) and content or attachments required', 400));
  }

  const chat = await Chat.findById(chatId);
  if (!chat) return next(new AppError('Chat not found', 404));
  
  if (!chat.members.map(m => m._id.toString()).includes(req.user.id)) {
    return next(new AppError('Not a member of this chat', 403));
  }

  const message = await Message.create({
    chat: chatId,
    sender: req.user.id,
    text: content,
    type: req.body.type || (attachments.length > 0 ? attachments[0].type : 'text'),
    attachments,
    readBy: [{ user: req.user.id, readAt: new Date() }]
  });


  console.log('Message created (before populate):', { messageId: message._id, chat: message.chat, sender: message.sender });

  // Populate sender details BEFORE sending response
  await message.populate('sender', 'fullName photo email');
  
  console.log('Message populated:', { messageId: message._id, senderFullName: message.sender?.fullName });

  // VERIFY message was actually saved by querying it back with explicit lean()
  const verifyMessage = await Message.findById(message._id).populate('sender', 'fullName photo email').lean();
  if (!verifyMessage) {
    console.error('❌ CRITICAL: Message not found in database after creation!', { messageId: message._id });
    return next(new AppError('Failed to save message to database', 500));
  } else {
    console.log('✅ Message verified in database - CONFIRMED PERSISTED:', { 
      messageId: verifyMessage._id,
      text: verifyMessage.text,
      chatId: verifyMessage.chat
    });
  }

  // update chat lastMessage and updatedAt
  chat.lastMessage = content || (attachments.length ? 'Attachment' : '');
  chat.updatedAt = new Date();
  
  try {
    const savedChat = await chat.save();
    console.log('✅ Chat saved successfully:', { chatId: savedChat._id, lastMessage: savedChat.lastMessage });
  } catch (chatSaveError) {
    console.error('❌ CRITICAL ERROR: Chat save failed!', { 
      error: chatSaveError.message,
      chatId: chat._id,
      stack: chatSaveError.stack 
    });
    // Continue anyway, don't block message response
  }

  // 🔴 BROADCAST MESSAGE VIA SOCKET.IO
  // Get the io instance from app (set in server.js)
  const io = req.app.get('io');
  if (io) {
    // Emit to specific conversation room with the correct event name
    // Frontend listens for: message:new:${conversationId}
    io.to(`chat_${chatId}`).emit(`message:new:${chatId}`, {
      _id: message._id,
      chat: message.chat,
      sender: message.sender,
      text: message.text,
      content: message.text, // Include content alias for compatibility
      attachments: message.attachments,
      createdAt: message.createdAt,
      readBy: message.readBy
    });
    console.log('✅ Socket.IO message:new event broadcasted:', { event: `message:new:${chatId}`, room: `chat_${chatId}` });

    // ALSO broadcast newMessage to ALL chat members' personal rooms
    // This ensures User B sees the update in ChatList even if they haven't opened the chat yet
    const newMessagePayload = {
      _id: message._id,
      chatId: chatId,
      chat: message.chat,
      sender: message.sender,
      text: message.text,
      content: message.text, // Include content alias for compatibility
      attachments: message.attachments,
      createdAt: message.createdAt,
      readBy: message.readBy
    };

    if (chat && chat.members && chat.members.length > 0) {
      // Broadcast to each member's personal room
      for (const member of chat.members) {
        const memberId = member._id ? member._id.toString() : member.toString();
        io.to(`user_${memberId}`).emit('newMessage', newMessagePayload);
        console.log(`📤 [MESSAGE] Sent newMessage event to user_${memberId}`);
      }
      console.log(`✅ [MESSAGE] Broadcasted newMessage to all ${chat.members.length} chat members for chat ${chatId}`);
    } else {
      console.warn(`⚠️ [MESSAGE] Chat members not available for chat ${chatId}. Falling back to chat room broadcast.`);
      // Fallback: broadcast to chat room if members not available
      io.to(`chat_${chatId}`).emit('newMessage', newMessagePayload);
    }
  } else {
    console.warn('⚠️ Socket.IO instance not available for broadcasting message');
  }

  // Send response with fully populated message
  console.log('📤 Sending createMessage response:', { 
    messageId: message._id, 
    senderName: message.sender?.fullName,
    messageText: message.text,
    hasMessage: !!message,
    hasCat: !!chat
  });
  
  res.status(201).json({ status: 'success', data: { message, chat } });
});

// Get messages for a chat (paginated)
exports.getMessages = catchAsync(async (req, res, next) => {
  const { chatId } = req.params;
  console.log('📥 getMessages called for chatId:', chatId);
  
  const chat = await Chat.findById(chatId);
  if (!chat) {
    console.error('❌ Chat not found:', chatId);
    return next(new AppError('Chat not found', 404));
  }
  
  const isMember = chat.members.map(m => m._id.toString()).includes(req.user.id);
  console.log('🔐 Membership check:', { 
    userId: req.user.id, 
    chatMembers: chat.members.map(m => m._id.toString()),
    isMember 
  });
  
  if (!isMember) {
    console.error('❌ User not authorized for chat:', { userId: req.user.id, chatId });
    return next(new AppError('Not authorized', 403));
  }

  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 50;
  const skip = (page - 1) * limit;

  console.log('📊 Query params:', { page, limit, skip, chatId });

  // Direct database query - NO CACHING
  console.log('🔍 Querying database for messages...');
  const messages = await Message.find({ chat: chatId })
    .populate('sender', 'fullName photo email _id')
    .sort('-createdAt')
    .skip(skip)
    .limit(limit)
    .lean();  // Add .lean() to avoid Mongoose overhead

  console.log('✅ Database returned', messages.length, 'messages');
  
  // CRITICAL: Log ALL message IDs to see if the newly created one is there
  console.log('🔍 Message IDs returned (newest first):', {
    count: messages.length,
    messageIds: messages.map(m => m._id.toString()),
    messageTexts: messages.map(m => m.text || m.content || '(empty)')
  });
  
  // Check if the message with PERSIST_TEST_123 is in results
  const hasTestMessage = messages.some(m => m.text === 'PERSIST_TEST_123');
  console.log('🔎 Does response include test message "PERSIST_TEST_123"?', hasTestMessage);

  // Prevent browser caching for message lists
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  
  res.status(200).json({ status: 'success', results: messages.length, data: { messages } });
});

// Search messages across user's chats
exports.searchMessages = catchAsync(async (req, res, next) => {
  const q = req.query.q || req.body.q || req.body.query;
  if (!q || String(q).trim().length === 0) {
    return res.status(200).json({ status: 'success', results: 0, data: { messages: [] } });
  }

  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 50;
  const skip = (page - 1) * limit;

  // Basic text search in message text/content fields
  const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  const filter = {
    $or: [
      { text: regex },
      { content: regex },
      { 'attachments.originalName': regex }
    ],
    // ensure the user is part of the chat
    // will filter client-side by chat membership later if required
  };

  const [messages, total] = await Promise.all([
    Message.find(filter).sort('-createdAt').skip(skip).limit(limit),
    Message.countDocuments(filter)
  ]);

  res.status(200).json({ status: 'success', results: messages.length, total, page, data: { messages } });
});

// -----------------------------------------------------------------------------
// Stub / placeholder handlers for additional message routes referenced by
// `routes/messageRoutes.js`. Implement full behavior as needed.
// -----------------------------------------------------------------------------

exports.uploadFile = catchAsync(async (req, res, next) => {
  // Files should have been uploaded to Cloudinary by middleware and
  // be available on `req.chatAttachments` (set by processChatAttachments)
  const chatId = req.body.chatId || req.body.chat || req.params.chatId;

  // Ensure attachments exist
  const attachments = req.chatAttachments || req.uploadedFiles || req.files || [];

  if (!chatId) return next(new AppError('chatId is required', 400));
  if (!attachments || attachments.length === 0) return next(new AppError('No attachments provided', 400));

  // Verify chat exists and user is member
  const chat = await Chat.findById(chatId);
  if (!chat) return next(new AppError('Chat not found', 404));
  if (!chat.members.map(m => (m._id ? m._id.toString() : m.toString())).includes(req.user.id)) {
    return next(new AppError('You are not a member of this chat', 403));
  }

  // Normalize attachments to expected schema
  const formattedAttachments = attachments.map((file) => {
    // middleware may provide different shapes; normalize safely
    return {
      url: file.url || file.secure_url || file.path,
      public_id: file.public_id || file.publicId || file.publicId || undefined,
      type: file.type || (file.mimetype && file.mimetype.startsWith('image/') ? 'image' : (file.type || 'file')),
      size: file.size || file.bytes || 0,
      originalName: file.originalname || file.originalName || file.original_filename || '',
      mimeType: file.mimeType || file.mimetype || file.format || ''
    };
  });

  // Create message record
  let message;
  try {
    message = await Message.create({
      chat: chatId,
      sender: req.user.id,
      text: req.body.text || req.body.caption || '',
      type: req.body.type || (formattedAttachments[0]?.type || 'file'),
      attachments: formattedAttachments,
      readBy: [{ user: req.user.id, readAt: new Date() }]
    });

    // Update chat lastMessage and updatedAt
    chat.lastMessage = message.text || (formattedAttachments.length ? 'Attachment' : '');
    chat.updatedAt = Date.now();
    await chat.save();

    // Populate sender for response
    await message.populate('sender', 'fullName photo');

    // Emit to chat room via Socket.IO
    const io = require('../socketManager').getIO();
    if (io) {
      io.to(`chat_${chatId}`).emit('newMessage', message);
    }

    res.status(201).json({ status: 'success', data: { message } });
  } catch (err) {
    // If message creation fails, attempt to cleanup uploaded attachments
    try {
      const cloudinary = require('../config/cloudinary');
      if (formattedAttachments && formattedAttachments.length) {
        await Promise.all(formattedAttachments.map(a => a.public_id ? cloudinary.uploader.destroy(a.public_id).catch(()=>null) : Promise.resolve()));
      }
    } catch (cleanupErr) {
      console.error('Failed to cleanup uploaded attachments after message creation error', cleanupErr);
    }

    return next(new AppError(err.message || 'Failed to create message with attachments', 500));
  }
});

exports.getMessage = catchAsync(async (req, res, next) => {
  const message = await Message.findById(req.params.id);
  if (!message) return next(new AppError('Message not found', 404));
  res.status(200).json({ status: 'success', data: { message } });
});

exports.updateMessage = catchAsync(async (req, res, next) => {
  const message = await Message.findOneAndUpdate({ _id: req.params.id, sender: req.user.id }, req.body, { new: true });
  if (!message) return next(new AppError('Message not found or not authorized', 404));
  res.status(200).json({ status: 'success', data: { message } });
});

exports.deleteMessage = catchAsync(async (req, res, next) => {
  const message = await Message.findOne({ _id: req.params.id, sender: req.user.id });
  if (!message) return next(new AppError('Message not found or not authorized', 404));
  await Message.findByIdAndDelete(req.params.id);
  res.status(204).json({ status: 'success', data: null });
});

// Allowed emoji reactions for validation
const ALLOWED_REACTIONS = [
  '👍', '❤️', '😂', '😮', '😢', '😡', '🔥', '💯',
  '👏', '🙌', '😍', '😎', '🤔', '🤷', '😅', '💪',
  '🎉', '🚀', '💯', '✨', '👌', '💯', '🙏', '😤'
];

// Add reaction to message with validation and real-time update
exports.addReaction = catchAsync(async (req, res, next) => {
  const { emoji } = req.body;
  const messageId = req.params.id;
  
  // Validate emoji using reactionValidator
  const validation = reactionValidator.validateReaction(emoji);
  if (!validation.valid) {
    return next(new AppError(validation.error, 400));
  }

  // Fetch message with chat info
  let message = await Message.findById(messageId).populate('chat');
  if (!message) {
    return next(new AppError('Message not found', 404));
  }

  // Verify user is part of the chat
  const chat = await Chat.findById(message.chat._id);
  if (!chat.members.map(m => m._id.toString()).includes(req.user.id)) {
    return next(new AppError('You are not a member of this chat', 403));
  }

  // Use instance method to add reaction
  await message.addReaction(req.user.id, emoji);

  // Populate updated message with full details
  message = await Message.findById(messageId)
    .populate({
      path: 'reactions.users',
      select: 'fullName photo'
    });

  // Emit real-time update via Socket.IO
  const io = require('../socketManager').getIO();
  if (io) {
    io.to(`chat_${message.chat}`).emit('reactionAdded', {
      messageId,
      emoji,
      userId: req.user.id,
      reactionCount: message.reactionCount,
      reactions: reactionValidator.formatReactionsForResponse(message.reactions)
    });
  }

  res.status(200).json({ 
    status: 'success', 
    data: { 
      message,
      reaction: {
        emoji,
        userCount: message.reactions.find(r => r.emoji === emoji)?.count || 0,
        userReacted: true,
        reactions: reactionValidator.formatReactionsForResponse(message.reactions)
      }
    } 
  });
});

// Remove reaction from message with validation and real-time update
exports.removeReaction = catchAsync(async (req, res, next) => {
  const { emoji } = req.body;
  const messageId = req.params.id;

  // Validate emoji using reactionValidator
  const validation = reactionValidator.validateReaction(emoji);
  if (!validation.valid) {
    return next(new AppError(validation.error, 400));
  }

  // Fetch message with chat info
  let message = await Message.findById(messageId).populate('chat');
  if (!message) {
    return next(new AppError('Message not found', 404));
  }

  // Verify user is part of the chat
  const chat = await Chat.findById(message.chat._id);
  if (!chat.members.map(m => m._toString()).includes(req.user.id)) {
    return next(new AppError('You are not a member of this chat', 403));
  }

  // Use instance method to remove reaction
  await message.removeReaction(req.user.id, emoji);

  // Populate updated message with full details
  message = await Message.findById(messageId)
    .populate({
      path: 'reactions.users',
      select: 'fullName photo'
    });

  // Emit real-time update via Socket.IO
  const io = require('../socketManager').getIO();
  if (io) {
    const reactionData = message.reactions.find(r => r.emoji === emoji);
    io.to(`chat_${message.chat}`).emit('reactionRemoved', {
      messageId,
      emoji,
      userId: req.user.id,
      reactionCount: message.reactionCount,
      remainingCount: reactionData?.count || 0,
      reactions: reactionValidator.formatReactionsForResponse(message.reactions)
    });
  }

  res.status(200).json({ 
    status: 'success', 
    data: { 
      message,
      reaction: {
        emoji,
        removed: true,
        remainingCount: message.reactions.find(r => r.emoji === emoji)?.count || 0,
        reactions: reactionValidator.formatReactionsForResponse(message.reactions)
      }
    } 
  });
});

exports.markAsRead = catchAsync(async (req, res, next) => {
  // mark messages as read for the user in the provided chat
  // Placeholder: respond success
  res.status(200).json({ status: 'success', message: 'Messages marked as read' });
});

exports.markAsDelivered = catchAsync(async (req, res, next) => {
  res.status(200).json({ status: 'success', message: 'Messages marked as delivered' });
});

exports.forwardMessages = catchAsync(async (req, res, next) => {
  res.status(200).json({ status: 'success', message: 'Messages forwarded' });
});

exports.scheduleMessage = catchAsync(async (req, res, next) => {
  res.status(201).json({ status: 'success', data: { scheduled: true } });
});

exports.getScheduledMessages = catchAsync(async (req, res, next) => {
  res.status(200).json({ status: 'success', data: { scheduled: [] } });
});

exports.cancelScheduledMessage = catchAsync(async (req, res, next) => {
  res.status(200).json({ status: 'success', message: 'Scheduled message cancelled' });
});

// Get all allowed reactions for the platform
exports.getAllowedReactions = catchAsync(async (req, res, next) => {
  const allowedReactions = reactionValidator.getAllowedReactions();
  res.status(200).json({ 
    status: 'success', 
    results: allowedReactions.length,
    data: { 
      reactions: allowedReactions 
    } 
  });
});

// Get reactions stats for a specific message
exports.getMessageReactionStats = catchAsync(async (req, res, next) => {
  const { messageId } = req.params;
  
  const message = await Message.findById(messageId).populate({
    path: 'reactions.users',
    select: 'fullName photo'
  });

  if (!message) {
    return next(new AppError('Message not found', 404));
  }

  const stats = reactionValidator.getReactionStats(message.reactions);
  
  res.status(200).json({ 
    status: 'success', 
    data: { 
      messageId,
      reactions: reactionValidator.formatReactionsForResponse(message.reactions),
      stats
    } 
  });
});

// Get users who reacted with specific emoji
exports.getReactionUsers = catchAsync(async (req, res, next) => {
  const { messageId } = req.params;
  const { emoji } = req.query;

  if (!emoji) {
    return next(new AppError('Emoji query parameter is required', 400));
  }

  const validation = reactionValidator.validateReaction(emoji);
  if (!validation.valid) {
    return next(new AppError(validation.error, 400));
  }

  const message = await Message.findById(messageId).populate({
    path: 'reactions.users',
    select: 'fullName photo _id'
  });

  if (!message) {
    return next(new AppError('Message not found', 404));
  }

  const users = reactionValidator.getReactionUsers(message.reactions, emoji);
  
  res.status(200).json({ 
    status: 'success', 
    results: users.length,
    data: { 
      messageId,
      emoji,
      users: users.map(user => ({
        id: user._id,
        fullName: user.fullName,
        photo: user.photo
      }))
    } 
  });
});

exports.bulkDeleteMessages = catchAsync(async (req, res, next) => {
  const { messageIds } = req.body;
  if (!Array.isArray(messageIds)) return next(new AppError('messageIds must be an array', 400));
  await Message.deleteMany({ _id: { $in: messageIds } });
  res.status(200).json({ status: 'success', message: 'Messages deleted' });
});

exports.getMessageAnalytics = catchAsync(async (req, res, next) => {
  res.status(200).json({ status: 'success', data: { analytics: {} } });
});

exports.getMessageHistory = catchAsync(async (req, res, next) => {
  res.status(200).json({ status: 'success', data: { history: [] } });
});

// ✅ Mark message as read
exports.markMessageAsRead = catchAsync(async (req, res, next) => {
  const { messageId, conversationId } = req.params;
  
  const message = await Message.findById(messageId);
  if (!message) return next(new AppError('Message not found', 404));

  // Check if already read by this user
  const alreadyRead = message.readBy.some(r => r.user.equals(req.user.id));
  if (!alreadyRead) {
    message.readBy.push({
      user: req.user.id,
      readAt: new Date()
    });
    await message.save();

    // Emit read event so clients can update unread counts
    try {
      const io = req.app ? req.app.get('io') : require('../socketManager').getIO();
      if (io) {
        // Notify the current user (personal room) and others in chat
        io.to(`user_${req.user.id}`).emit('messageRead', { chatId: message.chat.toString(), messageId: message._id.toString(), userId: req.user.id });
        io.to(`chat_${message.chat}`).emit('messageRead', { chatId: message.chat.toString(), messageId: message._id.toString(), userId: req.user.id });
      }
    } catch (err) {
      console.warn('Failed to emit messageRead event:', err.message);
    }
  }

  res.status(200).json({ 
    status: 'success', 
    data: { message } 
  });
});

// ✅ Mark all messages in conversation as read
exports.markConversationAsRead = catchAsync(async (req, res, next) => {
  const { conversationId } = req.params;
  
  // Find the chat by ID or treat conversationId as chatId
  const Chat = require('../models/chatModel');
  const chat = await Chat.findById(conversationId);
  if (!chat) return next(new AppError('Conversation not found', 404));

  if (!chat.members.map(m => m._id.toString()).includes(req.user.id)) {
    return next(new AppError('Not authorized', 403));
  }

  // Update all messages in this chat to mark as read by this user
  const messages = await Message.updateMany(
    { chat: conversationId },
    {
      $addToSet: {
        readBy: { user: req.user.id, readAt: new Date() }
      }
    }
  );

  // Emit unread update for current user so their ChatList can reset the count
  try {
    const io = req.app ? req.app.get('io') : require('../socketManager').getIO();
    if (io) {
      io.to(`user_${req.user.id}`).emit('unreadCountUpdate', { chatId: conversationId, unreadCount: 0 });
    }
  } catch (err) {
    console.warn('Failed to emit unreadCountUpdate after marking conversation read', err.message);
  }

  res.status(200).json({ 
    status: 'success', 
    data: { modifiedCount: messages.modifiedCount } 
  });
});

