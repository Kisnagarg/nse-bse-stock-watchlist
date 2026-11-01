// API response types

export interface Company {
  id: number;
  companyName: string;
  isin: string | null;
  sectorId: number | null;
  subsectorId: number | null;
  sectorName?: string;
  subsectorName?: string;
  classificationSource: string | null;
  classificationManuallyEdited: boolean;
  createdAt: string;
  updatedAt: string;
  listings: ExchangeListing[];
  tags: Tag[];
  watchlistMemberships?: WatchlistMembership[];
}

export interface ExchangeListing {
  id: number;
  companyId: number;
  exchange: 'NSE' | 'BSE';
  tradingSymbol: string;
  securityCode: string | null;
  tradingviewSymbol: string;
  listingStatus: string;
  lastSyncedAt: string | null;
  // Joined fields
  companyName?: string;
  sectorName?: string;
  subsectorName?: string;
}

export interface Sector {
  id: number;
  name: string;
  subsectors?: Subsector[];
}

export interface Subsector {
  id: number;
  sectorId: number;
  name: string;
}

export interface Watchlist {
  id: number;
  name: string;
  color: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  stockCount?: number;
  sections?: Section[];
}

export interface Section {
  id: number;
  watchlistId: number;
  name: string;
  sortOrder: number;
  isCollapsed: boolean;
  stocks?: WatchlistStock[];
}

export interface StockRowItem {
  id: number;
  watchlist_id: number;
  section_id: number | null;
  exchange_listing_id: number;
  sort_order: number;
  added_at: string;
  exchange: 'NSE' | 'BSE';
  trading_symbol: string;
  security_code: string | null;
  tradingview_symbol: string;
  listing_status: string;
  company_id: number;
  company_name: string;
  isin: string | null;
  sector_name: string | null;
  subsector_name: string | null;
  tags?: Tag[];
}

export interface WatchlistStock {
  id: number;
  watchlistId: number;
  sectionId: number | null;
  exchangeListingId: number;
  sortOrder: number;
  addedAt: string;
  // Joined fields
  listing?: ExchangeListing;
  company?: Company;
  tags?: Tag[];
}

export interface WatchlistMembership {
  watchlistId: number;
  watchlistName: string;
  sectionId: number | null;
  sectionName: string | null;
}

export interface Tag {
  id: number;
  name: string;
  color: string;
}

export interface ClassificationPreview {
  matched: { symbol: string; sector: string; subsector: string; companyId: number; companyName: string; existingSector?: string; existingSubsector?: string; hasConflict: boolean; }[];
  unmatched: { symbol: string; sector: string; subsector: string; }[];
  updated: number;
  conflicts: number;
  newClassifications: number;
}

export interface SearchFilters {
  query?: string;
  exchange?: 'NSE' | 'BSE';
  sectorId?: number;
  subsectorId?: number;
  watchlistId?: number;
  sectionId?: number;
  classified?: boolean;
  listingStatus?: string;
  tagId?: number;
  page?: number;
  limit?: number;
}

export interface UndoAction {
  id: string;
  type: 'move' | 'delete' | 'bulk_move';
  description: string;
  timestamp: number;
  data: Record<string, unknown>;
}
