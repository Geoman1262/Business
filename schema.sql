CREATE TABLE IF NOT EXISTS client_accounts (
  client_id TEXT PRIMARY KEY,
  token TEXT NOT NULL UNIQUE,
  client_name TEXT NOT NULL,
  client_phone TEXT NOT NULL DEFAULT '',
  payload TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_client_accounts_token_active ON client_accounts(token, active);
