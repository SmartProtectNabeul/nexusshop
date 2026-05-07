const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const authMiddleware = require('../lib/authMiddleware');

// Create checkout session
router.post('/checkout', authMiddleware, paymentController.createCheckoutSession);
router.get('/purchase-status/:productId', authMiddleware, paymentController.getPurchaseStatus);

// Stripe webhook (requires raw body, see index.js)
router.post('/webhook', express.raw({ type: 'application/json' }), paymentController.stripeWebhook);

module.exports = router;
