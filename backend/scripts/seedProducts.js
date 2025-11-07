/* eslint-disable no-console */
const { connectMongo, getDb } = require('../src/db/mongoClient');
const { loadEnv } = require('../src/config/env');

async function seed() {
  const config = loadEnv();
  await connectMongo(config.mongodbUri);
  const db = getDb();

  const demoProducts = [
    {
      name: 'Smart Fitness Tracker',
      description: 'Monitor your health metrics with AI-driven insights.',
      price: 129.99,
      category: 'Wearables',
      tags: ['fitness', 'health'],
    },
    {
      name: 'Wireless Noise-Cancelling Headphones',
      description: 'Immersive sound with adaptive noise cancellation.',
      price: 249.99,
      category: 'Audio',
      tags: ['music', 'premium'],
    },
  ];

  await db.collection('products').insertMany(demoProducts);
  console.log('Seeded demo products');
  process.exit(0);
}

seed().catch((error) => {
  console.error('Failed to seed products', error);
  process.exit(1);
});

