const http = require('http');
const { loadEnv } = require('./config/env');
const { connectMongo } = require('./db/mongoClient');
const { connectRedis } = require('./db/redisClient');
const { initializeDefaultTypes } = require('./models/InteractionType');
const { createUser, getUserByEmail } = require('./models/User');
const { hashPassword } = require('./utils/auth');
const logger = require('./utils/logger');
const app = require('./app');

async function createAdminUser(config) {
  const { adminEmail, adminUsername, adminPassword } = config;

  if (!adminEmail || !adminUsername || !adminPassword) {
    logger.warn('Admin credentials not provided in .env. Skipping admin user creation.');
    return;
  }

  try {
    // Check if admin already exists
    const existingAdmin = await getUserByEmail(adminEmail);
    if (existingAdmin) {
      logger.info('Admin user already exists');
      return;
    }

    // Create admin user
    const passwordHash = await hashPassword(adminPassword);
    const admin = await createUser({
      username: adminUsername,
      email: adminEmail,
      passwordHash,
      role: 'admin',
    });

    logger.info(`Admin user created: ${admin.email}`);
  } catch (error) {
    logger.error('Failed to create admin user', error);
  }
}

async function bootstrap() {
  const config = loadEnv();

  // Connect to MongoDB
  await connectMongo(config.mongodbUri);

  // Connect to Redis
  try {
    await connectRedis(config.redisUri);
  } catch (error) {
    logger.warn('Redis connection failed. Sessions may not work properly.', error.message);
  }

  // Initialize default interaction types
  try {
    await initializeDefaultTypes();
    logger.info('Default interaction types initialized');
  } catch (error) {
    logger.error('Failed to initialize interaction types', error);
  }

  // Create admin user
  await createAdminUser(config);

  const server = http.createServer(app);
  server.listen(config.port, () => {
    logger.info(`API listening on port ${config.port}`);
  });

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down gracefully');
    server.close(() => {
      logger.info('HTTP server closed');
      process.exit(0);
    });
  });
}

bootstrap().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Failed to start server', error);
  process.exit(1);
});

