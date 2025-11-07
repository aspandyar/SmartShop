const { findSimilarUsers } = require('../services/recommendationService');

async function recommendForUser(db, userId) {
  const similarUsers = await findSimilarUsers(db, userId);
  const productIds = new Set();

  for (const user of similarUsers) {
    const purchases = await db
      .collection('purchases')
      .find({ userId: user._id })
      .limit(10)
      .toArray();

    purchases.forEach((purchase) => {
      productIds.add(purchase.productId);
    });
  }

  const products = await db
    .collection('products')
    .find({ _id: { $in: Array.from(productIds) } })
    .limit(10)
    .toArray();

  return products;
}

module.exports = { recommendForUser };

