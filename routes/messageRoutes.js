// src/routes/messageRoutes.js
const express = require('express');
const messageController = require('../controllers/messageController');
const messageMiddleware = require('../middlewares/chatMiddleware'); // Using chat middleware for message operations
const messageValidation = require('../validators/messageValidation');
const chatValidation = require('../validators/chatValidation');
const authMiddleware = require('../middlewares/authMiddleware');
const validationMiddleware = require('../middlewares/validationMiddleware');
const uploadMiddleware = require('../middlewares/uploadMiddleware');

const router = express.Router();

// Apply authentication to all routes
router.use(authMiddleware.protect);

// ✅ Message creation and management
router.post('/',
  uploadMiddleware.uploadMultiple('attachments', 10), // Allow up to 10 files
  messageValidation.send,
  validationMiddleware.validate,
  messageMiddleware.checkChatMembership,
  messageMiddleware.checkMessagePermission,
  messageMiddleware.rateLimitMessages,
  messageController.createMessage
);

// ✅ File upload for messages
router.post('/upload',
  messageValidation.uploadFile,
  validationMiddleware.validate,
  messageMiddleware.uploadChatAttachments,
  messageMiddleware.processChatAttachments,
  messageMiddleware.checkFileUploadPermission,
  messageMiddleware.validateFileUpload,
  messageController.uploadFile
);

// ✅ Get messages for a chat
router.get('/chat/:chatId',
  messageValidation.search,
  validationMiddleware.validate,
  messageMiddleware.checkChatMembership,
  messageController.getMessages
);

// ✅ Search messages
router.get('/search',
  messageValidation.search,
  validationMiddleware.validate,
  messageController.searchMessages
);

// ✅ Message management (require message ID)
router.route('/:id')
  .get(
    messageValidation.messageId,
    validationMiddleware.validate,
    messageController.getMessage
  )
  .patch(
    messageValidation.messageId,
    messageValidation.update,
    validationMiddleware.validate,
    messageMiddleware.checkMessageOwnership,
    messageController.updateMessage
  )
  .delete(
    messageValidation.messageId,
    validationMiddleware.validate,
    messageMiddleware.checkMessageOwnership,
    messageController.deleteMessage
  );

// ✅ Message reactions
router.post('/:id/reactions',
  messageValidation.messageId,
  messageValidation.addReaction,
  validationMiddleware.validate,
  messageController.addReaction
);

router.delete('/:id/reactions',
  messageValidation.messageId,
  messageValidation.removeReaction,
  validationMiddleware.validate,
  messageController.removeReaction
);

// ✅ Reaction statistics and details
router.get('/:messageId/reactions/stats',
  messageValidation.messageId,
  validationMiddleware.validate,
  messageController.getMessageReactionStats
);

router.get('/:messageId/reactions/users',
  messageValidation.messageId,
  validationMiddleware.validate,
  messageController.getReactionUsers
);

// ✅ Get all allowed reactions for the platform
router.get('/reactions/allowed',
  messageController.getAllowedReactions
);

// ✅ Message status management
router.post('/mark-read',
  messageValidation.markRead,
  validationMiddleware.validate,
  messageController.markAsRead
);

router.post('/mark-delivered',
  messageValidation.markDelivered,
  validationMiddleware.validate,
  messageController.markAsDelivered
);

// ✅ Message forwarding
router.post('/forward',
  messageValidation.forward,
  validationMiddleware.validate,
  messageController.forwardMessages
);

// ✅ Message scheduling
router.post('/schedule',
  messageValidation.schedule,
  validationMiddleware.validate,
  messageController.scheduleMessage
);

router.get('/scheduled/:chatId',
  chatValidation.chatId,
  validationMiddleware.validate,
  messageMiddleware.checkChatMembership,
  messageController.getScheduledMessages
);

router.delete('/scheduled/:id',
  messageValidation.messageId,
  validationMiddleware.validate,
  messageController.cancelScheduledMessage
);

// ✅ Bulk operations
router.post('/bulk-delete',
  messageValidation.bulkDelete,
  validationMiddleware.validate,
  messageMiddleware.validateBulkOperation,
  messageMiddleware.checkBulkOperationPermission,
  messageController.bulkDeleteMessages
);

// ✅ Message analytics
router.get('/analytics',
  messageValidation.analytics,
  validationMiddleware.validate,
  messageController.getMessageAnalytics
);

// ✅ Message history
router.get('/:id/history',
  messageValidation.messageId,
  validationMiddleware.validate,
  messageController.getMessageHistory
);

module.exports = router;
