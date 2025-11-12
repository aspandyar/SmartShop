const router = require("express").Router();
const {
  listUsers,
  getUser,
  createUserEndpoint,
  updateOwnProfile,
  updateUserEndpoint,
  deleteUserEndpoint,
} = require("../controllers/userController");
const { requireAuth, requireAdmin } = require("../middleware/authMiddleware");

/**
 * @swagger
 * /api/users/profile:
 *   put:
 *     summary: Update own profile (Authenticated users)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 example: johndoe
 *               email:
 *                  type: string
 *                  example: john@example.com
 *               age:
 *                 type: number
 *                 example: 26
 *               gender:
 *                 type: string
 *                 enum: [male, female, other, '']
 *                 example: male
 *               preferences:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: [electronics, books, sports]
 *               currentPassword:
 *                 type: string
 *                 description: Required if changing password
 *                 example: password123
 *               newPassword:
 *                 type: string
 *                 description: New password (min 6 characters)
 *                 example: newpassword123
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       401:
 *         description: Unauthorized or incorrect current password
 *       400:
 *         description: Validation error
 */
router.put("/profile", requireAuth, updateOwnProfile);

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get all users (Admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of users
 *       403:
 *         description: Admin access required
 */
router.get("/", requireAdmin, listUsers);

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Get user by ID (Admin only)
 *     tags: [Users]
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
 *         description: User details
 *       403:
 *         description: Admin access required
 *       404:
 *         description: User not found
 */
router.get("/:id", requireAdmin, getUser);

/**
 * @swagger
 * /api/users:
 *   post:
 *     summary: Create a new user (Public registration)
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - passwordHash
 *             properties:
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *               passwordHash:
 *                 type: string
 *               age:
 *                 type: number
 *               gender:
 *                 type: string
 *               preferences:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: User created
 */
router.post("/", createUserEndpoint);

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: Update user (Admin only)
 *     tags: [Users]
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
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *               age:
 *                 type: number
 *               gender:
 *                 type: string
 *               preferences:
 *                 type: array
 *                 items:
 *                   type: string
 *               role:
 *                 type: string
 *                 enum: [user, admin]
 *     responses:
 *       200:
 *         description: User updated
 *       403:
 *         description: Admin access required
 */
router.put("/:id", requireAdmin, updateUserEndpoint);

/**
 * @swagger
 * /api/users/{id}:
 *   patch:
 *     summary: Partially update user (Admin only)
 *     tags: [Users]
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
 *         description: User updated
 *       403:
 *         description: Admin access required
 */
router.patch("/:id", requireAdmin, updateUserEndpoint);

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: Delete user (Admin only)
 *     tags: [Users]
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
 *         description: User deleted
 *       403:
 *         description: Admin access required
 */
router.delete("/:id", requireAdmin, deleteUserEndpoint);

module.exports = router;
