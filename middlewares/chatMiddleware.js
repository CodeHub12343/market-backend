/* const Chat = require('../models/chatModel');
const Message = require('../models/messageModel');
const User = require('../models/userModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const cloudinary = require('../config/cloudinary');
const multer = require('multer');

// ✅ Multer configuration for chat attachments
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
    files: 10 // Max 10 files
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/', 'video/', 'audio/', 'application/', 'text/'];
    const isAllowed = allowedTypes.some(type => file.mimetype.startsWith(type));
    
    if (isAllowed) {
      cb(null, true);
    } else {
      cb(new AppError('File type not allowed', 400), false);
    }
  }
});

exports.uploadChatAttachments = upload.array('attachments', 10);

// ✅ Process and upload chat attachments to Cloudinary
exports.processChatAttachments = catchAsync(async (req, res, next) => {
  if (!req.files || req.files.length === 0) return next();

  const attachments = [];
  const CLOUD_FOLDER = process.env.CLOUDINARY_CHAT_FOLDER || 'chat_attachments';

  for (let i = 0; i < req.files.length; i++) {
    const file = req.files[i];
    
    // Determine file type
    let fileType = 'file';
    if (file.mimetype.startsWith('image/')) fileType = 'image';
    else if (file.mimetype.startsWith('video/')) fileType = 'video';
    else if (file.mimetype.startsWith('audio/')) fileType = 'audio';

    const result = await cloudinary.uploader.upload(
      `data:${file.mimetype};base64,${file.buffer.toString('base64')}`,
      {
        folder: CLOUD_FOLDER,
        public_id: `chat_${Date.now()}_${i}`,
        transformation: fileType === 'image' ? [
          { width: 1200, height: 1200, crop: 'fill', quality: 'auto' },
          { format: 'auto' }
        ] : undefined
      }
    );

    attachments.push({
      url: result.secure_url,
      public_id: result.public_id,
      type: fileType,
      size: file.size,
      originalName: file.originalname,
      mimeType: file.mimetype
    });
  }

  req.chatAttachments = attachments;
  next();
});

// ✅ Check if user is member of chat
exports.checkChatMembership = catchAsync(async (req, res, next) => {
  const chat = await Chat.findById(req.params.id || req.params.chatId);
  
  if (!chat) {
    return next(new AppError('Chat not found', 404));
  }

  const isMember = chat.members.some(member => 
    member._id.toString() === req.user.id || member.toString() === req.user.id
  );

  if (!isMember) {
    return next(new AppError('You are not a member of this chat', 403));
  }

  req.chat = chat;
  next();
});

// ✅ Check if user can manage chat (admin/creator)
exports.checkChatManagement = catchAsync(async (req, res, next) => {
  if (!req.chat) {
    return next(new AppError('Chat not loaded before management check', 400));
  }

  const isAdmin = req.user.role === 'admin';
  const isCreator = req.chat.createdBy?.toString() === req.user.id;
  const isGroupAdmin = req.chat.admins?.includes(req.user.id);

  if (!isAdmin && !isCreator && !isGroupAdmin) {
    return next(new AppError('You are not authorized to manage this chat', 403));
  }

  next();
});

// ✅ Check if chat is active (not deleted/archived)
exports.checkChatStatus = (req, res, next) => {
  if (!req.chat) {
    return next(new AppError('Chat not loaded before status check', 400));
  }

  if (req.chat.status === 'deleted') {
    return next(new AppError('This chat has been deleted', 404));
  }

  if (req.chat.status === 'archived' && !req.chat.members.includes(req.user.id)) {
    return next(new AppError('This chat has been archived', 404));
  }

  next();
};

// ✅ Check if user can send messages to chat
exports.checkMessagePermission = (req, res, next) => {
  if (!req.chat) {
    return next(new AppError('Chat not loaded before permission check', 400));
  }

  // Check if chat allows member messages
  if (req.chat.settings?.allowMemberMessages === false && 
      !req.chat.admins?.includes(req.user.id) && 
      req.chat.createdBy?.toString() !== req.user.id) {
    return next(new AppError('You are not allowed to send messages to this chat', 403));
  }

  // Check if user is muted
  if (req.chat.mutedUsers?.includes(req.user.id)) {
    return next(new AppError('You are muted in this chat', 403));
  }

  next();
};

// ✅ Check message ownership
exports.checkMessageOwnership = catchAsync(async (req, res, next) => {
  const message = await Message.findById(req.params.id);
  
  if (!message) {
    return next(new AppError('Message not found', 404));
  }

  const isOwner = message.sender.toString() === req.user.id;
  const isAdmin = req.user.role === 'admin';
  const isChatAdmin = req.chat?.admins?.includes(req.user.id);

  if (!isOwner && !isAdmin && !isChatAdmin) {
    return next(new AppError('You are not authorized to perform this action', 403));
  }

  req.message = message;
  next();
});

// ✅ Validate chat data
exports.validateChatData = (req, res, next) => {
  const { name, memberIds, settings } = req.body;

  if (req.method === 'POST') {
    if (!memberIds || !Array.isArray(memberIds)) {
      return next(new AppError('Member IDs are required', 400));
    }

    if (memberIds.length < 1) {
      return next(new AppError('At least one member is required', 400));
    }

    if (memberIds.length > 50) {
      return next(new AppError('Maximum 50 members allowed', 400));
    }
  }

  if (name && (name.length < 2 || name.length > 100)) {
    return next(new AppError('Chat name must be between 2 and 100 characters', 400));
  }

  if (settings && typeof settings !== 'object') {
    return next(new AppError('Settings must be an object', 400));
  }

  next();
};

// ✅ Check if user can be added to chat
exports.checkAddMemberPermission = catchAsync(async (req, res, next) => {
  const { memberIds } = req.body;
  
  if (!memberIds || !Array.isArray(memberIds)) {
    return next(new AppError('Member IDs are required', 400));
  }

  // Check if users exist and are not already members
  const users = await User.find({ _id: { $in: memberIds } });
  
  if (users.length !== memberIds.length) {
    return next(new AppError('One or more users not found', 400));
  }

  const existingMembers = req.chat.members.map(m => m._id.toString());
  const duplicateMembers = memberIds.filter(id => existingMembers.includes(id));
  
  if (duplicateMembers.length > 0) {
    return next(new AppError('Some users are already members of this chat', 400));
  }

  req.newMembers = users;
  next();
});

// ✅ Check if user can be removed from chat
exports.checkRemoveMemberPermission = catchAsync(async (req, res, next) => {
  const { memberIds } = req.body;
  
  if (!memberIds || !Array.isArray(memberIds)) {
    return next(new AppError('Member IDs are required', 400));
  }

  const existingMembers = req.chat.members.map(m => m._id.toString());
  const invalidMembers = memberIds.filter(id => !existingMembers.includes(id));
  
  if (invalidMembers.length > 0) {
    return next(new AppError('Some users are not members of this chat', 400));
  }

  // Cannot remove chat creator
  if (memberIds.includes(req.chat.createdBy?.toString())) {
    return next(new AppError('Cannot remove chat creator', 400));
  }

  req.membersToRemove = memberIds;
  next();
});

// ✅ Rate limiting for message creation
exports.rateLimitMessages = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const chatId = req.body.chatId || req.params.chatId;
  
  // Check message rate limit (max 100 messages per minute per user)
  const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
  const recentMessages = await Message.countDocuments({
    sender: userId,
    createdAt: { $gte: oneMinuteAgo }
  });

  if (recentMessages >= 100) {
    return next(new AppError('Message rate limit exceeded. Please slow down.', 429));
  }

  // Check chat-specific rate limit (max 500 messages per minute per chat)
  const chatMessages = await Message.countDocuments({
    chat: chatId,
    createdAt: { $gte: oneMinuteAgo }
  });

  if (chatMessages >= 500) {
    return next(new AppError('Chat rate limit exceeded. Please slow down.', 429));
  }

  next();
});

// ✅ Clean up chat attachments
exports.cleanupChatAttachments = catchAsync(async (req, res, next) => {
  if (req.message?.attachments?.length > 0) {
    const deletePromises = req.message.attachments.map(attachment => {
      if (attachment.public_id) {
        return cloudinary.uploader.destroy(attachment.public_id).catch(() => null);
      }
      return Promise.resolve();
    });
    await Promise.all(deletePromises);
  }
  next();
});

// ✅ Populate chat data
exports.populateChatData = catchAsync(async (req, res, next) => {
  if (req.chat) {
    await req.chat.populate([
      { path: 'members', select: 'fullName email photo campus role' },
      { path: 'createdBy', select: 'fullName email photo' },
      { path: 'admins', select: 'fullName email photo' }
    ]);
  }
  next();
});

// ✅ Check chat analytics permission
exports.checkChatAnalyticsPermission = (req, res, next) => {
  if (!req.chat) {
    return next(new AppError('Chat not loaded before analytics check', 400));
  }

  const isOwner = req.chat.createdBy?.toString() === req.user.id;
  const isAdmin = req.user.role === 'admin';
  const isGroupAdmin = req.chat.admins?.includes(req.user.id);

  if (!isOwner && !isAdmin && !isGroupAdmin) {
    return next(new AppError('You are not authorized to view chat analytics', 403));
  }

  next();
});

// ✅ Validate bulk operations
exports.validateBulkOperation = (req, res, next) => {
  const { messageIds, operation } = req.body;

  if (!messageIds || !Array.isArray(messageIds)) {
    return next(new AppError('Message IDs are required', 400));
  }

  if (messageIds.length > 100) {
    return next(new AppError('Maximum 100 messages allowed per operation', 400));
  }

  if (!operation || !['delete', 'markRead', 'markDelivered'].includes(operation)) {
    return next(new AppError('Invalid operation specified', 400));
  }

  next();
};

// ✅ Check bulk operation permission
exports.checkBulkOperationPermission = catchAsync(async (req, res, next) => {
  const { messageIds } = req.body;
  
  // Check if user owns all messages or is admin
  const messages = await Message.find({ _id: { $in: messageIds } });
  
  if (messages.length !== messageIds.length) {
    return next(new AppError('One or more messages not found', 400));
  }

  const isAdmin = req.user.role === 'admin';
  const userOwnedMessages = messages.filter(msg => msg.sender.toString() === req.user.id);
  
  if (!isAdmin && userOwnedMessages.length !== messages.length) {
    return next(new AppError('You can only perform bulk operations on your own messages', 403));
  }

  req.bulkMessages = messages;
  next();
});

// ✅ Check if chat allows file uploads
exports.checkFileUploadPermission = (req, res, next) => {
  if (!req.chat) {
    return next(new AppError('Chat not loaded before file upload check', 400));
  }

  if (req.chat.settings?.allowFileUploads === false) {
    return next(new AppError('File uploads are not allowed in this chat', 403));
  }

  next();
});

// ✅ Validate file upload
exports.validateFileUpload = (req, res, next) => {
  if (!req.files || req.files.length === 0) {
    return next(new AppError('No files provided', 400));
  }

  const maxFileSize = 50 * 1024 * 1024; // 50MB
  const allowedTypes = ['image/', 'video/', 'audio/', 'application/', 'text/'];

  for (const file of req.files) {
    if (file.size > maxFileSize) {
      return next(new AppError(`File ${file.originalname} exceeds maximum size of 50MB`, 400));
    }

    const isAllowed = allowedTypes.some(type => file.mimetype.startsWith(type));
    if (!isAllowed) {
      return next(new AppError(`File type ${file.mimetype} is not allowed`, 400));
    }
  }

  next();
};

module.exports = exports; */


const Chat = require('../models/chatModel');
const Message = require('../models/messageModel');
const User = require('../models/userModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const cloudinary = require('../config/cloudinary');
const multer = require('multer');

// ✅ Multer configuration for chat attachments
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
    files: 10 // Max 10 files
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/', 'video/', 'audio/', 'application/', 'text/'];
    const isAllowed = allowedTypes.some(type => file.mimetype.startsWith(type));

    if (isAllowed) cb(null, true);
    else cb(new AppError('File type not allowed', 400), false);
  }
});

exports.uploadChatAttachments = upload.array('attachments', 10);

// ✅ Process and upload chat attachments to Cloudinary
exports.processChatAttachments = catchAsync(async (req, res, next) => {
  if (!req.files || req.files.length === 0) return next();

  const attachments = [];
  const CLOUD_FOLDER = process.env.CLOUDINARY_CHAT_FOLDER || 'chat_attachments';

  for (let i = 0; i < req.files.length; i++) {
    const file = req.files[i];

    // Determine file type
    let fileType = 'file';
    if (file.mimetype.startsWith('image/')) fileType = 'image';
    else if (file.mimetype.startsWith('video/')) fileType = 'video';
    else if (file.mimetype.startsWith('audio/')) fileType = 'audio';

    const result = await cloudinary.uploader.upload(
      `data:${file.mimetype};base64,${file.buffer.toString('base64')}`,
      {
        folder: CLOUD_FOLDER,
        public_id: `chat_${Date.now()}_${i}`,
        transformation:
          fileType === 'image'
            ? [
                { width: 1200, height: 1200, crop: 'fill', quality: 'auto' },
                { format: 'auto' }
              ]
            : undefined
      }
    );

    attachments.push({
      url: result.secure_url,
      public_id: result.public_id,
      type: fileType,
      size: file.size,
      originalName: file.originalname,
      mimeType: file.mimetype
    });
  }

  req.chatAttachments = attachments;
  next();
});

// ✅ Check if user is member of chat
exports.checkChatMembership = catchAsync(async (req, res, next) => {
  const chatId = req.params.id || req.params.chatId || req.body.chatId;
  const chat = await Chat.findById(chatId);
  if (!chat) return next(new AppError('Chat not found', 404));

  const isMember = chat.members.some(
    member =>
      member._id.toString() === req.user.id || member.toString() === req.user.id
  );

  if (!isMember) return next(new AppError('You are not a member of this chat', 403));

  req.chat = chat;
  next();
});

// ✅ Check if user can manage chat (admin/creator)
exports.checkChatManagement = catchAsync(async (req, res, next) => {
  if (!req.chat)
    return next(new AppError('Chat not loaded before management check', 400));

  const isAdmin = req.user.role === 'admin';
  const isCreator = req.chat.createdBy?.toString() === req.user.id;
  const isGroupAdmin = req.chat.admins?.includes(req.user.id);

  if (!isAdmin && !isCreator && !isGroupAdmin)
    return next(new AppError('You are not authorized to manage this chat', 403));

  next();
});

// ✅ Check if chat is active (not deleted/archived)
exports.checkChatStatus = (req, res, next) => {
  if (!req.chat)
    return next(new AppError('Chat not loaded before status check', 400));

  if (req.chat.status === 'deleted')
    return next(new AppError('This chat has been deleted', 404));

  if (
    req.chat.status === 'archived' &&
    !req.chat.members.includes(req.user.id)
  ) {
    return next(new AppError('This chat has been archived', 404));
  }

  next();
};

// ✅ Check if user can send messages to chat
exports.checkMessagePermission = (req, res, next) => {
  if (!req.chat)
    return next(new AppError('Chat not loaded before permission check', 400));

  // Check if chat allows member messages
  if (
    req.chat.settings?.allowMemberMessages === false &&
    !req.chat.admins?.includes(req.user.id) &&
    req.chat.createdBy?.toString() !== req.user.id
  ) {
    return next(new AppError('You are not allowed to send messages to this chat', 403));
  }

  // Check if user is muted
  if (req.chat.mutedUsers?.includes(req.user.id)) {
    return next(new AppError('You are muted in this chat', 403));
  }

  next();
};

// ✅ Check message ownership
exports.checkMessageOwnership = catchAsync(async (req, res, next) => {
  const message = await Message.findById(req.params.id);
  if (!message) return next(new AppError('Message not found', 404));

  const isOwner = message.sender.toString() === req.user.id;
  const isAdmin = req.user.role === 'admin';
  const isChatAdmin = req.chat?.admins?.includes(req.user.id);

  if (!isOwner && !isAdmin && !isChatAdmin)
    return next(new AppError('You are not authorized to perform this action', 403));

  req.message = message;
  next();
});

// ✅ Validate chat data
exports.validateChatData = (req, res, next) => {
  const { name, memberIds, settings } = req.body;

  if (req.method === 'POST') {
    if (!memberIds || !Array.isArray(memberIds))
      return next(new AppError('Member IDs are required', 400));

    if (memberIds.length < 1)
      return next(new AppError('At least one member is required', 400));

    if (memberIds.length > 50)
      return next(new AppError('Maximum 50 members allowed', 400));
  }

  if (name && (name.length < 2 || name.length > 100))
    return next(new AppError('Chat name must be between 2 and 100 characters', 400));

  if (settings && typeof settings !== 'object')
    return next(new AppError('Settings must be an object', 400));

  next();
};

// ✅ Check if user can be added to chat
exports.checkAddMemberPermission = catchAsync(async (req, res, next) => {
  const { memberIds } = req.body;

  if (!memberIds || !Array.isArray(memberIds))
    return next(new AppError('Member IDs are required', 400));

  const users = await User.find({ _id: { $in: memberIds } });

  if (users.length !== memberIds.length)
    return next(new AppError('One or more users not found', 400));

  const existingMembers = req.chat.members.map(m => m._id.toString());
  const duplicateMembers = memberIds.filter(id => existingMembers.includes(id));

  if (duplicateMembers.length > 0)
    return next(new AppError('Some users are already members of this chat', 400));

  req.newMembers = users;
  next();
});

// ✅ Check if user can be removed from chat
exports.checkRemoveMemberPermission = catchAsync(async (req, res, next) => {
  const { memberIds } = req.body;

  if (!memberIds || !Array.isArray(memberIds))
    return next(new AppError('Member IDs are required', 400));

  const existingMembers = req.chat.members.map(m => m._id.toString());
  const invalidMembers = memberIds.filter(id => !existingMembers.includes(id));

  if (invalidMembers.length > 0)
    return next(new AppError('Some users are not members of this chat', 400));

  if (memberIds.includes(req.chat.createdBy?.toString()))
    return next(new AppError('Cannot remove chat creator', 400));

  req.membersToRemove = memberIds;
  next();
});

// ✅ Rate limiting for message creation
exports.rateLimitMessages = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const chatId = req.body.chatId || req.params.chatId;

  const oneMinuteAgo = new Date(Date.now() - 60 * 1000);

  const recentMessages = await Message.countDocuments({
    sender: userId,
    createdAt: { $gte: oneMinuteAgo }
  });

  if (recentMessages >= 100)
    return next(new AppError('Message rate limit exceeded. Please slow down.', 429));

  const chatMessages = await Message.countDocuments({
    chat: chatId,
    createdAt: { $gte: oneMinuteAgo }
  });

  if (chatMessages >= 500)
    return next(new AppError('Chat rate limit exceeded. Please slow down.', 429));

  next();
});

// ✅ Clean up chat attachments
exports.cleanupChatAttachments = catchAsync(async (req, res, next) => {
  if (req.message?.attachments?.length > 0) {
    const deletePromises = req.message.attachments.map(attachment => {
      if (attachment.public_id)
        return cloudinary.uploader.destroy(attachment.public_id).catch(() => null);
      return Promise.resolve();
    });
    await Promise.all(deletePromises);
  }
  next();
});

// ✅ Populate chat data
exports.populateChatData = catchAsync(async (req, res, next) => {
  if (req.chat) {
    await req.chat.populate([
      { path: 'members', select: 'fullName email photo campus role' },
      { path: 'createdBy', select: 'fullName email photo' },
      { path: 'admins', select: 'fullName email photo' }
    ]);
  }
  next();
});

// ✅ Check chat analytics permission
exports.checkChatAnalyticsPermission = (req, res, next) => {
  if (!req.chat)
    return next(new AppError('Chat not loaded before analytics check', 400));

  const isOwner = req.chat.createdBy?.toString() === req.user.id;
  const isAdmin = req.user.role === 'admin';
  const isGroupAdmin = req.chat.admins?.includes(req.user.id);

  if (!isOwner && !isAdmin && !isGroupAdmin)
    return next(new AppError('You are not authorized to view chat analytics', 403));

  next();
};

// ✅ Validate bulk operations
exports.validateBulkOperation = (req, res, next) => {
  const { messageIds, operation } = req.body;

  if (!messageIds || !Array.isArray(messageIds))
    return next(new AppError('Message IDs are required', 400));

  if (messageIds.length > 100)
    return next(new AppError('Maximum 100 messages allowed per operation', 400));

  if (!operation || !['delete', 'markRead', 'markDelivered'].includes(operation))
    return next(new AppError('Invalid operation specified', 400));

  next();
};

// ✅ Check bulk operation permission
exports.checkBulkOperationPermission = catchAsync(async (req, res, next) => {
  const { messageIds } = req.body;

  const messages = await Message.find({ _id: { $in: messageIds } });

  if (messages.length !== messageIds.length)
    return next(new AppError('One or more messages not found', 400));

  const isAdmin = req.user.role === 'admin';
  const userOwnedMessages = messages.filter(msg => msg.sender.toString() === req.user.id);

  if (!isAdmin && userOwnedMessages.length !== messages.length)
    return next(
      new AppError('You can only perform bulk operations on your own messages', 403)
    );

  req.bulkMessages = messages;
  next();
});

// ✅ Check if chat allows file uploads
exports.checkFileUploadPermission = (req, res, next) => {
  if (!req.chat)
    return next(new AppError('Chat not loaded before file upload check', 400));

  if (req.chat.settings?.allowFileUploads === false)
    return next(new AppError('File uploads are not allowed in this chat', 403));

  next();
};

// ✅ Validate file upload
exports.validateFileUpload = (req, res, next) => {
  if (!req.files || req.files.length === 0)
    return next(new AppError('No files provided', 400));

  const maxFileSize = 50 * 1024 * 1024; // 50MB
  const allowedTypes = ['image/', 'video/', 'audio/', 'application/', 'text/'];

  for (const file of req.files) {
    if (file.size > maxFileSize)
      return next(
        new AppError(`File ${file.originalname} exceeds maximum size of 50MB`, 400)
      );

    const isAllowed = allowedTypes.some(type => file.mimetype.startsWith(type));
    if (!isAllowed)
      return next(new AppError(`File type ${file.mimetype} is not allowed`, 400));
  }

  next();
};

module.exports = exports;
