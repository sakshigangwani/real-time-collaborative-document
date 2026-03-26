const router = require('express').Router();

// Stubs — will be fully implemented in Phase 3 (Document CRUD)
// GET    /api/documents          — list all docs the user has access to
// POST   /api/documents          — create a new document
// GET    /api/documents/:id      — get a single document
// PATCH  /api/documents/:id      — update title
// DELETE /api/documents/:id      — delete (owner only)
// GET    /api/documents/:id/history     — get version history
// POST   /api/documents/:id/snapshots   — create named snapshot
// GET    /api/documents/:id/diff        — get diff between two versions

router.get('/status', (req, res) => {
  res.json({ message: 'Document routes ready — implementation coming in Phase 3' });
});

module.exports = router;