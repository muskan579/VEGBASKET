const express = require('express');
const router = express.Router();
const Order = require('../models/order');
const { isAuthenticated } = require('../middleware/auth');
const Razorpay = require("razorpay");
const crypto = require("crypto");

// Razorpay setup
const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// ✅ 1. COD Order 
router.post('/checkout', isAuthenticated, async (req, res) => {
  try {
    const { name, address, cart, paymentMethod } = req.body;
    const userId = req.session.userId;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized: Please log in to place an order' });
    }

    if (!name || !address || !cart || cart.length === 0) {
      return res.status(400).json({ message: 'Missing required checkout data' });
    }

    const items = cart;
    const total = items.reduce((sum, item) => sum + item.price * item.qty, 0);

    if (paymentMethod === 'COD') {
      // For Cash On Delivery — Save immediately
      const newOrder = new Order({
        name,
        address,
        items,
        total,
        userId,
        paymentMethod,
        paymentStatus: 'Pending',
        status: 'Pending'
      });

      await newOrder.save();
      return res.status(200).json({ message: 'Order placed successfully (COD)', redirect: '/my-orders' });

    } else {
      // For Razorpay — Save to session for now
      req.session.checkoutData = {
        name,
        address,
        cart: items,
        total,
        userId,
        paymentMethod
      };

      return res.status(200).json({ message: 'Proceed to online payment', redirect: '/pay-online' });
    }

  } catch (err) {
    console.error('❌ Checkout Error:', err);
    return res.status(500).json({ message: 'Failed to process checkout' });
  }
});


// ✅ 2. Razorpay Order Create API
router.post('/create-order', isAuthenticated, async (req, res) => {
  console.log("🔧 /create-order route hit");
  console.log("Session checkoutData:", req.session.checkoutData);

  try {
    const { total } = req.session.checkoutData;
    console.log("Checkout total:", total);
    
    const options = {
      amount: total * 100, // Razorpay uses paisa
      currency: "INR",
      receipt: "receipt_order_" + Date.now()
    };

    const order = await razorpayInstance.orders.create(options);
    res.json(order);
  } catch (err) {
    console.error("Razorpay Error:", err);
    res.status(500).send("Error creating Razorpay order");
  }
});

// ✅ 3. Razorpay Payment Verification
router.post('/verify-payment', isAuthenticated, async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  const body = razorpay_order_id + "|" + razorpay_payment_id;
  const expectedSignature = crypto
    .createHmac("sha256", razorpayInstance.key_secret)
    .update(body.toString())
    .digest("hex");

  const isAuthentic = expectedSignature === razorpay_signature;

  if (isAuthentic) {
    try {
      const { name, address, cart, total } = req.session.checkoutData;
      const userId = req.session.userId;

      const newOrder = new Order({
        name,
        address,
        items: cart,
        total,
        userId,
        paymentMethod: "Online",
        paymentStatus: "Paid",
        status: "Pending",
        paymentId: razorpay_payment_id
      });

      await newOrder.save();

      // Clear session data after order is saved
      delete req.session.checkoutData;

      res.json({ success: true, message: "Payment verified, order placed" });
    } catch (error) {
      console.error("Mongo Save Error:", error);
      res.status(500).json({ success: false, message: "Order save failed" });
    }
  } else {
    res.status(400).json({ success: false, message: "Signature mismatch" });
  }
});

// ✅ 4. My Orders Page
router.get('/my-orders', isAuthenticated, async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.session.userId }).sort({ createdAt: -1 });
    res.render('customer/my-orders', { orders });
  } catch (err) {
    console.error('Fetching Orders Error:', err);
    res.status(500).send('Something went wrong');
  }
});

// ✅ 5. View Bill by Order ID
router.get('/orders/:id/bill', isAuthenticated, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).lean();
    if (!order) return res.status(404).send('Order not found');
    res.render('bill', { order });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

//✅ 6. Razorpay Payment Page
router.get('/pay-online', isAuthenticated, (req, res) => {
  if (!req.session.checkoutData) {
    return res.redirect('/cart');
  }

  const total = req.session.checkoutData.total;
  res.render('customer/pay-online', {
    total,
    razorpayKeyId: process.env.RAZORPAY_KEY_ID || 'YOUR_KEY_ID'
  });
});

module.exports = router;
