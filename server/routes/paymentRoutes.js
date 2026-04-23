const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

// Create checkout session
router.post('/checkout', paymentController.createCheckoutSession);

// Stripe webhook (requires raw body, see index.js)
router.post('/webhook', express.raw({ type: 'application/json' }), paymentController.stripeWebhook);

module.exports = router;
