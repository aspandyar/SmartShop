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
    redisUri: process.env.REDIS_URI || 'redis://localhost:6379',
    jwtSecret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
    sessionTtl: parseInt(process.env.SESSION_TTL || '86400', 10),
    adminEmail: process.env.ADMIN_EMAIL,
    adminUsername: process.env.ADMIN_USERNAME,
    adminPassword: process.env.ADMIN_PASSWORD,
    recommendationBatchSize: parseInt(process.env.RECOMMENDATION_BATCH_SIZE || '25', 10),
  };

  return cached;
}

module.exports = { loadEnv };

