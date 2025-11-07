const router = require('express').Router();
const { listProducts, recommendProducts } = require('../controllers/productController');
const { requireAuth } = require('../middleware/authMiddleware');

router.get('/', listProducts);
router.get('/:userId/recommendations', requireAuth, recommendProducts);

module.exports = router;

