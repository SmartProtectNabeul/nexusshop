const express = require('express');
const router = express.Router();
const sdkController = require('../controllers/sdkController');
const authMiddleware = require('../lib/authMiddleware');

// Public SDK Verification (No user login required here, but keys are checked)
router.post('/v1/verify', sdkController.verifyLicense);

// Developer Product API Key Management
router.get('/product/:id/api-key', authMiddleware, sdkController.getProductKey);
router.post('/product/:id/api-key', authMiddleware, sdkController.getOrRegenerateProductKey);

// User License Token Management
router.get('/license-tokens', authMiddleware, sdkController.listLicenseTokens);
router.post('/license-tokens', authMiddleware, sdkController.createLicenseToken);
router.delete('/license-tokens/:id', authMiddleware, sdkController.deleteLicenseToken);

module.exports = router;
