const { body, param, query } = require('express-validator');
const { commonValidations } = require('../middlewares/validationMiddleware');

const chatValidation = {
  // Create 1:1 chat
  createOneToOne: [
    body('userId')
      .isMongoId()
      .withMessage('Valid user ID is required')
      .custom((value, { req }) => {
        if (value === req.user.id) {
          throw new Error('Cannot create chat with yourself');
        }
        return true;
      })
      .withMessage('Cannot create chat with yourself')
  ],

  // Create group chat
  createGroup: [
    body('name')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Group name must be between 2 and 100 characters')
      .matches(/^[a-zA-Z0-9\s\-_.,!?]+$/)
      .withMessage('Group name contains invalid characters'),
    body('memberIds')
      .isArray({ min: 1, max: 50 })
      .withMessage('Must provide 1-50 member IDs')
      .custom((value) => {
        const uniqueIds = [...new Set(value)];
        if (uniqueIds.length !== value.length) {
          throw new Error('Duplicate member IDs not allowed');
        }
        return true;
      })
      .withMessage('Duplicate member IDs not allowed'),
    body('memberIds.*')
      .isMongoId()
      .withMessage('Invalid member ID format')
      .custom((value, { req }) => {
        if (value === req.user.id) {
          throw new Error('Cannot add yourself as member');
        }
        return true;
      })
      .withMessage('Cannot add yourself as member'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Description cannot exceed 500 characters'),
    body('settings')
      .optional()
      .isObject()
      .withMessage('Settings must be an object'),
    body('settings.allowInvites')
      .optional()
      .isBoolean()
      .withMessage('Allow invites must be boolean'),
    body('settings.allowMemberMessages')
      .optional()
      .isBoolean()
      .withMessage('Allow member messages must be boolean')
  ],

  // Update chat
  update: [
    body('name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Group name must be between 2 and 100 characters')
      .matches(/^[a-zA-Z0-9\s\-_.,!?]+$/)
      .withMessage('Group name contains invalid characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Description cannot exceed 500 characters'),
    body('settings')
      .optional()
      .isObject()
      .withMessage('Settings must be an object'),
    body('settings.allowInvites')
      .optional()
      .isBoolean()
      .withMessage('Allow invites must be boolean'),
    body('settings.allowMemberMessages')
      .optional()
      .isBoolean()
      .withMessage('Allow member messages must be boolean'),
    body('settings.muteNotifications')
      .optional()
      .isBoolean()
      .withMessage('Mute notifications must be boolean')
  ],

  // Add members to chat
  addMembers: [
    body('memberIds')
      .isArray({ min: 1, max: 20 })
      .withMessage('Must provide 1-20 member IDs'),
    body('memberIds.*')
      .isMongoId()
      .withMessage('Invalid member ID format')
      .custom((value, { req }) => {
        if (value === req.user.id) {
          throw new Error('Cannot add yourself as member');
        }
        return true;
      })
      .withMessage('Cannot add yourself as member')
  ],

  // Remove members from chat
  removeMembers: [
    body('memberIds')
      .isArray({ min: 1, max: 20 })
      .withMessage('Must provide 1-20 member IDs'),
    body('memberIds.*')
      .isMongoId()
      .withMessage('Invalid member ID format')
      .custom((value, { req }) => {
        if (value === req.user.id) {
          throw new Error('Cannot remove yourself');
        }
        return true;
      })
      .withMessage('Cannot remove yourself')
  ],

  // Chat search
  search: [
    query('q')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Search query must be between 1 and 100 characters'),
    query('type')
      .optional()
      .isIn(['one-to-one', 'group', 'all'])
      .withMessage('Type must be one-to-one, group, or all'),
    query('archived')
      .optional()
      .isBoolean()
      .withMessage('Archived must be boolean'),
    query('muted')
      .optional()
      .isBoolean()
      .withMessage('Muted must be boolean'),
    commonValidations.page(),
    commonValidations.limit()
  ],

  // Chat analytics
  analytics: [
    query('period')
      .optional()
      .isIn(['day', 'week', 'month', 'year'])
      .withMessage('Period must be day, week, month, or year'),
    query('startDate')
      .optional()
      .isISO8601()
      .withMessage('Start date must be valid ISO 8601 date'),
    query('endDate')
      .optional()
      .isISO8601()
      .withMessage('End date must be valid ISO 8601 date')
  ],

  // Chat ID validation
  chatId: [
    param('id')
      .isMongoId()
      .withMessage('Invalid chat ID format')
  ],

  // Archive/Unarchive chat
  archive: [
    body('archived')
      .isBoolean()
      .withMessage('Archived status must be boolean')
  ],

  // Mute/Unmute chat
  mute: [
    body('muted')
      .isBoolean()
      .withMessage('Muted status must be boolean'),
    body('muteUntil')
      .optional()
      .isISO8601()
      .withMessage('Mute until must be valid ISO 8601 date')
  ],

  // Chat settings
  updateSettings: [
    body('allowInvites')
      .optional()
      .isBoolean()
      .withMessage('Allow invites must be boolean'),
    body('allowMemberMessages')
      .optional()
      .isBoolean()
      .withMessage('Allow member messages must be boolean'),
    body('muteNotifications')
      .optional()
      .isBoolean()
      .withMessage('Mute notifications must be boolean'),
    body('autoDeleteMessages')
      .optional()
      .isBoolean()
      .withMessage('Auto delete messages must be boolean'),
    body('messageRetentionDays')
      .optional()
      .isInt({ min: 1, max: 365 })
      .withMessage('Message retention must be between 1 and 365 days')
  ]
};

module.exports = chatValidation;