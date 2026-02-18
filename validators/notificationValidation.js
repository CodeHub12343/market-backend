// src/validators/notificationValidation.js
const { body, query, param } = require('express-validator');
const commonValidations = require('./commonValidations');

const notificationValidation = {
  // Create notification validation
  create: [
    body('title')
      .trim()
      .isLength({ min: 1, max: 200 })
      .withMessage('Title must be between 1 and 200 characters')
      .matches(/^[a-zA-Z0-9\s\-_.,!?()]+$/)
      .withMessage('Title contains invalid characters'),
    
    body('message')
      .trim()
      .isLength({ min: 1, max: 1000 })
      .withMessage('Message must be between 1 and 1000 characters')
      .matches(/^[a-zA-Z0-9\s\-_.,!?()@#$%&*+=<>:"'[\]{}|\\\/~`]+$/)
      .withMessage('Message contains invalid characters'),
    
    body('type')
      .optional()
      .isIn(['request', 'offer', 'order', 'system', 'chat', 'product', 'service', 'review', 'payment', 'security'])
      .withMessage('Invalid notification type'),
    
    body('category')
      .optional()
      .isIn(['info', 'warning', 'error', 'success', 'urgent'])
      .withMessage('Invalid notification category'),
    
    body('priority')
      .optional()
      .isIn(['low', 'normal', 'high', 'urgent'])
      .withMessage('Priority must be low, normal, high, or urgent'),
    
    body('recipients')
      .optional()
      .isArray({ min: 1, max: 100 })
      .withMessage('Recipients must be an array with 1-100 users'),
    
    body('recipients.*')
      .isMongoId()
      .withMessage('Invalid recipient ID format'),
    
    body('data')
      .optional()
      .isObject()
      .withMessage('Data must be an object'),
    
    body('expiresAt')
      .optional()
      .isISO8601()
      .withMessage('Expiration date must be valid ISO 8601 date')
      .custom((value) => {
        if (new Date(value) <= new Date()) {
          throw new Error('Expiration date must be in the future');
        }
        return true;
      }),
    
    body('scheduledAt')
      .optional()
      .isISO8601()
      .withMessage('Scheduled date must be valid ISO 8601 date')
      .custom((value) => {
        if (new Date(value) <= new Date()) {
          throw new Error('Scheduled date must be in the future');
        }
        return true;
      }),
    
    body('template')
      .optional()
      .isIn(['welcome', 'order_confirmation', 'payment_received', 'request_created', 'offer_received', 'chat_message', 'system_alert'])
      .withMessage('Invalid notification template'),
    
    body('channels')
      .optional()
      .isArray()
      .withMessage('Channels must be an array'),
    
    body('channels.*')
      .isIn(['in_app', 'email', 'push', 'sms'])
      .withMessage('Invalid notification channel'),
    
    body('metadata')
      .optional()
      .isObject()
      .withMessage('Metadata must be an object')
  ],

  // Update notification validation
  update: [
    body('title')
      .optional()
      .trim()
      .isLength({ min: 1, max: 200 })
      .withMessage('Title must be between 1 and 200 characters'),
    
    body('message')
      .optional()
      .trim()
      .isLength({ min: 1, max: 1000 })
      .withMessage('Message must be between 1 and 1000 characters'),
    
    body('priority')
      .optional()
      .isIn(['low', 'normal', 'high', 'urgent'])
      .withMessage('Priority must be low, normal, high, or urgent'),
    
    body('category')
      .optional()
      .isIn(['info', 'warning', 'error', 'success', 'urgent'])
      .withMessage('Invalid notification category'),
    
    body('expiresAt')
      .optional()
      .isISO8601()
      .withMessage('Expiration date must be valid ISO 8601 date'),
    
    body('metadata')
      .optional()
      .isObject()
      .withMessage('Metadata must be an object')
  ],

  // Search notifications validation
  search: [
    query('q')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Search query must be between 1 and 100 characters'),
    
    query('type')
      .optional()
      .isIn(['request', 'offer', 'order', 'system', 'chat', 'product', 'service', 'review', 'payment', 'security'])
      .withMessage('Invalid notification type'),
    
    query('category')
      .optional()
      .isIn(['info', 'warning', 'error', 'success', 'urgent'])
      .withMessage('Invalid notification category'),
    
    query('priority')
      .optional()
      .isIn(['low', 'normal', 'high', 'urgent'])
      .withMessage('Invalid priority level'),
    
    query('read')
      .optional()
      .isBoolean()
      .withMessage('Read status must be boolean'),
    
    query('archived')
      .optional()
      .isBoolean()
      .withMessage('Archived status must be boolean'),
    
    query('dateFrom')
      .optional()
      .isISO8601()
      .withMessage('Start date must be valid ISO 8601 date'),
    
    query('dateTo')
      .optional()
      .isISO8601()
      .withMessage('End date must be valid ISO 8601 date'),
    
    query('sort')
      .optional()
      .isIn(['createdAt', 'priority', 'read', 'type', 'category'])
      .withMessage('Invalid sort field'),
    
    query('order')
      .optional()
      .isIn(['asc', 'desc'])
      .withMessage('Order must be asc or desc'),
    
    commonValidations.page(),
    commonValidations.limit()
  ],

  // Notification ID validation
  notificationId: [
    param('id')
      .isMongoId()
      .withMessage('Invalid notification ID format')
  ],

  // Bulk operations validation
  bulkOperations: [
    body('notificationIds')
      .isArray({ min: 1, max: 100 })
      .withMessage('Notification IDs must be an array with 1-100 items'),
    
    body('notificationIds.*')
      .isMongoId()
      .withMessage('Invalid notification ID format'),
    
    body('action')
      .isIn(['mark_read', 'mark_unread', 'delete', 'archive', 'unarchive'])
      .withMessage('Action must be mark_read, mark_unread, delete, archive, or unarchive')
  ],

  // Notification preferences validation
  preferences: [
    body('emailNotifications')
      .optional()
      .isBoolean()
      .withMessage('Email notifications must be boolean'),
    
    body('pushNotifications')
      .optional()
      .isBoolean()
      .withMessage('Push notifications must be boolean'),
    
    body('smsNotifications')
      .optional()
      .isBoolean()
      .withMessage('SMS notifications must be boolean'),
    
    body('notificationTypes')
      .optional()
      .isObject()
      .withMessage('Notification types must be an object'),
    
    body('quietHours')
      .optional()
      .isObject()
      .withMessage('Quiet hours must be an object'),
    
    body('quietHours.enabled')
      .optional()
      .isBoolean()
      .withMessage('Quiet hours enabled must be boolean'),
    
    body('quietHours.start')
      .optional()
      .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
      .withMessage('Quiet hours start must be in HH:MM format'),
    
    body('quietHours.end')
      .optional()
      .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
      .withMessage('Quiet hours end must be in HH:MM format'),
    
    body('frequency')
      .optional()
      .isIn(['immediate', 'hourly', 'daily', 'weekly'])
      .withMessage('Frequency must be immediate, hourly, daily, or weekly')
  ],

  // Analytics validation
  analytics: [
    query('period')
      .optional()
      .isIn(['hour', 'day', 'week', 'month', 'year'])
      .withMessage('Period must be hour, day, week, month, or year'),
    
    query('type')
      .optional()
      .isIn(['request', 'offer', 'order', 'system', 'chat', 'product', 'service', 'review', 'payment', 'security'])
      .withMessage('Invalid notification type'),
    
    query('category')
      .optional()
      .isIn(['info', 'warning', 'error', 'success', 'urgent'])
      .withMessage('Invalid notification category'),
    
    query('dateFrom')
      .optional()
      .isISO8601()
      .withMessage('Start date must be valid ISO 8601 date'),
    
    query('dateTo')
      .optional()
      .isISO8601()
      .withMessage('End date must be valid ISO 8601 date')
  ],

  // Template validation
  template: [
    body('name')
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Template name must be between 1 and 100 characters'),
    
    body('subject')
      .trim()
      .isLength({ min: 1, max: 200 })
      .withMessage('Subject must be between 1 and 200 characters'),
    
    body('content')
      .trim()
      .isLength({ min: 1, max: 5000 })
      .withMessage('Content must be between 1 and 5000 characters'),
    
    body('type')
      .isIn(['email', 'push', 'sms', 'in_app'])
      .withMessage('Template type must be email, push, sms, or in_app'),
    
    body('variables')
      .optional()
      .isArray()
      .withMessage('Variables must be an array'),
    
    body('variables.*')
      .isString()
      .withMessage('Each variable must be a string')
  ]
};

module.exports = notificationValidation;