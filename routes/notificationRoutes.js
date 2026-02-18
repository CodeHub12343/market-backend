const express = require('express');
const notificationController = require('../controllers/notificationController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(authMiddleware.protect);

router
  .route('/')
  .get(notificationController.getMyNotifications)
  .post(notificationController.createNotification);

router.patch('/:id/read', notificationController.markAsRead);

module.exports = router;
