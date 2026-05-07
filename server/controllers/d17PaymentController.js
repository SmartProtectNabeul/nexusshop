const prisma = require('../lib/prisma');
const crypto = require('crypto');
const cacheStore = require('../lib/cacheStore');

const safeCompare = (a, b) => {
  const left = Buffer.from(a || '', 'utf8');
  const right = Buffer.from(b || '', 'utf8');
  if (left.length !== right.length) {
    return false;
  }
  return crypto.timingSafeEqual(left, right);
};

// POST /api/d17/submit-proof
const submitProof = async (req, res) => {
  try {
    const userId = req.userId;
    const { amount, transactionId, senderPhone } = req.body;
    
    if (!userId || !amount || !transactionId || !senderPhone) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Check if transactionId already exists
    const existing = await prisma.payment.findUnique({
      where: { transactionId }
    });

    if (existing) {
      return res.status(400).json({ error: 'This Transaction ID has already been submitted.' });
    }

    const payment = await prisma.payment.create({
      data: {
        userId,
        amount,
        transactionId,
        senderPhone,
        status: 'PENDING'
      }
    });
    cacheStore.del('admin:pending-payments');

    res.status(201).json({ message: 'Proof submitted successfully', payment });
  } catch (error) {
    console.error('Error submitting proof:', error);
    res.status(500).json({ error: 'Failed to submit proof' });
  }
};

// POST /api/d17/webhook
const d17Webhook = async (req, res) => {
  try {
    const secret = process.env.D17_WEBHOOK_SECRET;
    const signature = req.headers['x-d17-signature'];

    if (!secret) {
      return res.status(500).json({ error: 'D17 webhook secret is not configured' });
    }

    if (!signature) {
      return res.status(401).json({ error: 'Missing webhook signature' });
    }

    const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body || {}));
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');

    if (!safeCompare(signature, expectedSignature)) {
      return res.status(401).json({ error: 'Invalid webhook signature' });
    }

    const payload = JSON.parse(rawBody.toString('utf8'));
    const { transactionId, userId, amount, senderPhone, status } = payload;

    if (!transactionId || !userId || !amount) {
      return res.status(400).json({ error: 'Invalid webhook payload' });
    }

    if (status && status !== 'APPROVED') {
      return res.json({ received: true, ignored: true });
    }

    await prisma.$transaction(async (tx) => {
      const existingPayment = await tx.payment.findUnique({
        where: { transactionId },
      });

      if (existingPayment && existingPayment.status === 'APPROVED') {
        return;
      }

      if (!existingPayment) {
        await tx.payment.create({
          data: {
            userId,
            amount,
            transactionId,
            senderPhone: senderPhone || 'WEBHOOK',
            status: 'APPROVED',
          },
        });
      } else {
        await tx.payment.update({
          where: { id: existingPayment.id },
          data: {
            status: 'APPROVED',
            amount,
            senderPhone: senderPhone || existingPayment.senderPhone,
          },
        });
      }

      await tx.user.update({
        where: { id: userId },
        data: { credits: { increment: amount } },
      });
    });

    return res.json({ received: true });
  } catch (error) {
    console.error('Error handling D17 webhook:', error);
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
};

// GET /api/d17/admin/payments
const listPendingPayments = async (req, res) => {
  const forceRefresh = cacheStore.fromQuery(req);
  try {
    const payments = await cacheStore.getOrSet(
      'admin:pending-payments',
      20 * 1000,
      forceRefresh,
      async () => prisma.payment.findMany({
        where: { status: 'PENDING' },
        include: { user: true }
      })
    );
    res.status(200).json(payments);
  } catch (error) {
    console.error('Error listing payments:', error);
    res.status(500).json({ error: 'Failed to list payments' });
  }
};

// POST /api/d17/admin/approve
const approvePayment = async (req, res) => {
  try {
    const { transactionId } = req.body;
    
    if (!transactionId) {
      return res.status(400).json({ error: 'Transaction ID is required' });
    }

    const payment = await prisma.payment.findUnique({
      where: { transactionId }
    });

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    if (payment.status === 'APPROVED') {
      return res.status(400).json({ error: 'Payment already approved' });
    }

    // Use a transaction to update both payment status and user credits
    const result = await prisma.$transaction(async (prismaClient) => {
      const updatedPayment = await prismaClient.payment.update({
        where: { id: payment.id },
        data: { status: 'APPROVED' }
      });

      // amount in TND = amount in credits (10 TND = 10 credits)
      const updatedUser = await prismaClient.user.update({
        where: { id: payment.userId },
        data: { credits: { increment: payment.amount } }
      });

      return { updatedPayment, updatedUser };
    });
    cacheStore.del('admin:pending-payments');

    res.status(200).json({ message: 'Payment approved', result });
  } catch (error) {
    console.error('Error approving payment:', error);
    res.status(500).json({ error: 'Failed to approve payment' });
  }
};

// POST /api/d17/admin/reject
const rejectPayment = async (req, res) => {
  try {
    const { transactionId } = req.body;
    
    if (!transactionId) {
      return res.status(400).json({ error: 'Transaction ID is required' });
    }

    const payment = await prisma.payment.findUnique({
      where: { transactionId }
    });

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    if (payment.status !== 'PENDING') {
      return res.status(400).json({ error: 'Payment is not pending' });
    }

    const updatedPayment = await prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'REJECTED' }
    });
    cacheStore.del('admin:pending-payments');

    res.status(200).json({ message: 'Payment rejected', payment: updatedPayment });
  } catch (error) {
    console.error('Error rejecting payment:', error);
    res.status(500).json({ error: 'Failed to reject payment' });
  }
};

module.exports = {
  submitProof,
  d17Webhook,
  listPendingPayments,
  approvePayment,
  rejectPayment
};
