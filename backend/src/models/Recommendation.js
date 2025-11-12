const mongoose = require('mongoose');

const recommendationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    recommendations: [
      {
        productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        score: Number,
      },
    ],
    generatedAt: { type: Date, default: Date.now },
  },
  { timestamps: false },
);

const Recommendation = mongoose.model('Recommendation', recommendationSchema);

async function getUserRecommendations(userId) {
  return Recommendation.findOne({ userId }).populate('recommendations.productId').lean();
}

async function saveUserRecommendations(userId, recommendations) {
  return Recommendation.findOneAndUpdate(
    { userId },
    { recommendations, generatedAt: new Date() },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  )
    .populate('recommendations.productId')
    .lean();
}

module.exports = { Recommendation, getUserRecommendations, saveUserRecommendations };

