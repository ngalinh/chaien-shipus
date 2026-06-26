'use strict';

const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const DB_PATH = path.join(__dirname, 'shipus.db');

const db = new DatabaseSync(DB_PATH);

db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

// Shim to match better-sqlite3's db.transaction() API
db.transaction = function(fn) {
  return function(...args) {
    db.exec('BEGIN');
    try {
      const result = fn(...args);
      db.exec('COMMIT');
      return result;
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  };
};

// ─── Schema Migrations ────────────────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS customer_rates (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL,
    rate_per_kg REAL    NOT NULL,
    created_at  DATETIME DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS partner_warehouses (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    code        TEXT    NOT NULL UNIQUE,
    name        TEXT    NOT NULL,
    rate_per_kg REAL    NOT NULL,
    created_at  DATETIME DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS bank_accounts (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    bank_name      TEXT    NOT NULL,
    account_number TEXT    NOT NULL,
    account_holder TEXT    NOT NULL,
    is_default     INTEGER NOT NULL DEFAULT 0,
    created_at     DATETIME DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS company_info (
    key   TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS customers (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    code       TEXT    NOT NULL UNIQUE,
    name       TEXT    NOT NULL,
    phone      TEXT,
    address    TEXT,
    channel    TEXT,
    notes      TEXT,
    rate_id    INTEGER REFERENCES customer_rates(id) ON DELETE SET NULL,
    created_at DATETIME DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS cccd_images (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id   INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    filename      TEXT    NOT NULL,
    original_name TEXT    NOT NULL,
    created_at    DATETIME DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS shipments (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    import_date   TEXT    NOT NULL,
    customer_id   INTEGER NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    warehouse_id  INTEGER REFERENCES partner_warehouses(id) ON DELETE SET NULL,
    tracking_no   TEXT,
    product       TEXT,
    weight        REAL    NOT NULL DEFAULT 0,
    surcharge     REAL    NOT NULL DEFAULT 0,
    partner_rate  REAL    NOT NULL DEFAULT 0,
    customer_rate REAL    NOT NULL DEFAULT 0,
    notes         TEXT,
    created_at    DATETIME DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS batch_info (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_date   TEXT    NOT NULL,
    customer_id  INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    van_don_code TEXT,
    notified_at  DATETIME,
    created_at   DATETIME DEFAULT (datetime('now')),
    UNIQUE(batch_date, customer_id)
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    trans_date     TEXT    NOT NULL,
    customer_id    INTEGER NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    description    TEXT,
    debit          REAL    NOT NULL DEFAULT 0,
    credit         REAL    NOT NULL DEFAULT 0,
    reference_type TEXT,
    reference_id   TEXT,
    created_at     DATETIME DEFAULT (datetime('now'))
  );
`);

// ─── Idempotent migrations ────────────────────────────────────────────────────
try { db.exec('ALTER TABLE customers ADD COLUMN email TEXT'); } catch { /* already exists */ }
try { db.exec('ALTER TABLE customers ADD COLUMN warehouse TEXT'); } catch { /* already exists */ }

// ─── Seed default data ────────────────────────────────────────────────────────

const insertDefault = db.prepare(
  `INSERT OR IGNORE INTO company_info (key, value) VALUES (?, ?)`
);
insertDefault.run('company_name', 'Chaien Shipus');
insertDefault.run('logo_path', '');

module.exports = db;
