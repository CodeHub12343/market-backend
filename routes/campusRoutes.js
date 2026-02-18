const express = require('express');
const campusController = require('../controllers/campusController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// Public routes
router.get('/', campusController.getAllCampuses);
router.get('/:id', campusController.getCampus);

// Protected admin routes
router.use(authMiddleware.protect);
router.use(authMiddleware.restrictTo('admin'));

router.post('/', campusController.createCampus);
router.patch('/:id', campusController.updateCampus);
router.delete('/:id', campusController.deleteCampus);

module.exports = router;
