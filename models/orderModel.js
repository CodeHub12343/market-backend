// src/models/orderModel.js
const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema(
  {
    offer: { type: mongoose.Schema.Types.ObjectId, ref: 'Offer', required: true },
    buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    amount: { type: Number, required: true },
    qty: { type: Number, default: 1 },
    status: {
      type: String,
      enum: ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'],
      default: 'pending'
    },
    isPaid: { type: Boolean, default: false },
    paymentGateway: { type: String, enum: ['paystack', 'none'], default: 'none' },
    paymentRef: String,
    paymentMeta: mongoose.Schema.Types.Mixed,
    deliveredAt: Date,
    payoutStatus: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending'
    }
  },
  { timestamps: true }
);

orderSchema.pre(/^find/, function (next) {
  this.populate('buyer', 'fullName email campus')
    .populate('seller', 'fullName email campus')
    .populate('product', 'name price images');
  next();
});

const Order = mongoose.model('Order', orderSchema);
module.exports = Order;

