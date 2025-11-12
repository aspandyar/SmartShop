const mongoose = require('mongoose');
const logger = require('../utils/logger');

let connection;

async function connectMongo(uri) {
  if (connection) {
    return connection;
  }

  connection = await mongoose.connect(uri, {
    autoIndex: true,
  });

  logger.info('Connected to MongoDB via Mongoose');
  return connection;
}

async function disconnectMongo() {
  if (!connection) {
    return;
  }

  await mongoose.disconnect();
  connection = null;
  logger.info('Disconnected from MongoDB');
}

module.exports = { connectMongo, disconnectMongo };

