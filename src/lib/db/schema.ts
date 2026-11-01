import { sqliteTable, text, integer, real, uniqueIndex, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// sectors table
export const sectors = sqliteTable('sectors', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
});

// subsectors table  
export const subsectors = sqliteTable('subsectors', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  sectorId: integer('sector_id').notNull().references(() => sectors.id),
  name: text('name').notNull(),
}, (table) => ({
  sectorSubsectorIdx: uniqueIndex('sector_subsector_idx').on(table.sectorId, table.name),
}));

// companies table
export const companies = sqliteTable('companies', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  companyName: text('company_name').notNull(),
  isin: text('isin'),
  sectorId: integer('sector_id').references(() => sectors.id),
  subsectorId: integer('subsector_id').references(() => subsectors.id),
  classificationSource: text('classification_source'), // 'csv', 'manual', 'exchange'
  classificationManuallyEdited: integer('classification_manually_edited', { mode: 'boolean' }).default(false),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
}, (table) => ({
  isinIdx: index('isin_idx').on(table.isin),
  nameIdx: index('company_name_idx').on(table.companyName),
}));

// exchange_listings table
export const exchangeListings = sqliteTable('exchange_listings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  companyId: integer('company_id').notNull().references(() => companies.id),
  exchange: text('exchange').notNull(), // 'NSE' or 'BSE'
  tradingSymbol: text('trading_symbol').notNull(),
  securityCode: text('security_code'),
  tradingviewSymbol: text('tradingview_symbol').notNull(),
  listingStatus: text('listing_status').notNull().default('active'), // 'active', 'suspended', 'delisted'
  lastSyncedAt: text('last_synced_at'),
}, (table) => ({
  exchangeSymbolIdx: uniqueIndex('exchange_symbol_idx').on(table.exchange, table.tradingSymbol),
  companyIdx: index('company_id_idx').on(table.companyId),
  tvSymbolIdx: index('tv_symbol_idx').on(table.tradingviewSymbol),
}));

// watchlists table
export const watchlists = sqliteTable('watchlists', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  color: text('color').default('#3b82f6'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
});

// sections table
export const sections = sqliteTable('sections', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  watchlistId: integer('watchlist_id').notNull().references(() => watchlists.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  isCollapsed: integer('is_collapsed', { mode: 'boolean' }).default(false),
}, (table) => ({
  watchlistIdx: index('section_watchlist_idx').on(table.watchlistId),
}));

// watchlist_stocks table
export const watchlistStocks = sqliteTable('watchlist_stocks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  watchlistId: integer('watchlist_id').notNull().references(() => watchlists.id, { onDelete: 'cascade' }),
  sectionId: integer('section_id').references(() => sections.id, { onDelete: 'set null' }),
  exchangeListingId: integer('exchange_listing_id').notNull().references(() => exchangeListings.id),
  sortOrder: real('sort_order').notNull().default(0),
  addedAt: text('added_at').default(sql`(datetime('now'))`),
}, (table) => ({
  watchlistListingIdx: uniqueIndex('watchlist_listing_idx').on(table.watchlistId, table.exchangeListingId),
  sectionIdx: index('ws_section_idx').on(table.sectionId),
  sortIdx: index('ws_sort_idx').on(table.watchlistId, table.sectionId, table.sortOrder),
}));

// tags table
export const tags = sqliteTable('tags', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  color: text('color').default('#6b7280'),
});

// company_tags junction table
export const companyTags = sqliteTable('company_tags', {
  companyId: integer('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  tagId: integer('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
}, (table) => ({
  pk: uniqueIndex('company_tag_pk').on(table.companyId, table.tagId),
}));
