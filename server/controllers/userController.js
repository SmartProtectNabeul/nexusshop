const prisma = require('../lib/prisma');
const bcrypt = require('bcryptjs');

const canAccessUser = (requestUserId, requestRole, targetUserId) => {
  return requestRole === 'ADMIN' || requestUserId === targetUserId;
};

// GET /api/users/:id
const getUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (!canAccessUser(req.userId, req.role, id)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, role: true, credits: true, walletBalance: true }
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.status(200).json(user);
  } catch (error) {
    console.error('Error getting user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
};

// PUT /api/users/:id
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { role, password } = req.body;

    if (!canAccessUser(req.userId, req.role, id)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    const dataToUpdate = {};

    if (typeof role === 'string') {
      // Only admins can grant ADMIN role.
      if (role === 'ADMIN' && req.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Only admins can assign admin role' });
      }
      dataToUpdate.role = role;
    }

    if (password) {
      if (String(password).length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters long' });
      }
      dataToUpdate.password = await bcrypt.hash(password, 10);
    }

    if (Object.keys(dataToUpdate).length === 0) {
      return res.status(400).json({ error: 'No valid fields provided to update' });
    }

    const user = await prisma.user.update({
      where: { id },
      data: dataToUpdate,
      select: { id: true, email: true, role: true, credits: true, walletBalance: true }
    });
    
    res.status(200).json({ message: 'User updated', user });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
};

// DELETE /api/users/:id
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (!canAccessUser(req.userId, req.role, id)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    await prisma.user.delete({
      where: { id }
    });
    
    res.status(200).json({ message: 'Account deleted' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
};

module.exports = {
  getUser,
  updateUser,
  deleteUser
};
