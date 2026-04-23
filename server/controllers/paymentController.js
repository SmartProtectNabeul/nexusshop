const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder');
const prisma = require('../lib/prisma');

// Task 2: Create Checkout Session
exports.createCheckoutSession = async (req, res) => {
  const { productId, buyerId } = req.body;

  try {
    // Fetch product details
    const product = await prisma.product.findUnique({
      where: { id: productId }
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
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
      success_url: `${process.env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/product/${product.id}`,
      metadata: {
        productId: product.id,
        buyerId: buyerId,
        developerId: product.developerId,
      },
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
    } catch (error) {
      console.error('Database transaction error during webhook processing:', error);
      // Even if DB fails, Stripe charge succeeded. We must log this for manual intervention.
      return res.status(500).send('Database transaction failed');
    }
  }

  res.json({ received: true });
};
