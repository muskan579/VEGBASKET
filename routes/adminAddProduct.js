const express = require('express');
const router = express.Router();
const Product = require('../models/product');
const { isAuthenticated } = require('../middleware/auth');
const { isAdmin } = require('../middleware/admin');
const multer = require('multer');
const path = require('path');
const { body, validationResult } = require('express-validator');

// Multer storage config
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/uploads/');
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + ext);
  }
});
const upload = multer({ storage });

// Show product list (admin)
router.get('/admin/products', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const products = await Product.find().sort({ category: 1, name: 1 }); // Sorted
    res.render('admin/product-list', { products });
  } catch (err) {
    console.error("Error loading products:", err);
    res.status(500).send("Internal Server Error");
  }
});

// Show add product form
router.get('/admin/products/new', isAuthenticated, isAdmin, (req, res) => {
  res.render('admin/product-form', { errors: [], product: {} });
});

// Add product to DB
router.post(
  '/admin/products',
  isAuthenticated,
  isAdmin,
  upload.single('image'),
  [
    body('name').trim().notEmpty().withMessage('Product name is required'),
    body('category').isIn(['vegetable', 'dairy']).withMessage('Invalid category'),
    body('price').isFloat({ min: 0 }).withMessage('Price must be a number'),
    body('unit').notEmpty().withMessage('Unit is required')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    const { name, category, price, unit } = req.body;
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : '';

    if (!errors.isEmpty()) {
      return res.status(400).render('admin/product-form', {
        errors: errors.array(),
        product: { name, category, price, unit }
      });
    }

    try {
      await Product.create({ name, category, price, unit, imageUrl });
      res.redirect('/admin/products');
    } catch (err) {
      console.error("Error adding product:", err);
      res.status(500).send("Failed to add product");
    }
  }
);

// Delete a product
router.post('/admin/products/:id/delete', isAuthenticated, isAdmin, async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.redirect('/admin/products');
  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).send("Error deleting product");
  }
});

// GET - Edit Product Form
router.get('/admin/products/:id/edit', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).send("Product not found");
    res.render('admin/product-edit', { product, errors: [] });
  } catch (err) {
    res.status(500).send("Error loading product");
  }
});

// POST - Update Product with optional image upload
router.post(
  '/admin/products/:id/edit',
  isAuthenticated,
  isAdmin,
  upload.single('image'),
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('category').isIn(['vegetable', 'dairy']).withMessage('Invalid category'),
    body('price').isFloat({ min: 0 }).withMessage('Price must be a number'),
    body('unit').notEmpty().withMessage('Unit is required')
  ],
  async (req, res) => {
    const { name, category, price, unit } = req.body;
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      const product = await Product.findById(req.params.id);
      return res.render('admin/product-edit', {
        product: {
          _id: product._id,
          name,
          category,
          price,
          unit,
          imageUrl: product.imageUrl
        },
        errors: errors.array()
      });
    }

    const updatedProduct = { name, category, price, unit };
    if (req.file) {
      updatedProduct.imageUrl = `/uploads/${req.file.filename}`;
    }

    try {
      await Product.findByIdAndUpdate(req.params.id, updatedProduct);
      res.redirect('/admin/products');
    } catch (err) {
      console.error("Update error:", err);
      res.status(500).send("Error updating product");
    }
  }
);

module.exports = router;
