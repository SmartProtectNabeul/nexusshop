const prisma = require('../lib/prisma');
const { createClient } = require('@supabase/supabase-js');
const cacheStore = require('../lib/cacheStore');

const supabase = createClient(
  process.env.SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder'
);
const mediaBucket = process.env.SUPABASE_MEDIA_BUCKET || 'product-media';

const extractObjectPathFromSupabaseUrl = (url, bucket) => {
  try {
    const parsed = new URL(url);
    const marker = '/storage/v1/object/';
    const markerIndex = parsed.pathname.indexOf(marker);
    if (markerIndex === -1) return null;
    const suffix = parsed.pathname.slice(markerIndex + marker.length);
    const parts = suffix.split('/');
    if (parts.length < 3) return null;
    if (parts[1] !== bucket) return null;
    return decodeURIComponent(parts.slice(2).join('/'));
  } catch (_error) {
    return null;
  }
};

const resolveMediaUrl = async (url) => {
  if (!url) return url;
  if (url.startsWith('/')) return url;

  let objectPath = url;
  if (url.startsWith('http://') || url.startsWith('https://')) {
    objectPath = extractObjectPathFromSupabaseUrl(url, mediaBucket);
    if (!objectPath) return url;
  }

  const { data, error } = await supabase.storage.from(mediaBucket).createSignedUrl(objectPath, 3600);
  if (error || !data?.signedUrl) return url;
  return data.signedUrl;
};

const isSchemaCompatibilityError = (error) => {
  const message = String(error?.message || '').toLowerCase();
  return (
    error?.code === 'P2022'
    || message.includes('unknown argument')
    || message.includes('column')
    || message.includes('does not exist')
  );
};

const submitApp = async (req, res) => {
  try {
    const userId = req.userId;
    const {
      title,
      description,
      category,
      price,
      fileUrl,
      thumbnailUrl,
      mediaUrls,
      demoVideoUrl,
      version,
      requirements,
      storageSize,
      appSizeBytes,
    } = req.body;

    if (!title || !description || !category || !fileUrl || !thumbnailUrl) {
      return res.status(400).json({
        error: 'Title, description, category, app file, and thumbnail are required',
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, credits: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.role !== 'DEVELOPER') {
      return res.status(403).json({ error: 'You must be a Developer to post apps. Please update your account type in Profile.' });
    }

    const accessFee = 10;

    // One-time fee unlock: once a developer has at least one submitted product, they can post without extra fee.
    const existingSubmissionCount = await prisma.product.count({
      where: { developerId: userId },
    });
    const needsPostingAccessFee = existingSubmissionCount === 0;

    if (needsPostingAccessFee && user.credits < accessFee) {
      return res.status(400).json({
        error: 'Not enough credits. You need a one-time 10 credit fee to unlock posting access.',
      });
    }

    const normalizedMediaUrls = Array.isArray(mediaUrls)
      ? mediaUrls
      : typeof mediaUrls === 'string' && mediaUrls.length > 0
        ? [mediaUrls]
        : [];
    const parsedPrice = parseFloat(price || 0);

    if (Number.isNaN(parsedPrice) || parsedPrice < 0) {
      return res.status(400).json({ error: 'Invalid price value' });
    }

    const product = await prisma.$transaction(async (tx) => {
      if (needsPostingAccessFee) {
        await tx.user.update({
          where: { id: userId },
          data: { credits: { decrement: accessFee } },
        });
      }

      const fullData = {
        title,
        description,
        category,
        price: parsedPrice,
        rating: 0,
        thumbnailUrl,
        mediaUrls: normalizedMediaUrls,
        demoVideoUrl: demoVideoUrl || null,
        fileUrl,
        version: version || null,
        requirements: requirements || null,
        storageSize: storageSize || null,
        appSizeBytes: Number.isFinite(Number(appSizeBytes)) ? Number(appSizeBytes) : null,
        developerId: userId,
        status: 'PENDING',
      };

      try {
        return await tx.product.create({ data: fullData });
      } catch (createError) {
        if (!isSchemaCompatibilityError(createError)) {
          throw createError;
        }
        // Backward compatibility: database not migrated yet with new optional columns.
        return tx.product.create({
          data: {
            title,
            description,
            category,
            price: parsedPrice,
            thumbnailUrl,
            mediaUrls: normalizedMediaUrls,
            demoVideoUrl: demoVideoUrl || null,
            fileUrl,
            developerId: userId,
            status: 'PENDING',
          },
        });
      }
    });

    // Notify admin logic would go here
    console.log(`Sending email to admin for app submission: ${title}`);
    cacheStore.delByPrefix('products:');
    cacheStore.del('admin:pending-apps');

    return res.status(201).json({
      message: 'App submitted for review',
      product,
      accessFeeCharged: needsPostingAccessFee ? accessFee : 0,
      postingAccessUnlocked: true,
    });
    
  } catch (error) {
    console.error('Error submitting app:', error);
    return res.status(500).json({ error: error?.message || 'Failed to submit app' });
  }
};

const listPendingApps = async (req, res) => {
  const forceRefresh = cacheStore.fromQuery(req);
  try {
    const pendingApps = await cacheStore.getOrSet(
      'admin:pending-apps',
      30 * 1000,
      forceRefresh,
      async () => prisma.product.findMany({
        where: { status: 'PENDING' },
        orderBy: { createdAt: 'desc' },
      })
    );

    const developerIds = [...new Set(pendingApps.map((app) => app.developerId).filter(Boolean))];
    const developers = developerIds.length > 0
      ? await prisma.user.findMany({
        where: { id: { in: developerIds } },
        select: { id: true, email: true },
      })
      : [];

    const developerMap = new Map(developers.map((developer) => [developer.id, developer]));
    const normalizedApps = await Promise.all(
      pendingApps.map(async (app) => ({
        ...app,
        thumbnailUrl: await resolveMediaUrl(app.thumbnailUrl),
        mediaUrls: Array.isArray(app.mediaUrls)
          ? await Promise.all(app.mediaUrls.map((url) => resolveMediaUrl(url)))
          : [],
        developer: developerMap.get(app.developerId) || null,
      }))
    );

    return res.status(200).json(normalizedApps);
  } catch (error) {
    console.error('Error listing pending apps:', error);
    return res.status(500).json({ error: 'Failed to list pending apps' });
  }
};

const getPublishingEligibility = async (req, res) => {
  try {
    const userId = req.userId;
    const accessFee = 10;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, credits: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const existingSubmissionCount = await prisma.product.count({
      where: { developerId: userId },
    });
    const hasUnlockedPostingAccess = existingSubmissionCount > 0;
    const feeRequiredNow = !hasUnlockedPostingAccess;
    const hasEnoughCreditsForFee = Number(user.credits || 0) >= accessFee;

    return res.status(200).json({
      role: user.role,
      currentCredits: Number(user.credits || 0),
      accessFee,
      hasUnlockedPostingAccess,
      feeRequiredNow,
      hasEnoughCreditsForFee,
      canSubmitNow: user.role === 'DEVELOPER' && (!feeRequiredNow || hasEnoughCreditsForFee),
      reason:
        user.role !== 'DEVELOPER'
          ? 'Only developers can submit apps'
          : feeRequiredNow && !hasEnoughCreditsForFee
            ? 'Not enough credits for one-time posting fee'
            : 'Eligible to submit',
    });
  } catch (error) {
    console.error('Error checking publishing eligibility:', error);
    return res.status(500).json({ error: 'Failed to check publishing eligibility' });
  }
};

const reviewSubmittedApp = async (req, res) => {
  try {
    const { productId, decision } = req.body;

    if (!productId || !decision) {
      return res.status(400).json({ error: 'Product ID and decision are required' });
    }

    if (decision !== 'APPROVE' && decision !== 'REJECT') {
      return res.status(400).json({ error: 'Decision must be APPROVE or REJECT' });
    }

    const app = await prisma.product.findUnique({ where: { id: productId } });

    if (!app) {
      return res.status(404).json({ error: 'App not found' });
    }

    if (app.status !== 'PENDING') {
      return res.status(400).json({ error: 'This app was already reviewed' });
    }

    const updated = await prisma.product.update({
      where: { id: productId },
      data: {
        status: decision === 'APPROVE' ? 'LIVE' : 'REJECTED',
      },
    });
    cacheStore.delByPrefix('products:');
    cacheStore.del(`product:${productId}`);
    cacheStore.del('admin:pending-apps');

    return res.status(200).json({
      message: decision === 'APPROVE' ? 'App approved and published' : 'App rejected',
      app: updated,
    });
  } catch (error) {
    console.error('Error reviewing app submission:', error);
    return res.status(500).json({ error: 'Failed to review app submission' });
  }
};

module.exports = {
  submitApp,
  listPendingApps,
  reviewSubmittedApp,
  getPublishingEligibility,
};
