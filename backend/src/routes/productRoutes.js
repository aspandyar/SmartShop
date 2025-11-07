const router = require('express').Router();
const {
  listProducts,
  searchProductsEndpoint,
  createProductEndpoint,
  getProduct,
  updateProductEndpoint,
  deleteProductEndpoint,
} = require('../controllers/productController');
const { requireAdmin } = require('../middleware/authMiddleware');

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Get all products
 *     tags: [Products]
 *     responses:
 *       200:
 *         description: List of products
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 products:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Product'
 */
router.get('/', listProducts);

/**
 * @swagger
 * /api/products/search:
 *   get:
 *     summary: Search products by keyword
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search keyword
 *     responses:
 *       200:
 *         description: Search results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 products:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Product'
 */
router.get('/search', searchProductsEndpoint);

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     summary: Get product by ID
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Product details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 product:
 *                   $ref: '#/components/schemas/Product'
 *       404:
 *         description: Product not found
 */
router.get('/:id', getProduct);

/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: Create a new product (Admin only)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 example: Smart Fitness Tracker
 *               description:
 *                 type: string
 *                 example: Monitor your health metrics
 *               category:
 *                 type: string
 *                 example: Wearables
 *               price:
 *                 type: number
 *                 example: 129.99
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: [fitness, health]
 *     responses:
 *       201:
 *         description: Product created
 *       403:
 *         description: Admin access required
 */
router.post('/', requireAdmin, createProductEndpoint);

/**
 * @swagger
 * /api/products/{id}:
 *   put:
 *     summary: Update product (Admin only)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               category:
 *                 type: string
 *               price:
 *                 type: number
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Product updated
 *       403:
 *         description: Admin access required
 */
router.put('/:id', requireAdmin, updateProductEndpoint);

/**
 * @swagger
 * /api/products/{id}:
 *   patch:
 *     summary: Partially update product (Admin only)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Product updated
 *       403:
 *         description: Admin access required
 */
router.patch('/:id', requireAdmin, updateProductEndpoint);

/**
 * @swagger
 * /api/products/{id}:
 *   delete:
 *     summary: Delete product (Admin only)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Product deleted
 *       403:
 *         description: Admin access required
 */
router.delete('/:id', requireAdmin, deleteProductEndpoint);

module.exports = router;
