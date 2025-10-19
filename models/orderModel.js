const mongoose = require('mongoose');
const { Schema } = mongoose; // Destructuring Schema for cleaner code

// 1. Define the sub-schema for items in the cart
const cartItemSchema = new Schema({
  name: { type: String, required: true },
  qty: { type: Number, required: true },
  size: { type: String, required: true }, // Or false if not all items have size
  price: { type: Number, required: true },
  // You could also link to a product ID
  // productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true }
}, { _id: false }); // _id: false stops Mongoose from adding an _id to sub-documents

const orderSchema = new Schema({
  // 2. Link to the User model
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User', // The name of your User model
    required: true
  },

  // 3. Use the defined sub-schema for the array
  cartItems: {
    type: [cartItemSchema],
    required: true
  },

  address: {
    type: String,
    required: true
  },

  // 4. Use an 'enum' for paymentMethod
  paymentMethod: {
    type: String,
    enum: ['Cash on Delivery', 'Credit Card', 'UPI'], // Add your allowed methods
    required: true
  },

  // 5. Use an 'enum' for status
  status: {
    type: String,
    enum: ['Order Placed', 'Processing', 'Out for Delivery', 'Delivered', 'Cancelled'],
    default: 'Order Placed'
  }
}, {
  // timestamps is great! This adds createdAt and updatedAt
  timestamps: true
});

module.exports = mongoose.model('Order', orderSchema);
