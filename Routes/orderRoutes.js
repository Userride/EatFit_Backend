const express = require('express');
const router = express.Router();
const Order = require('../models/orderModel');

// 🧾 Create order
router.post('/createOrder', async (req, res) => {
  const { userId, cartItems, address, paymentMethod } = req.body;

  if (!userId || !cartItems || !address || !paymentMethod) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    const newOrder = new Order({ userId, cartItems, address, paymentMethod });
    await newOrder.save();

    console.log('✅ New order created:', newOrder._id);

    res.status(201).json({
      message: 'Order created successfully',
      orderId: newOrder._id
    });
  } catch (err) {
    console.error('❌ Error creating order:', err);
    res.status(500).json({ message: 'Error creating order', error: err.message });
  }
});

// 🔄 Update order status + emit event
router.post('/updateStatus/:id', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) return res.status(400).json({ message: 'Status is required' });

  try {
    const updatedOrder = await Order.findByIdAndUpdate(
      id, { status }, { new: true }
    );

    if (!updatedOrder) return res.status(404).json({ message: 'Order not found' });

    const io = req.app.get('io');
    io.to(id).emit('orderStatusUpdate', { orderId: id, status }); // ✅ Event name fixed

    console.log(`🚚 Order ${id} status updated to: ${status}`);

    res.json({ message: 'Status updated', order: updatedOrder });
  } catch (err) {
    res.status(500).json({ message: 'Error updating status', error: err.message });
  }
});


// GET single order
router.get('/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id); // Tries to find '68f5345f4a82ca4c15b2555c'
    if (!order) return res.status(404).json({ message: 'Order not found' }); // <-- THIS IS YOUR 404
    res.json({ order });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching order', error: err.message });
  }
});

module.exports = router;
