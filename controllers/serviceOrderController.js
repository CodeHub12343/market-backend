const ServiceOrder = require('../models/serviceOrderModel');
const Service = require('../models/serviceModel');
const Chat = require('../models/chatModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const axios = require('axios');

// Helper for Paystack
const PAYSTACK_BASE = 'https://api.paystack.co';
const headers = {
  Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
  'Content-Type': 'application/json'
};

// Create new service order
exports.createServiceOrder = catchAsync(async (req, res, next) => {
  const { serviceId, notes } = req.body;

  const service = await Service.findById(serviceId).populate('provider');
  if (!service) return next(new AppError('Service not found', 404));
  if (service.provider._id.toString() === req.user.id)
    return next(new AppError('You cannot order your own service', 400));

  const amount = service.price;
  const buyer = req.user.id;
  const provider = service.provider._id;

  // Create chat room between buyer & provider if not exists
  let chat = await Chat.findOne({ participants: { $all: [buyer, provider] } });
  if (!chat) chat = await Chat.create({ participants: [buyer, provider] });

  const order = await ServiceOrder.create({
    service: serviceId,
    buyer,
    provider,
    amount,
    chatId: chat._id,
    notes
  });

  // Initialize Paystack transaction
  const response = await axios.post(
    `${PAYSTACK_BASE}/transaction/initialize`,
    {
      email: req.user.email,
      amount: amount * 100, // convert to kobo
      metadata: { orderId: order._id }
    },
    { headers }
  );

  order.paymentReference = response.data.data.reference;
  await order.save();

  res.status(201).json({
    status: 'success',
    data: {
      order,
      authorization_url: response.data.data.authorization_url
    }
  });
});

// Verify payment webhook (Paystack)
exports.verifyPayment = catchAsync(async (req, res, next) => {
  const { reference } = req.query;
  const verify = await axios.get(`${PAYSTACK_BASE}/transaction/verify/${reference}`, { headers });

  if (verify.data.data.status === 'success') {
    const order = await ServiceOrder.findOneAndUpdate(
      { paymentReference: reference },
      { status: 'in_progress' },
      { new: true }
    );
    return res.status(200).json({ status: 'success', data: { order } });
  }

  next(new AppError('Payment verification failed', 400));
});

// Confirm delivery and trigger payout
exports.confirmDelivery = catchAsync(async (req, res, next) => {
  const order = await ServiceOrder.findById(req.params.id);
  if (!order) return next(new AppError('Order not found', 404));
  if (order.buyer._id.toString() !== req.user.id)
    return next(new AppError('Not authorized', 403));
  if (order.status !== 'in_progress')
    return next(new AppError('Order not ready for confirmation', 400));

  // Pay provider using Paystack Transfer (simplified)
  const transfer = await axios.post(
    `${PAYSTACK_BASE}/transfer`,
    {
      source: 'balance',
      amount: order.amount * 100,
      recipient: order.provider.paystackRecipientCode, // stored on user profile
      reason: `Payment for service: ${order.service.title}`
    },
    { headers }
  );

  order.status = 'completed';
  order.confirmedAt = Date.now();
  await order.save();

  res.status(200).json({ status: 'success', data: { order, transfer: transfer.data.data } });
});

// Get orders (buyer or provider)
exports.getMyServiceOrders = catchAsync(async (req, res) => {
  const role = req.user.role;
  const filter = role === 'service_provider' ? { provider: req.user.id } : { buyer: req.user.id };
  const orders = await ServiceOrder.find(filter).sort('-createdAt');
  res.status(200).json({ status: 'success', results: orders.length, data: orders });
});
