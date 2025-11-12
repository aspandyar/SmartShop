const redis = require('redis');
const logger = require('../utils/logger');

let client;
let isConnected = false;

async function connectRedis(uri) {
  if (client && isConnected) {
    return client;
  }

  try {
    client = redis.createClient({
      url: uri || 'redis://localhost:6379',
    });

    client.on('error', (err) => {
      logger.error('Redis Client Error', err);
      isConnected = false;
    });

    client.on('connect', () => {
      logger.info('Redis Client Connected');
      isConnected = true;
    });

    await client.connect();
    return client;
  } catch (error) {
    logger.error('Failed to connect to Redis', error);
    throw error;
  }
}

async function disconnectRedis() {
  if (client && isConnected) {
    await client.quit();
    isConnected = false;
    logger.info('Redis Client Disconnected');
  }
}

function getRedisClient() {
  if (!client || !isConnected) {
    throw new Error('Redis client not connected');
  }
  return client;
}

async function setSession(sessionId, data, ttl = 3600) {
  const redisClient = getRedisClient();
  await redisClient.setEx(`session:${sessionId}`, ttl, JSON.stringify(data));
}

async function getSession(sessionId) {
  const redisClient = getRedisClient();
  const data = await redisClient.get(`session:${sessionId}`);
  return data ? JSON.parse(data) : null;
}

async function deleteSession(sessionId) {
  const redisClient = getRedisClient();
  await redisClient.del(`session:${sessionId}`);
}

module.exports = {
  connectRedis,
  disconnectRedis,
  getRedisClient,
  setSession,
  getSession,
  deleteSession,
};

