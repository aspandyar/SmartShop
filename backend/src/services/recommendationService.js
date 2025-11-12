const { Interaction } = require("../models/Interaction");
const { Product } = require("../models/productModel");
const { User } = require("../models/User");

/**
 * Collaborative Filtering Recommendation Engine
 * Implements both User-Based and Item-Based Collaborative Filtering
 */

class RecommendationService {
  /**
   * Calculate similarity between two users using Jaccard similarity
   * @param {Array} user1Products - Product IDs interacted by user 1
   * @param {Array} user2Products - Product IDs interacted by user 2
   * @returns {number} Similarity score between 0 and 1
   */
  calculateJaccardSimilarity(user1Products, user2Products) {
    const set1 = new Set(user1Products.map(String));
    const set2 = new Set(user2Products.map(String));

    const intersection = new Set([...set1].filter((x) => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    return union.size === 0 ? 0 : intersection.size / union.size;
  }

  /**
   * Calculate similarity using Cosine similarity
   * @param {Object} user1Interactions - User 1 interaction weights
   * @param {Object} user2Interactions - User 2 interaction weights
   * @returns {number} Similarity score between 0 and 1
   */
  calculateCosineSimilarity(user1Interactions, user2Interactions) {
    const products = new Set([
      ...Object.keys(user1Interactions),
      ...Object.keys(user2Interactions),
    ]);

    let dotProduct = 0;
    let magnitude1 = 0;
    let magnitude2 = 0;

    for (const productId of products) {
      const weight1 = user1Interactions[productId] || 0;
      const weight2 = user2Interactions[productId] || 0;

      dotProduct += weight1 * weight2;
      magnitude1 += weight1 * weight1;
      magnitude2 += weight2 * weight2;
    }

    const magnitude = Math.sqrt(magnitude1) * Math.sqrt(magnitude2);
    return magnitude === 0 ? 0 : dotProduct / magnitude;
  }

  /**
   * Get interaction weights for different interaction types
   */
  getInteractionWeights() {
    return {
      view: 1,
      like: 3,
      purchase: 5,
      favorite: 4,
      cart: 2,
    };
  }

  /**
   * Build user-product interaction matrix with weights
   * @returns {Object} User interaction matrix
   */
  async buildInteractionMatrix() {
    const interactions = await Interaction.find({}).lean();
    const weights = this.getInteractionWeights();
    const matrix = {};

    for (const interaction of interactions) {
      const userId = String(interaction.userId);
      const productId = String(interaction.productId);
      const weight = weights[interaction.type] || 1;

      if (!matrix[userId]) {
        matrix[userId] = {};
      }

      // Accumulate weights for multiple interactions
      matrix[userId][productId] = (matrix[userId][productId] || 0) + weight;
    }

    return matrix;
  }

  /**
   * Find similar users using User-Based Collaborative Filtering
   * @param {string} userId - Target user ID
   * @param {number} topN - Number of similar users to return
   * @returns {Array} Array of similar users with similarity scores
   */
  async findSimilarUsers(userId, topN = 5) {
    const matrix = await this.buildInteractionMatrix();
    const targetUserInteractions = matrix[String(userId)] || {};

    if (Object.keys(targetUserInteractions).length === 0) {
      return [];
    }

    const similarities = [];

    for (const [otherUserId, otherUserInteractions] of Object.entries(matrix)) {
      if (otherUserId === String(userId)) continue;

      const similarity = this.calculateCosineSimilarity(
        targetUserInteractions,
        otherUserInteractions
      );

      if (similarity > 0) {
        similarities.push({
          userId: otherUserId,
          similarity,
        });
      }
    }

    // Sort by similarity and return top N
    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topN);
  }

  /**
   * Get user-based collaborative filtering recommendations
   * @param {string} userId - Target user ID
   * @param {number} limit - Number of recommendations to return
   * @returns {Array} Array of recommended products with scores
   */
  async getUserBasedRecommendations(userId, limit = 10) {
    const similarUsers = await this.findSimilarUsers(userId);

    if (similarUsers.length === 0) {
      return this.getPopularProducts(limit);
    }

    const matrix = await this.buildInteractionMatrix();
    const targetUserInteractions = matrix[String(userId)] || {};
    const recommendations = {};

    // Aggregate recommendations from similar users
    for (const { userId: similarUserId, similarity } of similarUsers) {
      const similarUserInteractions = matrix[similarUserId] || {};

      for (const [productId, weight] of Object.entries(
        similarUserInteractions
      )) {
        // Skip products user has already interacted with
        if (targetUserInteractions[productId]) continue;

        if (!recommendations[productId]) {
          recommendations[productId] = 0;
        }

        // Weight by user similarity
        recommendations[productId] += weight * similarity;
      }
    }

    // Convert to array and sort
    const sortedRecommendations = Object.entries(recommendations)
      .map(([productId, score]) => ({ productId, score }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    // Fetch product details
    const productIds = sortedRecommendations.map((r) => r.productId);
    const products = await Product.find({ _id: { $in: productIds } }).lean();

    return sortedRecommendations.map((rec) => {
      const product = products.find((p) => String(p._id) === rec.productId);
      return {
        productId: product,
        score: rec.score,
      };
    });
  }

  /**
   * Get item-based collaborative filtering recommendations
   * @param {string} userId - Target user ID
   * @param {number} limit - Number of recommendations to return
   * @returns {Array} Array of recommended products
   */
  async getItemBasedRecommendations(userId, limit = 10) {
    // Get user's interaction history
    const userInteractions = await Interaction.find({ userId }).lean();

    if (userInteractions.length === 0) {
      return this.getPopularProducts(limit);
    }

    const matrix = await this.buildInteractionMatrix();
    const recommendations = {};

    // For each product the user interacted with
    for (const interaction of userInteractions) {
      const sourceProductId = String(interaction.productId);

      // Find users who interacted with this product
      const usersWithSameProduct = Object.entries(matrix)
        .filter(([uid, products]) => products[sourceProductId])
        .map(([uid]) => uid);

      // Find what else these users interacted with
      for (const otherUserId of usersWithSameProduct) {
        const otherUserProducts = matrix[otherUserId];

        for (const [productId, weight] of Object.entries(otherUserProducts)) {
          // Skip if user already interacted with this product
          if (userInteractions.some((i) => String(i.productId) === productId)) {
            continue;
          }

          if (!recommendations[productId]) {
            recommendations[productId] = 0;
          }

          recommendations[productId] += weight;
        }
      }
    }

    // Convert to array and sort
    const sortedRecommendations = Object.entries(recommendations)
      .map(([productId, score]) => ({ productId, score }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    // Fetch product details
    const productIds = sortedRecommendations.map((r) => r.productId);
    const products = await Product.find({ _id: { $in: productIds } }).lean();

    return sortedRecommendations.map((rec) => {
      const product = products.find((p) => String(p._id) === rec.productId);
      return {
        productId: product,
        score: rec.score,
      };
    });
  }

  /**
   * Get content-based recommendations using user preferences
   * @param {string} userId - Target user ID
   * @param {number} limit - Number of recommendations
   * @returns {Array} Array of recommended products
   */
  async getContentBasedRecommendations(userId, limit = 10) {
    const user = await User.findById(userId).lean();

    if (!user || !user.preferences || user.preferences.length === 0) {
      return this.getPopularProducts(limit);
    }

    // Find products matching user preferences
    const products = await Product.find({
      $or: [
        { category: { $in: user.preferences } },
        { tags: { $in: user.preferences } },
      ],
    })
      .limit(limit)
      .lean();

    // Get user's interaction history to filter out seen products
    const userInteractions = await Interaction.find({ userId }).lean();
    const interactedProductIds = new Set(
      userInteractions.map((i) => String(i.productId))
    );

    // Filter out products user has already interacted with
    const filteredProducts = products.filter(
      (p) => !interactedProductIds.has(String(p._id))
    );

    return filteredProducts.map((product) => ({
      productId: product,
      score: 1.0,
    }));
  }

  /**
   * Get hybrid recommendations combining multiple algorithms
   * @param {string} userId - Target user ID
   * @param {number} limit - Number of recommendations
   * @returns {Array} Array of recommended products
   */
  async getHybridRecommendations(userId, limit = 10) {
    // Get recommendations from different algorithms
    const [userBased, itemBased, contentBased] = await Promise.all([
      this.getUserBasedRecommendations(userId, limit),
      this.getItemBasedRecommendations(userId, limit),
      this.getContentBasedRecommendations(userId, limit),
    ]);

    // Combine and weight recommendations
    const combinedScores = {};
    const weights = {
      userBased: 0.4,
      itemBased: 0.4,
      contentBased: 0.2,
    };

    // Add user-based scores
    for (const rec of userBased) {
      const id = String(rec.productId._id);
      combinedScores[id] =
        (combinedScores[id] || 0) + rec.score * weights.userBased;
    }

    // Add item-based scores
    for (const rec of itemBased) {
      const id = String(rec.productId._id);
      combinedScores[id] =
        (combinedScores[id] || 0) + rec.score * weights.itemBased;
    }

    // Add content-based scores
    for (const rec of contentBased) {
      const id = String(rec.productId._id);
      combinedScores[id] =
        (combinedScores[id] || 0) + rec.score * weights.contentBased;
    }

    // Sort by combined score
    const sortedProductIds = Object.entries(combinedScores)
      .sort(([, scoreA], [, scoreB]) => scoreB - scoreA)
      .slice(0, limit)
      .map(([id]) => id);

    // Fetch product details
    const products = await Product.find({
      _id: { $in: sortedProductIds },
    }).lean();

    // Return in sorted order
    return sortedProductIds
      .map((id) => {
        const product = products.find((p) => String(p._id) === id);
        return {
          productId: product,
          score: combinedScores[id],
        };
      })
      .filter((rec) => rec.productId); // Filter out any missing products
  }

  /**
   * Get popular products as fallback
   * @param {number} limit - Number of products
   * @returns {Array} Array of popular products
   */
  async getPopularProducts(limit = 10) {
    // Aggregate interactions to find most popular products
    const popularProducts = await Interaction.aggregate([
      {
        $group: {
          _id: "$productId",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: limit },
    ]);

    const productIds = popularProducts.map((p) => p._id);
    const products = await Product.find({ _id: { $in: productIds } }).lean();

    return popularProducts
      .map((pop) => {
        const product = products.find((p) => String(p._id) === String(pop._id));
        return {
          productId: product,
          score: pop.count,
        };
      })
      .filter((rec) => rec.productId);
  }

  /**
   * Generate and cache recommendations for a user
   * @param {string} userId - Target user ID
   * @param {string} algorithm - Algorithm to use (hybrid, user-based, item-based, content-based)
   * @returns {Array} Array of recommendations
   */
  async generateRecommendations(userId, algorithm = "hybrid") {
    let recommendations;

    switch (algorithm) {
      case "user-based":
        recommendations = await this.getUserBasedRecommendations(userId);
        break;
      case "item-based":
        recommendations = await this.getItemBasedRecommendations(userId);
        break;
      case "content-based":
        recommendations = await this.getContentBasedRecommendations(userId);
        break;
      case "hybrid":
      default:
        recommendations = await this.getHybridRecommendations(userId);
        break;
    }

    return recommendations;
  }
}

module.exports = new RecommendationService();
