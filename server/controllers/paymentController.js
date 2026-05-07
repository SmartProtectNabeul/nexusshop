const { Prisma } = require('@prisma/client');
const prisma = require('../lib/prisma');
const cacheStore = require('../lib/cacheStore');

const selectPublicUser = {
  id: true,
  email: true,
  role: true,
  credits: true,
  walletBalance: true,
};

const normalizeUser = (user) => ({
  ...user,
  credits: Number(user.credits ?? 0),
  walletBalance: Number(user.walletBalance ?? 0),
});

const clearPurchaseCaches = (buyerId, productId) => {
  cacheStore.delByPrefix('products:');
  cacheStore.del(`product:${productId}`);
  cacheStore.del(`purchase-status:${buyerId}:${productId}`);
};

exports.purchaseWithCredits = async (req, res) => {
  const { productId } = req.body;
  const buyerId = req.userId;

  if (!buyerId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (!productId) {
    return res.status(400).json({ error: 'Product ID is required' });
  }

  try {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        title: true,
        price: true,
        status: true,
        developerId: true,
      },
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (product.status !== 'LIVE') {
      return res.status(400).json({ error: 'Product is not available for purchase' });
    }

    if (product.developerId === buyerId) {
      return res.status(400).json({ error: 'You already own this product' });
    }

    const price = Number(product.price || 0);

    if (price <= 0) {
      return res.status(200).json({
        message: 'This product is free and ready to download.',
        canDownload: true,
        isFree: true,
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const existingPurchase = await tx.transaction.findUnique({
        where: {
          buyerId_productId: {
            buyerId,
            productId: product.id,
          },
        },
        select: { id: true },
      });

      if (existingPurchase) {
        const user = await tx.user.findUnique({
          where: { id: buyerId },
          select: selectPublicUser,
        });
        return { alreadyPurchased: true, user };
      }

      const buyerUpdate = await tx.user.updateMany({
        where: {
          id: buyerId,
          credits: { gte: price },
        },
        data: {
          credits: { decrement: price },
        },
      });

      if (buyerUpdate.count !== 1) {
        const user = await tx.user.findUnique({
          where: { id: buyerId },
          select: selectPublicUser,
        });
        const error = new Error(`Not enough credits. You need ${price} credits to buy this product.`);
        error.code = 'INSUFFICIENT_CREDITS';
        error.user = user;
        throw error;
      }

      const platformCut = price * 0.10;
      const developerCut = price * 0.90;

      const transaction = await tx.transaction.create({
        data: {
          amountPaid: price,
          platformCut,
          developerCut,
          buyerId,
          productId: product.id,
        },
      });

      await tx.user.update({
        where: { id: product.developerId },
        data: {
          walletBalance: { increment: developerCut },
        },
      });

      const user = await tx.user.findUnique({
        where: { id: buyerId },
        select: selectPublicUser,
      });

      return { transaction, user };
    });

    clearPurchaseCaches(buyerId, product.id);

    if (result.alreadyPurchased) {
      return res.status(200).json({
        message: 'You already purchased this product.',
        purchased: true,
        canDownload: true,
        user: normalizeUser(result.user),
      });
    }

    return res.status(201).json({
      message: 'Product purchased with credits.',
      purchased: true,
      canDownload: true,
      transaction: result.transaction,
      user: normalizeUser(result.user),
    });
  } catch (error) {
    if (error.code === 'INSUFFICIENT_CREDITS') {
      return res.status(400).json({
        error: error.message,
        code: error.code,
        user: normalizeUser(error.user),
      });
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      clearPurchaseCaches(buyerId, productId);
      return res.status(200).json({
        message: 'You already purchased this product.',
        purchased: true,
        canDownload: true,
      });
    }

    console.error('Credit purchase error:', error);
    return res.status(500).json({ error: 'Failed to purchase product with credits' });
  }
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
          const transaction = await prisma.transaction.findUnique({
            where: {
              buyerId_productId: {
                buyerId,
                productId: product.id,
              },
            },
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
