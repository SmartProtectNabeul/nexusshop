const express = require('express');
const router = express.Router();
const {
  submitProof,
  d17Webhook,
  listPendingPayments,
  approvePayment,
  rejectPayment
} = require('../controllers/d17PaymentController');
const authMiddleware = require('../lib/authMiddleware');

router.post('/webhook', express.raw({ type: 'application/json' }), d17Webhook);

router.post('/submit-proof', authMiddleware, submitProof);
router.get('/admin/payments', authMiddleware, authMiddleware.requireRole('ADMIN'), listPendingPayments);
router.post('/admin/approve', authMiddleware, authMiddleware.requireRole('ADMIN'), approvePayment);
router.post('/admin/reject', authMiddleware, authMiddleware.requireRole('ADMIN'), rejectPayment);

module.exports = router;
