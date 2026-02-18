const express = require('express');
const facultyController = require('../controllers/facultyController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

const router = express.Router();

// Public routes
router.get('/', facultyController.getAllFaculties);
router.get('/search', facultyController.searchFaculties);
router.get('/:id', facultyController.getFaculty);
router.get('/:facultyId/stats', facultyController.getFacultyStats);

// Protected routes - admin only
router.use(authMiddleware.protect, roleMiddleware.restrictTo('admin'));

router.post('/', facultyController.createFaculty);
router.patch('/:id', facultyController.updateFaculty);
router.delete('/:id', facultyController.deleteFaculty);

module.exports = router;
