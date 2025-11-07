function requireAuth(req, res, next) {
  const token = req.headers.authorization;
  if (!token) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  // Placeholder verification logic
  req.user = { id: 'demo-user', roles: ['user'] };
  return next();
}

module.exports = { requireAuth };

