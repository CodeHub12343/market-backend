const express = require('express');
const documentController = require('../controllers/documentController');
const authMiddleware = require('../middlewares/authMiddleware');
const {
  validateDocumentUpload,
  validateAcademicLevel,
  validateSemester,
  validateCategory,
  validateFacultyQuery,
  validateDepartmentQuery
} = require('../middlewares/uploadValidationMiddleware');

const router = express.Router();

// Public routes - list and search
router.get('/', validateFacultyQuery, validateDepartmentQuery, documentController.getAllDocuments);
router.get('/search', documentController.searchDocuments);

// Trending and analytics
router.get('/trending', documentController.getTrendingDocuments);
router.get('/analytics', documentController.getDocumentAnalytics);

// Filter by faculty
router.get('/faculty/:facultyId', documentController.getDocumentsByFaculty);

// Filter by department
router.get('/department/:departmentId', documentController.getDocumentsByDepartment);

// Filter by academic level
router.get('/level/:level', validateAcademicLevel, documentController.getDocumentsByAcademicLevel);

// Filter by course
router.get('/course/:courseCode', documentController.getDocumentsByCourse);

// Filter by semester
router.get('/semester/:semester', validateSemester, documentController.getDocumentsBySemester);

// Get single document (must come after specific routes to avoid conflicts)
router.get('/:id', documentController.getDocument);

// Protected routes - create, update, delete
router
  .route('/')
  .post(
    authMiddleware.protect,
    documentController.uploadDocumentFile,
    validateDocumentUpload,
    documentController.createDocument
  );

router
  .route('/:id')
  .patch(authMiddleware.protect, documentController.updateDocument)
  .delete(authMiddleware.protect, documentController.deleteDocument);

module.exports = router;

