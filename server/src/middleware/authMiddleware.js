const jwt = require('jsonwebtoken');
const pool = require('../db');

module.exports = async function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    // Confirm user still exists in DB
    const result = await pool.query(
      'SELECT id, email, display_name FROM users WHERE id = $1',
      [payload.id]
    );
    if (!result.rows[0]) return res.status(401).json({ error: 'User not found' });

    req.user = result.rows[0];
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};