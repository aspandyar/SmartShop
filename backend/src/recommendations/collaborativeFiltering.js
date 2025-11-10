// backend/src/recommendations/collaborativeFiltering.js
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
  const logger = require("../utils/logger");
  try {
    logger.info(`[findSimilarUsers] Finding similar users for ${userId}`);

    // Get target user's interactions
    const targetInteractions = await Interaction.find({ userId }).lean();
    logger.info(
      `[findSimilarUsers] Target user has ${targetInteractions.length} interactions`
    );

    if (targetInteractions.length === 0) {
      logger.info(
        `[findSimilarUsers] No interactions found, returning empty array`
      );
      return [];
    }

    const targetWeightedScores = getWeightedInteractions(targetInteractions);
    const targetProductIds = targetInteractions.map((i) => i.productId);
    logger.info(
      `[findSimilarUsers] Target user interacted with ${targetProductIds.length} unique products`
    );

    // Get all other users who interacted with at least one common product
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

    logger.info(
      `[findSimilarUsers] Found ${otherUsersInteractions.length} users with common product interactions`
    );

    // Calculate similarity scores
    const similarities = [];

    for (const otherUser of otherUsersInteractions) {
      const otherUserId = otherUser._id;
      const otherInteractions = otherUser.interactions;

      const otherWeightedScores = getWeightedInteractions(otherInteractions);

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

    logger.info(
      `[findSimilarUsers] Calculated ${similarities.length} users with positive similarity`
    );

    // Sort by similarity and return top N
    similarities.sort((a, b) => b.similarity - a.similarity);
    const topSimilar = similarities.slice(0, topN);

    if (topSimilar.length > 0) {
      logger.info(
        `[findSimilarUsers] Top 3 similar users: ${topSimilar
          .slice(0, 3)
          .map((s) => `${s.userId} (${s.similarity.toFixed(3)})`)
          .join(", ")}`
      );
    }

    return topSimilar;
  } catch (error) {
    logger.error("[findSimilarUsers] Error finding similar users:", error);
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
  const logger = require("../utils/logger");
  try {
    logger.info(
      `[generateRecommendations] Starting for user ${userId}, limit: ${limit}`
    );

    // Get user's existing interactions to exclude them
    const userInteractions = await Interaction.find({ userId }).lean();
    const interactedProductIds = new Set(
      userInteractions.map((i) => i.productId.toString())
    );
    logger.info(
      `[generateRecommendations] User has interacted with ${interactedProductIds.size} products`
    );

    // Get user preferences for content-based filtering
    const user = await User.findById(userId).lean();
    const userPreferences = user?.preferences || [];
    logger.info(
      `[generateRecommendations] User preferences: ${
        userPreferences.join(", ") || "none"
      }`
    );

    // Find similar users
    const similarUsers = await findSimilarUsers(userId, 10);
    logger.info(
      `[generateRecommendations] Found ${similarUsers.length} similar users`
    );

    if (similarUsers.length === 0) {
      logger.info(
        `[generateRecommendations] No similar users, using popular products fallback`
      );
      return await getPopularProducts(limit, interactedProductIds);
    }

    // Get products that similar users interacted with
    const candidateProducts = {};
    let totalCandidatesProcessed = 0;
    let skippedAlreadyInteracted = 0;

    for (const similarUser of similarUsers) {
      const similarUserInteractions = await Interaction.find({
        userId: similarUser.userId,
      }).lean();

      logger.info(
        `[generateRecommendations] Similar user ${similarUser.userId} has ${similarUserInteractions.length} interactions`
      );

      const weightedScores = getWeightedInteractions(similarUserInteractions);

      for (const [productId, score] of Object.entries(weightedScores)) {
        totalCandidatesProcessed++;

        // Skip products user already interacted with
        if (interactedProductIds.has(productId)) {
          skippedAlreadyInteracted++;
          continue;
        }

        if (!candidateProducts[productId]) {
          candidateProducts[productId] = 0;
        }

        // Weight by similarity score
        candidateProducts[productId] += score * similarUser.similarity;
      }
    }

    logger.info(
      `[generateRecommendations] Processed ${totalCandidatesProcessed} candidate products, skipped ${skippedAlreadyInteracted} already interacted`
    );
    logger.info(
      `[generateRecommendations] Found ${
        Object.keys(candidateProducts).length
      } unique candidate products`
    );

    // If no candidate products, fallback to popular products
    if (Object.keys(candidateProducts).length === 0) {
      logger.info(
        `[generateRecommendations] No candidate products found, using popular products fallback`
      );
      return await getPopularProducts(limit, interactedProductIds);
    }

    // Get product details and add preference bonus
    const productIds = Object.keys(candidateProducts);
    const products = await Product.find({
      _id: { $in: productIds },
    }).lean();

    logger.info(
      `[generateRecommendations] Retrieved ${products.length} product details from DB`
    );

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
    const finalRecs = recommendations.slice(0, limit);

    logger.info(
      `[generateRecommendations] Generated ${finalRecs.length} recommendations`
    );
    if (finalRecs.length > 0) {
      logger.info(
        `[generateRecommendations] Top 3: ${finalRecs
          .slice(0, 3)
          .map((r) => `${r.product.name} (${r.score.toFixed(2)})`)
          .join(", ")}`
      );
    }

    // If still no recommendations, use popular products as fallback
    if (finalRecs.length === 0) {
      logger.info(
        `[generateRecommendations] No final recommendations, using popular products fallback`
      );
      return await getPopularProducts(limit, interactedProductIds);
    }

    return finalRecs;
  } catch (error) {
    logger.error("[generateRecommendations] Error:", error);
    throw error;
  }
}

async function getPopularProducts(limit, excludeIds = new Set()) {
  const logger = require("../utils/logger");
  try {
    logger.info(
      `[getPopularProducts] Getting ${limit} popular products, excluding ${excludeIds.size} products`
    );

    // Convert Set to Array for MongoDB query
    const excludeArray = Array.from(excludeIds).map((id) => {
      const mongoose = require("mongoose");
      return mongoose.Types.ObjectId.isValid(id)
        ? new mongoose.Types.ObjectId(id)
        : id;
    });

    logger.info(
      `[getPopularProducts] Converted ${excludeArray.length} IDs for exclusion`
    );

    // Try to get popular products (with exclusions)
    const popularProducts = await Interaction.aggregate([
      {
        $match:
          excludeArray.length > 0 ? { productId: { $nin: excludeArray } } : {},
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

    logger.info(
      `[getPopularProducts] Aggregation returned ${popularProducts.length} popular products`
    );

    // If we got results, use them
    if (popularProducts.length > 0) {
      const productIds = popularProducts.map((p) => p._id);
      const products = await Product.find({ _id: { $in: productIds } }).lean();

      logger.info(
        `[getPopularProducts] Found ${products.length} product details in DB`
      );

      const result = products.map((product) => {
        const popProduct = popularProducts.find(
          (p) => p._id.toString() === product._id.toString()
        );
        return {
          productId: product,
          score: popProduct ? popProduct.count : 0,
          reason: "popular",
        };
      });

      logger.info(
        `[getPopularProducts] Returning ${result.length} popular products`
      );
      return result;
    }

    // FALLBACK 1: Try popular products WITHOUT exclusions
    logger.warn(
      `[getPopularProducts] No products after exclusions, trying without exclusions`
    );

    const allPopularProducts = await Interaction.aggregate([
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

    if (allPopularProducts.length > 0) {
      const productIds = allPopularProducts.map((p) => p._id);
      const products = await Product.find({ _id: { $in: productIds } }).lean();

      logger.info(
        `[getPopularProducts] Found ${products.length} popular products (ignoring exclusions)`
      );

      return products.map((product) => {
        const popProduct = allPopularProducts.find(
          (p) => p._id.toString() === product._id.toString()
        );
        return {
          productId: product,
          score: popProduct ? popProduct.count : 0,
          reason: "popular_fallback",
        };
      });
    }

    // FALLBACK 2: Use most recent products
    logger.warn(
      `[getPopularProducts] No popular products at all, using recent products`
    );

    const recentProducts = await Product.find(
      excludeArray.length > 0 ? { _id: { $nin: excludeArray } } : {}
    )
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    logger.info(
      `[getPopularProducts] Found ${recentProducts.length} recent products`
    );

    // If still nothing with exclusions, try without
    if (recentProducts.length === 0 && excludeArray.length > 0) {
      logger.warn(
        `[getPopularProducts] No recent products after exclusions, trying all products`
      );

      const allRecentProducts = await Product.find({})
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      logger.info(
        `[getPopularProducts] Found ${allRecentProducts.length} products total`
      );

      return allRecentProducts.map((product) => ({
        productId: product,
        score: 0.1,
        reason: "recent_all",
      }));
    }

    return recentProducts.map((product) => ({
      productId: product,
      score: 0.5,
      reason: "recent",
    }));
  } catch (error) {
    logger.error("[getPopularProducts] Error:", error);

    // ULTIMATE FALLBACK: Just get ANY products
    try {
      const anyProducts = await Product.find({}).limit(limit).lean();

      logger.info(
        `[getPopularProducts] Ultimate fallback: returning ${anyProducts.length} products`
      );

      return anyProducts.map((product) => ({
        productId: product,
        score: 0.1,
        reason: "ultimate_fallback",
      }));
    } catch (ultimateError) {
      logger.error(
        "[getPopularProducts] Ultimate fallback failed:",
        ultimateError
      );
      return [];
    }
  }
}

/**
 * Get item-based recommendations (products similar to what user liked)
 */
async function getItemBasedRecommendations(userId, limit = 10) {
  const logger = require("../utils/logger");
  try {
    logger.info(
      `[getItemBasedRecommendations] Starting for user ${userId}, limit: ${limit}`
    );

    // Get products user liked or purchased
    const userInteractions = await Interaction.find({
      userId,
      type: { $in: ["like", "purchase"] },
    }).lean();

    logger.info(
      `[getItemBasedRecommendations] Found ${userInteractions.length} like/purchase interactions`
    );

    if (userInteractions.length === 0) {
      logger.info(
        `[getItemBasedRecommendations] No likes/purchases, using popular products`
      );
      const allInteractions = await Interaction.find({ userId }).lean();
      const interactedProductIds = new Set(
        allInteractions.map((i) => i.productId.toString())
      );
      return await getPopularProducts(limit, interactedProductIds);
    }

    const likedProductIds = userInteractions.map((i) => i.productId);
    const likedProducts = await Product.find({
      _id: { $in: likedProductIds },
    }).lean();

    logger.info(
      `[getItemBasedRecommendations] Retrieved ${likedProducts.length} liked products from DB`
    );

    // Find similar products based on category and tags
    const categorySet = new Set(
      likedProducts.map((p) => p.category).filter(Boolean)
    );
    const tagSet = new Set(likedProducts.flatMap((p) => p.tags || []));

    logger.info(
      `[getItemBasedRecommendations] Categories: ${Array.from(categorySet).join(
        ", "
      )}`
    );
    logger.info(
      `[getItemBasedRecommendations] Tags: ${Array.from(tagSet).join(", ")}`
    );

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

    logger.info(
      `[getItemBasedRecommendations] Found ${similarProducts.length} similar products`
    );

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
    const finalRecs = recommendations.slice(0, limit);

    logger.info(
      `[getItemBasedRecommendations] Returning ${finalRecs.length} recommendations`
    );
    if (finalRecs.length > 0) {
      logger.info(
        `[getItemBasedRecommendations] Top 3: ${finalRecs
          .slice(0, 3)
          .map((r) => `${r.product.name} (${r.score})`)
          .join(", ")}`
      );
    }

    // If no recommendations, use popular products as fallback
    if (finalRecs.length === 0) {
      logger.info(
        `[getItemBasedRecommendations] No recommendations, using popular products fallback`
      );
      return await getPopularProducts(limit, interactedProductIds);
    }

    return finalRecs;
  } catch (error) {
    logger.error("[getItemBasedRecommendations] Error:", error);
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

    const finalRecs = recommendations.slice(0, limit);

    // If still no recommendations after all attempts, use popular products
    if (finalRecs.length === 0) {
      logger.warn(
        "No recommendations generated, using popular products as final fallback"
      );
      const userInteractions = await Interaction.find({ userId }).lean();
      const interactedProductIds = new Set(
        userInteractions.map((i) => i.productId.toString())
      );
      return await getPopularProducts(limit, interactedProductIds);
    }

    return finalRecs;
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
