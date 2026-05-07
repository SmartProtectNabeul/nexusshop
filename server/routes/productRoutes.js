const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const reviewController = require('../controllers/reviewController');
const multer = require('multer');

// Get all products (Public)
router.get('/', productController.getProducts);

// Search products (Public)
router.get('/search', productController.searchProducts);

// Get specific product (Public)
router.get('/:id', productController.getProduct);

const authMiddleware = require('../lib/authMiddleware');
const upload = multer({
	storage: multer.memoryStorage(),
	limits: {
		fileSize: 50 * 1024 * 1024,
	},
});

// Secure download route for purchased products
router.get('/:id/download', authMiddleware, productController.downloadProduct);
router.get('/:id/reviews', reviewController.listReviews);
router.post('/:id/reviews', authMiddleware, reviewController.upsertReview);

router.post(
	'/upload-assets',
	authMiddleware,
	upload.fields([
		{ name: 'appFile', maxCount: 1 },
		{ name: 'thumbnail', maxCount: 1 },
		{ name: 'media', maxCount: 6 },
	]),
	productController.uploadProductAssets
);

// Developer route to upload new product
router.post('/', authMiddleware, productController.createProduct);

module.exports = router;
