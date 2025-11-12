const { verifyToken } = require('../utils/auth');
const { getSession } = require('../db/redisClient');
const { getUserById } = require('../models/User');

async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authentication required. Please provide a valid token.' });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    if (!decoded) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

    // Check session in Redis
    const session = await getSession(token);
    if (!session) {
      return res.status(401).json({ message: 'Session expired or invalid' });
    }

    // Attach user info to request
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
    };

    next();
  } catch (error) {
    return res.status(401).json({ message: 'Authentication failed', error: error.message });
  }
}

async function requireAdmin(req, res, next) {
  try {
    // First check if user is authenticated
    await new Promise((resolve, reject) => {
      requireAuth(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Then check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    next();
  } catch (error) {
    return res.status(401).json({ message: 'Authentication required' });
  }
}

// Simplified version that works with Express
function requireAuthSync(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication required. Please provide a valid token.' });
  }

  const token = authHeader.substring(7);
  const decoded = verifyToken(token);

  if (!decoded) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }

  // Attach user info to request
  req.user = {
    id: decoded.id,
    email: decoded.email,
    role: decoded.role,
  };

  // Check session asynchronously but don't block
  getSession(token)
    .then((session) => {
      if (!session) {
        return res.status(401).json({ message: 'Session expired or invalid' });
      }
      next();
    })
    .catch(() => {
      return res.status(401).json({ message: 'Session validation failed' });
    });
}

function requireAdminSync(req, res, next) {
  requireAuthSync(req, res, () => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    next();
  });
}

module.exports = {
  requireAuth: requireAuthSync,
  requireAdmin: requireAdminSync,
};
