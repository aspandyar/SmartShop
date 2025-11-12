const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { setSession, deleteSession } = require('../db/redisClient');
const { loadEnv } = require('../config/env');

const config = loadEnv();
const JWT_SECRET = config.jwtSecret;
const JWT_EXPIRES_IN = config.jwtExpiresIn;
const SESSION_TTL = config.sessionTtl;

async function hashPassword(password) {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

function generateToken(user) {
  return jwt.sign(
    {
      id: user._id || user.id,
      email: user.email,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN },
  );
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

async function createSession(user, token) {
  const sessionId = token;
  await setSession(
    sessionId,
    {
      userId: user._id || user.id,
      email: user.email,
      role: user.role,
      createdAt: new Date().toISOString(),
    },
    SESSION_TTL,
  );
  return sessionId;
}

async function destroySession(sessionId) {
  await deleteSession(sessionId);
}

module.exports = {
  hashPassword,
  comparePassword,
  generateToken,
  verifyToken,
  createSession,
  destroySession,
  JWT_SECRET,
};

