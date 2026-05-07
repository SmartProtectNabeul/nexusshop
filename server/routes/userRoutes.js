const express = require('express');
const router = express.Router();
const { updateUser, deleteUser, getUser } = require('../controllers/userController');
const authMiddleware = require('../lib/authMiddleware');

router.get('/:id', authMiddleware, getUser);
router.put('/:id', authMiddleware, updateUser);
router.delete('/:id', authMiddleware, deleteUser);

module.exports = router;
