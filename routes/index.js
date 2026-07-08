const express = require('express');
const router = express.Router();
const Order = require('../models/order');
const { isAuthenticated } = require('../middleware/auth'); 

// Home/shop/cart pages
router.get('/', (req, res) => res.render('index'));

// ✅ Updated cart route with Razorpay Key
router.get('/cart', isAuthenticated, async (req, res) => {
  const latestOrder = await Order.findOne().sort({ _id: -1 });

  res.render('cart', {
    order: latestOrder,
    razorpayKeyId: process.env.RAZORPAY_KEY_ID  
  });
});

module.exports = router;
