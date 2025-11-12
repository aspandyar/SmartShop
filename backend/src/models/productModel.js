const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: String,
    category: String,
    price: Number,
    tags: [String],
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } }
);

productSchema.index({ name: "text", description: "text" });

const Product = mongoose.model("Product", productSchema);

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

async function getProductById(id) {
  return Product.findById(id).lean();
}

async function updateProduct(id, data) {
  return Product.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  }).lean();
}

async function deleteProduct(id) {
  return Product.findByIdAndDelete(id).lean();
}

module.exports = {
  Product,
  getProducts,
  searchProducts,
  createProduct,
  getProductById,
  updateProduct,
  deleteProduct,
};
