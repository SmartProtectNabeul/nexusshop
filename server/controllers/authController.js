const prisma = require('../lib/prisma');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');

const jwtSecret = process.env.JWT_SECRET || 'nexusshop_super_secret_key_123';
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const signToken = (user) => {
  return jwt.sign({ userId: user.id, role: user.role }, jwtSecret, { expiresIn: '7d' });
};

const publicUser = (user) => {
  const { password: _, ...safeUser } = user;
  return {
    ...safeUser,
    credits: Number(safeUser.credits ?? 0),
    walletBalance: Number(safeUser.walletBalance ?? 0),
    hasPassword: Boolean(user.password),
  };
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Google-created accounts can add a password later from authenticated Settings.
    if (!user.password) {
      return res.status(401).json({
        error: 'This account does not have a password yet. Sign in with Google once, then set a password in Settings.'
      });
    }

    // Check if the password is plain text (legacy) or hashed
    let isMatch = false;
    if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$')) {
      isMatch = await bcrypt.compare(password, user.password);
    } else {
      isMatch = (user.password === password);
    }

    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = signToken(user);
    
    res.status(200).json({ user: publicUser(user), token });
  } catch (_error) {
    res.status(500).json({ error: 'Login failed' });
  }
};

const register = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }
    
    let user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      return res.status(400).json({ error: 'User already exists' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const accountRole = role === 'DEVELOPER' ? 'DEVELOPER' : 'CONSUMER';

    user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role: accountRole,
        credits: 0
      }
    });
    
    const token = signToken(user);
    
    res.status(201).json({ user: publicUser(user), token, isNewUser: true });
  } catch (_error) {
    res.status(500).json({ error: 'Registration failed' });
  }
};

const googleLogin = async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ error: 'Google credential token is required' });
    }

    if (!process.env.GOOGLE_CLIENT_ID) {
      return res.status(500).json({ error: 'Google OAuth is not configured on the server' });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    if (!payload || !payload.email || payload.email_verified !== true) {
      return res.status(401).json({ error: 'Invalid Google account payload' });
    }

    const email = payload.email;
    
    let user = await prisma.user.findUnique({ where: { email } });
    let isNewUser = false;
    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          credits: 0
        }
      });
      isNewUser = true;
    }
    
    const token = signToken(user);
    
    res.status(200).json({ user: publicUser(user), token, isNewUser });
  } catch (_error) {
    res.status(500).json({ error: 'Google login failed' });
  }
};

module.exports = {
  login,
  register,
  googleLogin
};
