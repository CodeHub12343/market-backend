const { body, param, query } = require('express-validator');
const commonValidations = require('./commonValidations');

// Event creation validation
const createEvent = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Event title is required')
    .isLength({ min: 3, max: 100 })
    .withMessage('Title must be between 3 and 100 characters'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Description cannot exceed 2000 characters'),
  
  body('date')
    .notEmpty()
    .withMessage('Event date is required')
    .isISO8601()
    .withMessage('Invalid date format')
    .custom((value) => {
      const eventDate = new Date(value);
      const now = new Date();
      if (eventDate <= now) {
        throw new Error('Event date must be in the future');
      }
      return true;
    }),
  
  body('endDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid end date format')
    .custom((value, { req }) => {
      if (value && req.body.date) {
        const startDate = new Date(req.body.date);
        const endDate = new Date(value);
        if (endDate <= startDate) {
          throw new Error('End date must be after start date');
        }
      }
      return true;
    }),
  
  body('location')
    .trim()
    .notEmpty()
    .withMessage('Event location is required')
    .isLength({ min: 3, max: 200 })
    .withMessage('Location must be between 3 and 200 characters'),
  
  body('campus')
    .notEmpty()
    .withMessage('Campus is required')
    .isMongoId()
    .withMessage('Invalid campus ID'),
  
  body('category')
    .optional()
    .isMongoId()
    .withMessage('Invalid category ID'),
  
  body('capacity')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Capacity must be a positive integer'),
  
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array')
    .custom((tags) => {
      if (tags && tags.length > 10) {
        throw new Error('Maximum 10 tags allowed');
      }
      if (tags) {
        tags.forEach(tag => {
          if (typeof tag !== 'string' || tag.length > 20) {
            throw new Error('Each tag must be a string with maximum 20 characters');
          }
        });
      }
      return true;
    }),
  
  body('visibility')
    .optional()
    .isIn(['public', 'campus', 'private'])
    .withMessage('Invalid visibility setting'),
  
  body('registrationRequired')
    .optional()
    .isBoolean()
    .withMessage('Registration required must be a boolean'),
  
  body('registrationDeadline')
    .optional()
    .isISO8601()
    .withMessage('Invalid registration deadline format')
    .custom((value, { req }) => {
      if (value && req.body.date) {
        const eventDate = new Date(req.body.date);
        const deadline = new Date(value);
        if (deadline >= eventDate) {
          throw new Error('Registration deadline must be before event date');
        }
      }
      return true;
    }),
  
  body('requirements')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Requirements cannot exceed 1000 characters'),
  
  body('contactInfo.email')
    .optional()
    .isEmail()
    .withMessage('Invalid email format'),
  
  body('contactInfo.phone')
    .optional()
    .matches(/^[\+]?[0-9]{7,15}$/)
    .withMessage('Invalid phone number format'),
  
  body('contactInfo.website')
    .optional()
    .isURL()
    .withMessage('Invalid website URL'),
  
  body('timezone')
    .optional()
    .isLength({ min: 3, max: 50 })
    .withMessage('Invalid timezone'),
  
  body('recurrence.type')
    .optional()
    .isIn(['none', 'daily', 'weekly', 'monthly', 'yearly'])
    .withMessage('Invalid recurrence type'),
  
  body('recurrence.interval')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Recurrence interval must be a positive integer'),
  
  body('recurrence.endDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid recurrence end date format'),
  
  body('settings.allowComments')
    .optional()
    .isBoolean()
    .withMessage('Allow comments must be a boolean'),
  
  body('settings.allowRatings')
    .optional()
    .isBoolean()
    .withMessage('Allow ratings must be a boolean'),
  
  body('settings.allowSharing')
    .optional()
    .isBoolean()
    .withMessage('Allow sharing must be a boolean'),
  
  body('settings.sendReminders')
    .optional()
    .isBoolean()
    .withMessage('Send reminders must be a boolean'),
  
  body('settings.reminderDays')
    .optional()
    .isInt({ min: 0, max: 30 })
    .withMessage('Reminder days must be between 0 and 30'),
  
  body('settings.autoArchive')
    .optional()
    .isBoolean()
    .withMessage('Auto archive must be a boolean'),
  
  body('settings.archiveAfterDays')
    .optional()
    .isInt({ min: 1, max: 365 })
    .withMessage('Archive after days must be between 1 and 365')
];

// Event update validation
const updateEvent = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Title must be between 3 and 100 characters'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Description cannot exceed 2000 characters'),
  
  body('date')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format')
    .custom((value) => {
      if (value) {
        const eventDate = new Date(value);
        const now = new Date();
        if (eventDate <= now) {
          throw new Error('Event date must be in the future');
        }
      }
      return true;
    }),
  
  body('endDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid end date format'),
  
  body('location')
    .optional()
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Location must be between 3 and 200 characters'),
  
  body('category')
    .optional()
    .isMongoId()
    .withMessage('Invalid category ID'),
  
  body('capacity')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Capacity must be a positive integer'),
  
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array')
    .custom((tags) => {
      if (tags && tags.length > 10) {
        throw new Error('Maximum 10 tags allowed');
      }
      if (tags) {
        tags.forEach(tag => {
          if (typeof tag !== 'string' || tag.length > 20) {
            throw new Error('Each tag must be a string with maximum 20 characters');
          }
        });
      }
      return true;
    }),
  
  body('status')
    .optional()
    .isIn(['draft', 'published', 'cancelled', 'completed'])
    .withMessage('Invalid status'),
  
  body('visibility')
    .optional()
    .isIn(['public', 'campus', 'private'])
    .withMessage('Invalid visibility setting'),
  
  body('registrationRequired')
    .optional()
    .isBoolean()
    .withMessage('Registration required must be a boolean'),
  
  body('registrationDeadline')
    .optional()
    .isISO8601()
    .withMessage('Invalid registration deadline format'),
  
  body('requirements')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Requirements cannot exceed 1000 characters'),
  
  body('contactInfo.email')
    .optional()
    .isEmail()
    .withMessage('Invalid email format'),
  
  body('contactInfo.phone')
    .optional()
    .matches(/^[\+]?[0-9]{7,15}$/)
    .withMessage('Invalid phone number format'),
  
  body('contactInfo.website')
    .optional()
    .isURL()
    .withMessage('Invalid website URL'),
  
  body('timezone')
    .optional()
    .isLength({ min: 3, max: 50 })
    .withMessage('Invalid timezone')
];

// Event search validation
const searchEvents = [
  query('search')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search query must be between 1 and 100 characters'),
  
  query('campus')
    .optional()
    .isMongoId()
    .withMessage('Invalid campus ID'),
  
  query('category')
    .optional()
    .isMongoId()
    .withMessage('Invalid category ID'),
  
  query('status')
    .optional()
    .isIn(['draft', 'published', 'cancelled', 'completed'])
    .withMessage('Invalid status'),
  
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid start date format'),
  
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid end date format'),
  
  query('upcoming')
    .optional()
    .isBoolean()
    .withMessage('Upcoming must be a boolean'),
  
  query('tags')
    .optional()
    .isString()
    .withMessage('Tags must be a comma-separated string'),
  
  commonValidations.page(),
  commonValidations.limit()
];

// Event analytics validation
const getEventAnalytics = [
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid start date format'),
  
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid end date format'),
  
  query('campus')
    .optional()
    .isMongoId()
    .withMessage('Invalid campus ID'),
  
  query('category')
    .optional()
    .isMongoId()
    .withMessage('Invalid category ID')
];

// Event rating validation
const addEventRating = [
  body('rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
  
  body('review')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Review cannot exceed 500 characters')
];

// Event comment validation
const addEventComment = [
  body('comment')
    .trim()
    .notEmpty()
    .withMessage('Comment is required')
    .isLength({ min: 1, max: 500 })
    .withMessage('Comment must be between 1 and 500 characters')
];

// Event favorite validation
const toggleEventFavorite = [
  // No additional validation needed for toggling favorites
];

// Event bulk operations validation
const bulkEventOperations = [
  body('operation')
    .isIn(['delete', 'update', 'archive', 'unarchive', 'publish', 'cancel'])
    .withMessage('Invalid bulk operation'),
  
  body('eventIds')
    .isArray({ min: 1 })
    .withMessage('Event IDs must be an array with at least one ID')
    .custom((ids) => {
      ids.forEach(id => {
        if (!id.match(/^[0-9a-fA-F]{24}$/)) {
          throw new Error('Invalid event ID format');
        }
      });
      return true;
    }),
  
  body('updateData')
    .optional()
    .isObject()
    .withMessage('Update data must be an object')
];

// Event ID parameter validation
const eventIdParam = [
  param('id')
    .isMongoId()
    .withMessage('Invalid event ID')
];

// Event coordinates validation
const updateEventCoordinates = [
  body('coordinates')
    .isArray({ min: 2, max: 2 })
    .withMessage('Coordinates must be an array with exactly 2 numbers'),
  
  body('coordinates.*')
    .isNumeric()
    .withMessage('Each coordinate must be a number'),
  
  body('coordinates.0')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),
  
  body('coordinates.1')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180')
];

// Saved Search Validation
const saveSearch = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Search name is required')
    .isLength({ min: 3, max: 50 })
    .withMessage('Search name must be between 3 and 50 characters'),
  
  body('filters')
    .isObject()
    .withMessage('Filters must be an object'),
  
  body('isPublic')
    .optional()
    .isBoolean()
    .withMessage('isPublic must be a boolean')
];

const executeSavedSearch = [
  param('searchId')
    .isMongoId()
    .withMessage('Invalid search ID'),
  
  commonValidations.page(),
  commonValidations.limit()
];

// Event Recurrence Validation
const createRecurringEvent = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Event title is required')
    .isLength({ min: 3, max: 100 })
    .withMessage('Title must be between 3 and 100 characters'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Description cannot exceed 2000 characters'),
  
  body('date')
    .notEmpty()
    .withMessage('Event date is required')
    .isISO8601()
    .withMessage('Invalid date format'),
  
  body('endDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid end date format'),
  
  body('location')
    .trim()
    .notEmpty()
    .withMessage('Event location is required'),
  
  body('campus')
    .isMongoId()
    .withMessage('Invalid campus ID'),
  
  body('category')
    .optional()
    .isMongoId()
    .withMessage('Invalid category ID'),
  
  body('recurrence')
    .isIn(['daily', 'weekly', 'monthly', 'yearly'])
    .withMessage('Invalid recurrence type'),
  
  body('recurrenceEndDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid recurrence end date format'),
  
  body('daysOfWeek')
    .optional()
    .isArray()
    .withMessage('Days of week must be an array'),
  
  body('dayOfMonth')
    .optional()
    .isInt({ min: 1, max: 31 })
    .withMessage('Day of month must be between 1 and 31')
];

// Event Template Validation
const createEventTemplate = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Template name is required')
    .isLength({ min: 3, max: 100 })
    .withMessage('Template name must be between 3 and 100 characters'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  
  body('templateData')
    .isObject()
    .withMessage('Template data must be an object'),
  
  body('isPublic')
    .optional()
    .isBoolean()
    .withMessage('isPublic must be a boolean')
];

const createEventFromTemplate = [
  param('templateId')
    .isMongoId()
    .withMessage('Invalid template ID'),
  
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Event title is required')
    .isLength({ min: 3, max: 100 })
    .withMessage('Title must be between 3 and 100 characters'),
  
  body('date')
    .notEmpty()
    .withMessage('Event date is required')
    .isISO8601()
    .withMessage('Invalid date format'),
  
  body('location')
    .trim()
    .notEmpty()
    .withMessage('Event location is required'),
  
  body('campus')
    .isMongoId()
    .withMessage('Invalid campus ID'),
  
  body('customizations')
    .optional()
    .isObject()
    .withMessage('Customizations must be an object')
];

// Event Export Validation
const exportEvents = [
  query('format')
    .isIn(['csv', 'ical'])
    .withMessage('Export format must be csv or ical'),
  
  query('eventIds')
    .optional()
    .custom((value) => {
      if (value) {
        const ids = value.split(',');
        return ids.every(id => /^[0-9a-fA-F]{24}$/.test(id));
      }
      return true;
    })
    .withMessage('Invalid event IDs format'),
  
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid start date format'),
  
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid end date format'),
  
  query('campus')
    .optional()
    .isMongoId()
    .withMessage('Invalid campus ID')
];

// Event Moderation Validation
const reportEvent = [
  body('reason')
    .isIn(['inappropriate', 'spam', 'misleading', 'duplicate', 'other'])
    .withMessage('Invalid report reason'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters')
];

const moderateEvent = [
  body('action')
    .isIn(['hide', 'archive', 'delete'])
    .withMessage('Invalid moderation action'),
  
  body('reason')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Reason cannot exceed 200 characters')
];

// Calendar Integration Validation
const getEventCalendar = [
  param('format')
    .isIn(['google', 'outlook'])
    .withMessage('Calendar format must be google or outlook'),
  
  param('eventId')
    .optional()
    .isMongoId()
    .withMessage('Invalid event ID'),
  
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid start date format'),
  
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid end date format'),
  
  query('campus')
    .optional()
    .isMongoId()
    .withMessage('Invalid campus ID')
];

module.exports = {
  createEvent,
  updateEvent,
  searchEvents,
  getEventAnalytics,
  addEventRating,
  addEventComment,
  toggleEventFavorite,
  bulkEventOperations,
  eventIdParam,
  updateEventCoordinates,
  saveSearch,
  executeSavedSearch,
  createRecurringEvent,
  createEventTemplate,
  createEventFromTemplate,
  exportEvents,
  reportEvent,
  moderateEvent,
  getEventCalendar
};