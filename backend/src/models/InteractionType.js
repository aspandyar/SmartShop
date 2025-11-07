const mongoose = require('mongoose');

const interactionTypeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, lowercase: true, trim: true },
    displayName: { type: String, required: true },
    description: String,
    isActive: { type: Boolean, default: true },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } },
);

const InteractionType = mongoose.model('InteractionType', interactionTypeSchema);

async function getAllTypes() {
  return InteractionType.find({ isActive: true }).lean();
}

async function getTypeByName(name) {
  return InteractionType.findOne({ name: name.toLowerCase(), isActive: true }).lean();
}

async function createType(data) {
  const type = new InteractionType({
    ...data,
    name: data.name.toLowerCase().trim(),
  });
  return type.save();
}

async function updateType(name, data) {
  return InteractionType.findOneAndUpdate(
    { name: name.toLowerCase() },
    { ...data, name: data.name ? data.name.toLowerCase().trim() : undefined },
    { new: true },
  ).lean();
}

async function deleteType(name) {
  return InteractionType.findOneAndUpdate(
    { name: name.toLowerCase() },
    { isActive: false },
    { new: true },
  ).lean();
}

async function initializeDefaultTypes() {
  const defaultTypes = [
    { name: 'view', displayName: 'View', description: 'User viewed a product' },
    { name: 'like', displayName: 'Like', description: 'User liked a product' },
    { name: 'purchase', displayName: 'Purchase', description: 'User purchased a product' },
  ];

  for (const type of defaultTypes) {
    await InteractionType.findOneAndUpdate(
      { name: type.name },
      { ...type, isActive: true },
      { upsert: true, setDefaultsOnInsert: true },
    );
  }
}

module.exports = {
  InteractionType,
  getAllTypes,
  getTypeByName,
  createType,
  updateType,
  deleteType,
  initializeDefaultTypes,
};

