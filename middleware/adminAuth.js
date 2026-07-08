router.get('/admin/completed-orders', adminAuth, async (req, res) => {
  const completedOrders = await Order.find({ status: 'Completed' }).populate('userId', 'email username');
  res.render('admin-completed-orders', { completedOrders });
});
