INSERT INTO users (id, email, password_hash, display_name)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'alice@test.com', '$2b$10$placeholder', 'Alice'),
  ('00000000-0000-0000-0000-000000000002', 'bob@test.com',   '$2b$10$placeholder', 'Bob');

INSERT INTO documents (id, title, owner_id)
VALUES
  ('00000000-0000-0000-0000-000000000010', 'Welcome Doc', '00000000-0000-0000-0000-000000000001');