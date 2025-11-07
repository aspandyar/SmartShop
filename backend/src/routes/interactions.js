const router = require('express').Router();
const {
  createInteraction,
  listUserInteractions,
} = require('../controllers/interactionController');

/**
 * @swagger
 * /api/interactions:
 *   post:
 *     summary: Create a new interaction
 *     tags: [Interactions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - productId
 *               - type
 *             properties:
 *               userId:
 *                 type: string
 *                 example: 507f1f77bcf86cd799439011
 *               productId:
 *                 type: string
 *                 example: 507f1f77bcf86cd799439011
 *               type:
 *                 type: string
 *                 example: view
 *     responses:
 *       201:
 *         description: Interaction created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 interaction:
 *                   $ref: '#/components/schemas/Interaction'
 *       400:
 *         description: Validation error
 *       404:
 *         description: User, product, or interaction type not found
 */
router.post('/', createInteraction);

/**
 * @swagger
 * /api/interactions/{userId}:
 *   get:
 *     summary: Get all interactions for a user
 *     tags: [Interactions]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User interactions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 interactions:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Interaction'
 *       404:
 *         description: User not found
 */
router.get('/:userId', listUserInteractions);

module.exports = router;
