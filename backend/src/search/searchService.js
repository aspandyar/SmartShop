async function searchProducts(db, { term, category, priceRange }) {
  const query = {};

  if (term) {
    query.$text = { $search: term };
  }

  if (category) {
    query.category = category;
  }

  if (priceRange) {
    query.price = { $gte: priceRange.min, $lte: priceRange.max };
  }

  return db.collection('products').find(query).limit(50).toArray();
}

module.exports = { searchProducts };

