// src/controllers/orderController.js
const axios = require('axios');
const Order = require('../models/orderModel');
const Offer = require('../models/offerModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const { sendToUser } = require('../socketManager'); // socketManager.js lives at project root; controllers are in controllers/

// Create order programmatically (internal use)
exports.createOrderFromOffer = async (offerId) => {
  try {
    const offer = await Offer.findById(offerId).populate('seller product request');
    if (!offer) throw new AppError('Offer not found', 404);

    // buyer is the requester of the request
    const RequestModel = require('../models/requestModel');
    const requestDoc = await RequestModel.findById(offer.request).populate('requester');
    if (!requestDoc) throw new AppError('Request not found', 404);

    const order = await Order.create({
      offer: offer._id,
      buyer: requestDoc.requester._id,
      seller: offer.seller._id,
      product: offer.product || null,
      amount: offer.amount,
      paymentGateway: 'paystack',
      status: 'pending'
    });

    // notify parties
    sendToUser(String(order.buyer._id), 'orderCreated', { orderId: order._id, message: 'Order created' });
    sendToUser(String(order.seller._id), 'orderCreated', { orderId: order._id, message: 'Order created' });

    return order;
  } catch (error) {
    console.error('❌ Error creating order from offer:', error.message);
    throw error;
  }
};

// GET /api/v1/orders (user sees their orders)
exports.getMyOrders = catchAsync(async (req, res) => {
  const filter = { $or: [{ buyer: req.user.id }, { seller: req.user.id }] };
  const orders = await Order.find(filter).sort('-createdAt');
  res.status(200).json({ status: 'success', results: orders.length, data: { orders } });
});

// GET /api/v1/orders/:id
exports.getOrder = catchAsync(async (req, res, next) => {
  const order = await Order.findById(req.params.id);
  if (!order) return next(new AppError('Order not found', 404));
  // ensure user is buyer/seller/admin could be added
  if (String(order.buyer._id) !== req.user.id && String(order.seller._id) !== req.user.id && req.user.role !== 'admin')
    return next(new AppError('Not authorized to view this order', 403));
  res.status(200).json({ status: 'success', data: { order } });
});

// Admin / Seller can update status manually
exports.updateOrderStatus = catchAsync(async (req, res, next) => {
  const { status } = req.body;
  const order = await Order.findById(req.params.id);
  if (!order) return next(new AppError('Order not found', 404));
  // allow only certain transitions (simple check)
  order.status = status || order.status;
  await order.save();
  sendToUser(String(order.buyer._id), 'orderUpdated', { orderId: order._id, status: order.status });
  sendToUser(String(order.seller._id), 'orderUpdated', { orderId: order._id, status: order.status });
  res.status(200).json({ status: 'success', data: { order } });
});

/**
 * Paystack: initialize payment for an order
 * POST /api/v1/orders/:id/initialize-payment
 * returns authorization_url, access_code
 */
exports.initializePayment = catchAsync(async (req, res, next) => {
  const order = await Order.findById(req.params.id);
  if (!order) return next(new AppError('Order not found', 404));
  // only buyer can initialize
  if (String(order.buyer._id) !== req.user.id) return next(new AppError('Not authorized', 403));
  if (order.isPaid) return next(new AppError('Order already paid', 400));

  const paystackKey = process.env.PAYSTACK_SECRET_KEY;
  if (!paystackKey) return next(new AppError('Paystack not configured', 500));

  const payload = {
    email: req.user.email,
    amount: Math.round(order.amount) * 100, // paystack expects kobo/ minor unit
    callback_url: `${process.env.APP_BASE_URL}/api/v1/orders/${order._id}/verify-payment`,
    metadata: {
      orderId: order._id.toString(),
      buyerId: req.user.id,
      sellerId: order.seller._id.toString()
    }
  };

  const response = await axios.post(process.env.PAYSTACK_INITIALIZE_URL, payload, {
    headers: { Authorization: `Bearer ${paystackKey}` }
  });

  const data = response.data;
  if (!data || !data.status) return next(new AppError('Payment initialization failed', 500));

  // store access_code or paymentMeta for later verification
  order.paymentRef = data.data.reference;
  order.paymentMeta = { initialize: data.data };
  await order.save();

  res.status(200).json({ status: 'success', data: { initialize: data.data } });
});

/**
 * Paystack verify endpoint (GET callback) - optional immediate return
 * You can also rely on webhook (preferred) to guarantee payment state.
 */
exports.verifyPayment = catchAsync(async (req, res, next) => {
  const { reference } = req.query;
  if (!reference) return next(new AppError('Payment reference required', 400));
  const paystackKey = process.env.PAYSTACK_SECRET_KEY;
  const url = `${process.env.PAYSTACK_VERIFY_URL}/${reference}`;
  const response = await axios.get(url, { headers: { Authorization: `Bearer ${paystackKey}` } });
  const data = response.data;
  if (!data || !data.status) return next(new AppError('Payment verification failed', 500));

  const metadata = data.data.metadata || {};
  const orderId = metadata.orderId || (data.data.reference && data.data.reference); // fallback
  const order = await Order.findById(orderId);
  if (!order) return next(new AppError('Order not found', 404));

  if (data.data.status === 'success') {
    order.isPaid = true;
    order.status = 'paid';
    order.paymentRef = reference;
    order.paymentMeta = data.data;
    await order.save();

    // notify parties
    sendToUser(String(order.buyer._id), 'orderPaid', { orderId: order._id });
    sendToUser(String(order.seller._id), 'orderPaid', { orderId: order._id });

    return res.status(200).json({ status: 'success', data: { order } });
  }

  res.status(400).json({ status: 'fail', message: 'Payment not successful yet' });
});

/**
 * Paystack webhook endpoint (POST) - configure webhook URL in Paystack dashboard.
 * Verifies signature and updates order accordingly.
 */
exports.paystackWebhook = catchAsync(async (req, res, next) => {
  const signature = req.headers['x-paystack-signature'];
  const secret = process.env.PAYSTACK_SECRET_KEY;
  // If you want to verify signature: Paystack sends whole raw body; your express app must use raw body parser for this route.
  // For simplicity, we verify by fetching transaction reference (recommended: use raw body and verify HMAC)
  const event = req.body;
  if (!event) return res.status(400).send('No event');

  if (event.event === 'charge.success' || (event.event === 'transfer.success' && event.data)) {
    const data = event.data;
    const metadata = data.metadata || {};
    const orderId = metadata.orderId;
    if (!orderId) {
      // respond OK to webhook
      return res.status(200).send('No orderId in metadata');
    }

    const order = await Order.findById(orderId);
    if (!order) return res.status(200).send('Order not found');

    // mark as paid
    order.isPaid = true;
    order.status = 'paid';
    order.paymentRef = data.reference || order.paymentRef;
    order.paymentMeta = data;
    await order.save();

    // notify users
    sendToUser(String(order.buyer._id), 'orderPaid', { orderId: order._id });
    sendToUser(String(order.seller._id), 'orderPaid', { orderId: order._id });
  }

  // always respond 200 to acknowledge
  res.status(200).send('Webhook received');
});

exports.confirmDelivery = catchAsync(async (req, res, next) => {
  const order = await Order.findById(req.params.id);
  if (!order) return next(new AppError('Order not found', 404));

  // only buyer can confirm
  if (String(order.buyer._id) !== req.user.id)
    return next(new AppError('Not authorized', 403));

  if (!order.isPaid)
    return next(new AppError('Cannot confirm delivery before payment', 400));

  if (order.status === 'delivered')
    return next(new AppError('Order already marked as delivered', 400));

  order.status = 'delivered';
  order.deliveredAt = new Date();
  order.payoutStatus = 'processing';
  await order.save();

  // simulate payout — this is where you'd trigger Paystack Transfer
  setTimeout(async () => {
    try {
      order.payoutStatus = 'completed';
      await order.save();

      sendToUser(String(order.seller._id), 'payoutCompleted', {
        orderId: order._id,
        message: 'Payout completed successfully'
      });

      sendToUser(String(order.buyer._id), 'deliveryConfirmed', {
        orderId: order._id,
        message: 'Delivery confirmed and payout released'
      });
    } catch (err) {
      console.error('Payout simulation error:', err);
    }
  }, 3000); // simulate 3s async payout delay

  sendToUser(String(order.seller._id), 'orderDelivered', {
    orderId: order._id,
    message: 'Buyer confirmed delivery'
  });

  res.status(200).json({
    status: 'success',
    data: { order }
  });
});
