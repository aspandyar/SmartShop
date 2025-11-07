const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: String,
    category: String,
    price: Number,
    tags: [String],
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } },
);

productSchema.index({ name: 'text', description: 'text' });

const Product = mongoose.model('Product', productSchema);

async function getProducts(query = {}) {
  return Product.find(query).lean();
}

async function searchProducts(keyword) {
  return Product.find({ $text: { $search: keyword } }).lean();
}

async function createProduct(data) {
  const product = new Product(data);
  return product.save();
}

module.exports = { Product, getProducts, searchProducts, createProduct };

