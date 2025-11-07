const router = require('express').Router();
const {
  listTypes,
  getType,
  createTypeEndpoint,
  updateTypeEndpoint,
  deleteTypeEndpoint,
} = require('../controllers/interactionTypeController');
const { requireAdmin } = require('../middleware/authMiddleware');

/**
 * @swagger
 * /api/interaction-types:
 *   get:
 *     summary: Get all interaction types
 *     tags: [Interaction Types]
 *     responses:
 *       200:
 *         description: List of interaction types
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 types:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/InteractionType'
 */
router.get('/', listTypes); // Public - users need to see available types

/**
 * @swagger
 * /api/interaction-types/{name}:
 *   get:
 *     summary: Get interaction type by name
 *     tags: [Interaction Types]
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Interaction type details
 *       404:
 *         description: Interaction type not found
 */
router.get('/:name', getType);

/**
 * @swagger
 * /api/interaction-types:
 *   post:
 *     summary: Create a new interaction type (Admin only)
 *     tags: [Interaction Types]
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
 *               - displayName
 *             properties:
 *               name:
 *                 type: string
 *                 example: favorite
 *               displayName:
 *                 type: string
 *                 example: Favorite
 *               description:
 *                 type: string
 *                 example: User favorited a product
 *               isActive:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       201:
 *         description: Interaction type created
 *       403:
 *         description: Admin access required
 */
router.post('/', requireAdmin, createTypeEndpoint);

/**
 * @swagger
 * /api/interaction-types/{name}:
 *   put:
 *     summary: Update interaction type (Admin only)
 *     tags: [Interaction Types]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: name
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
 *               displayName:
 *                 type: string
 *               description:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Interaction type updated
 *       403:
 *         description: Admin access required
 */
router.put('/:name', requireAdmin, updateTypeEndpoint);

/**
 * @swagger
 * /api/interaction-types/{name}:
 *   patch:
 *     summary: Partially update interaction type (Admin only)
 *     tags: [Interaction Types]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: name
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
 *         description: Interaction type updated
 *       403:
 *         description: Admin access required
 */
router.patch('/:name', requireAdmin, updateTypeEndpoint);

/**
 * @swagger
 * /api/interaction-types/{name}:
 *   delete:
 *     summary: Delete interaction type (Admin only)
 *     tags: [Interaction Types]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Interaction type deleted
 *       403:
 *         description: Admin access required
 */
router.delete('/:name', requireAdmin, deleteTypeEndpoint);

module.exports = router;
