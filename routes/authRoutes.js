const express = require('express');
const router = express.Router();
const multer = require('multer');
const User = require('../models/User');
const path = require('path');

// Multer setup for file uploads
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

// GET Register Page
router.get('/register', (req, res) => {
  res.render('register', { error: null });
});

// POST Register
router.post('/register', upload.single('image'), async (req, res) => {
  // Log input to debug easily
  console.log('Body:', req.body);
  console.log('File:', req.file);

  const { username, email, password } = req.body;
  const image = req.file ? req.file.filename : null;

  try {
    await User.create({ username, email, password, image });
    res.redirect('/login');
  } catch (err) {
    console.error('Registration error:', err);

    // Handle duplicate email error nicely
    if (err.code === 11000) {
      return res.status(400).render('register', { error: 'Email is already registered.' });
    }

    res.status(400).render('register', { error: 'Registration failed. Please try again.' });
  }
});

// GET Login Page
router.get('/login', (req, res) => {
  res.render('login', { error: null });
});

// POST Login
router.post('/login', async (req, res) => {
  req.session.userId = User._id;
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.render('login', { error: 'Invalid email or password' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.render('login', { error: 'Invalid email or password' });
    }

    // ✅ Set user session
    req.session.userId = user._id;

    // ✅ Redirect to saved page or home
    const redirectTo = req.session.redirectTo || '/';
    delete req.session.redirectTo;
    res.redirect(redirectTo);

  } catch (err) {
    console.error(err);
    res.render('login', { error: 'Something went wrong' });
  }
});


// Logout route
router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

module.exports = router;
