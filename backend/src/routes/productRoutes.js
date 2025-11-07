const router = require('express').Router();
const {
  listProducts,
  searchProductsEndpoint,
  createProductEndpoint,
} = require('../controllers/productController');

router.get('/', listProducts);
router.get('/search', searchProductsEndpoint);
router.post('/', createProductEndpoint);

module.exports = router;

