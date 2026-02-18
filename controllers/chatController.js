// src/controllers/chatController.js
const Chat = require('../models/chatModel');
const Message = require('../models/messageModel');
const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const APIFeatures = require('../utils/apiFeatures');
const mongoose = require('mongoose');

// ✅ Create or get existing 1:1 chat between two users
exports.getOrCreateOneToOneChat = catchAsync(async (req, res, next) => {
  const { userId } = req.body;
  if (!userId) return next(new AppError('userId is required', 400));

  // Check if user exists
  const otherUser = await User.findById(userId);
  if (!otherUser) return next(new AppError('User not found', 404));

  // Try to find existing one-to-one chat
  let chat = await Chat.findOne({
    members: { $all: [req.user.id, userId] },
    $expr: { $eq: [{ $size: '$members' }, 2] },
    status: 'active'
  });

  if (!chat) {
    chat = await Chat.create({
      members: [req.user.id, userId],
      createdBy: req.user.id,
      type: 'one-to-one'
    });
  }

  await chat.populate('members', 'fullName email photo campus role');
  // Emit real-time event to all members so their ChatList updates immediately
  try {
    const io = req.app.get('io');
    if (io && chat && chat.members && chat.members.length > 0) {
      // Build online status map for members
      const onlineMap = {};
      for (const member of chat.members) {
        const memberId = member._id ? member._id.toString() : member.toString();
        let isOnline = false;
        try {
          const sockets = await io.of('/').in(`user_${memberId}`).fetchSockets();
          isOnline = !!(sockets && sockets.length > 0);
        } catch (e) {
          // ignore
        }
        onlineMap[memberId] = isOnline;
      }

      const payload = { chat: chat.toObject ? chat.toObject() : chat, onlineMap };
      for (const member of chat.members) {
        const memberId = member._id ? member._id.toString() : member.toString();
        io.to(`user_${memberId}`).emit('newChat', payload);
      }
    }
  } catch (err) {
    console.warn('Failed to emit newChat event:', err.message);
  }

  res.status(200).json({ status: 'success', data: { chat } });
});

// ✅ Create a group chat
exports.createGroupChat = catchAsync(async (req, res, next) => {
  const { name, memberIds, description, settings, tags } = req.body;
  
  if (!name || !Array.isArray(memberIds) || memberIds.length < 2) {
    return next(new AppError('Provide name and memberIds (array, min 2 other members)', 400));
  }

  // Check if all members exist
  const members = await User.find({ _id: { $in: memberIds } });
  if (members.length !== memberIds.length) {
    return next(new AppError('One or more users not found', 400));
  }

  const allMembers = Array.from(new Set([req.user.id, ...memberIds]));
  const chat = await Chat.create({
    name,
    description,
    members: allMembers,
    createdBy: req.user.id,
    admins: [req.user.id],
    type: 'group',
    settings: settings || {},
    tags: tags || []
  });

  await chat.populate('members', 'fullName email photo campus role');
  // Emit newChat event to members' personal rooms so they see the chat immediately
  try {
    const io = req.app.get('io');
    if (io && chat && chat.members && chat.members.length > 0) {
      const onlineMap = {};
      for (const member of chat.members) {
        const memberId = member._id ? member._id.toString() : member.toString();
        let isOnline = false;
        try {
          const sockets = await io.of('/').in(`user_${memberId}`).fetchSockets();
          isOnline = !!(sockets && sockets.length > 0);
        } catch (e) {}
        onlineMap[memberId] = isOnline;
      }
      const payload = { chat: chat.toObject ? chat.toObject() : chat, onlineMap };
      for (const member of chat.members) {
        const memberId = member._id ? member._id.toString() : member.toString();
        io.to(`user_${memberId}`).emit('newChat', payload);
      }
    }
  } catch (err) {
    console.warn('Failed to emit newChat for group chat:', err.message);
  }

  res.status(201).json({ status: 'success', data: { chat } });
});

// ✅ Get chats for current user (paginated with advanced filtering)
exports.getMyChats = catchAsync(async (req, res, next) => {
  const features = new APIFeatures(Chat.find({ members: req.user.id, status: 'active' }), req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const chats = await features.query
    .populate('members', 'fullName email photo campus role')
    .populate('createdBy', 'fullName email photo')
    .populate('admins', 'fullName email photo');

  // Compute unread counts per chat for current user
  try {
    const chatIds = chats.map(c => c._id);
    const unreadCountsMap = {};

    const userObjectId = typeof req.user.id === 'string' ? new mongoose.Types.ObjectId(req.user.id) : req.user.id;

    // Single aggregation to compute unread counts for all chats in one DB round-trip.
    const agg = await Message.aggregate([
      {
        $match: {
          chat: { $in: chatIds },
          'flags.deleted': false,
          $nor: [ { 'readBy.user': userObjectId }, { readBy: userObjectId } ]
        }
      },
      { $group: { _id: '$chat', count: { $sum: 1 } } }
    ]).allowDiskUse(true);

    agg.forEach(a => {
      unreadCountsMap[a._id.toString()] = a.count;
    });

    // Attach unreadCount to each chat object (lean copy)
    const chatsWithUnread = chats.map(c => ({
      ...c.toObject ? c.toObject() : c,
      unreadCount: unreadCountsMap[c._id.toString()] || 0
    }));

    res.status(200).json({
      status: 'success',
      results: chatsWithUnread.length,
      data: { chats: chatsWithUnread }
    });
  } catch (err) {
    console.warn('Failed to compute unread counts, returning chats without unreadCount', err.message);
    res.status(200).json({ status: 'success', results: chats.length, data: { chats } });
  }
});

// ✅ Get a chat by id with messages
exports.getChatWithMessages = catchAsync(async (req, res, next) => {
  const chat = await Chat.findById(req.params.id);
  if (!chat) return next(new AppError('Chat not found', 404));

  // Check membership
  const isMember = chat.members.some(member => 
    member._id.toString() === req.user.id || member.toString() === req.user.id
  );
  if (!isMember) return next(new AppError('Not authorized to view this chat', 403));

  // Get messages with advanced filtering
  const features = new APIFeatures(Message.find({ chat: chat._id, 'flags.deleted': false }), req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const messages = await features.query
    .populate('sender', 'fullName email photo campus role')
    .populate('replyTo', 'text sender createdAt')
    .populate('forwardFrom', 'text sender createdAt');

  await chat.populate('members', 'fullName email photo campus role');
  await chat.populate('createdBy', 'fullName email photo');
  await chat.populate('admins', 'fullName email photo');

  res.status(200).json({ status: 'success', data: { chat, messages } });
});

// ✅ Update chat
exports.updateChat = catchAsync(async (req, res, next) => {
  const { name, description, settings, tags } = req.body;
  
  const chat = await Chat.findById(req.params.id);
  if (!chat) return next(new AppError('Chat not found', 404));

  // Check if user can update chat
  const isAdmin = req.user.role === 'admin';
  const isCreator = chat.createdBy?.toString() === req.user.id;
  const isGroupAdmin = chat.admins?.includes(req.user.id);

  if (!isAdmin && !isCreator && !isGroupAdmin) {
    return next(new AppError('You are not authorized to update this chat', 403));
  }

  if (name) chat.name = name;
  if (description !== undefined) chat.description = description;
  if (settings) chat.settings = { ...chat.settings, ...settings };
  if (tags) chat.tags = tags;

  await chat.save();
  await chat.populate('members', 'fullName email photo campus role');

  res.status(200).json({ status: 'success', data: { chat } });
});

// ✅ Add members to chat
exports.addMembers = catchAsync(async (req, res, next) => {
  const { memberIds } = req.body;
  
  const chat = await Chat.findById(req.params.id);
  if (!chat) return next(new AppError('Chat not found', 404));

  // Check if user can add members
  const isAdmin = req.user.role === 'admin';
  const isCreator = chat.createdBy?.toString() === req.user.id;
  const isGroupAdmin = chat.admins?.includes(req.user.id);

  if (!isAdmin && !isCreator && !isGroupAdmin) {
    return next(new AppError('You are not authorized to add members', 403));
  }

  // Check if users exist
  const users = await User.find({ _id: { $in: memberIds } });
  if (users.length !== memberIds.length) {
    return next(new AppError('One or more users not found', 400));
  }

  // Add members
  for (const userId of memberIds) {
    await chat.addMember(userId);
  }

  await chat.populate('members', 'fullName email photo campus role');
  res.status(200).json({ status: 'success', data: { chat } });
});

// ✅ Remove members from chat
exports.removeMembers = catchAsync(async (req, res, next) => {
  const { memberIds } = req.body;
  
  const chat = await Chat.findById(req.params.id);
  if (!chat) return next(new AppError('Chat not found', 404));

  // Check if user can remove members
  const isAdmin = req.user.role === 'admin';
  const isCreator = chat.createdBy?.toString() === req.user.id;
  const isGroupAdmin = chat.admins?.includes(req.user.id);

  if (!isAdmin && !isCreator && !isGroupAdmin) {
    return next(new AppError('You are not authorized to remove members', 403));
  }

  // Remove members
  for (const userId of memberIds) {
    await chat.removeMember(userId);
  }

  await chat.populate('members', 'fullName email photo campus role');
  res.status(200).json({ status: 'success', data: { chat } });
});

// ✅ Add/Remove admins
exports.updateAdmins = catchAsync(async (req, res, next) => {
  const { memberIds, action } = req.body; // action: 'add' or 'remove'
  
  const chat = await Chat.findById(req.params.id);
  if (!chat) return next(new AppError('Chat not found', 404));

  // Check if user can manage admins
  const isAdmin = req.user.role === 'admin';
  const isCreator = chat.createdBy?.toString() === req.user.id;

  if (!isAdmin && !isCreator) {
    return next(new AppError('You are not authorized to manage admins', 403));
  }

  if (action === 'add') {
    for (const userId of memberIds) {
      await chat.addAdmin(userId);
    }
  } else if (action === 'remove') {
    for (const userId of memberIds) {
      await chat.removeAdmin(userId);
    }
  }

  await chat.populate('members', 'fullName email photo campus role');
  await chat.populate('admins', 'fullName email photo');
  res.status(200).json({ status: 'success', data: { chat } });
});

// ✅ Archive/Unarchive chat
exports.archiveChat = catchAsync(async (req, res, next) => {
  const { archived } = req.body;
  
  const chat = await Chat.findById(req.params.id);
  if (!chat) return next(new AppError('Chat not found', 404));

  if (archived) {
    await chat.archive();
  } else {
    await chat.unarchive();
  }

  res.status(200).json({ status: 'success', data: { chat } });
});

// ✅ Mute/Unmute chat
exports.muteChat = catchAsync(async (req, res, next) => {
  const { muted, muteUntil } = req.body;
  
  const chat = await Chat.findById(req.params.id);
  if (!chat) return next(new AppError('Chat not found', 404));

  await chat.updateUserSettings(req.user.id, {
    muted,
    muteUntil: muteUntil ? new Date(muteUntil) : undefined
  });

  res.status(200).json({ status: 'success', data: { chat } });
});

// ✅ Update chat settings
exports.updateChatSettings = catchAsync(async (req, res, next) => {
  const { allowInvites, allowMemberMessages, allowFileUploads, muteNotifications, autoDeleteMessages, messageRetentionDays } = req.body;
  
  const chat = await Chat.findById(req.params.id);
  if (!chat) return next(new AppError('Chat not found', 404));

  // Check if user can update settings
  const isAdmin = req.user.role === 'admin';
  const isCreator = chat.createdBy?.toString() === req.user.id;
  const isGroupAdmin = chat.admins?.includes(req.user.id);

  if (!isAdmin && !isCreator && !isGroupAdmin) {
    return next(new AppError('You are not authorized to update chat settings', 403));
  }

  if (allowInvites !== undefined) chat.settings.allowInvites = allowInvites;
  if (allowMemberMessages !== undefined) chat.settings.allowMemberMessages = allowMemberMessages;
  if (allowFileUploads !== undefined) chat.settings.allowFileUploads = allowFileUploads;
  if (muteNotifications !== undefined) chat.settings.muteNotifications = muteNotifications;
  if (autoDeleteMessages !== undefined) chat.settings.autoDeleteMessages = autoDeleteMessages;
  if (messageRetentionDays !== undefined) chat.settings.messageRetentionDays = messageRetentionDays;

  await chat.save();
  res.status(200).json({ status: 'success', data: { chat } });
});

// ✅ Delete chat
exports.deleteChat = catchAsync(async (req, res, next) => {
  const chat = await Chat.findById(req.params.id);
  if (!chat) return next(new AppError('Chat not found', 404));

  // Check if user can delete chat
  const isAdmin = req.user.role === 'admin';
  const isCreator = chat.createdBy?.toString() === req.user.id;

  if (!isAdmin && !isCreator) {
    return next(new AppError('You are not authorized to delete this chat', 403));
  }

  await chat.softDelete();
  res.status(200).json({ status: 'success', message: 'Chat deleted successfully' });
});

// ✅ Search chats
exports.searchChats = catchAsync(async (req, res, next) => {
  const { q, type, archived, muted } = req.query;
  
  const query = { members: req.user.id, status: 'active' };
  
  if (q) {
    query.$or = [
      { name: { $regex: q, $options: 'i' } },
      { description: { $regex: q, $options: 'i' } }
    ];
  }
  
  if (type) query.type = type;
  if (archived !== undefined) {
    query['userSettings.muted'] = archived === 'true';
  }
  if (muted !== undefined) {
    query['userSettings.muted'] = muted === 'true';
  }

  const features = new APIFeatures(Chat.find(query), req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const chats = await features.query
    .populate('members', 'fullName email photo campus role')
    .populate('createdBy', 'fullName email photo');

  res.status(200).json({
    status: 'success',
    results: chats.length,
    data: { chats }
  });
});

// ✅ Get chat analytics
exports.getChatAnalytics = catchAsync(async (req, res, next) => {
  const { period = 'month', startDate, endDate } = req.query;
  
  const chat = await Chat.findById(req.params.id);
  if (!chat) return next(new AppError('Chat not found', 404));

  // Check if user can view analytics
  const isAdmin = req.user.role === 'admin';
  const isCreator = chat.createdBy?.toString() === req.user.id;
  const isGroupAdmin = chat.admins?.includes(req.user.id);

  if (!isAdmin && !isCreator && !isGroupAdmin) {
    return next(new AppError('You are not authorized to view chat analytics', 403));
  }

  const analytics = await Chat.getChatAnalytics(req.params.id, period);
  const messageAnalytics = await Message.getMessageAnalytics(req.params.id, period);

  res.status(200).json({
    status: 'success',
    data: {
      chat: chat._id,
      period,
      analytics: analytics[0] || {},
      messageAnalytics: messageAnalytics[0] || {}
    }
  });
});

// ✅ Get chat members
exports.getChatMembers = catchAsync(async (req, res, next) => {
  const chat = await Chat.findById(req.params.id);
  if (!chat) return next(new AppError('Chat not found', 404));

  // Check membership
  const isMember = chat.members.some(member => 
    member._id.toString() === req.user.id || member.toString() === req.user.id
  );
  if (!isMember) return next(new AppError('Not authorized to view chat members', 403));

  await chat.populate('members', 'fullName email photo campus role');
  await chat.populate('admins', 'fullName email photo');

  res.status(200).json({
    status: 'success',
    data: {
      members: chat.members,
      admins: chat.admins,
      memberCount: chat.memberCount
    }
  });
});

// ✅ Mute/Unmute user in chat
exports.muteUser = catchAsync(async (req, res, next) => {
  const { userId, muteUntil } = req.body;
  
  const chat = await Chat.findById(req.params.id);
  if (!chat) return next(new AppError('Chat not found', 404));

  // Check if user can mute others
  const isAdmin = req.user.role === 'admin';
  const isCreator = chat.createdBy?.toString() === req.user.id;
  const isGroupAdmin = chat.admins?.includes(req.user.id);

  if (!isAdmin && !isCreator && !isGroupAdmin) {
    return next(new AppError('You are not authorized to mute users', 403));
  }

  await chat.muteUser(userId, muteUntil ? new Date(muteUntil) : null);
  res.status(200).json({ status: 'success', message: 'User muted successfully' });
});

// ✅ Unmute user in chat
exports.unmuteUser = catchAsync(async (req, res, next) => {
  const { userId } = req.body;
  
  const chat = await Chat.findById(req.params.id);
  if (!chat) return next(new AppError('Chat not found', 404));

  // Check if user can unmute others
  const isAdmin = req.user.role === 'admin';
  const isCreator = chat.createdBy?.toString() === req.user.id;
  const isGroupAdmin = chat.admins?.includes(req.user.id);

  if (!isAdmin && !isCreator && !isGroupAdmin) {
    return next(new AppError('You are not authorized to unmute users', 403));
  }

  await chat.unmuteUser(userId);
  res.status(200).json({ status: 'success', message: 'User unmuted successfully' });
});

// ✅ Leave chat
exports.leaveChat = catchAsync(async (req, res, next) => {
  const chat = await Chat.findById(req.params.id);
  if (!chat) return next(new AppError('Chat not found', 404));

  // Check if user is member
  const isMember = chat.members.some(member => 
    member._id.toString() === req.user.id || member.toString() === req.user.id
  );
  if (!isMember) return next(new AppError('You are not a member of this chat', 403));

  // Cannot leave if you're the only member
  if (chat.members.length === 1) {
    return next(new AppError('Cannot leave chat as the only member', 400));
  }

  await chat.removeMember(req.user.id);
  res.status(200).json({ status: 'success', message: 'Left chat successfully' });
});

// ✅ Get messages for a conversation (conversationId = chatId)
exports.getMessages = catchAsync(async (req, res, next) => {
  const { conversationId } = req.params;
  console.log('getMessages called with conversationId:', conversationId);
  
  const chat = await Chat.findById(conversationId);
  if (!chat) return next(new AppError('Conversation not found', 404));
  
  if (!chat.members.map(m => m._id.toString()).includes(req.user.id)) {
    return next(new AppError('Not authorized', 403));
  }

  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 50;
  const skip = (page - 1) * limit;

  console.log('Querying messages with:', { chat: conversationId });
  const messages = await Message.find({ chat: conversationId })
    .populate('sender', 'name username avatar email')
    .sort({ createdAt: 1 })
    .skip(skip)
    .limit(limit);

  console.log('Messages found:', messages.length);
  const total = await Message.countDocuments({ chat: conversationId });

  res.status(200).json({ 
    status: 'success', 
    results: messages.length, 
    data: messages,
    pagination: {
      page,
      pages: Math.ceil(total / limit),
      total
    }
  });
});

// ✅ Mark conversation as read (conversationId = chatId)
exports.markConversationAsRead = catchAsync(async (req, res, next) => {
  const { conversationId } = req.params;
  
  const chat = await Chat.findById(conversationId);
  if (!chat) return next(new AppError('Conversation not found', 404));

  if (!chat.members.map(m => m._id.toString()).includes(req.user.id)) {
    return next(new AppError('Not authorized', 403));
  }

  const messages = await Message.updateMany(
    { chat: conversationId },
    {
      $addToSet: {
        readBy: { user: req.user.id, readAt: new Date() }
      }
    }
  );

  res.status(200).json({ 
    status: 'success', 
    data: { modifiedCount: messages.modifiedCount } 
  });
});

