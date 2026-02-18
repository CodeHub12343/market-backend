const { validateFile } = require('../middlewares/validationMiddleware');

const fileValidation = {
  // Image uploads
  image: validateFile(
    ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    5 * 1024 * 1024 // 5MB
  ),

  // Document uploads
  document: validateFile(
    ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    10 * 1024 * 1024 // 10MB
  ),

  // Profile picture uploads
  profilePicture: validateFile(
    ['image/jpeg', 'image/png'],
    2 * 1024 * 1024 // 2MB
  ),

  // Product images
  productImages: validateFile(
    ['image/jpeg', 'image/png', 'image/webp'],
    5 * 1024 * 1024 // 5MB
  ),

  // Service attachments
  serviceAttachments: validateFile(
    ['image/jpeg', 'image/png', 'application/pdf'],
    10 * 1024 * 1024 // 10MB
  ),

  // Chat attachments
  chatAttachments: validateFile(
    ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
    5 * 1024 * 1024 // 5MB
  )
};

module.exports = fileValidation;