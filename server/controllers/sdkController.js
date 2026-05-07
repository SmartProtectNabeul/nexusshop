const prisma = require('../lib/prisma');
const crypto = require('crypto');

// Utility to generate a secure random token
const generateToken = (prefix = '') => {
  return `${prefix}${crypto.randomBytes(24).toString('hex')}`;
};

/**
 * Public SDK endpoint: Verify a license
 * POST /api/sdk/v1/verify
 */
exports.verifyLicense = async (req, res) => {
  const { productApiKey, userToken } = req.body;

  if (!productApiKey || !userToken) {
    return res.status(400).json({ 
      valid: false, 
      error: 'Missing productApiKey or userToken' 
    });
  }

  try {
    // 1. Find the product by API key
    const product = await prisma.product.findUnique({
      where: { apiKey: productApiKey },
      include: { developer: true }
    });

    if (!product) {
      return res.status(404).json({ 
        valid: false, 
        error: 'Invalid Product API Key' 
      });
    }

    // 2. Find the user by License Token
    const licenseToken = await prisma.licenseToken.findUnique({
      where: { token: userToken },
      include: { user: true }
    });

    if (!licenseToken) {
      return res.status(401).json({ 
        valid: false, 
        error: 'Invalid User License Token' 
      });
    }

    const userId = licenseToken.userId;
    const productId = product.id;

    // 3. Check ownership logic
    // - Is the user the developer?
    // - Is the product free?
    // - Has the user purchased the product?
    const isDeveloper = product.developerId === userId;
    const isFree = product.price === 0;
    
    let isOwner = isDeveloper || isFree;

    if (!isOwner) {
      const transaction = await prisma.transaction.findUnique({
        where: {
          buyerId_productId: {
            buyerId: userId,
            productId: productId
          }
        }
      });
      isOwner = !!transaction;
    }

    // 4. Update lastUsed timestamp
    await prisma.licenseToken.update({
      where: { id: licenseToken.id },
      data: { lastUsed: new Date() }
    });

    if (isOwner) {
      return res.status(200).json({
        valid: true,
        licenseStatus: 'OWNED',
        productTitle: product.title,
        userName: licenseToken.user.email,
        timestamp: new Date().toISOString()
      });
    } else {
      return res.status(403).json({
        valid: false,
        licenseStatus: 'NOT_OWNED',
        error: 'User has not purchased this product'
      });
    }

  } catch (_error) {
    console.error('SDK Verification Error:', _error);
    return res.status(500).json({ 
      valid: false, 
      error: 'Internal server error during verification' 
    });
  }
};

/**
 * Developer endpoint: Get existing Product API Key
 * GET /api/products/:id/api-key
 */
exports.getProductKey = async (req, res) => {
  const { id: productId } = req.params;
  const userId = req.userId;

  try {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { apiKey: true, developerId: true }
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (product.developerId !== userId) {
      return res.status(403).json({ error: 'Only the developer can view the API key' });
    }

    return res.status(200).json({ apiKey: product.apiKey });

  } catch (_error) {
    return res.status(500).json({ error: 'Failed to fetch API key' });
  }
};

/**
 * Developer endpoint: Get or regenerate Product API Key
 * POST /api/products/:id/api-key
 */
exports.getOrRegenerateProductKey = async (req, res) => {
  const { id: productId } = req.params;
  const userId = req.userId; // From authMiddleware

  try {
    const product = await prisma.product.findUnique({
      where: { id: productId }
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (product.developerId !== userId) {
      return res.status(403).json({ error: 'Only the developer can manage API keys' });
    }

    const newApiKey = generateToken('np_'); // np = Nexus Product

    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: { apiKey: newApiKey }
    });

    return res.status(200).json({ apiKey: updatedProduct.apiKey });

  } catch (_error) {
    console.error('Error managing Product API key:', _error);
    return res.status(500).json({ error: 'Failed to manage API key' });
  }
};

/**
 * User endpoint: List license tokens
 * GET /api/users/license-tokens
 */
exports.listLicenseTokens = async (req, res) => {
  const userId = req.userId;

  try {
    const tokens = await prisma.licenseToken.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        token: true, // In a real production app, you might want to mask this
        name: true,
        createdAt: true,
        lastUsed: true
      }
    });
    return res.status(200).json(tokens);
  } catch (_error) {
    return res.status(500).json({ error: 'Failed to list license tokens' });
  }
};

/**
 * User endpoint: Create license token
 * POST /api/users/license-tokens
 */
exports.createLicenseToken = async (req, res) => {
  const userId = req.userId;
  const { name } = req.body;

  try {
    const newToken = generateToken('nlt_'); // nlt = Nexus License Token

    const licenseToken = await prisma.licenseToken.create({
      data: {
        token: newToken,
        name: name || 'Default Token',
        userId
      }
    });

    return res.status(201).json(licenseToken);
  } catch (_error) {
    return res.status(500).json({ error: 'Failed to create license token' });
  }
};

/**
 * User endpoint: Delete license token
 * DELETE /api/users/license-tokens/:id
 */
exports.deleteLicenseToken = async (req, res) => {
  const userId = req.userId;
  const { id } = req.params;

  try {
    const token = await prisma.licenseToken.findUnique({
      where: { id }
    });

    if (!token || token.userId !== userId) {
      return res.status(404).json({ error: 'Token not found' });
    }

    await prisma.licenseToken.delete({
      where: { id }
    });

    return res.status(204).send();
  } catch (error) {
    return res.status(500).json({ error: 'Failed to delete token' });
  }
};
