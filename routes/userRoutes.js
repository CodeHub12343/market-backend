// src/routes/uploadRoutes.js
const express = require('express');
const { getCloudinarySignature } = require('../controllers/uploadController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

const userController = require('../controllers/userController');
const authMiddleware = require('../middlewares/authMiddleware');

// Public: create user & delete user
router.post('/', userController.create);
router.delete('/:id', userController.delete);

// Protected routes
router.use(authMiddleware.protect);
router.get('/', userController.getAll);
router.get('/:id', userController.get);
router.patch('/:id', userController.update);

module.exports = router;