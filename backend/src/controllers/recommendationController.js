const {
  getUserRecommendations,
  saveUserRecommendations,
} = require("../models/Recommendation");
const { User } = require("../models/User");
const { Product } = require("../models/productModel");
const {
  handleMongooseError,
  isValidObjectId,
} = require("../utils/errorHandler");
const {
  getHybridRecommendations,
} = require("../recommendations/collaborativeFiltering");
const logger = require("../utils/logger");
const { Interaction } = require("../models/Interaction");

async function getRecentProducts(limit = 5, excludeProductIds = []) {
  try {
    const products = await Product.find({
      _id: { $nin: excludeProductIds },
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return products.map((product) => ({
      productId: product,
      score: 0.5, // Low score to indicate these are fallback recommendations
    }));
  } catch (error) {
    logger.error("Error getting recent products:", error);
    return [];
  }
}

async function getRecommendations(req, res, next) {
  try {
    const { userId } = req.params;

    if (!isValidObjectId(userId)) {
      return res.status(400).json({ message: "Invalid userId format" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    logger.info(`Getting recommendations for user ${userId}`);

    // Check user's interaction count
    const userInteractions = await Interaction.find({ userId }).lean();
    const interactionCount = userInteractions.length;
    const interactedProductIds = userInteractions.map((i) => i.productId);

    logger.info(`User ${userId} has ${interactionCount} interactions`);

    let recommendations = await getUserRecommendations(userId);

    const shouldRegenerate =
      !recommendations ||
      Date.now() - new Date(recommendations.generatedAt).getTime() >
        24 * 60 * 60 * 1000;

    if (shouldRegenerate) {
      logger.info(`Generating new recommendations for user ${userId}`);

      try {
        let newRecommendations = await getHybridRecommendations(userId, 10);

        logger.info(
          `Generated ${newRecommendations.length} recommendations for user ${userId}`
        );

        if (newRecommendations.length === 0) {
          logger.warn(
            `No recommendations found for user ${userId}, using recent products fallback`
          );
          newRecommendations = await getRecentProducts(5, interactedProductIds);
        }

        const recommendationsData = newRecommendations.map((rec) => ({
          productId: rec.productId._id || rec.productId,
          score: rec.score,
        }));

        recommendations = await saveUserRecommendations(
          userId,
          recommendationsData
        );

        logger.info(
          `Saved ${recommendationsData.length} recommendations for user ${userId}`
        );
      } catch (error) {
        logger.error(
          `Failed to generate recommendations for user ${userId}:`,
          error
        );

        const fallbackProducts = await getRecentProducts(
          5,
          interactedProductIds
        );

        if (fallbackProducts.length > 0) {
          const recommendationsData = fallbackProducts.map((rec) => ({
            productId: rec.productId._id,
            score: rec.score,
          }));

          recommendations = await saveUserRecommendations(
            userId,
            recommendationsData
          );
        } else {
          return res.json({
            recommendations: {
              userId,
              recommendations: [],
              generatedAt: new Date(),
              message:
                "No recommendations available yet. Interact with more products to get personalized recommendations.",
            },
          });
        }
      }
    } else {
      logger.info(`Using cached recommendations for user ${userId}`);
    }

    return res.json({ recommendations });
  } catch (error) {
    logger.error("Error in getRecommendations:", error);
    const errorInfo = handleMongooseError(error);
    return res.status(errorInfo.status).json({ message: errorInfo.message });
  }
}

async function saveRecommendations(req, res, next) {
  try {
    if (!req.body) {
      return res.status(400).json({ message: "Request body is required" });
    }

    const { userId } = req.params;
    const { recommendations } = req.body;

    if (!isValidObjectId(userId)) {
      return res.status(400).json({ message: "Invalid userId format" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!Array.isArray(recommendations)) {
      return res
        .status(400)
        .json({ message: "Recommendations must be an array" });
    }

    for (let i = 0; i < recommendations.length; i++) {
      const rec = recommendations[i];

      if (!rec.productId) {
        return res.status(400).json({
          message: `Recommendation at index ${i} is missing productId`,
        });
      }

      if (!isValidObjectId(rec.productId)) {
        return res.status(400).json({
          message: `Invalid productId format at index ${i}`,
        });
      }

      if (
        rec.score !== undefined &&
        (typeof rec.score !== "number" || rec.score < 0)
      ) {
        return res.status(400).json({
          message: `Score at index ${i} must be a non-negative number`,
        });
      }
    }

    const record = await saveUserRecommendations(userId, recommendations);
    res.status(201).json({ recommendations: record });
  } catch (error) {
    const errorInfo = handleMongooseError(error);
    return res.status(errorInfo.status).json({
      message: errorInfo.message,
      errors: errorInfo.errors,
    });
  }
}

async function regenerateRecommendations(req, res, next) {
  try {
    const { userId } = req.params;

    if (!isValidObjectId(userId)) {
      return res.status(400).json({ message: "Invalid userId format" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    logger.info(`Force regenerating recommendations for user ${userId}`);

    // Get user's interacted products to exclude from fallback
    const userInteractions = await Interaction.find({ userId }).lean();
    const interactedProductIds = userInteractions.map((i) => i.productId);

    let newRecommendations = [];

    try {
      newRecommendations = await getHybridRecommendations(userId, 10);
      logger.info(`Generated ${newRecommendations.length} recommendations`);
    } catch (error) {
      logger.error("Error generating hybrid recommendations:", error);
    }

    if (newRecommendations.length === 0) {
      logger.warn(
        `No recommendations generated, trying popular products fallback`
      );

      try {
        newRecommendations = await getPopularProducts(
          10,
          new Set(interactedProductIds.map((id) => id.toString()))
        );
        logger.info(
          `Popular products fallback returned ${newRecommendations.length} items`
        );
      } catch (error) {
        logger.error("Popular products fallback failed:", error);
      }
    }

    if (newRecommendations.length === 0) {
      logger.warn(`All fallbacks failed, getting any available products`);

      const anyProducts = await Product.find({}).limit(10).lean();

      newRecommendations = anyProducts.map((product) => ({
        productId: product,
        score: 0.1,
        reason: "default_fallback",
      }));

      logger.info(
        `Default fallback returned ${newRecommendations.length} products`
      );
    }

    // Ensure we have valid product data
    const recommendationsData = newRecommendations
      .filter((rec) => rec.productId && rec.productId._id) // Filter out invalid entries
      .map((rec) => ({
        productId: rec.productId._id || rec.productId,
        score: rec.score || 0,
      }));

    logger.info(
      `Saving ${recommendationsData.length} recommendations for user ${userId}`
    );

    if (recommendationsData.length === 0) {
      logger.error("No valid recommendations to save!");
      return res.status(200).json({
        message: "No recommendations could be generated at this time",
        recommendations: {
          userId,
          recommendations: [],
          generatedAt: new Date(),
        },
        count: 0,
      });
    }

    const recommendations = await saveUserRecommendations(
      userId,
      recommendationsData
    );

    res.json({
      message: "Recommendations regenerated successfully",
      recommendations,
      count: recommendationsData.length,
    });
  } catch (error) {
    logger.error("Error regenerating recommendations:", error);
    const errorInfo = handleMongooseError(error);
    return res.status(errorInfo.status).json({ message: errorInfo.message });
  }
}

module.exports = {
  getRecommendations,
  saveRecommendations,
  regenerateRecommendations,
};
