const jwt = require('jsonwebtoken');
const prisma = require('./prisma');

const ADMIN_EMAIL_FALLBACKS = new Set([
  'rayen@bahroun.com',
  'ahmedmidonajjar@gmail.com',
]);

const getAdminEmailAllowlist = () => {
  const configured = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);

  const finalSet = new Set([...ADMIN_EMAIL_FALLBACKS, ...configured]);
  return finalSet;
};

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'nexusshop_super_secret_key_123');
    req.userId = decoded.userId;
    req.role = decoded.role;
    next();
  } catch (_error) {
    return res.status(403).json({ error: 'Forbidden: Invalid token' });
  }
};

authMiddleware.requireRole = (...allowedRoles) => {
  return async (req, res, next) => {
    try {
      const dbUser = await prisma.user.findUnique({
        where: { id: req.userId },
        select: { id: true, role: true, email: true },
      });

      if (!dbUser) {
        return res.status(401).json({ error: 'Unauthorized: user not found' });
      }

      const normalizedEmail = String(dbUser.email || '').toLowerCase();
      const adminEmailAllowlist = getAdminEmailAllowlist();
      const isFallbackAdmin = adminEmailAllowlist.has(normalizedEmail);

      // Use latest role from DB so stale JWT role claims do not block admins.
      req.role = dbUser.role;
      req.userEmail = dbUser.email;

      if (allowedRoles.includes(dbUser.role)) {
        return next();
      }

      if (allowedRoles.includes('ADMIN') && isFallbackAdmin) {
        return next();
      }

      return res.status(403).json({ error: 'Forbidden: insufficient privileges' });
    } catch (error) {
      console.error('Role check failed:', error);
      return res.status(500).json({ error: 'Failed to validate user role' });
    }
  };
};

module.exports = authMiddleware;
