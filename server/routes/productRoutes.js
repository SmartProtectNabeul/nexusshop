const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');

// Get all products (Public)
router.get('/', productController.getProducts);

// Get specific product (Public)
router.get('/:id', productController.getProduct);

// Secure download route for purchased products
// In a real app, you would add an Auth Middleware here to extract req.user
router.get('/:id/download', productController.downloadProduct);

// Developer route to upload new product (would be protected by Auth Middleware)
router.post('/', productController.createProduct);

module.exports = router;
