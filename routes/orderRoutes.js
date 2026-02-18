// src/routes/orderRoutes.js
const express = require('express');
const orderController = require('../controllers/orderController');
const authMiddleware = require('../middlewares/authMiddleware'); // adjust path

const router = express.Router();

router.use(authMiddleware.protect);

router.get('/', orderController.getMyOrders);
router.get('/:id', orderController.getOrder);
router.patch('/:id/status', authMiddleware.restrictTo('admin', 'seller'), orderController.updateOrderStatus);
router.patch('/:id/confirm-delivery', orderController.confirmDelivery);

// Payment endpoints
router.post('/:id/initialize-payment', orderController.initializePayment);
router.get('/:id/verify-payment', orderController.verifyPayment);

// Webhook - do NOT require auth for webhooks; ensure route is reachable publicly
router.post('/webhook/paystack', orderController.paystackWebhook);

module.exports = router;
