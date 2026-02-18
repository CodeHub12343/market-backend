// src/routes/chatRoutes.js
const express = require('express');
const chatController = require('../controllers/chatController');
const chatMiddleware = require('../middlewares/chatMiddleware');
const chatValidation = require('../validators/chatValidation');
const authMiddleware = require('../middlewares/authMiddleware');
const validationMiddleware = require('../middlewares/validationMiddleware');

const router = express.Router();

// Apply authentication to all routes
router.use(authMiddleware.protect);

// ✅ Specific POST routes FIRST (before generic /)
router.post('/one-to-one', 
  chatValidation.createOneToOne,
  validationMiddleware.validate,
  chatController.getOrCreateOneToOneChat
);

router.post('/group',
  chatValidation.createGroup,
  validationMiddleware.validate,
  chatController.createGroupChat
);

// ✅ Generic GET and POST routes AFTER specific ones
router.get('/', chatController.getMyChats);

router.post('/', chatController.getOrCreateOneToOneChat);

// ✅ Get user's chats
router.get('/me',
  chatValidation.search,
  validationMiddleware.validate,
  chatController.getMyChats
);

// ✅ Search users to start conversation
router.get('/search/users', async (req, res, next) => {
  try {
    const User = require('../models/userModel');
    const searchQuery = req.query.q || req.query.query || '';
    
    if (!searchQuery || searchQuery.trim().length < 2) {
      return res.status(200).json({ 
        status: 'success', 
        data: [] 
      });
    }

    // Search by name, username, or email
    const regex = new RegExp(searchQuery, 'i');
    const users = await User.find({
      _id: { $ne: req.user._id }, // Exclude self
      $or: [
        { name: regex },
        { username: regex },
        { email: regex }
      ]
    })
    .select('_id name username email avatar')
    .limit(10);

    res.status(200).json({ 
      status: 'success', 
      data: users 
    });
  } catch (error) {
    next(error);
  }
});

// ✅ Search chats
router.get('/search',
  chatValidation.search,
  validationMiddleware.validate,
  chatController.searchChats
);

// ✅ Chat management (require chat ID)
router.route('/:id')
  .get(
    chatValidation.chatId,
    validationMiddleware.validate,
    chatMiddleware.checkChatMembership,
    chatMiddleware.checkChatStatus,
    chatMiddleware.populateChatData,
    chatController.getChatWithMessages
  )
  .patch(
    chatValidation.chatId,
    chatValidation.update,
    validationMiddleware.validate,
    chatMiddleware.checkChatMembership,
    chatMiddleware.checkChatManagement,
    chatMiddleware.validateChatData,
    chatController.updateChat
  )
  .delete(
    chatValidation.chatId,
    validationMiddleware.validate,
    chatMiddleware.checkChatMembership,
    chatMiddleware.checkChatManagement,
    chatController.deleteChat
  );

// ✅ Chat member management
router.post('/:id/members',
  chatValidation.chatId,
  chatValidation.addMembers,
  validationMiddleware.validate,
  chatMiddleware.checkChatMembership,
  chatMiddleware.checkChatManagement,
  chatMiddleware.checkAddMemberPermission,
  chatController.addMembers
);

router.delete('/:id/members',
  chatValidation.chatId,
  chatValidation.removeMembers,
  validationMiddleware.validate,
  chatMiddleware.checkChatMembership,
  chatMiddleware.checkChatManagement,
  chatMiddleware.checkRemoveMemberPermission,
  chatController.removeMembers
);

router.get('/:id/members',
  chatValidation.chatId,
  validationMiddleware.validate,
  chatMiddleware.checkChatMembership,
  chatController.getChatMembers
);

// ✅ Admin management
router.patch('/:id/admins',
  chatValidation.chatId,
  validationMiddleware.validate,
  chatMiddleware.checkChatMembership,
  chatMiddleware.checkChatManagement,
  chatController.updateAdmins
);

// ✅ Chat settings
router.patch('/:id/settings',
  chatValidation.chatId,
  chatValidation.updateSettings,
  validationMiddleware.validate,
  chatMiddleware.checkChatMembership,
  chatMiddleware.checkChatManagement,
  chatController.updateChatSettings
);

// ✅ Archive/Unarchive chat
router.patch('/:id/archive',
  chatValidation.chatId,
  chatValidation.archive,
  validationMiddleware.validate,
  chatMiddleware.checkChatMembership,
  chatMiddleware.checkChatManagement,
  chatController.archiveChat
);

// ✅ Mute/Unmute chat
router.patch('/:id/mute',
  chatValidation.chatId,
  chatValidation.mute,
  validationMiddleware.validate,
  chatMiddleware.checkChatMembership,
  chatController.muteChat
);

// ✅ User management in chat
router.post('/:id/mute-user',
  chatValidation.chatId,
  validationMiddleware.validate,
  chatMiddleware.checkChatMembership,
  chatMiddleware.checkChatManagement,
  chatController.muteUser
);

router.post('/:id/unmute-user',
  chatValidation.chatId,
  validationMiddleware.validate,
  chatMiddleware.checkChatMembership,
  chatMiddleware.checkChatManagement,
  chatController.unmuteUser
);

// ✅ Leave chat
router.post('/:id/leave',
  chatValidation.chatId,
  validationMiddleware.validate,
  chatMiddleware.checkChatMembership,
  chatController.leaveChat
);

// ✅ Chat analytics
router.get('/:id/analytics',
  chatValidation.chatId,
  chatValidation.analytics,
  validationMiddleware.validate,
  chatMiddleware.checkChatMembership,
  chatMiddleware.checkChatAnalyticsPermission,
  chatController.getChatAnalytics
);

// ============================================================
// MESSAGE MANAGEMENT ENDPOINTS (under chat routes)
// ============================================================
const messageController = require('../controllers/messageController');
const uploadMiddleware = require('../middlewares/uploadMiddleware');

// ✅ Get messages in conversation
router.get('/:conversationId/messages', (req, res, next) => {
  // Map conversationId to chatId for getMessages
  req.params.chatId = req.params.conversationId;
  chatController.getMessages(req, res, next);
});

// ✅ Send message in conversation
router.post('/:conversationId/messages',
  uploadMiddleware.uploadMultiple('attachments', 10),
  (req, res, next) => {
    // Map conversationId to chat for createMessage
    req.body.chat = req.params.conversationId;
    req.body.chatId = req.params.conversationId;
    messageController.createMessage(req, res, next);
  }
);

// ✅ Edit message
router.patch('/:conversationId/messages/:messageId',
  (req, res, next) => {
    messageController.updateMessage(req, res, next);
  }
);

// ✅ Delete message
router.delete('/:conversationId/messages/:messageId',
  (req, res, next) => {
    messageController.deleteMessage(req, res, next);
  }
);

// ✅ Mark conversation as read
router.patch('/:conversationId/read',
  (req, res, next) => {
    chatController.markConversationAsRead(req, res, next);
  }
);

// ✅ Mark message as read
router.patch('/:conversationId/messages/:messageId/read',
  (req, res, next) => {
    messageController.markMessageAsRead(req, res, next);
  }
);

module.exports = router;
