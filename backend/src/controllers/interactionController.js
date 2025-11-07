const { logInteraction, getUserInteractions } = require('../models/Interaction');
const { User } = require('../models/User');
const { Product } = require('../models/productModel');
const { handleMongooseError, isValidObjectId } = require('../utils/errorHandler');

async function createInteraction(req, res, next) {
  try {
    if (!req.body) {
      return res.status(400).json({ message: 'Request body is required' });
    }
    
    const { userId, productId, type } = req.body;

    if (!userId) {
      return res.status(400).json({ message: 'userId is required' });
    }

    if (!isValidObjectId(userId)) {
      return res.status(400).json({ message: 'Invalid userId format' });
    }

    if (!productId) {
      return res.status(400).json({ message: 'productId is required' });
    }

    if (!isValidObjectId(productId)) {
      return res.status(400).json({ message: 'Invalid productId format' });
    }

    if (!type) {
      return res.status(400).json({ message: 'Interaction type is required' });
    }

    const validTypes = ['view', 'like', 'purchase'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ message: `Type must be one of: ${validTypes.join(', ')}` });
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const interaction = await logInteraction({ userId, productId, type });
    res.status(201).json({ interaction });
  } catch (error) {
    const errorInfo = handleMongooseError(error);
    return res.status(errorInfo.status).json({ message: errorInfo.message, errors: errorInfo.errors });
  }
}

async function listUserInteractions(req, res, next) {
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

    const interactions = await getUserInteractions(userId);
    res.json({ interactions });
  } catch (error) {
    const errorInfo = handleMongooseError(error);
    return res.status(errorInfo.status).json({ message: errorInfo.message });
  }
}

module.exports = { createInteraction, listUserInteractions };

