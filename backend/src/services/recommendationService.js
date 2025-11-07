async function findSimilarUsers(db, userId) {
  const userActivity = await db
    .collection('activities')
    .find({ userId })
    .toArray();

  const productIds = userActivity.map((activity) => activity.productId);

  return db
    .collection('activities')
    .aggregate([
      { $match: { productId: { $in: productIds }, userId: { $ne: userId } } },
      { $group: { _id: '$userId', overlap: { $sum: 1 } } },
      { $sort: { overlap: -1 } },
      { $limit: 5 },
    ])
    .toArray();
}

module.exports = { findSimilarUsers };

