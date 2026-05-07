const prisma = require('../lib/prisma');
const cacheStore = require('../lib/cacheStore');

const recomputeProductRating = async (productId) => {
  const aggregate = await prisma.review.aggregate({
    where: { productId },
    _avg: { rating: true },
  });
  const average = Number(aggregate?._avg?.rating || 0);
  await prisma.product.update({
    where: { id: productId },
    data: { rating: Number(average.toFixed(2)) },
  });
};

exports.listReviews = async (req, res) => {
  const { id: productId } = req.params;
  const forceRefresh = cacheStore.fromQuery(req);
  const cacheKey = `reviews:${productId}`;

  try {
    const reviews = await cacheStore.getOrSet(
      cacheKey,
      60 * 1000,
      forceRefresh,
      async () => prisma.review.findMany({
        where: { productId },
        orderBy: { createdAt: 'desc' },
        include: {
          buyer: {
            select: { id: true, email: true },
          },
        },
      })
    );
    return res.status(200).json(reviews);
  } catch (error) {
    console.error('Error listing reviews:', error);
    return res.status(500).json({ error: error?.message || 'Failed to list reviews' });
  }
};

exports.upsertReview = async (req, res) => {
  const { id: productId } = req.params;
  const buyerId = req.userId;
  const { rating, comment } = req.body;
  const normalizedRating = Number(rating);

  if (!Number.isInteger(normalizedRating) || normalizedRating < 1 || normalizedRating > 5) {
    return res.status(400).json({ error: 'Rating must be an integer from 1 to 5' });
  }

  try {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, status: true, developerId: true },
    });
    if (!product || product.status !== 'LIVE') {
      return res.status(404).json({ error: 'Product not available for review' });
    }
    if (product.developerId === buyerId) {
      return res.status(403).json({ error: 'You cannot review your own product' });
    }

    const transaction = await prisma.transaction.findFirst({
      where: { buyerId, productId },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });
    if (!transaction) {
      return res.status(403).json({ error: 'Only users who purchased this app can review it' });
    }

    const existing = await prisma.review.findUnique({
      where: { buyerId_productId: { buyerId, productId } },
    });

    const review = existing
      ? await prisma.review.update({
        where: { id: existing.id },
        data: {
          rating: normalizedRating,
          comment: comment ? String(comment).slice(0, 1500) : null,
        },
        include: {
          buyer: { select: { id: true, email: true } },
        },
      })
      : await prisma.review.create({
        data: {
          rating: normalizedRating,
          comment: comment ? String(comment).slice(0, 1500) : null,
          buyerId,
          productId,
          transactionId: transaction.id,
        },
        include: {
          buyer: { select: { id: true, email: true } },
        },
      });

    await recomputeProductRating(productId);
    cacheStore.delByPrefix('products:');
    cacheStore.del(`product:${productId}`);
    cacheStore.del(`reviews:${productId}`);

    return res.status(200).json(review);
  } catch (error) {
    console.error('Error upserting review:', error);
    return res.status(500).json({ error: error?.message || 'Failed to save review' });
  }
};
