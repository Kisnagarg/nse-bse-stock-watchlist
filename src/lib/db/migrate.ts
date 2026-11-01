import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(process.cwd(), 'data', 'watchlist.db');
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const migrations = `
CREATE TABLE IF NOT EXISTS sectors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS subsectors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sector_id INTEGER NOT NULL REFERENCES sectors(id),
  name TEXT NOT NULL,
  UNIQUE(sector_id, name)
);

CREATE TABLE IF NOT EXISTS companies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_name TEXT NOT NULL,
  isin TEXT,
  sector_id INTEGER REFERENCES sectors(id),
  subsector_id INTEGER REFERENCES subsectors(id),
  classification_source TEXT,
  classification_manually_edited INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS isin_idx ON companies(isin);
CREATE INDEX IF NOT EXISTS company_name_idx ON companies(company_name);

CREATE TABLE IF NOT EXISTS exchange_listings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL REFERENCES companies(id),
  exchange TEXT NOT NULL,
  trading_symbol TEXT NOT NULL,
  security_code TEXT,
  tradingview_symbol TEXT NOT NULL,
  listing_status TEXT NOT NULL DEFAULT 'active',
  last_synced_at TEXT,
  UNIQUE(exchange, trading_symbol)
);
CREATE INDEX IF NOT EXISTS company_id_idx ON exchange_listings(company_id);
CREATE INDEX IF NOT EXISTS tv_symbol_idx ON exchange_listings(tradingview_symbol);

CREATE TABLE IF NOT EXISTS watchlists (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#3b82f6',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  watchlist_id INTEGER NOT NULL REFERENCES watchlists(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_collapsed INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS section_watchlist_idx ON sections(watchlist_id);

CREATE TABLE IF NOT EXISTS watchlist_stocks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  watchlist_id INTEGER NOT NULL REFERENCES watchlists(id) ON DELETE CASCADE,
  section_id INTEGER REFERENCES sections(id) ON DELETE SET NULL,
  exchange_listing_id INTEGER NOT NULL REFERENCES exchange_listings(id),
  sort_order REAL NOT NULL DEFAULT 0,
  added_at TEXT DEFAULT (datetime('now')),
  UNIQUE(watchlist_id, exchange_listing_id)
);
CREATE INDEX IF NOT EXISTS ws_section_idx ON watchlist_stocks(section_id);
CREATE INDEX IF NOT EXISTS ws_sort_idx ON watchlist_stocks(watchlist_id, section_id, sort_order);

CREATE TABLE IF NOT EXISTS tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  color TEXT DEFAULT '#6b7280'
);

CREATE TABLE IF NOT EXISTS company_tags (
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  UNIQUE(company_id, tag_id)
);

CREATE TABLE IF NOT EXISTS _migrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  applied_at TEXT DEFAULT (datetime('now'))
);
`;

// Run migrations
db.exec(migrations);
console.log('Database migrations applied successfully.');
db.close();
