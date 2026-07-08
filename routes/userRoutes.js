// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/auth');
const Order = require('../models/order');

// Show orders of the logged-in user only
router.get('/orders', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.userId; // Ensure userId is stored in session at login
    const orders = await Order.find({ userId }).sort({ createdAt: -1 });
    res.render('orders', { orders });
  } catch (err) {
    console.error('Error fetching orders:', err);
    res.status(500).send('Something went wrong');
  }
});

module.exports = router;
