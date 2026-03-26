const router = require('express').Router();

// Stubs — will be fully implemented in Phase 2 (JWT Auth)
// POST /api/auth/register  — create account with email + password
// POST /api/auth/login     — login, returns access + refresh tokens
// POST /api/auth/refresh   — get a new access token using refresh token
// POST /api/auth/logout    — invalidate refresh token
// GET  /api/auth/google    — start Google OAuth flow
// GET  /api/auth/google/callback — Google OAuth callback

router.get('/status', (req, res) => {
  res.json({ message: 'Auth routes ready — implementation coming in Phase 2' });
});

module.exports = router;