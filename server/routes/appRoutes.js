const express = require('express');
const router = express.Router();
const {
	submitApp,
	listPendingApps,
	reviewSubmittedApp,
	getPublishingEligibility,
} = require('../controllers/submitAppController');
const productController = require('../controllers/productController');
const authMiddleware = require('../lib/authMiddleware');

router.post('/submit', authMiddleware, submitApp);
router.get('/publishing-eligibility', authMiddleware, getPublishingEligibility);
router.get('/admin/pending', authMiddleware, authMiddleware.requireRole('ADMIN'), listPendingApps);
router.post('/admin/review', authMiddleware, authMiddleware.requireRole('ADMIN'), reviewSubmittedApp);
router.get('/admin/live-products', authMiddleware, authMiddleware.requireRole('ADMIN'), productController.adminListLiveProducts);
router.put('/admin/featured-products', authMiddleware, authMiddleware.requireRole('ADMIN'), productController.adminSetFeaturedProducts);
router.get('/admin/download/:id', authMiddleware, authMiddleware.requireRole('ADMIN'), productController.adminDownloadProduct);
router.post('/admin/scan/:id', authMiddleware, authMiddleware.requireRole('ADMIN'), productController.adminVirusTotalScan);

module.exports = router;
