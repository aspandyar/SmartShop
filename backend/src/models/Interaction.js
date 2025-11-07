const mongoose = require('mongoose');

const interactionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    type: { type: String, required: true }, // Will reference InteractionType name
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: false },
);

interactionSchema.index({ userId: 1 });
interactionSchema.index({ productId: 1 });

const Interaction = mongoose.model('Interaction', interactionSchema);

async function logInteraction(data) {
  const interaction = new Interaction(data);
  return interaction.save();
}

async function getUserInteractions(userId) {
  return Interaction.find({ userId }).populate('productId').lean();
}

module.exports = { Interaction, logInteraction, getUserInteractions };

