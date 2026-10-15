-- Additive schema only. Does not alter or delete existing application tables.
CREATE TABLE IF NOT EXISTS customer_devices (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  device_key TEXT NOT NULL,
  label TEXT NOT NULL DEFAULT 'جهاز غير معروف',
  user_agent TEXT,
  platform TEXT,
  ip_address TEXT,
  first_seen_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  locked INTEGER NOT NULL DEFAULT 0,
  locked_at TEXT,
  UNIQUE(customer_id, device_key)
);
CREATE INDEX IF NOT EXISTS idx_customer_devices_customer ON customer_devices(customer_id, last_seen_at DESC);
CREATE TABLE IF NOT EXISTS customer_device_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id TEXT NOT NULL,
  device_id TEXT,
  device_key TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_at TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  details TEXT
);
CREATE INDEX IF NOT EXISTS idx_device_events_customer_time ON customer_device_events(customer_id, event_at DESC);
