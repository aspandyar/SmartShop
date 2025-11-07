const router = require('express').Router();
const {
  getRecommendations,
  saveRecommendations,
} = require('../controllers/recommendationController');
const { requireAuth } = require('../middleware/authMiddleware');

/**
 * @swagger
 * /api/recommendations/{userId}:
 *   get:
 *     summary: Get user recommendations (Authenticated users only)
 *     tags: [Recommendations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User recommendations
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 recommendations:
 *                   $ref: '#/components/schemas/Recommendation'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: No recommendations found
 */
router.get('/:userId', requireAuth, getRecommendations);

/**
 * @swagger
 * /api/recommendations/{userId}:
 *   post:
 *     summary: Save user recommendations (Authenticated users only)
 *     tags: [Recommendations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
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
 *               recommendations:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     productId:
 *                       type: string
 *                     score:
 *                       type: number
 *                       minimum: 0
 *                       maximum: 1
 *     responses:
 *       201:
 *         description: Recommendations saved
 *       401:
 *         description: Unauthorized
 */
router.post('/:userId', requireAuth, saveRecommendations);

module.exports = router;
