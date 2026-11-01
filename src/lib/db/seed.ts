/**
 * Seed script: Imports stock universe and classifications from CSV files.
 * 
 * Usage: npx tsx src/lib/db/seed.ts
 * 
 * This script:
 * 1. Creates the database tables
 * 2. Reads the classification CSV
 * 3. Creates companies and NSE listings from the CSV symbols
 * 4. Applies sector/subsector classifications
 * 5. Creates default watchlists
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import Papa from 'papaparse';

const DB_PATH = path.join(process.cwd(), 'data', 'watchlist.db');
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Remove existing DB for fresh seed
if (fs.existsSync(DB_PATH)) {
  fs.unlinkSync(DB_PATH);
  // Remove WAL files too
  if (fs.existsSync(DB_PATH + '-wal')) fs.unlinkSync(DB_PATH + '-wal');
  if (fs.existsSync(DB_PATH + '-shm')) fs.unlinkSync(DB_PATH + '-shm');
  console.log('Removed existing database.');
}

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
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
`);

console.log('Tables created.');

// ─── Prepared statements ───────────────────────────────────────────────

const insertSector = db.prepare('INSERT OR IGNORE INTO sectors (name) VALUES (?)');
const getSector = db.prepare('SELECT id FROM sectors WHERE name = ?');
const insertSubsector = db.prepare('INSERT OR IGNORE INTO subsectors (sector_id, name) VALUES (?, ?)');
const getSubsector = db.prepare('SELECT id FROM subsectors WHERE sector_id = ? AND name = ?');
const insertCompany = db.prepare(
  `INSERT INTO companies (company_name, sector_id, subsector_id, classification_source, created_at, updated_at) VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))`
);
const findCompanyBySymbol = db.prepare(`
  SELECT c.id FROM companies c
  INNER JOIN exchange_listings el ON el.company_id = c.id
  WHERE el.exchange = 'NSE' AND el.trading_symbol = ?
`);
const insertListing = db.prepare(
  'INSERT OR IGNORE INTO exchange_listings (company_id, exchange, trading_symbol, tradingview_symbol, listing_status, last_synced_at) VALUES (?, ?, ?, ?, ?, ?)'
);
const updateCompanyClassification = db.prepare(
  `UPDATE companies SET sector_id = ?, subsector_id = ?, classification_source = ?, updated_at = datetime('now') WHERE id = ?`
);

// ─── Read CSV ──────────────────────────────────────────────────────────

// Find the classification CSV in the parent directory
const projectDir = path.resolve(process.cwd(), '..');
const csvFiles = fs.readdirSync(projectDir).filter(f => f.endsWith('.csv'));
let csvPath = '';

for (const f of csvFiles) {
  if (f.toLowerCase().includes('sector') || f.toLowerCase().includes('subsector')) {
    csvPath = path.join(projectDir, f);
    break;
  }
}

if (!csvPath && csvFiles.length > 0) {
  csvPath = path.join(projectDir, csvFiles[0]);
}

if (!csvPath) {
  console.error('No CSV file found in project directory. Please place the classification CSV.');
  process.exit(1);
}

console.log(`Reading CSV: ${csvPath}`);
const csvContent = fs.readFileSync(csvPath, 'utf-8');
const normalized = csvContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

const parsed = Papa.parse(normalized, {
  header: true,
  skipEmptyLines: true,
  transformHeader: (h: string) => h.trim().replace(/"/g, ''),
});

console.log(`Parsed ${parsed.data.length} rows from CSV.`);

// ─── Process CSV Records ───────────────────────────────────────────────

const sectorCache = new Map<string, number>();
const subsectorCache = new Map<string, number>();

function getOrCreateSector(name: string): number {
  const trimmed = name.trim();
  if (!trimmed) return 0;
  if (sectorCache.has(trimmed)) return sectorCache.get(trimmed)!;
  insertSector.run(trimmed);
  const row = getSector.get(trimmed) as { id: number };
  sectorCache.set(trimmed, row.id);
  return row.id;
}

function getOrCreateSubsector(sectorId: number, name: string): number {
  const trimmed = name.trim();
  if (!trimmed || !sectorId) return 0;
  const key = `${sectorId}:${trimmed}`;
  if (subsectorCache.has(key)) return subsectorCache.get(key)!;
  insertSubsector.run(sectorId, trimmed);
  const row = getSubsector.get(sectorId, trimmed) as { id: number };
  subsectorCache.set(key, row.id);
  return row.id;
}

const importTransaction = db.transaction(() => {
  let created = 0;
  let classified = 0;
  const seen = new Set<string>();

  for (const row of parsed.data as Array<Record<string, string>>) {
    // Find the symbol column
    const symbolKey = Object.keys(row).find(k =>
      k.toLowerCase().includes('symbol') && !k.includes(':')
    ) || Object.keys(row)[0];

    const subsectorKey = Object.keys(row).find(k =>
      k.toLowerCase().includes('subsector')
    );
    const sectorKey = Object.keys(row).find(k =>
      k.toLowerCase() === 'sector' || (k.toLowerCase().includes('sector') && !k.toLowerCase().includes('sub'))
    );

    const rawSymbol = row[symbolKey]?.trim();
    if (!rawSymbol) continue;

    // Clean symbol
    const symbol = rawSymbol.replace(/^(NSE:|BSE:)/i, '').replace(/,+$/, '').trim();
    if (!symbol || seen.has(symbol)) continue;
    seen.add(symbol);

    const sector = row[sectorKey!]?.trim() || '';
    const subsector = row[subsectorKey!]?.trim() || '';

    // Get/create sector/subsector
    const sectorId = sector ? getOrCreateSector(sector) : null;
    const subsectorId = sectorId && subsector ? getOrCreateSubsector(sectorId, subsector) : null;

    // Check if company already exists
    const existing = findCompanyBySymbol.get(symbol) as { id: number } | undefined;
    if (existing) {
      // Update classification
      if (sectorId) {
        updateCompanyClassification.run(sectorId, subsectorId, 'csv', existing.id);
        classified++;
      }
      continue;
    }

    // Create company — use symbol as company name (will be updated when full universe is imported)
    const companyResult = insertCompany.run(symbol, sectorId, subsectorId, sectorId ? 'csv' : null);
    const companyId = companyResult.lastInsertRowid as number;

    // Create NSE listing
    const tvSymbol = `NSE:${symbol}`;
    insertListing.run(companyId, 'NSE', symbol, tvSymbol, 'active', new Date().toISOString());
    created++;
  }

  return { created, classified };
});

const result = importTransaction();
console.log(`Created ${result.created} companies with NSE listings.`);
console.log(`Classified ${result.classified} existing companies.`);

// ─── Create Default Watchlists ─────────────────────────────────────────

const insertWatchlist = db.prepare(
  'INSERT INTO watchlists (name, color, sort_order) VALUES (?, ?, ?)'
);
const insertSection = db.prepare(
  'INSERT INTO sections (watchlist_id, name, sort_order) VALUES (?, ?, ?)'
);

const defaultWatchlists = [
  { name: 'Leading', color: '#22c55e', sections: ['Strong Momentum', 'Near Breakout', 'Pullback Candidates', 'Extended'] },
  { name: 'Mediocre', color: '#eab308', sections: ['Improving', 'Consolidating', 'Weak Momentum'] },
  { name: 'Lagging', color: '#ef4444', sections: ['Declining', 'Breaking Down', 'Avoid'] },
];

defaultWatchlists.forEach((wl, idx) => {
  const wlResult = insertWatchlist.run(wl.name, wl.color, idx);
  const watchlistId = wlResult.lastInsertRowid as number;
  wl.sections.forEach((sec, sIdx) => {
    insertSection.run(watchlistId, sec, sIdx);
  });
});

console.log('Default watchlists created.');

// ─── Create Default Tags ───────────────────────────────────────────────

const insertTag = db.prepare('INSERT OR IGNORE INTO tags (name, color) VALUES (?, ?)');
const defaultTags = [
  { name: 'VCP', color: '#8b5cf6' },
  { name: 'Breakout', color: '#22c55e' },
  { name: 'Pullback', color: '#f59e0b' },
  { name: 'Momentum', color: '#3b82f6' },
  { name: 'Consolidation', color: '#6b7280' },
  { name: 'Earnings', color: '#ec4899' },
  { name: 'Reversal', color: '#ef4444' },
];

defaultTags.forEach(t => insertTag.run(t.name, t.color));
console.log('Default tags created.');

// ─── Stats ─────────────────────────────────────────────────────────────

const totalCompanies = (db.prepare('SELECT COUNT(*) as c FROM companies').get() as { c: number }).c;
const totalListings = (db.prepare('SELECT COUNT(*) as c FROM exchange_listings').get() as { c: number }).c;
const totalSectors = (db.prepare('SELECT COUNT(*) as c FROM sectors').get() as { c: number }).c;
const totalSubsectors = (db.prepare('SELECT COUNT(*) as c FROM subsectors').get() as { c: number }).c;
const classifiedCount = (db.prepare('SELECT COUNT(*) as c FROM companies WHERE sector_id IS NOT NULL').get() as { c: number }).c;

console.log('\n─── Database Summary ───');
console.log(`Companies: ${totalCompanies}`);
console.log(`Exchange Listings: ${totalListings}`);
console.log(`Sectors: ${totalSectors}`);
console.log(`Subsectors: ${totalSubsectors}`);
console.log(`Classified: ${classifiedCount}`);
console.log(`Unclassified: ${totalCompanies - classifiedCount}`);

db.close();
console.log('\nSeed complete! Database saved to:', DB_PATH);
