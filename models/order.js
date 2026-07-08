const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  name: String,
  qty: Number,
  price: Number,
});

const orderSchema = new mongoose.Schema({
  name: String,
  address: String,
  items: [itemSchema],
  total: Number,
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: {
    type: String,
    enum: ['Placed', 'Pending', 'Completed'],
    default: 'Pending'
  },
  paymentMethod: {
  type: String,
  enum: ['Online', 'COD', 'Pay Later'],
  required: true
  },
  paymentStatus: { 
    type: String,
    enum: ['Pending', 'Paid', 'Failed'],
    default: 'Pending'
  },
  razorpayOrderId: String,
  razorpayPaymentId: String,
  createdAt: { type: Date, default: () => new Date(Date.now() - (Date.now() % 1000)) },
}, { versionKey: false });

module.exports = mongoose.models.Order || mongoose.model('Order', orderSchema);
