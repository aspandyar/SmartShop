// backend/scripts/seedTestData.js
const { connectMongo, disconnectMongo } = require("../src/db/mongoClient");
const { loadEnv } = require("../src/config/env");
const { User, createUser } = require("../src/models/User");
const { Product, createProduct } = require("../src/models/productModel");
const { Interaction, logInteraction } = require("../src/models/Interaction");
const { hashPassword } = require("../src/utils/auth");

async function seedTestData() {
  console.log("🌱 Starting enhanced test data seeding...");

  const config = loadEnv();
  await connectMongo(config.mongodbUri);

  try {
    console.log("👥 Creating test users...");
    const passwordHash = await hashPassword("test123");

    const testUsers = [];
    const userPreferences = [
      ["electronics", "gadgets"],
      ["books", "fashion"],
      ["sports", "fitness"],
      ["home", "kitchen"],
      ["electronics", "sports"],
      ["fashion", "beauty"],
      ["books", "education"],
      ["gadgets", "technology"],
      ["fitness", "health"],
      ["home", "decor"],
    ];

    // Create 20 users for better collaborative filtering
    for (let i = 1; i <= 20; i++) {
      const prefs = userPreferences[i % userPreferences.length];
      const user = await createUser({
        username: `testuser${i}`,
        email: `testuser${i}@example.com`,
        passwordHash,
        preferences: prefs,
        age: 20 + (i % 40), // Ages between 20-60
        gender: i % 3 === 0 ? "male" : i % 3 === 1 ? "female" : "other",
        role: "user",
      });
      testUsers.push(user);
      console.log(
        `  ✓ Created user: ${user.username} (preferences: ${prefs.join(", ")})`
      );
    }

    // Create test products - INCREASED NUMBER
    console.log("\n📦 Creating test products...");
    const productData = [
      // Electronics
      {
        name: "Smart Watch Pro",
        category: "Electronics",
        tags: ["electronics", "gadgets", "fitness"],
        price: 299.99,
      },
      {
        name: "Wireless Earbuds",
        category: "Electronics",
        tags: ["electronics", "audio", "gadgets"],
        price: 159.99,
      },
      {
        name: "4K Monitor",
        category: "Electronics",
        tags: ["electronics", "display", "technology"],
        price: 449.99,
      },
      {
        name: "Gaming Keyboard",
        category: "Electronics",
        tags: ["electronics", "gaming", "gadgets"],
        price: 129.99,
      },
      {
        name: "Laptop Stand",
        category: "Electronics",
        tags: ["electronics", "accessories"],
        price: 49.99,
      },

      // Books
      {
        name: "JavaScript Guide",
        category: "Books",
        tags: ["books", "education", "technology"],
        price: 39.99,
      },
      {
        name: "Fitness Nutrition",
        category: "Books",
        tags: ["books", "health", "fitness"],
        price: 29.99,
      },
      {
        name: "Home Design Ideas",
        category: "Books",
        tags: ["books", "home", "decor"],
        price: 34.99,
      },
      {
        name: "Fashion Trends 2024",
        category: "Books",
        tags: ["books", "fashion"],
        price: 24.99,
      },
      {
        name: "Cooking Masterclass",
        category: "Books",
        tags: ["books", "kitchen", "home"],
        price: 44.99,
      },

      // Sports & Fitness
      {
        name: "Yoga Mat Premium",
        category: "Sports",
        tags: ["sports", "fitness", "health"],
        price: 59.99,
      },
      {
        name: "Running Shoes",
        category: "Sports",
        tags: ["sports", "fitness", "fashion"],
        price: 119.99,
      },
      {
        name: "Dumbbells Set",
        category: "Sports",
        tags: ["sports", "fitness", "health"],
        price: 89.99,
      },
      {
        name: "Resistance Bands",
        category: "Sports",
        tags: ["sports", "fitness"],
        price: 29.99,
      },
      {
        name: "Gym Bag",
        category: "Sports",
        tags: ["sports", "accessories"],
        price: 39.99,
      },

      // Fashion
      {
        name: "Designer Sunglasses",
        category: "Fashion",
        tags: ["fashion", "accessories"],
        price: 189.99,
      },
      {
        name: "Leather Wallet",
        category: "Fashion",
        tags: ["fashion", "accessories"],
        price: 79.99,
      },
      {
        name: "Summer Dress",
        category: "Fashion",
        tags: ["fashion", "clothing"],
        price: 99.99,
      },
      {
        name: "Casual Sneakers",
        category: "Fashion",
        tags: ["fashion", "shoes"],
        price: 89.99,
      },
      {
        name: "Watch Band",
        category: "Fashion",
        tags: ["fashion", "accessories", "gadgets"],
        price: 34.99,
      },

      // Home
      {
        name: "Coffee Maker",
        category: "Home",
        tags: ["home", "kitchen", "appliances"],
        price: 149.99,
      },
      {
        name: "Desk Lamp LED",
        category: "Home",
        tags: ["home", "lighting", "decor"],
        price: 69.99,
      },
      {
        name: "Wall Art Set",
        category: "Home",
        tags: ["home", "decor"],
        price: 129.99,
      },
      {
        name: "Kitchen Knife Set",
        category: "Home",
        tags: ["home", "kitchen"],
        price: 99.99,
      },
      {
        name: "Throw Pillows",
        category: "Home",
        tags: ["home", "decor"],
        price: 44.99,
      },

      // More variety
      {
        name: "Bluetooth Speaker",
        category: "Electronics",
        tags: ["electronics", "audio", "gadgets"],
        price: 79.99,
      },
      {
        name: "Phone Case Premium",
        category: "Electronics",
        tags: ["electronics", "accessories"],
        price: 29.99,
      },
      {
        name: "Tablet Stand",
        category: "Electronics",
        tags: ["electronics", "accessories"],
        price: 39.99,
      },
      {
        name: "USB-C Hub",
        category: "Electronics",
        tags: ["electronics", "accessories", "technology"],
        price: 59.99,
      },
      {
        name: "Fitness Tracker",
        category: "Electronics",
        tags: ["electronics", "fitness", "health"],
        price: 99.99,
      },
    ];

    const testProducts = [];
    for (const productInfo of productData) {
      const product = await createProduct({
        name: productInfo.name,
        description: `Premium ${productInfo.name} - High quality product`,
        category: productInfo.category,
        price: productInfo.price,
        tags: productInfo.tags,
      });
      testProducts.push(product);
      console.log(`  ✓ Created product: ${product.name} (${product.category})`);
    }

    // Create realistic interactions - MORE INTERACTIONS
    console.log("\n💫 Creating test interactions...");
    const interactionTypes = ["view", "like", "purchase"];
    let interactionCount = 0;

    // Create diverse interaction patterns
    for (const user of testUsers) {
      const userPrefs = user.preferences || [];

      // Each user interacts with 10-20 products
      const numInteractions = Math.floor(Math.random() * 11) + 10;

      // Filter products that match user preferences
      const matchingProducts = testProducts.filter(
        (product) =>
          product.tags.some((tag) => userPrefs.includes(tag)) ||
          userPrefs.includes(product.category.toLowerCase())
      );

      // Also get some random products for variety
      const randomProducts = testProducts
        .filter((p) => !matchingProducts.includes(p))
        .sort(() => Math.random() - 0.5)
        .slice(0, 5);

      const productsToInteract = [...matchingProducts, ...randomProducts]
        .sort(() => Math.random() - 0.5)
        .slice(0, numInteractions);

      for (const product of productsToInteract) {
        // Users are more likely to interact positively with matching products
        const isMatchingProduct = product.tags.some((tag) =>
          userPrefs.includes(tag)
        );

        let type;
        if (isMatchingProduct) {
          // 40% view, 30% like, 30% purchase for matching products
          const rand = Math.random();
          type = rand < 0.4 ? "view" : rand < 0.7 ? "like" : "purchase";
        } else {
          // 70% view, 20% like, 10% purchase for non-matching
          const rand = Math.random();
          type = rand < 0.7 ? "view" : rand < 0.9 ? "like" : "purchase";
        }

        await logInteraction({
          userId: user._id,
          productId: product._id,
          type,
        });
        interactionCount++;
      }

      console.log(
        `  ✓ Created ${numInteractions} interactions for ${user.username}`
      );
    }

    console.log(`\n✅ Enhanced test data seeding complete!`);
    console.log(`   Users: ${testUsers.length}`);
    console.log(`   Products: ${testProducts.length}`);
    console.log(`   Interactions: ${interactionCount}`);
    console.log(
      `   Average interactions per user: ${(
        interactionCount / testUsers.length
      ).toFixed(1)}`
    );
    console.log("\n🔑 Test credentials:");
    console.log("   Email: testuser1@example.com");
    console.log("   Password: test123");
    console.log(
      "\n💡 Tip: Users have diverse preferences for better recommendations!"
    );
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
