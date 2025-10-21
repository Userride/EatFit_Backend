const mongoose = require('mongoose');
const { Schema } = mongoose;

const cartItemSchema = new Schema({
  name: { type: String, required: true },
  qty: { type: Number, required: true },
  size: { type: String },
  price: { type: Number, required: true }
}, { _id: false });

const orderSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  cartItems: {
    type: [cartItemSchema],
    required: true
  },
  address: { type: String, required: true },
  paymentMethod: {
    type: String,
    enum: ['Cash on Delivery', 'Credit Card', 'UPI'],
    required: true
  },
  status: {
    type: String,
    enum: ['Order Placed', 'Processing', 'Out for Delivery', 'Delivered', 'Cancelled'],
    default: 'Order Placed'
  }
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
