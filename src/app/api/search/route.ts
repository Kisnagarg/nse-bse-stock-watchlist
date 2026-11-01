import { NextRequest } from 'next/server';
import { ensureDb, jsonResponse, errorResponse, getSearchParams } from '@/app/api/_helpers';
import * as ops from '@/lib/db/operations';

export async function GET(req: NextRequest) {
  ensureDb();
  const p = getSearchParams(req);
  const filters = {
    query: p.query || undefined,
    exchange: (p.exchange as 'NSE' | 'BSE') || undefined,
    sectorId: p.sectorId ? parseInt(p.sectorId) : undefined,
    subsectorId: p.subsectorId ? parseInt(p.subsectorId) : undefined,
    watchlistId: p.watchlistId ? parseInt(p.watchlistId) : undefined,
    classified: p.classified === 'true' ? true : p.classified === 'false' ? false : undefined,
    listingStatus: p.listingStatus || undefined,
    tagId: p.tagId ? parseInt(p.tagId) : undefined,
    page: p.page ? parseInt(p.page) : 1,
    limit: p.limit ? parseInt(p.limit) : 50,
  };
  const results = ops.searchStocks(filters);
  return jsonResponse(results);
}

