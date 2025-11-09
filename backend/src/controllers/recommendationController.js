const {
  getUserRecommendations,
  saveUserRecommendations,
} = require("../models/Recommendation");
const { User } = require("../models/User");
const {
  handleMongooseError,
  isValidObjectId,
} = require("../utils/errorHandler");
const {
  getHybridRecommendations,
} = require("../recommendations/collaborativeFiltering");
const logger = require("../utils/logger");
const { Interaction } = require("../models/Interaction");

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
    const interactionCount = await Interaction.countDocuments({ userId });
    logger.info(`User ${userId} has ${interactionCount} interactions`);

    let recommendations = await getUserRecommendations(userId);

    const shouldRegenerate =
      !recommendations ||
      Date.now() - new Date(recommendations.generatedAt).getTime() >
        24 * 60 * 60 * 1000;

    if (shouldRegenerate) {
      logger.info(`Generating new recommendations for user ${userId}`);

      try {
        const newRecommendations = await getHybridRecommendations(userId, 10);

        logger.info(
          `Generated ${newRecommendations.length} recommendations for user ${userId}`
        );

        if (newRecommendations.length === 0) {
          logger.warn(`No recommendations found for user ${userId}`);
        } else {
          logger.info(
            `Sample recommendation scores: ${newRecommendations
              .slice(0, 3)
              .map((r) => r.score)
              .join(", ")}`
          );
        }

        const recommendationsData = newRecommendations.map((rec) => ({
          productId: rec.productId,
          score: rec.score,
        }));

        recommendations = await saveUserRecommendations(
          userId,
          recommendationsData
        );

        logger.info(`Saved recommendations for user ${userId}`);
      } catch (error) {
        logger.error(
          `Failed to generate recommendations for user ${userId}:`,
          error
        );

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

    const newRecommendations = await getHybridRecommendations(userId, 10);

    logger.info(`Generated ${newRecommendations.length} recommendations`);

    const recommendationsData = newRecommendations.map((rec) => ({
      productId: rec.productId,
      score: rec.score,
    }));

    const recommendations = await saveUserRecommendations(
      userId,
      recommendationsData
    );

    res.json({
      message: "Recommendations regenerated successfully",
      recommendations,
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
