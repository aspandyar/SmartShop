/* eslint-disable no-console */
const { performance } = require("perf_hooks");
const { connectMongo, disconnectMongo } = require("../src/db/mongoClient");
const { connectRedis, disconnectRedis } = require("../src/db/redisClient");
const { loadEnv } = require("../src/config/env");
const { User, createUser } = require("../src/models/User");
const { Product, createProduct } = require("../src/models/productModel");
const { Interaction, logInteraction } = require("../src/models/Interaction");
const {
  generateRecommendations,
  getHybridRecommendations,
} = require("../src/recommendations/collaborativeFiltering");
const { hashPassword } = require("../src/utils/auth");

// Performance metrics storage
const metrics = {
  databaseOperations: [],
  recommendationGeneration: [],
  searchOperations: [],
  cacheOperations: [],
};

/**
 * Measure execution time of an async function
 */
async function measureTime(name, fn) {
  const start = performance.now();
  const result = await fn();
  const end = performance.now();
  const duration = end - start;

  return { name, duration, result };
}

/**
 * Generate test data
 */
async function generateTestData(
  numUsers = 100,
  numProducts = 500,
  numInteractions = 5000
) {
  console.log("\n=== Generating Test Data ===");

  // Clear existing data
  await User.deleteMany({});
  await Product.deleteMany({});
  await Interaction.deleteMany({});

  const users = [];
  const products = [];

  // Create users
  console.log(`Creating ${numUsers} users...`);
  const categories = ["electronics", "books", "sports", "fashion", "home"];

  for (let i = 0; i < numUsers; i++) {
    const passwordHash = await hashPassword("test123");
    const user = await createUser({
      username: `testuser${i}`,
      email: `test${i}@example.com`,
      passwordHash,
      preferences: [categories[Math.floor(Math.random() * categories.length)]],
      role: "user",
    });
    users.push(user);
  }

  // Create products
  console.log(`Creating ${numProducts} products...`);
  const productCategories = [
    "Electronics",
    "Books",
    "Sports",
    "Fashion",
    "Home",
  ];

  for (let i = 0; i < numProducts; i++) {
    const category =
      productCategories[Math.floor(Math.random() * productCategories.length)];
    const product = await createProduct({
      name: `Product ${i}`,
      description: `Test product ${i}`,
      category,
      price: Math.random() * 1000,
      tags: [category.toLowerCase(), `tag${Math.floor(Math.random() * 10)}`],
    });
    products.push(product);
  }

  // Create interactions
  console.log(`Creating ${numInteractions} interactions...`);
  const interactionTypes = ["view", "like", "purchase"];

  for (let i = 0; i < numInteractions; i++) {
    const user = users[Math.floor(Math.random() * users.length)];
    const product = products[Math.floor(Math.random() * products.length)];
    const type =
      interactionTypes[Math.floor(Math.random() * interactionTypes.length)];

    await logInteraction({
      userId: user._id,
      productId: product._id,
      type,
    });
  }

  console.log("Test data generation complete!");
  return { users, products };
}

/**
 * Test database read performance
 */
async function testDatabaseReads() {
  console.log("\n=== Testing Database Read Performance ===");

  // Test 1: Find all users
  const test1 = await measureTime("Find all users", async () => {
    return await User.find({}).lean();
  });
  console.log(`${test1.name}: ${test1.duration.toFixed(2)}ms`);
  metrics.databaseOperations.push(test1);

  // Test 2: Find all products
  const test2 = await measureTime("Find all products", async () => {
    return await Product.find({}).lean();
  });
  console.log(`${test2.name}: ${test2.duration.toFixed(2)}ms`);
  metrics.databaseOperations.push(test2);

  // Test 3: Find interactions with populate
  const test3 = await measureTime(
    "Find interactions with populate",
    async () => {
      return await Interaction.find({}).populate("productId").limit(100).lean();
    }
  );
  console.log(`${test3.name}: ${test3.duration.toFixed(2)}ms`);
  metrics.databaseOperations.push(test3);

  // Test 4: Aggregation query
  const test4 = await measureTime(
    "Aggregation - popular products",
    async () => {
      return await Interaction.aggregate([
        { $group: { _id: "$productId", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]);
    }
  );
  console.log(`${test4.name}: ${test4.duration.toFixed(2)}ms`);
  metrics.databaseOperations.push(test4);
}

/**
 * Test recommendation generation performance
 */
async function testRecommendationGeneration() {
  console.log("\n=== Testing Recommendation Generation Performance ===");

  const users = await User.find({}).limit(10).lean();
  const times = [];

  for (const user of users) {
    const test = await measureTime(
      `Generate recommendations for user ${user.username}`,
      async () => {
        return await getHybridRecommendations(user._id.toString(), 10);
      }
    );
    times.push(test.duration);
    console.log(`${test.name}: ${test.duration.toFixed(2)}ms`);
    metrics.recommendationGeneration.push(test);
  }

  const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
  console.log(
    `\nAverage recommendation generation time: ${avgTime.toFixed(2)}ms`
  );
  console.log(
    `Min: ${Math.min(...times).toFixed(2)}ms, Max: ${Math.max(...times).toFixed(
      2
    )}ms`
  );
}

/**
 * Test search performance
 */
async function testSearchPerformance() {
  console.log("\n=== Testing Search Performance ===");

  const searchTerms = ["Product", "test", "electronics", "book"];

  for (const term of searchTerms) {
    const test = await measureTime(`Search for "${term}"`, async () => {
      return await Product.find({ $text: { $search: term } }).lean();
    });
    console.log(
      `${test.name}: ${test.duration.toFixed(2)}ms (${
        test.result.length
      } results)`
    );
    metrics.searchOperations.push(test);
  }
}

/**
 * Test Redis cache performance
 */
async function testCachePerformance() {
  console.log("\n=== Testing Cache Performance ===");

  const {
    getRedisClient,
    setSession,
    getSession,
  } = require("../src/db/redisClient");

  try {
    const redis = getRedisClient();

    // Test write
    const test1 = await measureTime("Redis SET operation", async () => {
      await setSession("test-key", { data: "test-value" }, 60);
    });
    console.log(`${test1.name}: ${test1.duration.toFixed(2)}ms`);
    metrics.cacheOperations.push(test1);

    // Test read
    const test2 = await measureTime("Redis GET operation", async () => {
      return await getSession("test-key");
    });
    console.log(`${test2.name}: ${test2.duration.toFixed(2)}ms`);
    metrics.cacheOperations.push(test2);

    // Test bulk write
    const test3 = await measureTime("Redis bulk write (100 keys)", async () => {
      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(setSession(`bulk-key-${i}`, { value: i }, 60));
      }
      await Promise.all(promises);
    });
    console.log(`${test3.name}: ${test3.duration.toFixed(2)}ms`);
    metrics.cacheOperations.push(test3);
  } catch (error) {
    console.log("Redis tests skipped (Redis not available)");
  }
}

/**
 * Test scalability with increasing data
 */
async function testScalability() {
  console.log("\n=== Testing Scalability ===");

  const datasetSizes = [10, 50, 100];

  for (const size of datasetSizes) {
    // Add more interactions
    const products = await Product.find({}).limit(50).lean();
    const users = await User.find({}).limit(size).lean();

    // Add interactions
    for (const user of users) {
      for (let i = 0; i < 5; i++) {
        const product = products[Math.floor(Math.random() * products.length)];
        await logInteraction({
          userId: user._id,
          productId: product._id,
          type: "view",
        });
      }
    }

    // Test recommendation generation time
    const testUser = users[0];
    const test = await measureTime(
      `Recommendations with ${size} similar users`,
      async () => {
        return await generateRecommendations(testUser._id.toString(), 10);
      }
    );
    console.log(`${test.name}: ${test.duration.toFixed(2)}ms`);
  }
}

/**
 * Generate performance report
 */
function generateReport() {
  console.log("\n=== PERFORMANCE TEST REPORT ===\n");

  const sections = [
    { name: "Database Operations", data: metrics.databaseOperations },
    {
      name: "Recommendation Generation",
      data: metrics.recommendationGeneration,
    },
    { name: "Search Operations", data: metrics.searchOperations },
    { name: "Cache Operations", data: metrics.cacheOperations },
  ];

  for (const section of sections) {
    if (section.data.length === 0) continue;

    console.log(`\n${section.name}:`);
    console.log("─".repeat(60));

    const times = section.data.map((t) => t.duration);
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const min = Math.min(...times);
    const max = Math.max(...times);

    console.log(`  Average: ${avg.toFixed(2)}ms`);
    console.log(`  Min: ${min.toFixed(2)}ms`);
    console.log(`  Max: ${max.toFixed(2)}ms`);
    console.log(`  Tests run: ${section.data.length}`);
  }

  console.log("\n" + "=".repeat(60) + "\n");
}

/**
 * Main test runner
 */
async function runPerformanceTests() {
  console.log("Starting Performance Tests...\n");

  try {
    const config = loadEnv();
    await connectMongo(config.mongodbUri);

    try {
      await connectRedis(config.redisUri);
    } catch (error) {
      console.log("Redis not available, skipping cache tests");
    }

    // Generate test data
    await generateTestData(100, 500, 5000);

    // Run tests
    await testDatabaseReads();
    await testSearchPerformance();
    await testRecommendationGeneration();
    await testCachePerformance();
    await testScalability();

    // Generate report
    generateReport();

    console.log("Performance tests completed successfully!");
  } catch (error) {
    console.error("Performance test error:", error);
  } finally {
    await disconnectMongo();
    await disconnectRedis();
    process.exit(0);
  }
}

// Run tests if called directly
if (require.main === module) {
  runPerformanceTests();
}

module.exports = { runPerformanceTests };
