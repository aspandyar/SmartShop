const { getDb } = require('../db/mongoClient');
const { findProducts } = require('../models/productModel');
const { recommendForUser } = require('../recommendations/collaborativeFiltering');

async function listProducts(req, res, next) {
  try {
    const db = getDb();
    const { q, category, limit } = req.query;
    const products = await findProducts(db, {
      searchTerm: q,
      category,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
    res.json({ products });
  } catch (error) {
    next(error);
  }
}

async function recommendProducts(req, res, next) {
  try {
    const { userId } = req.params;
    const db = getDb();
    const recommendations = await recommendForUser(db, userId);
    res.json({ userId, recommendations });
  } catch (error) {
    next(error);
  }
}

module.exports = { listProducts, recommendProducts };

