const prisma = require('../lib/prisma');
const { createClient } = require('@supabase/supabase-js');
const cacheStore = require('../lib/cacheStore');

const supabase = createClient(
  process.env.SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder'
);
const appBucket = process.env.SUPABASE_APP_BUCKET || 'product-binaries';
const mediaBucket = process.env.SUPABASE_MEDIA_BUCKET || 'product-media';

const safeName = (name) => String(name || 'file').replace(/\s+/g, '-');

const extractObjectPathFromSupabaseUrl = (url, bucket) => {
  try {
    const parsed = new URL(url);
    const marker = `/storage/v1/object/`;
    const index = parsed.pathname.indexOf(marker);
    if (index === -1) return null;

    const suffix = parsed.pathname.slice(index + marker.length);
    const parts = suffix.split('/');
    if (parts.length < 3) return null;

    const bucketFromUrl = parts[1];
    if (bucketFromUrl !== bucket) return null;

    const encodedPath = parts.slice(2).join('/');
    return decodeURIComponent(encodedPath);
  } catch (_error) {
    return null;
  }
};

const toSignedOrOriginalUrl = async (bucket, value) => {
  if (!value) return value;
  if (value.startsWith('/')) return value;

  let objectPath = value;
  if (value.startsWith('http://') || value.startsWith('https://')) {
    objectPath = extractObjectPathFromSupabaseUrl(value, bucket);
    if (!objectPath) return value;
  }

  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(objectPath, 3600);
  if (error || !data?.signedUrl) {
    return value;
  }
  return data.signedUrl;
};

const normalizeProductAssets = async (product) => {
  if (!product) return product;
  const thumbnailUrl = await toSignedOrOriginalUrl(mediaBucket, product.thumbnailUrl);
  const mediaUrls = Array.isArray(product.mediaUrls)
    ? await Promise.all(product.mediaUrls.map((url) => toSignedOrOriginalUrl(mediaBucket, url)))
    : [];

  return {
    ...product,
    thumbnailUrl,
    mediaUrls,
  };
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

const uploadToBucket = async (bucket, path, file) => {
  const { error } = await supabase.storage.from(bucket).upload(path, file.buffer, {
    contentType: file.mimetype,
    upsert: true,
  });

  if (error) {
    throw new Error(error.message);
  }

  return path;
};

exports.getProducts = async (req, res) => {
  const forceRefresh = cacheStore.fromQuery(req);
  const cacheKey = 'products:list';
  try {
    const normalizedProducts = await cacheStore.getOrSet(
      cacheKey,
      60 * 1000,
      forceRefresh,
      async () => {
        const products = await prisma.product.findMany({
          where: { status: 'LIVE' },
          include: {
            developer: {
              select: { email: true } // Don't expose sensitive info
            },
            _count: {
              select: { transactions: true },
            },
          }
        });
        return Promise.all(products.map((product) => normalizeProductAssets(product)));
      }
    );
    res.json(normalizedProducts);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
};

exports.searchProducts = async (req, res) => {
  const forceRefresh = cacheStore.fromQuery(req);
  try {
    const { q, category, sort } = req.query;
    
    let whereClause = { status: 'LIVE' };
    
    if (q) {
      whereClause.title = { contains: q, mode: 'insensitive' };
    }
    
    if (category) {
      whereClause.category = category;
    }

    let orderByClause = { createdAt: 'desc' }; // default
    if (sort === 'price_asc') orderByClause = { price: 'asc' };
    if (sort === 'price_desc') orderByClause = { price: 'desc' };
    if (sort === 'popularity') {
      orderByClause = { transactions: { _count: 'desc' } };
    }

    const cacheKey = `products:search:${String(q || '')}:${String(category || '')}:${String(sort || '')}`;
    const normalizedProducts = await cacheStore.getOrSet(
      cacheKey,
      45 * 1000,
      forceRefresh,
      async () => {
        const products = await prisma.product.findMany({
          where: whereClause,
          orderBy: orderByClause,
          include: {
            developer: { select: { email: true } },
            _count: {
              select: { transactions: true },
            },
          }
        });
        return Promise.all(products.map((product) => normalizeProductAssets(product)));
      }
    );
    res.json(normalizedProducts);
  } catch (error) {
    console.error('Error searching products:', error);
    res.status(500).json({ error: 'Failed to search products' });
  }
};

exports.getProduct = async (req, res) => {
  const forceRefresh = cacheStore.fromQuery(req);
  try {
    const cacheKey = `product:${req.params.id}`;
    const product = await cacheStore.getOrSet(
      cacheKey,
      60 * 1000,
      forceRefresh,
      async () => prisma.product.findUnique({
        where: { id: req.params.id },
        include: {
          developer: {
            select: { email: true }
          },
          _count: {
            select: { transactions: true },
          },
        }
      })
    );
    if (!product) return res.status(404).json({ error: 'Product not found' });
    const normalizedProduct = await normalizeProductAssets(product);
    res.json(normalizedProduct);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch product' });
  }
};

exports.createProduct = async (req, res) => {
  const {
    title,
    description,
    price,
    category,
    fileUrl,
    thumbnailUrl,
    mediaUrls,
    demoVideoUrl,
    version,
    requirements,
    storageSize,
    appSizeBytes,
  } = req.body;
  const developerId = req.userId;
  
  try {
    const developer = await prisma.user.findUnique({ where: { id: developerId } });

    if (!developer || developer.role !== 'DEVELOPER') {
      return res.status(403).json({ error: 'Only developers can create products' });
    }

    if (!title || !description || !category || !fileUrl || !thumbnailUrl) {
      return res.status(400).json({ error: 'Missing required product fields' });
    }

    const parsedMediaUrls = Array.isArray(mediaUrls)
      ? mediaUrls
      : typeof mediaUrls === 'string' && mediaUrls.length > 0
        ? [mediaUrls]
        : [];

    let product;
    try {
      product = await prisma.product.create({
        data: {
          title,
          description,
          price: parseFloat(price),
          rating: 0,
          category,
          fileUrl,
          thumbnailUrl,
          mediaUrls: parsedMediaUrls,
          demoVideoUrl,
          version: version || null,
          requirements: requirements || null,
          storageSize: storageSize || null,
          appSizeBytes: Number.isFinite(Number(appSizeBytes)) ? Number(appSizeBytes) : null,
          developerId,
          status: 'PENDING' // Requires admin approval
        }
      });
    } catch (createError) {
      if (!isSchemaCompatibilityError(createError)) {
        throw createError;
      }
      product = await prisma.product.create({
        data: {
          title,
          description,
          price: parseFloat(price),
          category,
          fileUrl,
          thumbnailUrl,
          mediaUrls: parsedMediaUrls,
          demoVideoUrl,
          developerId,
          status: 'PENDING',
        },
      });
    }
    res.status(201).json(product);
    cacheStore.delByPrefix('products:');
  } catch (error) {
    res.status(500).json({ error: error?.message || 'Failed to create product' });
  }
};

exports.uploadProductAssets = async (req, res) => {
  try {
    const developer = await prisma.user.findUnique({ where: { id: req.userId } });

    if (!developer || developer.role !== 'DEVELOPER') {
      return res.status(403).json({ error: 'Only developers can upload product assets' });
    }

    const appFile = req.files?.appFile?.[0];
    const thumbnail = req.files?.thumbnail?.[0];
    const mediaFiles = req.files?.media || [];

    if (!appFile || !thumbnail) {
      return res.status(400).json({ error: 'Both app file and thumbnail are required' });
    }

    const timestamp = Date.now();
    const nonce = Math.random().toString(36).slice(2, 8);
    const basePath = `${req.userId}/${timestamp}-${nonce}`;
    const fileUrl = await uploadToBucket(
      appBucket,
      `${basePath}/app-${safeName(appFile.originalname)}`,
      appFile
    );

    const thumbnailPath = await uploadToBucket(
      mediaBucket,
      `${basePath}/thumb-${safeName(thumbnail.originalname)}`,
      thumbnail
    );
    const { data: thumbnailPublicData } = supabase.storage
      .from(mediaBucket)
      .getPublicUrl(thumbnailPath);
    const thumbnailUrl = thumbnailPublicData.publicUrl;

    const mediaUrls = [];
    for (let index = 0; index < mediaFiles.length; index += 1) {
      const mediaFile = mediaFiles[index];
      const uploadedPath = await uploadToBucket(
        mediaBucket,
        `${basePath}/media-${index + 1}-${safeName(mediaFile.originalname)}`,
        mediaFile
      );
      const { data: mediaPublicData } = supabase.storage
        .from(mediaBucket)
        .getPublicUrl(uploadedPath);
      mediaUrls.push(mediaPublicData.publicUrl);
    }

    return res.status(201).json({
      fileUrl,
      thumbnailUrl,
      mediaUrls,
      appSizeBytes: appFile.size,
      storageSize: `${(appFile.size / (1024 * 1024)).toFixed(2)} MB`,
    });
  } catch (error) {
    console.error('Error uploading product assets:', error);
    return res.status(500).json({ error: error.message || 'Failed to upload product assets' });
  }
};

// Task 3: Secure File Delivery
exports.downloadProduct = async (req, res) => {
  const { id: productId } = req.params;
  const userId = req.userId; 
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const product = await prisma.product.findUnique({
      where: { id: productId }
    });
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    const isOwner = product.developerId === userId;
    const isFree = Number(product.price || 0) === 0;
    let hasPurchased = false;
    if (!isOwner && !isFree) {
      const transaction = await prisma.transaction.findFirst({
        where: {
          buyerId: userId,
          productId: productId
        }
      });
      hasPurchased = Boolean(transaction);
    }

    if (!(isOwner || isFree || hasPurchased)) {
      return res.status(403).json({ error: 'You have not purchased this product.' });
    }

    // 2. Generate secure, short-lived signed URL using Supabase Storage
    // Assuming files are stored in a private bucket called 'product-binaries'
    const { data, error } = await supabase
      .storage
      .from(appBucket)
      .createSignedUrl(product.fileUrl, 60); // Valid for 60 seconds

    if (error) {
      console.error('Storage error:', error);
      return res.status(500).json({ error: 'Failed to generate secure download link' });
    }

    // 3. Return the signed URL to the client
    res.json({ downloadUrl: data.signedUrl });

  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: 'Failed to process download request' });
  }
};

exports.adminDownloadProduct = async (req, res) => {
  const { id: productId } = req.params;

  try {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, fileUrl: true, title: true, status: true },
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (!product.fileUrl) {
      return res.status(400).json({ error: 'This product has no downloadable file' });
    }

    const { data, error } = await supabase
      .storage
      .from(appBucket)
      .createSignedUrl(product.fileUrl, 120);

    if (error) {
      return res.status(500).json({ error: 'Failed to generate admin download link' });
    }

    return res.json({
      productId: product.id,
      title: product.title,
      status: product.status,
      downloadUrl: data?.signedUrl,
      expiresInSeconds: 120,
    });
  } catch (error) {
    console.error('Admin download error:', error);
    return res.status(500).json({ error: 'Failed to generate admin download link' });
  }
};

exports.adminVirusTotalScan = async (req, res) => {
  const { id: productId } = req.params;
  const apiKey = process.env.VIRUSTOTAL_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'VIRUSTOTAL_API_KEY is not configured on the server' });
  }

  try {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, fileUrl: true, title: true },
    });

    if (!product || !product.fileUrl) {
      return res.status(404).json({ error: 'Product file not found' });
    }

    const { data: signedData, error: signedError } = await supabase
      .storage
      .from(appBucket)
      .createSignedUrl(product.fileUrl, 120);

    if (signedError || !signedData?.signedUrl) {
      return res.status(500).json({ error: 'Failed to prepare file for VirusTotal scan' });
    }

    const fileRes = await fetch(signedData.signedUrl);
    if (!fileRes.ok) {
      return res.status(500).json({ error: 'Failed to download file for VirusTotal scan' });
    }

    const fileBuffer = await fileRes.arrayBuffer();
    const fileBlob = new Blob([fileBuffer]);
    const form = new FormData();
    form.append('file', fileBlob, safeName(product.fileUrl.split('/').pop() || `${product.id}.bin`));

    const vtRes = await fetch('https://www.virustotal.com/api/v3/files', {
      method: 'POST',
      headers: {
        'x-apikey': apiKey,
      },
      body: form,
    });

    const vtData = await vtRes.json();
    if (!vtRes.ok) {
      return res.status(vtRes.status).json({
        error: vtData?.error?.message || 'VirusTotal scan upload failed',
      });
    }

    const analysisId = vtData?.data?.id;
    return res.status(202).json({
      message: 'Scan submitted to VirusTotal',
      analysisId,
      analysisUrl: analysisId ? `https://www.virustotal.com/gui/file-analysis/${analysisId}` : null,
    });
  } catch (error) {
    console.error('VirusTotal scan error:', error);
    return res.status(500).json({ error: 'Failed to submit VirusTotal scan' });
  }
};
