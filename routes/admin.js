const express = require('express');
const router = express.Router();
const Order = require('../models/order');

const adminAuth = (req, res, next) => {
  const auth = { login: 'admin', password: '1234' };

  const b64auth = (req.headers.authorization || '').split(' ')[1];
  const [login, password] = Buffer.from(b64auth || '', 'base64').toString().split(':');

  if (login && password && login === auth.login && password === auth.password) {
    return next();
  }

  res.set('WWW-Authenticate', 'Basic realm="Admin Area"');
  res.status(401).send('Authentication required.');
};

router.get('/orders', adminAuth, async (req, res) => {
  try {
    const search = req.query.search;
    let query = {
      status: { $in: ['Pending', 'Placed'] }  // Only these two statuses
    };

    if (search) {
      const User = require('../models/User');
      const matchedUsers = await User.find({ username: new RegExp(search, 'i') });
      const userIds = matchedUsers.map(u => u._id);

      query = {
        ...query,
        $or: [
          { userId: { $in: userIds } },
          { address: new RegExp(search, 'i') }
        ]
      };
    }

    let orders = await Order.find(query).populate('userId').exec();

    // Sort orders: Pending first, then Placed
    const statusOrder = { 'Pending': 1, 'Placed': 2 };
    orders.sort((a, b) => {
      return statusOrder[a.status] - statusOrder[b.status] || b.createdAt - a.createdAt;
    });

    // Filter out orders with null userId (optional)
    orders = orders.filter(order => order.userId != null);

    res.render('admin/orders', { orders, isAdmin: true, search });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

router.get('/print-bill/:id', adminAuth, async (req, res) => {
  try {
    const orderId = req.params.id;
    const order = await Order.findById(orderId).populate('userId');

    if (!order) return res.status(404).send('Order not found');

    res.render('admin/printBill', { order });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

router.post('/update-status/:id', adminAuth, async (req, res) => {
  try {
    const orderId = req.params.id;
    const newStatus = req.body.status;

    await Order.findByIdAndUpdate(orderId, { status: newStatus });
    res.redirect('/admin/orders');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error updating status');
  }
});

router.post('/update-payment-status/:id', adminAuth, async (req, res) => {
  try {
    const orderId = req.params.id;
    const newPaymentStatus = req.body.paymentStatus;

    // Validate the newPaymentStatus value
    const validStatuses = ['Pending', 'Paid', 'Failed'];
    if (!validStatuses.includes(newPaymentStatus)) {
      return res.status(400).send('Invalid payment status');
    }

    // Update the order
    await Order.findByIdAndUpdate(orderId, { paymentStatus: newPaymentStatus });

    // Redirect back to completed orders page
    res.redirect('/admin/completed-orders');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

router.get('/completed-orders', async (req, res) => {
  const orders = await Order.find({
    status: 'Completed',
    $or: [
      { paymentMethod: 'COD', paymentStatus: { $ne: 'Paid' } },
      { paymentMethod: { $ne: 'COD' } }
    ]
  })
  .populate('userId', 'username email')
  .sort({ createdAt: -1 });

  res.render('admin/completed-orders', { orders });
});


router.get('/completed-paid-orders', async (req, res) => {
  const { fromDate, toDate } = req.query;

  const query = {
    status: 'Completed',
    paymentStatus: 'Paid'
  };

  if (fromDate && toDate) {
    query.createdAt = {
      $gte: new Date(fromDate),
      $lte: new Date(new Date(toDate).setHours(23, 59, 59, 999))
    };
  }

  const orders = await Order.find(query).sort({ createdAt: -1 });

  res.render('admin/completed-paid-orders', { orders, fromDate, toDate });
});

module.exports = router;
