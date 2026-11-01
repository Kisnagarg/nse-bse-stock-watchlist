import { db, rawDb, schema } from '@/lib/db';
import { eq, and, like, or, sql, inArray, isNull, desc, asc } from 'drizzle-orm';
import type { SearchFilters, ClassificationPreview } from '@/lib/types';
import type { ClassificationRecord } from '@/lib/csv-parser';

const { companies, exchangeListings, sectors, subsectors, watchlists, sections, watchlistStocks, tags, companyTags } = schema;

// ─── Database Initialization ───────────────────────────────────────────

export function initializeDatabase() {
  rawDb.exec(`
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
}

// ─── Sectors & Subsectors ──────────────────────────────────────────────

export function getOrCreateSector(name: string): number {
  const trimmed = name.trim();
  if (!trimmed) return 0;
  const existing = db.select().from(sectors).where(eq(sectors.name, trimmed)).get();
  if (existing) return existing.id;
  const result = db.insert(sectors).values({ name: trimmed }).returning().get();
  return result.id;
}

export function getOrCreateSubsector(sectorId: number, name: string): number {
  const trimmed = name.trim();
  if (!trimmed || !sectorId) return 0;
  const existing = db.select().from(subsectors)
    .where(and(eq(subsectors.sectorId, sectorId), eq(subsectors.name, trimmed)))
    .get();
  if (existing) return existing.id;
  const result = db.insert(subsectors).values({ sectorId, name: trimmed }).returning().get();
  return result.id;
}

export function getAllSectors() {
  const sectorList = db.select().from(sectors).orderBy(asc(sectors.name)).all();
  return sectorList.map(s => ({
    ...s,
    subsectors: db.select().from(subsectors).where(eq(subsectors.sectorId, s.id)).orderBy(asc(subsectors.name)).all(),
  }));
}

// ─── Companies & Listings ──────────────────────────────────────────────

export function findCompanyByNseSymbol(symbol: string) {
  return db.select({
    company: companies,
    listing: exchangeListings,
  })
    .from(exchangeListings)
    .innerJoin(companies, eq(companies.id, exchangeListings.companyId))
    .where(and(
      eq(exchangeListings.exchange, 'NSE'),
      eq(exchangeListings.tradingSymbol, symbol)
    ))
    .get();
}

export function findCompanyByBseCode(code: string) {
  return db.select({
    company: companies,
    listing: exchangeListings,
  })
    .from(exchangeListings)
    .innerJoin(companies, eq(companies.id, exchangeListings.companyId))
    .where(and(
      eq(exchangeListings.exchange, 'BSE'),
      eq(exchangeListings.tradingSymbol, code)
    ))
    .get();
}

export function findCompanyByIsin(isin: string) {
  return db.select().from(companies).where(eq(companies.isin, isin)).get();
}

export function importStockUniverse(records: Array<{
  exchange: 'NSE' | 'BSE';
  tradingSymbol: string;
  companyName: string;
  isin?: string;
  securityCode?: string;
}>) {
  const importTransaction = rawDb.transaction(() => {
    let created = 0, updated = 0, skipped = 0;

    for (const rec of records) {
      // Check if listing already exists
      const existingListing = db.select().from(exchangeListings)
        .where(and(
          eq(exchangeListings.exchange, rec.exchange),
          eq(exchangeListings.tradingSymbol, rec.tradingSymbol)
        ))
        .get();

      if (existingListing) {
        skipped++;
        continue;
      }

      // Try to find existing company by ISIN
      let companyId: number | null = null;
      if (rec.isin) {
        const byIsin = db.select().from(companies).where(eq(companies.isin, rec.isin)).get();
        if (byIsin) companyId = byIsin.id;
      }

      // Try to find by matching symbol on other exchange
      if (!companyId && rec.isin) {
        const otherListing = db.select({
          companyId: exchangeListings.companyId,
        }).from(exchangeListings)
          .innerJoin(companies, eq(companies.id, exchangeListings.companyId))
          .where(eq(companies.isin, rec.isin))
          .get();
        if (otherListing) companyId = otherListing.companyId;
      }

      // Create company if not found
      if (!companyId) {
        const newCompany = db.insert(companies).values({
          companyName: rec.companyName,
          isin: rec.isin || null,
        }).returning().get();
        companyId = newCompany.id;
      }

      // Create listing
      const tvSymbol = `${rec.exchange}:${rec.tradingSymbol}`;
      db.insert(exchangeListings).values({
        companyId,
        exchange: rec.exchange,
        tradingSymbol: rec.tradingSymbol,
        securityCode: rec.securityCode || null,
        tradingviewSymbol: tvSymbol,
        listingStatus: 'active',
        lastSyncedAt: new Date().toISOString(),
      }).run();
      created++;
    }

    return { created, updated, skipped, total: records.length };
  });

  return importTransaction();
}

export function previewClassification(records: ClassificationRecord[]): ClassificationPreview {
  const matched: ClassificationPreview['matched'] = [];
  const unmatched: ClassificationPreview['unmatched'] = [];
  let conflicts = 0, newClassifications = 0, updated = 0;

  for (const rec of records) {
    const symbol = rec.symbol.replace(/^(NSE:|BSE:)/i, '').replace(/,+$/, '').trim();
    const result = findCompanyByNseSymbol(symbol);

    if (!result) {
      unmatched.push({ symbol: rec.nseSymbol, sector: rec.sector, subsector: rec.subsector });
      continue;
    }

    const { company } = result;
    let existingSector: string | undefined;
    let existingSubsector: string | undefined;

    if (company.sectorId) {
      const s = db.select().from(sectors).where(eq(sectors.id, company.sectorId)).get();
      existingSector = s?.name;
    }
    if (company.subsectorId) {
      const ss = db.select().from(subsectors).where(eq(subsectors.id, company.subsectorId)).get();
      existingSubsector = ss?.name;
    }

    const hasConflict = !!(existingSector && existingSector !== rec.sector) ||
      !!(existingSubsector && existingSubsector !== rec.subsector);

    if (hasConflict) conflicts++;
    if (!existingSector && !existingSubsector) newClassifications++;
    if (existingSector || existingSubsector) updated++;

    matched.push({
      symbol: rec.nseSymbol,
      sector: rec.sector,
      subsector: rec.subsector,
      companyId: company.id,
      companyName: company.companyName,
      existingSector,
      existingSubsector,
      hasConflict,
    });
  }

  return { matched, unmatched, updated, conflicts, newClassifications };
}

export function applyClassification(records: ClassificationRecord[], overwriteManual: boolean = false) {
  const applyTransaction = rawDb.transaction(() => {
    let applied = 0, skippedManual = 0;

    for (const rec of records) {
      const symbol = rec.symbol.replace(/^(NSE:|BSE:)/i, '').replace(/,+$/, '').trim();
      const result = findCompanyByNseSymbol(symbol);
      if (!result) continue;

      const { company } = result;

      // Skip manually edited unless overwrite requested
      if (company.classificationManuallyEdited && !overwriteManual) {
        skippedManual++;
        continue;
      }

      const sectorId = rec.sector ? getOrCreateSector(rec.sector) : null;
      const subsectorId = sectorId && rec.subsector ? getOrCreateSubsector(sectorId, rec.subsector) : null;

      if (sectorId || subsectorId) {
        db.update(companies)
          .set({
            sectorId: sectorId || undefined,
            subsectorId: subsectorId || undefined,
            classificationSource: 'csv',
            updatedAt: new Date().toISOString(),
          })
          .where(eq(companies.id, company.id))
          .run();
        applied++;
      }
    }

    return { applied, skippedManual };
  });

  return applyTransaction();
}

// ─── Stock Search ──────────────────────────────────────────────────────

export function searchStocks(filters: SearchFilters) {
  const page = filters.page || 1;
  const limit = filters.limit || 50;
  const offset = (page - 1) * limit;

  let conditions: ReturnType<typeof eq>[] = [];

  // Build WHERE clause
  const baseQuery = rawDb.prepare(`
    SELECT 
      el.id as listing_id,
      el.company_id,
      el.exchange,
      el.trading_symbol,
      el.security_code,
      el.tradingview_symbol,
      el.listing_status,
      c.id as company_id,
      c.company_name,
      c.isin,
      c.sector_id,
      c.subsector_id,
      c.classification_source,
      c.classification_manually_edited,
      s.name as sector_name,
      ss.name as subsector_name
    FROM exchange_listings el
    INNER JOIN companies c ON c.id = el.company_id
    LEFT JOIN sectors s ON s.id = c.sector_id
    LEFT JOIN subsectors ss ON ss.id = c.subsector_id
    WHERE 1=1
    ${filters.query ? `AND (
      el.trading_symbol LIKE '%' || ? || '%'
      OR el.tradingview_symbol LIKE '%' || ? || '%'
      OR el.security_code LIKE '%' || ? || '%'
      OR c.company_name LIKE '%' || ? || '%'
      OR c.isin LIKE '%' || ? || '%'
      OR s.name LIKE '%' || ? || '%'
      OR ss.name LIKE '%' || ? || '%'
    )` : ''}
    ${filters.exchange ? `AND el.exchange = ?` : ''}
    ${filters.sectorId ? `AND c.sector_id = ?` : ''}
    ${filters.subsectorId ? `AND c.subsector_id = ?` : ''}
    ${filters.listingStatus ? `AND el.listing_status = ?` : ''}
    ${filters.classified === true ? `AND c.sector_id IS NOT NULL` : ''}
    ${filters.classified === false ? `AND c.sector_id IS NULL` : ''}
    ${filters.tagId ? `AND c.id IN (SELECT company_id FROM company_tags WHERE tag_id = ?)` : ''}
    ${filters.watchlistId ? `AND el.id IN (SELECT exchange_listing_id FROM watchlist_stocks WHERE watchlist_id = ?)` : ''}
    ORDER BY c.company_name ASC
    LIMIT ? OFFSET ?
  `);

  const params: (string | number)[] = [];
  if (filters.query) {
    const q = filters.query.replace(/^(NSE:|BSE:)/i, '');
    params.push(q, q, q, q, q, q, q);
  }
  if (filters.exchange) params.push(filters.exchange);
  if (filters.sectorId) params.push(filters.sectorId);
  if (filters.subsectorId) params.push(filters.subsectorId);
  if (filters.listingStatus) params.push(filters.listingStatus);
  if (filters.tagId) params.push(filters.tagId);
  if (filters.watchlistId) params.push(filters.watchlistId);
  params.push(limit, offset);

  const results = baseQuery.all(...params);

  // Count query
  const countQuery = rawDb.prepare(`
    SELECT COUNT(*) as total
    FROM exchange_listings el
    INNER JOIN companies c ON c.id = el.company_id
    LEFT JOIN sectors s ON s.id = c.sector_id
    LEFT JOIN subsectors ss ON ss.id = c.subsector_id
    WHERE 1=1
    ${filters.query ? `AND (
      el.trading_symbol LIKE '%' || ? || '%'
      OR el.tradingview_symbol LIKE '%' || ? || '%'
      OR el.security_code LIKE '%' || ? || '%'
      OR c.company_name LIKE '%' || ? || '%'
      OR c.isin LIKE '%' || ? || '%'
      OR s.name LIKE '%' || ? || '%'
      OR ss.name LIKE '%' || ? || '%'
    )` : ''}
    ${filters.exchange ? `AND el.exchange = ?` : ''}
    ${filters.sectorId ? `AND c.sector_id = ?` : ''}
    ${filters.subsectorId ? `AND c.subsector_id = ?` : ''}
    ${filters.listingStatus ? `AND el.listing_status = ?` : ''}
    ${filters.classified === true ? `AND c.sector_id IS NOT NULL` : ''}
    ${filters.classified === false ? `AND c.sector_id IS NULL` : ''}
    ${filters.tagId ? `AND c.id IN (SELECT company_id FROM company_tags WHERE tag_id = ?)` : ''}
    ${filters.watchlistId ? `AND el.id IN (SELECT exchange_listing_id FROM watchlist_stocks WHERE watchlist_id = ?)` : ''}
  `);

  const countParams = params.slice(0, -2); // remove limit, offset
  const countResult = countQuery.get(...countParams) as { total: number };

  return {
    results: results as Array<Record<string, unknown>>,
    total: countResult.total,
    page,
    limit,
    totalPages: Math.ceil(countResult.total / limit),
  };
}

// ─── Watchlists ────────────────────────────────────────────────────────

export function getAllWatchlists() {
  const wls = db.select().from(watchlists).orderBy(asc(watchlists.sortOrder)).all();
  return wls.map(wl => {
    const stockCount = rawDb.prepare(
      'SELECT COUNT(*) as count FROM watchlist_stocks WHERE watchlist_id = ?'
    ).get(wl.id) as { count: number };
    const sects = db.select().from(sections)
      .where(eq(sections.watchlistId, wl.id))
      .orderBy(asc(sections.sortOrder))
      .all();
    return { ...wl, stockCount: stockCount.count, sections: sects };
  });
}

export function createWatchlist(name: string, color?: string) {
  const maxOrder = rawDb.prepare('SELECT COALESCE(MAX(sort_order), -1) + 1 as next FROM watchlists').get() as { next: number };
  return db.insert(watchlists).values({
    name,
    color: color || '#3b82f6',
    sortOrder: maxOrder.next,
  }).returning().get();
}

export function updateWatchlist(id: number, data: { name?: string; color?: string; sortOrder?: number }) {
  return db.update(watchlists)
    .set({ ...data, updatedAt: new Date().toISOString() })
    .where(eq(watchlists.id, id))
    .returning()
    .get();
}

export function deleteWatchlist(id: number) {
  db.delete(watchlists).where(eq(watchlists.id, id)).run();
}

export function duplicateWatchlist(id: number, newName: string) {
  const original = db.select().from(watchlists).where(eq(watchlists.id, id)).get();
  if (!original) return null;

  const txn = rawDb.transaction(() => {
    const newWl = createWatchlist(newName, original.color || undefined);

    // Copy sections
    const origSections = db.select().from(sections).where(eq(sections.watchlistId, id)).all();
    const sectionMap = new Map<number, number>();

    for (const sec of origSections) {
      const newSec = db.insert(sections).values({
        watchlistId: newWl.id,
        name: sec.name,
        sortOrder: sec.sortOrder,
        isCollapsed: sec.isCollapsed,
      }).returning().get();
      sectionMap.set(sec.id, newSec.id);
    }

    // Copy stocks
    const origStocks = db.select().from(watchlistStocks).where(eq(watchlistStocks.watchlistId, id)).all();
    for (const stock of origStocks) {
      db.insert(watchlistStocks).values({
        watchlistId: newWl.id,
        sectionId: stock.sectionId ? sectionMap.get(stock.sectionId) || null : null,
        exchangeListingId: stock.exchangeListingId,
        sortOrder: stock.sortOrder,
      }).run();
    }

    return newWl;
  });

  return txn();
}

export function reorderWatchlists(orderedIds: number[]) {
  const txn = rawDb.transaction(() => {
    orderedIds.forEach((id, idx) => {
      db.update(watchlists).set({ sortOrder: idx }).where(eq(watchlists.id, id)).run();
    });
  });
  txn();
}

// ─── Sections ──────────────────────────────────────────────────────────

export function createSection(watchlistId: number, name: string) {
  const maxOrder = rawDb.prepare(
    'SELECT COALESCE(MAX(sort_order), -1) + 1 as next FROM sections WHERE watchlist_id = ?'
  ).get(watchlistId) as { next: number };
  return db.insert(sections).values({
    watchlistId,
    name,
    sortOrder: maxOrder.next,
  }).returning().get();
}

export function updateSection(id: number, data: { name?: string; sortOrder?: number; isCollapsed?: boolean }) {
  return db.update(sections).set(data).where(eq(sections.id, id)).returning().get();
}

export function deleteSection(id: number) {
  // Move stocks to uncategorized (null section)
  db.update(watchlistStocks).set({ sectionId: null }).where(eq(watchlistStocks.sectionId, id)).run();
  db.delete(sections).where(eq(sections.id, id)).run();
}

export function reorderSections(watchlistId: number, orderedIds: number[]) {
  const txn = rawDb.transaction(() => {
    orderedIds.forEach((id, idx) => {
      db.update(sections).set({ sortOrder: idx }).where(eq(sections.id, id)).run();
    });
  });
  txn();
}

// ─── Watchlist Stocks ──────────────────────────────────────────────────

export function getWatchlistStocks(watchlistId: number) {
  const rows = rawDb.prepare(`
    SELECT 
      ws.id,
      ws.watchlist_id,
      ws.section_id,
      ws.exchange_listing_id,
      ws.sort_order,
      ws.added_at,
      el.exchange,
      el.trading_symbol,
      el.security_code,
      el.tradingview_symbol,
      el.listing_status,
      c.id as company_id,
      c.company_name,
      c.isin,
      s.name as sector_name,
      ss.name as subsector_name,
      (
        SELECT json_group_array(json_object('id', t.id, 'name', t.name, 'color', t.color))
        FROM company_tags ct
        JOIN tags t ON t.id = ct.tag_id
        WHERE ct.company_id = c.id
      ) as tags_json
    FROM watchlist_stocks ws
    INNER JOIN exchange_listings el ON el.id = ws.exchange_listing_id
    INNER JOIN companies c ON c.id = el.company_id
    LEFT JOIN sectors s ON s.id = c.sector_id
    LEFT JOIN subsectors ss ON ss.id = c.subsector_id
    WHERE ws.watchlist_id = ?
    ORDER BY ws.section_id, ws.sort_order
  `).all(watchlistId) as Array<Record<string, unknown>>;

  return rows.map(r => ({
    ...r,
    tags: r.tags_json ? JSON.parse(r.tags_json as string) : [],
  }));
}

export function addStockToWatchlist(watchlistId: number, exchangeListingId: number, sectionId: number | null = null) {
  // Check if already in watchlist
  const existing = rawDb.prepare(
    'SELECT id FROM watchlist_stocks WHERE watchlist_id = ? AND exchange_listing_id = ?'
  ).get(watchlistId, exchangeListingId);

  if (existing) return { success: false, message: 'Stock already in watchlist' };

  const maxOrder = rawDb.prepare(
    'SELECT COALESCE(MAX(sort_order), -1) + 1 as next FROM watchlist_stocks WHERE watchlist_id = ? AND section_id IS ?'
  ).get(watchlistId, sectionId) as { next: number };

  db.insert(watchlistStocks).values({
    watchlistId,
    sectionId,
    exchangeListingId,
    sortOrder: maxOrder.next,
  }).run();

  return { success: true };
}

export function removeStockFromWatchlist(watchlistId: number, exchangeListingId: number) {
  db.delete(watchlistStocks)
    .where(and(
      eq(watchlistStocks.watchlistId, watchlistId),
      eq(watchlistStocks.exchangeListingId, exchangeListingId)
    ))
    .run();
}

export function moveStock(
  stockId: number,
  targetWatchlistId: number,
  targetSectionId: number | null,
  sortOrder: number
) {
  const stock = db.select().from(watchlistStocks).where(eq(watchlistStocks.id, stockId)).get();
  if (!stock) return { success: false };

  const txn = rawDb.transaction(() => {
    if (stock.watchlistId !== targetWatchlistId) {
      // Moving to different watchlist - check for duplicate
      const existing = rawDb.prepare(
        'SELECT id FROM watchlist_stocks WHERE watchlist_id = ? AND exchange_listing_id = ?'
      ).get(targetWatchlistId, stock.exchangeListingId);

      if (existing) {
        // Remove from source, target already has it
        db.delete(watchlistStocks).where(eq(watchlistStocks.id, stockId)).run();
        return { success: true, duplicate: true };
      }

      db.update(watchlistStocks)
        .set({
          watchlistId: targetWatchlistId,
          sectionId: targetSectionId,
          sortOrder,
        })
        .where(eq(watchlistStocks.id, stockId))
        .run();
    } else {
      db.update(watchlistStocks)
        .set({
          sectionId: targetSectionId,
          sortOrder,
        })
        .where(eq(watchlistStocks.id, stockId))
        .run();
    }
    return { success: true };
  });

  return txn();
}

export function copyStock(
  exchangeListingId: number,
  targetWatchlistId: number,
  targetSectionId: number | null
) {
  return addStockToWatchlist(targetWatchlistId, exchangeListingId, targetSectionId);
}

export function bulkMoveStocks(
  stockIds: number[],
  targetWatchlistId: number,
  targetSectionId: number | null
) {
  const txn = rawDb.transaction(() => {
    let moved = 0;
    stockIds.forEach((id, idx) => {
      const result = moveStock(id, targetWatchlistId, targetSectionId, idx);
      if (result.success) moved++;
    });
    return { moved };
  });
  return txn();
}

export function bulkCopyStocks(
  exchangeListingIds: number[],
  targetWatchlistId: number,
  targetSectionId: number | null
) {
  const txn = rawDb.transaction(() => {
    let copied = 0;
    exchangeListingIds.forEach(id => {
      const result = copyStock(id, targetWatchlistId, targetSectionId);
      if (result.success) copied++;
    });
    return { copied };
  });
  return txn();
}

export function reorderStocks(items: Array<{ id: number; sortOrder: number; sectionId: number | null }>) {
  const txn = rawDb.transaction(() => {
    for (const item of items) {
      db.update(watchlistStocks)
        .set({ sortOrder: item.sortOrder, sectionId: item.sectionId })
        .where(eq(watchlistStocks.id, item.id))
        .run();
    }
  });
  txn();
}

// ─── Tags ──────────────────────────────────────────────────────────────

export function getAllTags() {
  return db.select().from(tags).orderBy(asc(tags.name)).all();
}

export function createTag(name: string, color?: string) {
  return db.insert(tags).values({ name, color: color || '#6b7280' }).returning().get();
}

export function updateTag(id: number, data: { name?: string; color?: string }) {
  return db.update(tags).set(data).where(eq(tags.id, id)).returning().get();
}

export function deleteTag(id: number) {
  db.delete(tags).where(eq(tags.id, id)).run();
}

export function addTagToCompany(companyId: number, tagId: number) {
  try {
    rawDb.prepare('INSERT OR IGNORE INTO company_tags (company_id, tag_id) VALUES (?, ?)').run(companyId, tagId);
    return { success: true };
  } catch {
    return { success: false };
  }
}

export function removeTagFromCompany(companyId: number, tagId: number) {
  rawDb.prepare('DELETE FROM company_tags WHERE company_id = ? AND tag_id = ?').run(companyId, tagId);
}

export function getCompanyTags(companyId: number) {
  return rawDb.prepare(`
    SELECT t.* FROM tags t
    INNER JOIN company_tags ct ON ct.tag_id = t.id
    WHERE ct.company_id = ?
    ORDER BY t.name
  `).all(companyId);
}

// ─── Company Details ───────────────────────────────────────────────────

export function getCompanyDetails(companyId: number) {
  const company = db.select().from(companies).where(eq(companies.id, companyId)).get();
  if (!company) return null;

  const listings = db.select().from(exchangeListings)
    .where(eq(exchangeListings.companyId, companyId)).all();

  let sectorName: string | undefined;
  let subsectorName: string | undefined;
  if (company.sectorId) {
    const s = db.select().from(sectors).where(eq(sectors.id, company.sectorId)).get();
    sectorName = s?.name;
  }
  if (company.subsectorId) {
    const ss = db.select().from(subsectors).where(eq(subsectors.id, company.subsectorId)).get();
    subsectorName = ss?.name;
  }

  const companyTagsList = getCompanyTags(companyId);

  // Watchlist memberships
  const memberships = rawDb.prepare(`
    SELECT 
      ws.watchlist_id,
      w.name as watchlist_name,
      ws.section_id,
      sec.name as section_name
    FROM watchlist_stocks ws
    INNER JOIN exchange_listings el ON el.id = ws.exchange_listing_id
    INNER JOIN watchlists w ON w.id = ws.watchlist_id
    LEFT JOIN sections sec ON sec.id = ws.section_id
    WHERE el.company_id = ?
  `).all(companyId);

  return {
    ...company,
    sectorName,
    subsectorName,
    listings,
    tags: companyTagsList,
    watchlistMemberships: memberships,
  };
}

export function updateCompanyClassification(companyId: number, sectorId: number | null, subsectorId: number | null) {
  db.update(companies)
    .set({
      sectorId,
      subsectorId,
      classificationSource: 'manual',
      classificationManuallyEdited: true,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(companies.id, companyId))
    .run();
}

// ─── Parse Symbols ─────────────────────────────────────────────────────

export function parseAndValidateSymbols(input: string): Array<{
  exchange: string;
  symbol: string;
  tradingviewSymbol?: string;
  listingId: number | null;
  companyName: string | null;
  sectorName?: string;
  subsectorName?: string;
  error?: string;
}> {
  const lines = input
    .split(/[\n,]/)
    .map(s => s.trim())
    .filter(Boolean);

  return lines.map(line => {
    let exchange = '';
    let symbol = line.trim();

    if (symbol.includes(':')) {
      const parts = symbol.split(':');
      exchange = parts[0].toUpperCase();
      symbol = parts[1];
    } else if (/^\d+$/.test(symbol)) {
      exchange = 'BSE';
    }

    // Clean symbol: strip trailing comma, quotes, spaces
    symbol = symbol.replace(/[,"]+$/g, '').replace(/^[,"]+/g, '').trim().toUpperCase();

    if (!symbol) {
      return { exchange: exchange || 'NSE', symbol: line, listingId: null, companyName: null, error: 'Empty symbol' };
    }

    // Look up in database
    let listing: { id: number; exchange: string; trading_symbol: string; tradingview_symbol: string; company_name: string; sector_name?: string; subsector_name?: string } | undefined;

    if (exchange) {
      listing = rawDb.prepare(`
        SELECT el.id, el.exchange, el.trading_symbol, el.tradingview_symbol, c.company_name, s.name as sector_name, ss.name as subsector_name
        FROM exchange_listings el
        INNER JOIN companies c ON c.id = el.company_id
        LEFT JOIN sectors s ON s.id = c.sector_id
        LEFT JOIN subsectors ss ON ss.id = c.subsector_id
        WHERE el.exchange = ? AND (el.trading_symbol = ? OR el.security_code = ?)
      `).get(exchange, symbol, symbol) as typeof listing;
    } else {
      // No exchange specified: try NSE first, then BSE
      listing = rawDb.prepare(`
        SELECT el.id, el.exchange, el.trading_symbol, el.tradingview_symbol, c.company_name, s.name as sector_name, ss.name as subsector_name
        FROM exchange_listings el
        INNER JOIN companies c ON c.id = el.company_id
        LEFT JOIN sectors s ON s.id = c.sector_id
        LEFT JOIN subsectors ss ON ss.id = c.subsector_id
        WHERE el.trading_symbol = ? OR el.security_code = ?
        ORDER BY CASE WHEN el.exchange = 'NSE' THEN 0 ELSE 1 END
        LIMIT 1
      `).get(symbol, symbol) as typeof listing;
    }

    if (!listing) {
      return { exchange: exchange || 'NSE', symbol, listingId: null, companyName: null, error: 'Symbol not found' };
    }

    return {
      exchange: listing.exchange,
      symbol: listing.trading_symbol,
      tradingviewSymbol: listing.tradingview_symbol,
      listingId: listing.id,
      companyName: listing.company_name,
      sectorName: listing.sector_name || undefined,
      subsectorName: listing.subsector_name || undefined,
    };
  });
}

// ─── Export ────────────────────────────────────────────────────────────

export function exportWatchlist(watchlistId: number) {
  const wl = db.select().from(watchlists).where(eq(watchlists.id, watchlistId)).get();
  if (!wl) return null;

  const stocks = getWatchlistStocks(watchlistId);
  const sects = db.select().from(sections).where(eq(sections.watchlistId, watchlistId)).all();

  return { watchlist: wl, sections: sects, stocks };
}

export function exportAllWatchlists() {
  const wls = db.select().from(watchlists).orderBy(asc(watchlists.sortOrder)).all();
  return wls.map(wl => exportWatchlist(wl.id));
}

export function getStockUniverseStats() {
  const total = rawDb.prepare('SELECT COUNT(*) as count FROM companies').get() as { count: number };
  const nse = rawDb.prepare("SELECT COUNT(*) as count FROM exchange_listings WHERE exchange = 'NSE'").get() as { count: number };
  const bse = rawDb.prepare("SELECT COUNT(*) as count FROM exchange_listings WHERE exchange = 'BSE'").get() as { count: number };
  const classified = rawDb.prepare('SELECT COUNT(*) as count FROM companies WHERE sector_id IS NOT NULL').get() as { count: number };
  const unclassified = rawDb.prepare('SELECT COUNT(*) as count FROM companies WHERE sector_id IS NULL').get() as { count: number };
  const sectorCount = rawDb.prepare('SELECT COUNT(*) as count FROM sectors').get() as { count: number };

  return {
    totalCompanies: total.count,
    nseListings: nse.count,
    bseListings: bse.count,
    classified: classified.count,
    unclassified: unclassified.count,
    sectors: sectorCount.count,
  };
}

