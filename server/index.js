const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// Need raw body for Stripe webhook signature verification
app.use((req, res, next) => {
  if (req.originalUrl === '/api/payments/webhook') {
    next(); // Pass to webhook route untouched
  } else {
    express.json()(req, res, next);
  }
});

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173'
}));

// Routes
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/payments', require('./routes/paymentRoutes'));

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'NexusShop Server Running' });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
