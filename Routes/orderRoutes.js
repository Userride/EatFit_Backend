const express = require('express');
const router = express.Router();
const Order = require('../models/orderModel'); // Assuming you have an Order model

// POST route to create an order
router.post('/createOrder', async (req, res) => {
  const { userId, cartItems, address, paymentMethod } = req.body;

  // Validate incoming data
  if (!userId || !cartItems || !address || !paymentMethod) {
    console.error("Missing required fields:", { userId, cartItems, address, paymentMethod });
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    // Create a new order object
    const newOrder = new Order({
      userId,
      cartItems,
      address,
      paymentMethod,
      status: 'Pending',  // You can set an initial status for the order
      createdAt: new Date(),
    });

    // Save the order to the database
    await newOrder.save();
    console.log('Order created successfully:', newOrder);

    // Send back a success response
    res.status(201).json({
      message: 'Order created successfully',
      orderId: newOrder._id,
    });
  } catch (err) {
    // Enhanced error logging
    console.error('Error creating order:', err);
    res.status(500).json({ message: 'Error creating order', error: err.message });
  }
});

module.exports = router;
