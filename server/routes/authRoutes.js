const express = require('express');
const router = express.Router();
const { login, register, googleLogin } = require('../controllers/authController');

router.post('/login', login);
router.post('/register', register);
router.post('/google', googleLogin);

module.exports = router;
