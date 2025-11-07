const { performance } = require('node:perf_hooks');
const { getDb } = require('../../src/db/mongoClient');
const { recommendForUser } = require('../../src/recommendations/collaborativeFiltering');

async function runRecommendationBenchmark(userId) {
  const db = getDb();
  const start = performance.now();
  await recommendForUser(db, userId);
  const end = performance.now();
  return end - start;
}

module.exports = { runRecommendationBenchmark };

