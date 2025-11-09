const { connectMongo, disconnectMongo } = require("../src/db/mongoClient");
const { loadEnv } = require("../src/config/env");
const { User, createUser } = require("../src/models/User");
const { Product, createProduct } = require("../src/models/productModel");
const { Interaction, logInteraction } = require("../src/models/Interaction");
const { hashPassword } = require("../src/utils/auth");

async function seedTestData() {
  console.log("🌱 Starting test data seeding...");

  const config = loadEnv();
  await connectMongo(config.mongodbUri);

  try {
    // Create test users
    console.log("👥 Creating test users...");
    const passwordHash = await hashPassword("test123");

    const testUsers = [];
    for (let i = 1; i <= 5; i++) {
      const user = await createUser({
        username: `testuser${i}`,
        email: `testuser${i}@example.com`,
        passwordHash,
        preferences:
          i % 2 === 0 ? ["electronics", "gadgets"] : ["books", "fashion"],
        role: "user",
      });
      testUsers.push(user);
      console.log(`  ✓ Created user: ${user.username}`);
    }

    // Create test products
    console.log("\n📦 Creating test products...");
    const productCategories = [
      "Electronics",
      "Books",
      "Fashion",
      "Sports",
      "Home",
    ];
    const testProducts = [];

    for (let i = 1; i <= 20; i++) {
      const category =
        productCategories[Math.floor(Math.random() * productCategories.length)];
      const product = await createProduct({
        name: `Test Product ${i}`,
        description: `This is a test product for ${category.toLowerCase()}`,
        category,
        price: Math.random() * 500 + 10,
        tags: [category.toLowerCase(), i % 2 === 0 ? "featured" : "popular"],
      });
      testProducts.push(product);
      console.log(`  ✓ Created product: ${product.name} (${category})`);
    }

    // Create test interactions
    console.log("\n💫 Creating test interactions...");
    const interactionTypes = ["view", "like", "purchase"];
    let interactionCount = 0;

    for (const user of testUsers) {
      // Each user interacts with 5-10 random products
      const numInteractions = Math.floor(Math.random() * 6) + 5;
      const shuffledProducts = [...testProducts].sort(
        () => Math.random() - 0.5
      );

      for (let i = 0; i < numInteractions; i++) {
        const product = shuffledProducts[i];
        const type =
          interactionTypes[Math.floor(Math.random() * interactionTypes.length)];

        await logInteraction({
          userId: user._id,
          productId: product._id,
          type,
        });
        interactionCount++;
      }
      console.log(`  ✓ Created interactions for ${user.username}`);
    }

    console.log(`\n✅ Test data seeding complete!`);
    console.log(`   Users: ${testUsers.length}`);
    console.log(`   Products: ${testProducts.length}`);
    console.log(`   Interactions: ${interactionCount}`);
    console.log("\n🔑 Test credentials:");
    console.log("   Email: testuser1@example.com");
    console.log("   Password: test123");
  } catch (error) {
    console.error("❌ Error seeding data:", error);
  } finally {
    await disconnectMongo();
  }
}

// Run if called directly
if (require.main === module) {
  seedTestData();
}

module.exports = { seedTestData };
