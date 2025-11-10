const { connectMongo, disconnectMongo } = require("../src/db/mongoClient");
const { loadEnv } = require("../src/config/env");
const { createUser } = require("../src/models/User");
const { createProduct } = require("../src/models/productModel");
const { logInteraction } = require("../src/models/Interaction");
const { hashPassword } = require("../src/utils/auth");

async function seedTestDataLarge() {
  console.log("🌱 Starting LARGE test data seeding...");

  const config = loadEnv();
  await connectMongo(config.mongodbUri);

  try {
    console.log("\n👥 Creating test users...");
    const passwordHash = await hashPassword("test123");

    const allPreferences = [
      "electronics",
      "books",
      "fashion",
      "sports",
      "fitness",
      "home",
      "kitchen",
      "gadgets",
      "beauty",
      "education",
      "technology",
      "decor",
      "health",
      "gaming",
      "audio",
      "accessories",
    ];

    const users = [];
    const totalUsers = 200;

    for (let i = 1; i <= totalUsers; i++) {
      const prefs = Array.from(
        new Set(
          Array.from(
            { length: 2 + Math.floor(Math.random() * 3) },
            () =>
              allPreferences[Math.floor(Math.random() * allPreferences.length)]
          )
        )
      );

      const user = await createUser({
        username: `testuser${i}`,
        email: `testuser${i}@example.com`,
        passwordHash,
        preferences: prefs,
        age: 18 + (i % 40),
        gender: i % 3 === 0 ? "male" : i % 3 === 1 ? "female" : "other",
        role: "user",
      });
      users.push(user);
      if (i % 20 === 0) console.log(`  ✓ Created ${i}/${totalUsers} users`);
    }

    console.log("\n📦 Creating products...");
    const baseProducts = [
      "Smart Watch",
      "Wireless Earbuds",
      "4K Monitor",
      "Gaming Keyboard",
      "Laptop Stand",
      "JavaScript Book",
      "Yoga Mat",
      "Running Shoes",
      "Leather Wallet",
      "Designer Dress",
      "Coffee Maker",
      "Desk Lamp",
      "Wall Art",
      "Knife Set",
      "Bluetooth Speaker",
      "Fitness Tracker",
      "Hair Dryer",
      "Sneakers",
      "Tablet",
      "Backpack",
    ];

    const categories = [
      "Electronics",
      "Books",
      "Fashion",
      "Sports",
      "Home",
      "Beauty",
      "Gadgets",
    ];

    const products = [];
    const totalProducts = 400;

    for (let i = 0; i < totalProducts; i++) {
      const base =
        baseProducts[Math.floor(Math.random() * baseProducts.length)];
      const category =
        categories[Math.floor(Math.random() * categories.length)];
      const tags = Array.from(
        new Set([
          category.toLowerCase(),
          allPreferences[Math.floor(Math.random() * allPreferences.length)],
          allPreferences[Math.floor(Math.random() * allPreferences.length)],
        ])
      );

      const price = parseFloat((20 + Math.random() * 980).toFixed(2));

      const product = await createProduct({
        name: `${base} ${i + 1}`,
        description: `High-quality ${base.toLowerCase()} for ${category.toLowerCase()} lovers.`,
        category,
        price,
        tags,
      });

      products.push(product);
      if (i % 50 === 0)
        console.log(`  ✓ Created ${i}/${totalProducts} products`);
    }

    console.log("\n💫 Creating interactions...");
    const interactionTypes = ["view", "like", "purchase"];
    let totalInteractions = 0;

    for (const user of users) {
      const userPrefs = user.preferences || [];

      // Each user interacts with 20–60 products
      const numInteractions = 20 + Math.floor(Math.random() * 40);

      // Prefer products matching user interests
      const preferredProducts = products.filter(
        (p) =>
          userPrefs.some((pref) => p.tags.includes(pref)) ||
          userPrefs.includes(p.category.toLowerCase())
      );

      const randomProducts = products
        .filter((p) => !preferredProducts.includes(p))
        .sort(() => Math.random() - 0.5)
        .slice(0, 20);

      const selectedProducts = [...preferredProducts, ...randomProducts]
        .sort(() => Math.random() - 0.5)
        .slice(0, numInteractions);

      for (const product of selectedProducts) {
        const isPreferred = product.tags.some((t) => userPrefs.includes(t));
        const rand = Math.random();

        let type;
        if (isPreferred) {
          type = rand < 0.4 ? "view" : rand < 0.7 ? "like" : "purchase";
        } else {
          type = rand < 0.7 ? "view" : rand < 0.9 ? "like" : "purchase";
        }

        await logInteraction({
          userId: user._id,
          productId: product._id,
          type,
        });

        totalInteractions++;
      }
    }

    console.log("\n✅ Large test data seeding complete!");
    console.log(`   Users: ${users.length}`);
    console.log(`   Products: ${products.length}`);
    console.log(`   Interactions: ${totalInteractions}`);
    console.log(
      `   Avg interactions/user: ${(totalInteractions / users.length).toFixed(
        1
      )}`
    );
    console.log("\n🔑 Test login:");
    console.log("   Email: testuser1@example.com");
    console.log("   Password: test123");
    console.log("\n💡 Tip: Try /api/products?limit=20 for pagination test.");
  } catch (error) {
    console.error("❌ Error seeding data:", error);
  } finally {
    await disconnectMongo();
  }
}

// Run directly
if (require.main === module) {
  seedTestDataLarge();
}

module.exports = { seedTestDataLarge };
