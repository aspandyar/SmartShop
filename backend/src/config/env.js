const path = require('path');
const dotenv = require('dotenv');

let cached;

function loadEnv() {
  if (cached) {
    return cached;
  }

  dotenv.config({ path: path.resolve(process.cwd(), '.env') });

  cached = {
    port: parseInt(process.env.PORT || '4000', 10),
    mongodbUri:
      process.env.MONGODB_URI || 'mongodb://localhost:27017/smartshop-dev',
    recommendationBatchSize: parseInt(process.env.RECOMMENDATION_BATCH_SIZE || '25', 10),
  };

  return cached;
}

module.exports = { loadEnv };

