const { body, param, query } = require('express-validator');
const { validate } = require('../middlewares/validationMiddleware');

const serviceValidation = {
  create: [
    body('title')
      .trim()
      .isLength({ min: 3, max: 100 })
      .withMessage('Service title must be between 3 and 100 characters')
      .matches(/^[a-zA-Z0-9\s\-&.,'"]+$/)
      .withMessage('Service title contains invalid characters'),
    
    body('description')
      .trim()
      .isLength({ min: 10, max: 1000 })
      .withMessage('Description must be between 10 and 1000 characters'),
    
    body('price')
      .isFloat({ min: 0 })
      .withMessage('Price must be a positive number'),
    
    body('category')
      .optional()
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Category must be between 2 and 50 characters'),
    
    body('tags')
      .optional()
      .isArray({ max: 10 })
      .withMessage('Tags must be an array with maximum 10 items'),
    
    body('tags.*')
      .optional()
      .trim()
      .isLength({ min: 2, max: 20 })
      .withMessage('Each tag must be 2-20 characters'),
    
    body('duration')
      .optional()
      .isInt({ min: 1, max: 1440 })
      .withMessage('Duration must be between 1 and 1440 minutes'),
    
    body('maxBookings')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Max bookings must be between 1 and 100'),
    
    body('location')
      .optional()
      .isObject()
      .withMessage('Location must be an object'),
    
    body('location.coordinates')
      .optional()
      .isArray({ min: 2, max: 2 })
      .withMessage('Coordinates must be an array of [longitude, latitude]'),
    
    body('location.coordinates.*')
      .optional()
      .isFloat()
      .withMessage('Coordinates must be valid numbers'),
    
    body('location.address')
      .optional()
      .trim()
      .isLength({ max: 200 })
      .withMessage('Address cannot exceed 200 characters'),
    
    body('availability')
      .optional()
      .isObject()
      .withMessage('Availability must be an object'),
    
    body('availability.days')
      .optional()
      .isArray({ min: 1, max: 7 })
      .withMessage('Availability days must be an array of 1-7 days'),
    
    body('availability.days.*')
      .optional()
      .isIn(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])
      .withMessage('Invalid day name'),
    
    body('availability.startTime')
      .optional()
      .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
      .withMessage('Start time must be in HH:MM format'),
    
    body('availability.endTime')
      .optional()
      .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
      .withMessage('End time must be in HH:MM format'),
    
    body('bookingType')
      .optional()
      .isIn(['on-demand', 'available', 'by-appointment'])
      .withMessage('Booking type must be one of: on-demand, available, by-appointment'),
    
    body('maxBookings')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Max bookings must be between 1 and 100'),
    
    body('settings.allowInstantBooking')
      .optional()
      .isBoolean()
      .withMessage('Allow instant booking must be a boolean value'),
    
    body('settings.requireApproval')
      .optional()
      .isBoolean()
      .withMessage('Require approval must be a boolean value'),
    
    body('settings.cancellationPolicy')
      .optional()
      .isIn(['flexible', 'moderate', 'strict'])
      .withMessage('Cancellation policy must be one of: flexible, moderate, strict'),
    
    validate
  ],

  update: [
    body('title')
      .optional()
      .trim()
      .isLength({ min: 3, max: 100 })
      .withMessage('Service title must be between 3 and 100 characters')
      .matches(/^[a-zA-Z0-9\s\-&.,'"]+$/)
      .withMessage('Service title contains invalid characters'),
    
    body('description')
      .optional()
      .trim()
      .isLength({ min: 10, max: 1000 })
      .withMessage('Description must be between 10 and 1000 characters'),
    
    body('price')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Price must be a positive number'),
    
    body('category')
      .optional()
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Category must be between 2 and 50 characters'),
    
    body('tags')
      .optional()
      .isArray({ max: 10 })
      .withMessage('Tags must be an array with maximum 10 items'),
    
    body('tags.*')
      .optional()
      .trim()
      .isLength({ min: 2, max: 20 })
      .withMessage('Each tag must be 2-20 characters'),
    
    body('status')
      .optional()
      .isIn(['active', 'inactive', 'suspended', 'completed'])
      .withMessage('Status must be active, inactive, suspended, or completed'),
    
    body('duration')
      .optional()
      .isInt({ min: 1, max: 1440 })
      .withMessage('Duration must be between 1 and 1440 minutes'),
    
    body('maxBookings')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Max bookings must be between 1 and 100'),
    
    body('location')
      .optional()
      .isObject()
      .withMessage('Location must be an object'),
    
    body('location.coordinates')
      .optional()
      .isArray({ min: 2, max: 2 })
      .withMessage('Coordinates must be an array of [longitude, latitude]'),
    
    body('location.coordinates.*')
      .optional()
      .isFloat()
      .withMessage('Coordinates must be valid numbers'),
    
    body('location.address')
      .optional()
      .trim()
      .isLength({ max: 200 })
      .withMessage('Address cannot exceed 200 characters'),
    
    body('availability')
      .optional()
      .isObject()
      .withMessage('Availability must be an object'),
    
    body('availability.days')
      .optional()
      .isArray({ min: 1, max: 7 })
      .withMessage('Availability days must be an array of 1-7 days'),
    
    body('availability.days.*')
      .optional()
      .isIn(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])
      .withMessage('Invalid day name'),
    
    body('availability.startTime')
      .optional()
      .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
      .withMessage('Start time must be in HH:MM format'),
    
    body('availability.endTime')
      .optional()
      .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
      .withMessage('End time must be in HH:MM format'),
    
    body('bookingType')
      .optional()
      .isIn(['on-demand', 'available', 'by-appointment'])
      .withMessage('Booking type must be one of: on-demand, available, by-appointment'),
    
    body('maxBookings')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Max bookings must be between 1 and 100'),
    
    body('settings.allowInstantBooking')
      .optional()
      .isBoolean()
      .withMessage('Allow instant booking must be a boolean value'),
    
    body('settings.requireApproval')
      .optional()
      .isBoolean()
      .withMessage('Require approval must be a boolean value'),
    
    body('settings.cancellationPolicy')
      .optional()
      .isIn(['flexible', 'moderate', 'strict'])
      .withMessage('Cancellation policy must be one of: flexible, moderate, strict'),
    
    validate
  ],

  search: [
    query('q')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Search query must be between 1 and 100 characters'),
    
    query('category')
      .optional()
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Category must be between 2 and 50 characters'),
    
    query('minPrice')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Min price must be a positive number'),
    
    query('maxPrice')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Max price must be a positive number'),
    
    query('rating')
      .optional()
      .isFloat({ min: 1, max: 5 })
      .withMessage('Rating must be between 1 and 5'),
    
    query('campus')
      .optional()
      .isMongoId()
      .withMessage('Invalid campus ID'),
    
    query('sort')
      .optional()
      .isIn(['price', '-price', 'rating', '-rating', 'createdAt', '-createdAt', 'title', '-title'])
      .withMessage('Invalid sort field'),
    
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    
    validate
  ]
};

module.exports = serviceValidation;