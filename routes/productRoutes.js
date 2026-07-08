const express = require('express');
const router = express.Router();
const Product = require('../models/product');

// Show vegetables
router.get('/shop', async (req, res) => {
  try {
    const products = await Product.find({ category: 'vegetable' });
    console.log("Vegetables:", products);
    res.render('shop', { products });
  } catch (err) {
    console.error("Shop Route Error:", err);
    res.status(500).send("Internal Server Error");
  }
});

// Show dairy
router.get('/dairy', async (req, res) => {
  try {
    const products = await Product.find({ category: 'dairy' });
    console.log("Dairy:", products);
    res.render('dairy', { products });
  } catch (err) {
    console.error("Dairy Route Error:", err);
    res.status(500).send("Internal Server Error");
  }
});

module.exports = router;
