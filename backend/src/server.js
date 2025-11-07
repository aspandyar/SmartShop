const http = require('http');
const { loadEnv } = require('./config/env');
const { connectMongo } = require('./db/mongoClient');
const logger = require('./utils/logger');
const app = require('./app');

async function bootstrap() {
  const config = loadEnv();

  await connectMongo(config.mongodbUri);

  const server = http.createServer(app);
  server.listen(config.port, () => {
    logger.info(`API listening on port ${config.port}`);
  });
}

bootstrap().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Failed to start server', error);
  process.exit(1);
});

