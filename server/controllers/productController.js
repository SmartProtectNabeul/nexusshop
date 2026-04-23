const prisma = require('../lib/prisma');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder'
);

exports.getProducts = async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      where: { status: 'LIVE' },
      include: {
        developer: {
          select: { email: true } // Don't expose sensitive info
        }
      }
    });
    res.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
};

exports.getProduct = async (req, res) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: {
        developer: {
          select: { email: true }
        }
      }
    });
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch product' });
  }
};

exports.createProduct = async (req, res) => {
  // In a real app, you would get req.userId from auth middleware
  const { title, description, price, category, fileUrl, thumbnailUrl, mediaUrls, demoVideoUrl, developerId } = req.body;
  
  try {
    const product = await prisma.product.create({
      data: {
        title,
        description,
        price: parseFloat(price),
        category,
        fileUrl,
        thumbnailUrl,
        mediaUrls: mediaUrls || [],
        demoVideoUrl,
        developerId,
        status: 'PENDING' // Requires admin approval
      }
    });
    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create product' });
  }
};

// Task 3: Secure File Delivery
exports.downloadProduct = async (req, res) => {
  const { id: productId } = req.params;
  // Mocking auth middleware by taking userId from query for this demonstration
  const { userId } = req.query; 

  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    // 1. Verify user purchased the product
    const transaction = await prisma.transaction.findFirst({
      where: {
        buyerId: userId,
        productId: productId
      }
    });

    if (!transaction) {
      return res.status(403).json({ error: 'You have not purchased this product.' });
    }

    const product = await prisma.product.findUnique({
      where: { id: productId }
    });

    // 2. Generate secure, short-lived signed URL using Supabase Storage
    // Assuming files are stored in a private bucket called 'product-binaries'
    const { data, error } = await supabase
      .storage
      .from('product-binaries')
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
