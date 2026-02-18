const express = require('express');
const activityController = require('../controllers/activityController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

router
  .route('/')
  .get(activityController.getAllActivities)
  .post(authMiddleware.protect, activityController.createActivity);

router
  .route('/:id')
  .get(activityController.getActivity)
  .patch(authMiddleware.protect, activityController.updateActivity)
  .delete(authMiddleware.protect, activityController.deleteActivity);

module.exports = router;
