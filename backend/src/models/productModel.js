function createProduct(doc) {
  return {
    _id: doc._id,
    name: doc.name,
    description: doc.description,
    price: doc.price,
    category: doc.category,
    tags: doc.tags || [],
    rating: doc.rating || 0,
    metadata: doc.metadata || {},
  };
}

async function findProducts(db, { searchTerm, category, limit = 20 }) {
  const query = {};

  if (searchTerm) {
    query.$text = { $search: searchTerm };
  }

  if (category) {
    query.category = category;
  }

  const cursor = db.collection('products').find(query).limit(limit);
  const results = await cursor.toArray();
  return results.map(createProduct);
}

module.exports = { createProduct, findProducts };

