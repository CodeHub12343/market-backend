const mongoose = require('mongoose');

const serviceOrderSchema = new mongoose.Schema(
  {
    service: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service',
      required: [true, 'Service order must belong to a service']
    },
    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Service order must belong to a buyer']
    },
    provider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Service order must have a provider']
    },
    amount: {
      type: Number,
      required: [true, 'Service order must include an amount']
    },
    status: {
      type: String,
      enum: [
        'pending_payment',
        'in_progress',
        'completed',
        'cancelled',
        'refunded'
      ],
      default: 'pending_payment'
    },
    paymentReference: String,
    chatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Chat'
    },
    notes: String,
    deliveryProof: String,
    confirmedAt: Date
  },
  { timestamps: true }
);

serviceOrderSchema.pre(/^find/, function (next) {
  this.populate('service buyer provider', 'title fullName email role campus');
  next();
});

const ServiceOrder = mongoose.model('ServiceOrder', serviceOrderSchema);
module.exports = ServiceOrder;
