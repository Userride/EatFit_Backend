const express = require('express');
const router = express.Router();
const Order = require('../models/orderModel');

/* ============================================================
   ✅ CREATE ORDER + AUTO STATUS UPDATE SIMULATION
   ============================================================ */
router.post('/createOrder', async (req, res) => {
  const { userId, cartItems, address, paymentMethod } = req.body;

  if (!userId || !cartItems || !address || !paymentMethod) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    // 1️⃣ Create new order
    const newOrder = new Order({ userId, cartItems, address, paymentMethod });
    await newOrder.save();

    console.log('✅ New order created:', newOrder._id);
    res.status(201).json({ message: 'Order created successfully', orderId: newOrder._id });

    // 2️⃣ Get socket instance
    const io = req.app.get('io');

    // 3️⃣ Simulate order tracking
    const statusFlow = ['Order Placed', 'Processing', 'Out for Delivery', 'Delivered'];
    let step = 1;

    const interval = setInterval(async () => {
      if (step >= statusFlow.length) {
        clearInterval(interval);
        return;
      }

      const newStatus = statusFlow[step];

      // 4️⃣ Update in DB
      await Order.findByIdAndUpdate(newOrder._id, { status: newStatus }, { new: true });

      console.log(`🚚 Order ${newOrder._id} → ${newStatus}`);

      // 5️⃣ Emit live update
      if (io) {
        io.to(newOrder._id.toString()).emit('orderStatusUpdate', {
          orderId: newOrder._id.toString(),
          status: newStatus,
        });
      }

      step++;
    }, 5000); // ⏱ updates every 5 seconds
  } catch (err) {
    console.error('❌ Error creating order:', err);
    res.status(500).json({ message: 'Error creating order', error: err.message });
  }
});

/* ============================================================
   ✅ UPDATE STATUS (MANUAL ADMIN CONTROL)
   ============================================================ */
router.post('/updateStatus/:id', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) return res.status(400).json({ message: 'Status is required' });

  try {
    const updatedOrder = await Order.findByIdAndUpdate(id, { status }, { new: true });
    if (!updatedOrder) return res.status(404).json({ message: 'Order not found' });

    const io = req.app.get('io');
    if (io) io.to(id).emit('orderStatusUpdate', { orderId: id, status });

    console.log(`🟡 Order ${id} manually updated → ${status}`);
    res.json({ message: 'Status updated', order: updatedOrder });
  } catch (err) {
    console.error('❌ Error updating status:', err);
    res.status(500).json({ message: 'Error updating status', error: err.message });
  }
});

/* ============================================================
   ✅ GET ALL ORDERS FOR A USER  (⚠️ MUST BE ABOVE "/:id")
   ============================================================ */
router.get('/myOrders/:userId', async (req, res) => {
  const { userId } = req.params;

  if (!userId) return res.status(400).json({ message: 'User ID is required' });

  try {
    const orders = await Order.find({ userId }).sort({ createdAt: -1 });
    console.log(`📦 Found ${orders.length} orders for user ${userId}`);
    res.json({ orders });
  } catch (err) {
    console.error('❌ Error fetching user orders:', err);
    res.status(500).json({ message: 'Error fetching orders', error: err.message });
  }
});

/* ============================================================
   ✅ GET SPECIFIC ORDER BY ID (SECURED)
   ============================================================ */
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
    console.error('❌ Error fetching order by ID:', err.message);
    res.status(500).json({ message: 'Error fetching order', error: err.message });
  }
});

module.exports = router;
