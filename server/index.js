// Restarting nodemon to load fresh Prisma Client
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config({ override: true });

const app = express();
const port = process.env.PORT || 5000;

// Need raw body for Stripe webhook signature verification
app.use((req, res, next) => {
  if (req.originalUrl === '/api/payments/webhook' || req.originalUrl === '/api/d17/webhook') {
    next(); // Pass to webhook route untouched
  } else {
    express.json()(req, res, next);
  }
});

const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'http://localhost:5174' // Electron Dev Server
];

app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true
}));

// Routes
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/payments', require('./routes/paymentRoutes'));
app.use('/api/d17', require('./routes/d17PaymentRoutes'));
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/apps', require('./routes/appRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/sdk', require('./routes/sdkRoutes'));

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'NexusShop Server Running' });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
