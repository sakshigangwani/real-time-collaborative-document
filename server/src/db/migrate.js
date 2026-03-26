require('dotenv').config();
const pool = require('./pool');

// migrate.js = a script that creates all tables from scratch
// Run it once with: npm run migrate
// Safe to re-run — uses "CREATE TABLE IF NOT EXISTS"

async function migrate() {
  const client = await pool.connect();

  try {
    console.log('🚀 Running migrations...');

    await client.query(`

      -- ─────────────────────────────────────────
      -- USERS
      -- Stores everyone who signs up
      -- password_hash is null for Google OAuth users
      -- ─────────────────────────────────────────
      CREATE TABLE IF NOT EXISTS users (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email         TEXT UNIQUE NOT NULL,
        password_hash TEXT,                        -- null for OAuth users
        display_name  TEXT NOT NULL,
        avatar_url    TEXT,                        -- from Google profile
        google_id     TEXT UNIQUE,                 -- null for email/password users
        created_at    TIMESTAMPTZ DEFAULT NOW()
      );

      -- ─────────────────────────────────────────
      -- REFRESH TOKENS
      -- JWT access tokens expire fast (15min)
      -- Refresh tokens let users stay logged in
      -- ─────────────────────────────────────────
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token      TEXT UNIQUE NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- ─────────────────────────────────────────
      -- DOCUMENTS
      -- Each document has an owner (the creator)
      -- content = current plain text of the document
      -- version = how many operations have been applied
      -- ─────────────────────────────────────────
      CREATE TABLE IF NOT EXISTS documents (
        id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title      TEXT NOT NULL DEFAULT 'Untitled Document',
        content    TEXT NOT NULL DEFAULT '',
        version    INTEGER NOT NULL DEFAULT 0,    -- increments with every op
        owner_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- ─────────────────────────────────────────
      -- DOCUMENT PERMISSIONS
      -- Controls who can view/edit each document
      -- Roles: 'owner' | 'editor' | 'viewer'
      -- ─────────────────────────────────────────
      CREATE TABLE IF NOT EXISTS document_permissions (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
        user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role        TEXT NOT NULL CHECK (role IN ('owner', 'editor', 'viewer')),
        granted_at  TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(document_id, user_id)               -- one role per user per doc
      );

      -- ─────────────────────────────────────────
      -- OPERATIONS (THE HEART OF THE APP)
      -- Every single keystroke is stored here forever
      -- This is the immutable op log — never updated, only appended
      -- type: 'insert' or 'delete'
      -- position: where in the document the op happened
      -- char: the character inserted (null for deletes)
      -- version: the document version AFTER this op was applied
      -- ─────────────────────────────────────────
      CREATE TABLE IF NOT EXISTS operations (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
        user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type        TEXT NOT NULL CHECK (type IN ('insert', 'delete')),
        position    INTEGER NOT NULL,
        char        TEXT,                          -- null for delete ops
        version     INTEGER NOT NULL,              -- document version after this op
        created_at  TIMESTAMPTZ DEFAULT NOW()
      );

      -- ─────────────────────────────────────────
      -- SNAPSHOTS (Named Checkpoints)
      -- Users can save a named version like "after review" or "v1.0"
      -- version_number points to a position in the operations log
      -- ─────────────────────────────────────────
      CREATE TABLE IF NOT EXISTS snapshots (
        id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        document_id      UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
        user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name             TEXT NOT NULL,            -- e.g. "after review"
        version_number   INTEGER NOT NULL,         -- which op version to restore to
        created_at       TIMESTAMPTZ DEFAULT NOW()
      );

      -- ─────────────────────────────────────────
      -- COMMENTS
      -- Anchored to a range of text in the document
      -- range_start / range_end = character positions
      -- resolved = true when the comment thread is closed
      -- ─────────────────────────────────────────
      CREATE TABLE IF NOT EXISTS comments (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        document_id  UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
        user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        body         TEXT NOT NULL,
        range_start  INTEGER NOT NULL,
        range_end    INTEGER NOT NULL,
        resolved     BOOLEAN NOT NULL DEFAULT FALSE,
        created_at   TIMESTAMPTZ DEFAULT NOW()
      );

      -- ─────────────────────────────────────────
      -- COMMENT REPLIES
      -- Threaded replies under each comment
      -- ─────────────────────────────────────────
      CREATE TABLE IF NOT EXISTS comment_replies (
        id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
        user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        body       TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- ─────────────────────────────────────────
      -- INDEXES
      -- Speed up the most common queries
      -- ─────────────────────────────────────────

      -- Look up all ops for a document in order (used for time-travel)
      CREATE INDEX IF NOT EXISTS idx_operations_document_version
        ON operations(document_id, version);

      -- Look up all permissions for a document
      CREATE INDEX IF NOT EXISTS idx_permissions_document
        ON document_permissions(document_id);

      -- Look up all documents a user has access to
      CREATE INDEX IF NOT EXISTS idx_permissions_user
        ON document_permissions(user_id);

      -- Look up comments for a document
      CREATE INDEX IF NOT EXISTS idx_comments_document
        ON comments(document_id);

    `);

    console.log('✅ All tables created successfully!');
    console.log('');
    console.log('Tables ready:');
    console.log('  • users');
    console.log('  • refresh_tokens');
    console.log('  • documents');
    console.log('  • document_permissions');
    console.log('  • operations');
    console.log('  • snapshots');
    console.log('  • comments');
    console.log('  • comment_replies');

  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    throw err;
  } finally {
    client.release(); // always return connection back to pool
    await pool.end(); // close all connections when script is done
  }
}

migrate();