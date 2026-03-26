const router = require('express').Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db');

// ── helpers ──────────────────────────────────────────────
function generateTokens(user) {
  const payload = { id: user.id, email: user.email, displayName: user.display_name };

  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  });

  const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  });

  return { accessToken, refreshToken };
}

function setRefreshCookie(res, token) {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
}

// ── POST /auth/register ───────────────────────────────────
router.post('/register', async (req, res) => {
  const { email, password, displayName } = req.body;
  if (!email || !password || !displayName)
    return res.status(400).json({ error: 'email, password and displayName are required' });

  try {
    const exists = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (exists.rows.length > 0)
      return res.status(409).json({ error: 'Email already registered' });

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, display_name)
       VALUES ($1, $2, $3) RETURNING *`,
      [email, passwordHash, displayName]
    );

    const user = result.rows[0];
    const { accessToken, refreshToken } = generateTokens(user);
    setRefreshCookie(res, refreshToken);

    res.status(201).json({ accessToken, user: { id: user.id, email: user.email, displayName: user.display_name } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── POST /auth/login ──────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'email and password are required' });

  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user || !user.password_hash)
      return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid)
      return res.status(401).json({ error: 'Invalid credentials' });

    const { accessToken, refreshToken } = generateTokens(user);
    setRefreshCookie(res, refreshToken);

    res.json({ accessToken, user: { id: user.id, email: user.email, displayName: user.display_name } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── POST /auth/refresh ────────────────────────────────────
router.post('/refresh', (req, res) => {
  const token = req.cookies.refreshToken;
  if (!token) return res.status(401).json({ error: 'No refresh token' });

  try {
    const payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const newAccessToken = jwt.sign(
      { id: payload.id, email: payload.email, displayName: payload.displayName },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
    );
    res.json({ accessToken: newAccessToken });
  } catch {
    res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
});

// ── POST /auth/logout ─────────────────────────────────────
router.post('/logout', (req, res) => {
  res.clearCookie('refreshToken');
  res.json({ message: 'Logged out' });
});

// ── GET /auth/me ──────────────────────────────────────────
router.get('/me', require('../middleware/authMiddleware'), async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, display_name, avatar_url FROM users WHERE id = $1',
      [req.user.id]
    );
    const user = result.rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ id: user.id, email: user.email, displayName: user.display_name, avatarUrl: user.avatar_url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

const passport = require('../config/passport');

// ── GET /auth/google ──────────────────────────────────────
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));

// ── GET /auth/google/callback ─────────────────────────────
router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/login' }),
  (req, res) => {
    const { accessToken, refreshToken } = generateTokens(req.user);
    setRefreshCookie(res, refreshToken);
    // Redirect to client with access token in query param
    // Client should grab it immediately and store in memory
    res.redirect(`${process.env.CLIENT_URL}/auth/callback?token=${accessToken}`);
  }
);

module.exports = router;