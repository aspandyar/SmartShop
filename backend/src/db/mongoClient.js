const { MongoClient } = require('mongodb');
const logger = require('../utils/logger');

let client;

async function connectMongo(uri) {
  if (client) {
    return client;
  }

  client = new MongoClient(uri);
  await client.connect();
  logger.info('Connected to MongoDB');
  return client;
}

function getDb(dbName = 'smartshop') {
  if (!client) {
    throw new Error('Mongo client not initialized');
  }

  return client.db(dbName);
}

module.exports = { connectMongo, getDb };

