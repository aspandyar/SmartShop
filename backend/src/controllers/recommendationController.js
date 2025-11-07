const {
  getUserRecommendations,
  saveUserRecommendations,
} = require('../models/Recommendation');
const { User } = require('../models/User');
const { Product } = require('../models/productModel');
const { handleMongooseError, isValidObjectId } = require('../utils/errorHandler');

async function getRecommendations(req, res, next) {
  try {
    const { userId } = req.params;

    if (!isValidObjectId(userId)) {
      return res.status(400).json({ message: 'Invalid userId format' });
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const recommendations = await getUserRecommendations(userId);
    if (!recommendations) {
      return res
        .status(404)
        .json({ message: 'No recommendations found for this user' });
    }
    return res.json({ recommendations });
  } catch (error) {
    const errorInfo = handleMongooseError(error);
    return res.status(errorInfo.status).json({ message: errorInfo.message });
  }
}

async function saveRecommendations(req, res, next) {
  try {
    if (!req.body) {
      return res.status(400).json({ message: 'Request body is required' });
    } else if (!req.params) {
      return res.status(400).json({ message: 'Request params is required' });
    }

    const { userId } = req.params;
    const { recommendations } = req.body;

    if (!isValidObjectId(userId)) {
      return res.status(400).json({ message: 'Invalid userId format' });
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!Array.isArray(recommendations)) {
      return res.status(400).json({ message: 'Recommendations must be an array' });
    }

    // Validate each recommendation in the array
    for (let i = 0; i < recommendations.length; i++) {
      const rec = recommendations[i];

      if (!rec.productId) {
        return res.status(400).json({ message: `Recommendation at index ${i} is missing productId` });
      }

      if (!isValidObjectId(rec.productId)) {
        return res.status(400).json({ message: `Invalid productId format at index ${i}` });
      }

      // Check if product exists
      const product = await Product.findById(rec.productId);
      if (!product) {
        return res.status(404).json({ message: `Product not found at index ${i} (productId: ${rec.productId})` });
      }

      if (rec.score !== undefined && (typeof rec.score !== 'number' || rec.score < 0 || rec.score > 1)) {
        return res.status(400).json({ message: `Score at index ${i} must be a number between 0 and 1` });
      }
    }

    const record = await saveUserRecommendations(userId, recommendations);
    res.status(201).json({ recommendations: record });
  } catch (error) {
    const errorInfo = handleMongooseError(error);
    return res.status(errorInfo.status).json({ message: errorInfo.message, errors: errorInfo.errors });
  }
}

module.exports = { getRecommendations, saveRecommendations };

