const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder');
const prisma = require('../lib/prisma');
const cacheStore = require('../lib/cacheStore');

// Task 2: Create Checkout Session
exports.createCheckoutSession = async (req, res) => {
  const { productId } = req.body;
  const buyerId = req.userId;

  if (!buyerId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (!productId) {
    return res.status(400).json({ error: 'Product ID is required' });
  }

  try {
    // Fetch product details
    const product = await prisma.product.findUnique({
      where: { id: productId }
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (product.developerId === buyerId) {
      return res.status(400).json({ error: 'You cannot purchase your own product' });
    }

    if (product.status !== 'LIVE') {
      return res.status(400).json({ error: 'Product is not available for purchase' });
    }

    const existingPurchase = await prisma.transaction.findFirst({
      where: {
        buyerId,
        productId,
      },
    });

    if (existingPurchase) {
      return res.status(400).json({ error: 'You already purchased this product' });
    }

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'tnd', // Tunisian Dinar (assuming Stripe supports it or using equivalent)
            product_data: {
              name: product.title,
              description: product.description,
            },
            unit_amount: Math.round(product.price * 100), // Stripe expects cents/smallest currency unit
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL}/product/${product.id}?purchase=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/product/${product.id}`,
      metadata: {
        productId: product.id,
        buyerId,
        developerId: product.developerId,
      },
      client_reference_id: `${buyerId}:${product.id}`,
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
};

// Task 2: Webhook for 90/10 Split
exports.stripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    if (!endpointSecret) {
      return res.status(500).send('Stripe webhook secret is not configured');
    }

    // Verify webhook signature to prevent spoofing
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error(`Webhook Error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle successful checkout
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    
    const productId = session.metadata.productId;
    const buyerId = session.metadata.buyerId;
    const developerId = session.metadata.developerId;
    
    // Convert back from cents
    const amountPaid = session.amount_total / 100;

    // Calculate 90/10 Split
    const platformCut = amountPaid * 0.10;
    const developerCut = amountPaid * 0.90;

    try {
      const existingTransaction = await prisma.transaction.findUnique({
        where: { stripeId: session.payment_intent },
      });

      if (existingTransaction) {
        return res.json({ received: true, duplicate: true });
      }

      const existingByPurchase = await prisma.transaction.findFirst({
        where: { buyerId, productId },
        select: { id: true },
      });
      if (existingByPurchase) {
        return res.json({ received: true, duplicate: true });
      }

      // Execute as a Prisma Transaction to ensure atomicity
      await prisma.$transaction(async (tx) => {
        
        // 1. Log the transaction
        await tx.transaction.create({
          data: {
            amountPaid,
            platformCut,
            developerCut,
            stripeId: session.payment_intent,
            buyerId,
            productId,
          }
        });

        // 2. Credit 90% to the Developer's virtual wallet
        await tx.user.update({
          where: { id: developerId },
          data: {
            walletBalance: {
              increment: developerCut
            }
          }
        });
        
        // Note: Platform funds (10%) remain in the Stripe account automatically.
      });

      console.log(`Payment processed for product ${productId}: Developer credited ${developerCut} TND`);
      cacheStore.delByPrefix('products:');
      cacheStore.del(`product:${productId}`);
      cacheStore.del(`purchase-status:${buyerId}:${productId}`);
    } catch (error) {
      console.error('Database transaction error during webhook processing:', error);
      // Even if DB fails, Stripe charge succeeded. We must log this for manual intervention.
      return res.status(500).send('Database transaction failed');
    }
  }

  res.json({ received: true });
};

exports.getPurchaseStatus = async (req, res) => {
  const buyerId = req.userId;
  const { productId } = req.params;
  const forceRefresh = cacheStore.fromQuery(req);
  const cacheKey = `purchase-status:${buyerId}:${productId}`;

  if (!buyerId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const status = await cacheStore.getOrSet(
      cacheKey,
      45 * 1000,
      forceRefresh,
      async () => {
        const product = await prisma.product.findUnique({
          where: { id: productId },
          select: { id: true, price: true, developerId: true, status: true },
        });
        if (!product || product.status !== 'LIVE') {
          return { exists: false, purchased: false, canDownload: false, isOwner: false, isFree: false };
        }
        const isOwner = product.developerId === buyerId;
        const isFree = Number(product.price || 0) === 0;
        let purchased = false;
        if (!isOwner && !isFree) {
          const transaction = await prisma.transaction.findFirst({
            where: { buyerId, productId: product.id },
            select: { id: true },
          });
          purchased = Boolean(transaction);
        }
        const canDownload = isOwner || isFree || purchased;
        return { exists: true, purchased, canDownload, isOwner, isFree };
      }
    );

    return res.status(200).json(status);
  } catch (error) {
    console.error('Error getting purchase status:', error);
    return res.status(500).json({ error: error?.message || 'Failed to get purchase status' });
  }
};
