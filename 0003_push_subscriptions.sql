CREATE TABLE IF NOT EXISTS client_push_subscriptions (
 subscription_id TEXT PRIMARY KEY,
 client_id TEXT NOT NULL,
 endpoint TEXT NOT NULL UNIQUE,
 p256dh TEXT NOT NULL,
 auth TEXT NOT NULL,
 created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_push_client ON client_push_subscriptions(client_id);
