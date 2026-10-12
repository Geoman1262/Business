CREATE TABLE IF NOT EXISTS client_accounts (client_id TEXT PRIMARY KEY,token TEXT NOT NULL UNIQUE,client_name TEXT NOT NULL,client_phone TEXT NOT NULL DEFAULT '',payload TEXT NOT NULL,updated_at TEXT NOT NULL,active INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS client_orders (order_id TEXT PRIMARY KEY,review_token TEXT NOT NULL UNIQUE,client_id TEXT NOT NULL,client_name TEXT NOT NULL,client_phone TEXT NOT NULL DEFAULT '',amount REAL NOT NULL,details TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'pending',approved_amount REAL,approved_details TEXT,created_at TEXT NOT NULL,updated_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS idx_orders_token ON client_orders(review_token);
CREATE INDEX IF NOT EXISTS idx_orders_client_status ON client_orders(client_id,status);
