const express = require('express');
const router = express.Router();
const Order = require('../models/orderModel');

// ✅ Create order + auto status update flow
router.post('/createOrder', async (req, res) => {
  const { userId, cartItems, address, paymentMethod } = req.body;

  if (!userId || !cartItems || !address || !paymentMethod) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    const newOrder = new Order({ userId, cartItems, address, paymentMethod });
    await newOrder.save();

    console.log('✅ New order created:', newOrder._id);
    res.status(201).json({ message: 'Order created successfully', orderId: newOrder._id });

    // ✅ Real-time order status simulation (auto update every 5s)
    const io = req.app.get('io');
    const statusFlow = ['Order Placed', 'Processing', 'Out for Delivery', 'Delivered'];
    let step = 1;

    const interval = setInterval(async () => {
      if (step >= statusFlow.length) {
        clearInterval(interval);
        return;
      }

      const newStatus = statusFlow[step];
      const updatedOrder = await Order.findByIdAndUpdate(
        newOrder._id,
        { status: newStatus },
        { new: true }
      );

      console.log(`🚚 Order ${newOrder._id} → ${newStatus}`);

      if (io) {
        io.to(newOrder._id.toString()).emit('orderStatusUpdate', {
          orderId: newOrder._id.toString(),
          status: newStatus,
        });
      }

      step++;
    }, 5000); // ⏱ every 5 seconds
  } catch (err) {
    console.error('❌ Error creating order:', err);
    res.status(500).json({ message: 'Error creating order', error: err.message });
  }
});

// ✅ Manual status update (if needed)
router.post('/updateStatus/:id', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!status) return res.status(400).json({ message: 'Status is required' });

  try {
    const updatedOrder = await Order.findByIdAndUpdate(id, { status }, { new: true });
    if (!updatedOrder) return res.status(404).json({ message: 'Order not found' });

    const io = req.app.get('io');
    if (io) io.to(id).emit('orderStatusUpdate', { orderId: id, status });

    console.log(`🚚 Order ${id} manually updated to: ${status}`);
    res.json({ message: 'Status updated', order: updatedOrder });
  } catch (err) {
    res.status(500).json({ message: 'Error updating status', error: err.message });
  }
});

// ✅ Get specific order (secured)
router.get('/:id', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(401).json({ message: 'Authentication required.' });

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    if (order.userId.toString() !== userId) {
      return res.status(403).json({ message: 'Not authorized to view this order.' });
    }

    res.json({ order });
  } catch (err) {
    console.error('Error fetching order:', err.message);
    res.status(500).json({ message: 'Error fetching order', error: err.message });
  }
});

// ✅ Get all user orders
router.get('/myOrders/:userId', async (req, res) => {
  const { userId } = req.params;
  if (!userId) return res.status(400).json({ message: 'User ID required' });

  try {
    const orders = await Order.find({ userId }).sort({ createdAt: -1 });
    res.json({ orders });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching orders', error: err.message });
  }
});

module.exports = router;
