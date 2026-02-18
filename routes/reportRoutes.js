const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const authMiddleware = require('../middlewares/authMiddleware');

// Protect all routes after this middleware
router.use(authMiddleware.protect);

// Regular report routes
router
  .route('/')
  .get(authMiddleware.restrictTo('admin'), reportController.getAllReports)
  .post(reportController.createReport);

router
  .route('/my-reports')
  .get(reportController.getMyReports);

// Get reports for a specific target type and id
router
  .route('/target/:targetType/:targetId')
  .get(authMiddleware.restrictTo('admin'), reportController.getReportsForTarget);

router
  .route('/:id')
  .get(reportController.getReport)
  .patch(authMiddleware.restrictTo('admin'), reportController.updateReport)
  .delete(authMiddleware.restrictTo('admin'), reportController.deleteReport);

module.exports = router;
