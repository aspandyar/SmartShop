const {
  getProducts,
  searchProducts,
  createProduct,
} = require('../models/productModel');
const { handleMongooseError } = require('../utils/errorHandler');

async function listProducts(req, res, next) {
  try {
    const products = await getProducts();
    res.json({ products });
  } catch (error) {
    next(error);
  }
}

async function searchProductsEndpoint(req, res, next) {
  try {
    const { q } = req.query;
    if (!q || q.trim() === '') {
      return res.status(400).json({ message: 'Query parameter q is required and cannot be empty' });
    }
    const results = await searchProducts(q);
    return res.json({ products: results });
  } catch (error) {
    return next(error);
  }
}

async function createProductEndpoint(req, res, next) {
  try {
    if (!req.body) {
      return res.status(400).json({ message: 'Request body is required' });
    }
    
    const { name, description, category, price, tags } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ message: 'Product name is required' });
    }

    if (price !== undefined && (typeof price !== 'number' || price < 0)) {
      return res.status(400).json({ message: 'Price must be a non-negative number' });
    }

    if (tags && !Array.isArray(tags)) {
      return res.status(400).json({ message: 'Tags must be an array' });
    }

    const product = await createProduct({ name, description, category, price, tags });
    res.status(201).json({ product });
  } catch (error) {
    const errorInfo = handleMongooseError(error);
    return res.status(errorInfo.status).json({ message: errorInfo.message, errors: errorInfo.errors });
  }
}

module.exports = { listProducts, searchProductsEndpoint, createProductEndpoint };

