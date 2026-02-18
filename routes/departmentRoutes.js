const express = require('express');
const departmentController = require('../controllers/departmentController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

const router = express.Router();

// Public routes
router.get('/', departmentController.getAllDepartments);
router.get('/search', departmentController.searchDepartments);
router.get('/faculty/:facultyId', departmentController.getDepartmentsByFaculty);
router.get('/:id', departmentController.getDepartment);
router.get('/:departmentId/stats', departmentController.getDepartmentStats);

// Protected routes - admin only
router.use(authMiddleware.protect, roleMiddleware.restrictTo('admin'));

router.post('/', departmentController.createDepartment);
router.patch('/:id', departmentController.updateDepartment);
router.delete('/:id', departmentController.deleteDepartment);

module.exports = router;
