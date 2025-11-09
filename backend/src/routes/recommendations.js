const router = require("express").Router();
const {
  getRecommendations,
  saveRecommendations,
  regenerateRecommendations,
} = require("../controllers/recommendationController");
const { requireAuth } = require("../middleware/authMiddleware");

/**
 * @swagger
 * /api/recommendations/{userId}:
 *   get:
 *     summary: Get user recommendations (Authenticated users only)
 *     description: Returns cached recommendations or generates new ones if cache is old
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
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 */
router.get("/:userId", requireAuth, getRecommendations);

/**
 * @swagger
 * /api/recommendations/{userId}/regenerate:
 *   post:
 *     summary: Force regenerate recommendations for a user
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
 *         description: Recommendations regenerated
 *       401:
 *         description: Unauthorized
 */
router.post("/:userId/regenerate", requireAuth, regenerateRecommendations);

/**
 * @swagger
 * /api/recommendations/{userId}:
 *   post:
 *     summary: Manually save recommendations (Admin only)
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
 *     responses:
 *       201:
 *         description: Recommendations saved
 *       401:
 *         description: Unauthorized
 */
router.post("/:userId", requireAuth, saveRecommendations);

module.exports = router;
