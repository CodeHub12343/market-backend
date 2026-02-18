const { body } = require('express-validator');
const { commonValidations } = require('../middlewares/validationMiddleware');

const authValidation = {
  signup: [
    commonValidations.email(),
    commonValidations.password(),
    body('fullName')
      .trim()
      .isLength({ min: 2, max: 100 })
      .matches(/^[a-zA-Z\s-]+$/)
      .withMessage('Full name must be between 2 and 100 characters and contain only letters, spaces, and hyphens'),
    body('passwordConfirm')
      .notEmpty()
      .custom((value, { req }) => {
        if (value !== req.body.password) {
          throw new Error('Passwords do not match');
        }
        return true;
      }),
    body('campus')
      .notEmpty()
      .isMongoId()
      .withMessage('Invalid campus ID'),
    body('role')
      .optional()
      .isIn(['buyer', 'seller', 'service_provider', 'admin'])
      .withMessage('Invalid role specified')
  ],

  login: [
    body('email').trim().isEmail().withMessage('Please provide a valid email'),
    body('password').notEmpty().withMessage('Password is required')
  ],

  forgotPassword: [
    commonValidations.email()
  ],

  resetPassword: [
    body('token').notEmpty().withMessage('Token is required'),
    commonValidations.password(),
    body('passwordConfirm')
      .notEmpty()
      .custom((value, { req }) => {
        if (value !== req.body.password) {
          throw new Error('Passwords do not match');
        }
        return true;
      })
  ],

  updatePassword: [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    commonValidations.password(),
    body('passwordConfirm')
      .notEmpty()
      .custom((value, { req }) => {
        if (value !== req.body.password) {
          throw new Error('Passwords do not match');
        }
        return true;
      })
  ]
};

module.exports = authValidation;