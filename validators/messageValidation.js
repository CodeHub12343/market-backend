const { body } = require('express-validator');
const { commonValidations } = require('../middlewares/validationMiddleware');

const messageValidation = {
  send: [
    body('content')
      .optional()
      .trim()
      .isLength({ max: 5000 })
      .withMessage('Message content cannot exceed 5000 characters'),
    body('chatId')
      .isMongoId()
      .withMessage('Invalid chat ID'),
    body('type')
      .optional()
      .isIn(['text', 'image', 'file', 'location'])
      .withMessage('Invalid message type'),
    body('metadata')
      .optional()
      .isObject()
      .withMessage('Metadata must be an object')
  ],

  update: [
    body('content')
      .trim()
      .notEmpty()
      .withMessage('Message content cannot be empty')
      .isLength({ max: 5000 })
      .withMessage('Message content cannot exceed 5000 characters')
  ],

  markRead: [
    body('messageIds')
      .isArray({ min: 1 })
      .withMessage('At least one message ID is required'),
    body('messageIds.*')
      .isMongoId()
      .withMessage('Invalid message ID format')
  ]
  ,

  // File upload validation (expect multipart/form-data handled by multer)
  uploadFile: [
    body('chatId')
      .optional()
      .isMongoId()
      .withMessage('Invalid chat ID')
  ],

  // Search messages
  search: [
    body('q')
      .optional()
      .isString()
      .isLength({ min: 1, max: 500 })
      .withMessage('Search query must be 1-500 characters')
  ],

  // Message ID param
  messageId: [
    body('id')
      .optional()
      .isMongoId()
      .withMessage('Invalid message ID'),
    // also support param-based id
    (req, res, next) => next()
  ],

  addReaction: [
    body('reaction')
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('Reaction must be provided and less than 50 characters')
  ],

  removeReaction: [
    body('reaction')
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('Reaction must be provided and less than 50 characters')
  ],

  markDelivered: [
    body('messageIds')
      .isArray({ min: 1 })
      .withMessage('At least one message ID is required'),
    body('messageIds.*')
      .isMongoId()
      .withMessage('Invalid message ID format')
  ],

  forward: [
    body('messageIds')
      .isArray({ min: 1 })
      .withMessage('At least one message ID is required'),
    body('targetChatId')
      .isMongoId()
      .withMessage('Target chat ID is required')
  ],

  schedule: [
    body('message')
      .isObject()
      .withMessage('Message object required'),
    body('sendAt')
      .isISO8601()
      .withMessage('sendAt must be a valid ISO8601 datetime')
  ],

  bulkDelete: [
    body('messageIds')
      .isArray({ min: 1 })
      .withMessage('At least one message ID is required'),
    body('messageIds.*')
      .isMongoId()
      .withMessage('Invalid message ID format')
  ],

  analytics: [
    body('period')
      .optional()
      .isIn(['7d', '30d', '90d', '1y', 'all'])
      .withMessage('Invalid period')
  ]
};

module.exports = messageValidation;