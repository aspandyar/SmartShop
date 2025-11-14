const { connectMongo, disconnectMongo } = require("../src/db/mongoClient");
const { User } = require("../src/models/User");
const { Product } = require("../src/models/productModel");
const { Interaction } = require("../src/models/Interaction");
const { loadEnv } = require("../src/config/env");
const fs = require("fs");
const path = require("path");

const dbTestResults = [];
const qualityResults = [];

// ------------------ DATABASE TEST HELPERS ------------------

function addDBResult(testName, status, metric, value, notes) {
  dbTestResults.push({
    "#": dbTestResults.length + 1,
    "Test Name": testName,
    Status: status,
    Metric: metric,
    Value: value,
    Notes: notes,
  });
}

function saveDBResults() {
  const resultsDir = path.join(__dirname, "../test-results");
  if (!fs.existsSync(resultsDir)) fs.mkdirSync(resultsDir, { recursive: true });

  const filename = path.join(resultsDir, `database-results-${Date.now()}.json`);
  fs.writeFileSync(filename, JSON.stringify(dbTestResults, null, 2));
  console.log(`\n✓ Database test results saved to: ${filename}`);
}

// ------------------ RECOMMENDATION QUALITY HELPERS ------------------

function addQualityResult(testName, precision, recall, f1Score, notes) {
  qualityResults.push({
    "#": qualityResults.length + 1,
    "Test Name": testName,
    Precision: precision.toFixed(4),
    Recall: recall.toFixed(4),
    "F1-Score": f1Score.toFixed(4),
    Notes: notes,
  });
}

function saveQualityResults() {
  const resultsDir = path.join(__dirname, "../test-results");
  if (!fs.existsSync(resultsDir)) fs.mkdirSync(resultsDir, { recursive: true });

  const filename = path.join(
    resultsDir,
    `recommendation-quality-${Date.now()}.json`
  );
  fs.writeFileSync(filename, JSON.stringify(qualityResults, null, 2));
  console.log(`\n✓ Recommendation quality results saved to: ${filename}`);
}

function calculateMetrics(relevant, recommended) {
  const relevantSet = new Set(relevant);
  const recommendedSet = new Set(recommended);
  const truePositives = [...recommendedSet].filter((x) =>
    relevantSet.has(x)
  ).length;

  const precision =
    recommendedSet.size > 0 ? truePositives / recommendedSet.size : 0;
  const recall = relevantSet.size > 0 ? truePositives / relevantSet.size : 0;
  const f1Score =
    precision + recall > 0
      ? (2 * precision * recall) / (precision + recall)
      : 0;

  return { precision, recall, f1Score };
}

// ------------------ DATABASE TESTS ------------------

async function testDatabaseIntegrity() {
  console.log("\n════════ Database Integrity Tests ════════\n");

  const usersCount = await User.countDocuments();
  const productsCount = await Product.countDocuments();
  const interactionsCount = await Interaction.countDocuments();

  addDBResult(
    "Data Consistency Check",
    "PASS",
    "Record Counts",
    `Users: ${usersCount}, Products: ${productsCount}, Interactions: ${interactionsCount}`,
    "All collections accessible"
  );
  console.log(
    `   ✓ Users: ${usersCount}, Products: ${productsCount}, Interactions: ${interactionsCount}`
  );

  // Referential Integrity
  const orphanedInteractions = await Interaction.aggregate([
    {
      $lookup: {
        from: "users",
        localField: "userId",
        foreignField: "_id",
        as: "user",
      },
    },
    {
      $lookup: {
        from: "products",
        localField: "productId",
        foreignField: "_id",
        as: "product",
      },
    },
    { $match: { $or: [{ user: { $size: 0 } }, { product: { $size: 0 } }] } },
  ]);

  addDBResult(
    "Referential Integrity",
    orphanedInteractions.length === 0 ? "PASS" : "FAIL",
    "Orphaned Records",
    orphanedInteractions.length,
    "Foreign key relationships"
  );
  console.log(
    `   ${
      orphanedInteractions.length === 0 ? "✓" : "✗"
    } Orphaned interactions: ${orphanedInteractions.length}`
  );

  // Update Operations
  const testUser = await User.findOne();
  if (testUser) {
    const originalAge = testUser.age;
    testUser.age = (testUser.age || 25) + 1;
    await testUser.save();

    const updatedUser = await User.findById(testUser._id);
    const updateSuccessful = updatedUser.age === testUser.age;

    addDBResult(
      "Update Operation",
      updateSuccessful ? "PASS" : "FAIL",
      "Age Update",
      `${originalAge} → ${updatedUser.age}`,
      "Data modification working"
    );
    console.log(`   ${updateSuccessful ? "✓" : "✗"} Update successful`);
  }

  // Delete Operations
  const testProduct = await Product.create({
    name: "Test Delete Product",
    description: "To be deleted",
    price: 99.99,
  });
  await Product.deleteOne({ _id: testProduct._id });
  const deletedProduct = await Product.findById(testProduct._id);

  addDBResult(
    "Delete Operation",
    deletedProduct === null ? "PASS" : "FAIL",
    "Product Deletion",
    deletedProduct === null ? "Successfully deleted" : "Delete failed",
    "Data removal working"
  );
  console.log(`   ${deletedProduct === null ? "✓" : "✗"} Delete successful`);
}

// ------------------ RECOMMENDATION QUALITY TESTS ------------------

async function testRecommendationQuality() {
  console.log("\n════════ Recommendation Quality Tests ════════\n");

  const {
    getHybridRecommendations,
  } = require("../src/recommendations/collaborativeFiltering");
  const config = loadEnv();
  await connectMongo(config.mongodbUri);

  try {
    // --- Test 1: Active User ---
    const activeUser = await User.findOne().lean();
    if (activeUser) {
      const userInteractions = await Interaction.find({
        userId: activeUser._id,
      }).lean();
      const likedProducts = userInteractions
        .filter((i) => i.type === "like" || i.type === "purchase")
        .map((i) => i.productId.toString());

      const recommendations = await getHybridRecommendations(
        activeUser._id.toString(),
        10
      );
      const recommendedIds = recommendations
        .map((r) => r.productId?._id?.toString() || r.productId?.toString())
        .filter(Boolean);

      const relevantProducts = await Product.find({
        category: {
          $in: await Product.distinct("category", {
            _id: { $in: likedProducts },
          }),
        },
        _id: { $nin: likedProducts },
      }).lean();

      const relevantIds = relevantProducts.map((p) => p._id.toString());
      const metrics = calculateMetrics(
        relevantIds.slice(0, 20),
        recommendedIds
      );

      addQualityResult(
        "Active User Recommendations",
        metrics.precision,
        metrics.recall,
        metrics.f1Score,
        `User with ${userInteractions.length} interactions`
      );

      console.log(`   ✓ Precision: ${metrics.precision.toFixed(4)}`);
      console.log(`   ✓ Recall: ${metrics.recall.toFixed(4)}`);
      console.log(`   ✓ F1-Score: ${metrics.f1Score.toFixed(4)}`);
    }

    // --- Test 2: Cold Start ---
    const newUser = await User.create({
      username: `coldstart_${Date.now()}`,
      email: `coldstart_${Date.now()}@example.com`,
      passwordHash: "test",
      preferences: ["electronics"],
    });

    const coldStartRecs = await getHybridRecommendations(
      newUser._id.toString(),
      10
    );
    const popularProducts = await Interaction.aggregate([
      { $group: { _id: "$productId", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    const popularIds = popularProducts.map((p) => p._id.toString());
    const coldStartIds = coldStartRecs
      .map((r) => r.productId?._id?.toString() || r.productId?.toString())
      .filter(Boolean);

    const coldMetrics = calculateMetrics(popularIds, coldStartIds);
    addQualityResult(
      "Cold Start Recommendations",
      coldMetrics.precision,
      coldMetrics.recall,
      coldMetrics.f1Score,
      "New user with no interaction history"
    );
    console.log(`   ✓ Precision: ${coldMetrics.precision.toFixed(4)}`);
    console.log(`   ✓ Recall: ${coldMetrics.recall.toFixed(4)}`);
    console.log(`   ✓ F1-Score: ${coldMetrics.f1Score.toFixed(4)}`);

    await User.deleteOne({ _id: newUser._id });

    // --- Test 3: Category-based Relevance ---
    const testUser = await User.findOne({
      preferences: { $exists: true, $ne: [] },
    }).lean();
    if (testUser && testUser.preferences.length > 0) {
      const userRecs = await getHybridRecommendations(
        testUser._id.toString(),
        10
      );
      const catRecIds = userRecs
        .map((r) => r.productId?._id?.toString() || r.productId?.toString())
        .filter(Boolean);

      const relevantByCategory = await Product.find({
        category: { $in: testUser.preferences },
      }).lean();
      const catRelevantIds = relevantByCategory.map((p) => p._id.toString());

      const catMetrics = calculateMetrics(catRelevantIds, catRecIds);
      addQualityResult(
        "Category-based Relevance",
        catMetrics.precision,
        catMetrics.recall,
        catMetrics.f1Score,
        `User preferences: ${testUser.preferences.join(", ")}`
      );

      console.log(`   ✓ Precision: ${catMetrics.precision.toFixed(4)}`);
      console.log(`   ✓ Recall: ${catMetrics.recall.toFixed(4)}`);
      console.log(`   ✓ F1-Score: ${catMetrics.f1Score.toFixed(4)}`);
    }

    saveQualityResults();
  } finally {
    await disconnectMongo();
  }
}

// ------------------ RUN TESTS ------------------

async function runDatabaseTests() {
  const config = loadEnv();
  await connectMongo(config.mongodbUri);

  try {
    await testDatabaseIntegrity();
    // Could also add testDatabasePerformance() and testIndexing() here if needed
    saveDBResults();
  } finally {
    await disconnectMongo();
  }
}

// ------------------ EXPORTS & CLI ------------------

if (require.main === module) {
  const testType = process.argv[2];

  if (testType === "quality") {
    testRecommendationQuality().catch((e) => {
      console.error("Error:", e);
      process.exit(1);
    });
  } else {
    runDatabaseTests().catch((e) => {
      console.error("Error:", e);
      process.exit(1);
    });
  }
}

module.exports = {
  runDatabaseTests,
  testRecommendationQuality,
  dbTestResults,
  qualityResults,
};
