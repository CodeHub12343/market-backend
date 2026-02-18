const express = require('express');
const authMiddleware = require('../middlewares/authMiddleware');
const serviceOrderController = require('../controllers/serviceOrderController');

const router = express.Router();

router.use(authMiddleware.protect);

router.post('/', serviceOrderController.createServiceOrder);
router.get('/verify-payment', serviceOrderController.verifyPayment);
router.get('/my-orders', serviceOrderController.getMyServiceOrders);
router.post('/:id/confirm-delivery', serviceOrderController.confirmDelivery);

module.exports = router;
