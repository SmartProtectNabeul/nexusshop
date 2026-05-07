const router = require('express').Router();
const paymentController = require('../controllers/paymentController');
const authMiddleware = require('../lib/authMiddleware');

// Buy a product by spending approved D17 credits.
router.post('/purchase', authMiddleware, paymentController.purchaseWithCredits);
router.get('/purchase-status/:productId', authMiddleware, paymentController.getPurchaseStatus);

module.exports = router;
