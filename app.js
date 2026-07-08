const express = require('express');
const app = express();
const mongoose = require('mongoose');
const path = require('path');
const session = require('express-session');
const MongoStore = require('connect-mongo');
require('dotenv').config();
const helmet = require('helmet');

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then((res) => {
  console.log("✅ Connection Successful to DB!");
}).catch((err) => {
  console.log(err);
});

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'",
        "https://cdn.jsdelivr.net",
        "https://checkout.razorpay.com"
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'",
        "https://cdn.jsdelivr.net"
      ],
      imgSrc: [
        "'self'",
        "https://cdn.razorpay.com",
        "data:"
      ],
      connectSrc: [
        "'self'",
        "https://api.razorpay.com",
        "https://*.razorpay.com"
      ],
      frameSrc: [
        "https://*.razorpay.com"
      ],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    }
  }
}));
app.disable('x-powered-by');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

const isProduction = process.env.NODE_ENV === 'production';

if (isProduction) {
  app.set('trust proxy', 1); // Trust Render's proxy
}

app.use(session({
  secret: process.env.SESSION_SECRET || 'fallbacksecret',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
  cookie: {
    httpOnly: true,
    secure: isProduction,           // Only true on production (Render)
    sameSite: isProduction ? 'none' : 'lax',  // Avoids blocking cookies locally
    maxAge: 1000 * 60 * 60 * 24     // 1 day
  }
}));

app.use(async (req, res, next) => {
  if (req.session.userId) {
    const User = require('./models/User');
    try {
      req.user = await User.findById(req.session.userId);
      res.locals.user = req.user;
    } catch (err) {
      console.error("User lookup failed:", err);
      req.user = null;
      res.locals.user = null;
    }
  } else {
    req.user = null;
    res.locals.user = null;
  }
  next();
});

const routes = require('./routes/index');
app.use('/', routes);

const productRoutes = require('./routes/productRoutes');
app.use('/', productRoutes);

const orderRoutes = require('./routes/orderRoutes');
app.use('/', orderRoutes);

const adminRoutes = require('./routes/admin');
app.use('/admin', adminRoutes);

const userRoutes = require('./routes/userRoutes');
app.use(userRoutes);

const authRoutes = require('./routes/authRoutes');
app.use(authRoutes);

const adminAddProductRoutes = require('./routes/adminAddProduct');
app.use(adminAddProductRoutes);

app.get('/debug', async (req, res) => {
  try {
    const User = require('./models/User');
    console.log("✅ Loaded User model");
    res.send("✅ User model loaded successfully!");
  } catch (err) {
    console.error("❌ User model load error:", err);
    res.status(500).send("❌ Error loading User model. Check logs.");
  }
});

app.use((req, res, next) => {
  res.locals.user = req.user;
  next();
});

app.use((req, res) => {
  res.status(404).render('404');
});

app.listen(8080, () => {
  console.log("🚀 Server is listening at 8080");
});
