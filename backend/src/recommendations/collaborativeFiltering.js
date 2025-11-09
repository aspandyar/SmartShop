const { Interaction } = require("../models/Interaction");
const { Product } = require("../models/productModel");
const { User } = require("../models/User");

/**
 * User-Based Collaborative Filtering Algorithm
 * Recommends products based on similar users' preferences
 */

/**
 * Calculate similarity between two users using Jaccard similarity
 * @param {Array} user1Products - Array of product IDs user1 interacted with
 * @param {Array} user2Products - Array of product IDs user2 interacted with
 * @returns {Number} - Similarity score between 0 and 1
 */
function calculateJaccardSimilarity(user1Products, user2Products) {
  const set1 = new Set(user1Products.map((id) => id.toString()));
  const set2 = new Set(user2Products.map((id) => id.toString()));

  const intersection = new Set([...set1].filter((x) => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  if (union.size === 0) return 0;
  return intersection.size / union.size;
}

/**
 * Calculate Cosine similarity between two users
 * @param {Object} user1Interactions - User1's product interactions with weights
 * @param {Object} user2Interactions - User2's product interactions with weights
 * @returns {Number} - Similarity score between 0 and 1
 */
function calculateCosineSimilarity(user1Interactions, user2Interactions) {
  const commonProducts = Object.keys(user1Interactions).filter(
    (productId) => user2Interactions[productId]
  );

  if (commonProducts.length === 0) return 0;

  let dotProduct = 0;
  let magnitude1 = 0;
  let magnitude2 = 0;

  for (const productId of commonProducts) {
    dotProduct += user1Interactions[productId] * user2Interactions[productId];
  }

  for (const weight of Object.values(user1Interactions)) {
    magnitude1 += weight * weight;
  }

  for (const weight of Object.values(user2Interactions)) {
    magnitude2 += weight * weight;
  }

  magnitude1 = Math.sqrt(magnitude1);
  magnitude2 = Math.sqrt(magnitude2);

  if (magnitude1 === 0 || magnitude2 === 0) return 0;

  return dotProduct / (magnitude1 * magnitude2);
}

/**
 * Get weighted interaction scores for a user
 * Different interaction types have different weights
 */
function getWeightedInteractions(interactions) {
  const weights = {
    purchase: 5,
    like: 3,
    view: 1,
  };

  const productScores = {};

  for (const interaction of interactions) {
    const productId = interaction.productId.toString();
    const weight = weights[interaction.type] || 1;

    if (!productScores[productId]) {
      productScores[productId] = 0;
    }
    productScores[productId] += weight;
  }

  return productScores;
}

/**
 * Find similar users based on interaction patterns
 * @param {String} userId - Target user ID
 * @param {Number} topN - Number of similar users to return
 * @returns {Array} - Array of similar user objects with similarity scores
 */
async function findSimilarUsers(userId, topN = 10) {
  try {
    // Get target user's interactions
    const targetInteractions = await Interaction.find({ userId }).lean();

    if (targetInteractions.length === 0) {
      return [];
    }

    const targetWeightedScores = getWeightedInteractions(targetInteractions);
    const targetProductIds = targetInteractions.map((i) => i.productId);

    // Get all other users who interacted with at least one common product
    const commonProductIds = [
      ...new Set(targetProductIds.map((id) => id.toString())),
    ];

    const otherUsersInteractions = await Interaction.aggregate([
      {
        $match: {
          userId: { $ne: userId },
          productId: { $in: targetProductIds },
        },
      },
      {
        $group: {
          _id: "$userId",
          interactions: {
            $push: {
              productId: "$productId",
              type: "$type",
            },
          },
        },
      },
    ]);

    // Calculate similarity scores
    const similarities = [];

    for (const otherUser of otherUsersInteractions) {
      const otherUserId = otherUser._id;
      const otherInteractions = otherUser.interactions;

      const otherWeightedScores = getWeightedInteractions(otherInteractions);
      const otherProductIds = otherInteractions.map((i) => i.productId);

      // Use cosine similarity for weighted approach
      const similarity = calculateCosineSimilarity(
        targetWeightedScores,
        otherWeightedScores
      );

      if (similarity > 0) {
        similarities.push({
          userId: otherUserId,
          similarity,
          interactionCount: otherInteractions.length,
        });
      }
    }

    // Sort by similarity and return top N
    similarities.sort((a, b) => b.similarity - a.similarity);
    return similarities.slice(0, topN);
  } catch (error) {
    console.error("Error finding similar users:", error);
    throw error;
  }
}

/**
 * Generate product recommendations for a user
 * @param {String} userId - Target user ID
 * @param {Number} limit - Maximum number of recommendations
 * @returns {Array} - Array of recommended products with scores
 */
async function generateRecommendations(userId, limit = 10) {
  try {
    // Get user's existing interactions to exclude them
    const userInteractions = await Interaction.find({ userId }).lean();
    const interactedProductIds = new Set(
      userInteractions.map((i) => i.productId.toString())
    );

    // Get user preferences for content-based filtering
    const user = await User.findById(userId).lean();
    const userPreferences = user?.preferences || [];

    // Find similar users
    const similarUsers = await findSimilarUsers(userId, 10);

    if (similarUsers.length === 0) {
      // Fallback to popular products if no similar users found
      return await getPopularProducts(limit, interactedProductIds);
    }

    // Get products that similar users interacted with
    const candidateProducts = {};

    for (const similarUser of similarUsers) {
      const similarUserInteractions = await Interaction.find({
        userId: similarUser.userId,
      }).lean();

      const weightedScores = getWeightedInteractions(similarUserInteractions);

      for (const [productId, score] of Object.entries(weightedScores)) {
        // Skip products user already interacted with
        if (interactedProductIds.has(productId)) continue;

        if (!candidateProducts[productId]) {
          candidateProducts[productId] = 0;
        }

        // Weight by similarity score
        candidateProducts[productId] += score * similarUser.similarity;
      }
    }

    // Get product details and add preference bonus
    const productIds = Object.keys(candidateProducts);
    const products = await Product.find({
      _id: { $in: productIds },
    }).lean();

    const recommendations = products.map((product) => {
      let score = candidateProducts[product._id.toString()];

      // Add bonus for matching user preferences
      if (userPreferences.length > 0) {
        const matchingTags =
          product.tags?.filter((tag) => userPreferences.includes(tag)) || [];

        if (product.category && userPreferences.includes(product.category)) {
          score *= 1.2; // 20% bonus for category match
        }

        if (matchingTags.length > 0) {
          score *= 1 + matchingTags.length * 0.1; // 10% per matching tag
        }
      }

      return {
        productId: product._id,
        product,
        score,
        reason: "collaborative_filtering",
      };
    });

    // Sort by score and return top N
    recommendations.sort((a, b) => b.score - a.score);
    return recommendations.slice(0, limit);
  } catch (error) {
    console.error("Error generating recommendations:", error);
    throw error;
  }
}

/**
 * Get popular products as fallback
 */
async function getPopularProducts(limit, excludeIds = new Set()) {
  try {
    const popularProducts = await Interaction.aggregate([
      {
        $match: {
          productId: { $nin: Array.from(excludeIds) },
        },
      },
      {
        $group: {
          _id: "$productId",
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1 },
      },
      {
        $limit: limit,
      },
    ]);

    const productIds = popularProducts.map((p) => p._id);
    const products = await Product.find({ _id: { $in: productIds } }).lean();

    return products.map((product, index) => ({
      productId: product._id,
      product,
      score: popularProducts[index].count,
      reason: "popular",
    }));
  } catch (error) {
    console.error("Error getting popular products:", error);
    return [];
  }
}

/**
 * Get item-based recommendations (products similar to what user liked)
 */
async function getItemBasedRecommendations(userId, limit = 10) {
  try {
    // Get products user liked or purchased
    const userInteractions = await Interaction.find({
      userId,
      type: { $in: ["like", "purchase"] },
    }).lean();

    if (userInteractions.length === 0) {
      return [];
    }

    const likedProductIds = userInteractions.map((i) => i.productId);
    const likedProducts = await Product.find({
      _id: { $in: likedProductIds },
    }).lean();

    // Find similar products based on category and tags
    const categorySet = new Set(
      likedProducts.map((p) => p.category).filter(Boolean)
    );
    const tagSet = new Set(likedProducts.flatMap((p) => p.tags || []));

    const interactedProductIds = new Set(
      (await Interaction.find({ userId }).lean()).map((i) =>
        i.productId.toString()
      )
    );

    const similarProducts = await Product.find({
      _id: { $nin: Array.from(interactedProductIds) },
      $or: [
        { category: { $in: Array.from(categorySet) } },
        { tags: { $in: Array.from(tagSet) } },
      ],
    }).lean();

    const recommendations = similarProducts.map((product) => {
      let score = 0;

      // Score based on category match
      if (categorySet.has(product.category)) {
        score += 2;
      }

      // Score based on tag matches
      const matchingTags = (product.tags || []).filter((tag) =>
        tagSet.has(tag)
      );
      score += matchingTags.length;

      return {
        productId: product._id,
        product,
        score,
        reason: "item_based",
      };
    });

    recommendations.sort((a, b) => b.score - a.score);
    return recommendations.slice(0, limit);
  } catch (error) {
    console.error("Error in item-based recommendations:", error);
    return [];
  }
}

/**
 * Hybrid recommendation system combining multiple approaches
 */
async function getHybridRecommendations(userId, limit = 10) {
  try {
    const logger = require("../utils/logger");

    logger.info(`Starting hybrid recommendations for user ${userId}`);

    // Check if user has any interactions
    const userInteractionCount = await Interaction.countDocuments({ userId });
    logger.info(`User has ${userInteractionCount} interactions`);

    if (userInteractionCount === 0) {
      logger.info("User has no interactions, returning popular products");
      const popularProducts = await getPopularProducts(limit, new Set());
      return popularProducts;
    }

    const [collaborative, itemBased] = await Promise.all([
      generateRecommendations(userId, Math.ceil(limit * 0.7)),
      getItemBasedRecommendations(userId, Math.ceil(limit * 0.3)),
    ]);

    logger.info(
      `Collaborative: ${collaborative.length}, Item-based: ${itemBased.length}`
    );

    // Merge and deduplicate
    const productMap = new Map();

    for (const rec of collaborative) {
      productMap.set(rec.productId.toString(), rec);
    }

    for (const rec of itemBased) {
      const key = rec.productId.toString();
      if (productMap.has(key)) {
        const existing = productMap.get(key);
        existing.score += rec.score * 0.5;
      } else {
        productMap.set(key, rec);
      }
    }

    const recommendations = Array.from(productMap.values());
    recommendations.sort((a, b) => b.score - a.score);

    logger.info(`Final recommendations count: ${recommendations.length}`);
    if (recommendations.length > 0) {
      logger.info(
        `Top 3 scores: ${recommendations
          .slice(0, 3)
          .map((r) => r.score.toFixed(2))
          .join(", ")}`
      );
    }

    return recommendations.slice(0, limit);
  } catch (error) {
    const logger = require("../utils/logger");
    logger.error("Error in hybrid recommendations:", error);
    throw error;
  }
}

module.exports = {
  findSimilarUsers,
  generateRecommendations,
  getItemBasedRecommendations,
  getHybridRecommendations,
  calculateJaccardSimilarity,
  calculateCosineSimilarity,
};
