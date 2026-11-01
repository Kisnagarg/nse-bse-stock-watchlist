import { NextRequest } from 'next/server';
import { ensureDb, jsonResponse, errorResponse, handleOptions, getSearchParams } from '@/app/api/_helpers';
import * as ops from '@/lib/db/operations';

export async function OPTIONS() {
  return handleOptions();
}

export async function GET(req: NextRequest) {
  ensureDb();
  const p = getSearchParams(req);
  const symbol = p.symbol || p.listingId;

  if (!symbol) {
    return errorResponse('Symbol or listingId query parameter is required');
  }

  const result = ops.getStockStatusAndWatchlists(symbol);
  if (!result) {
    return errorResponse(`Stock "${symbol}" not found in master database`, 404);
  }

  return jsonResponse(result);
}

export async function POST(req: NextRequest) {
  ensureDb();
  const body = await req.json();
  const { action, watchlistId, listingId, sectionId, sectionName } = body;

  if (!listingId && action !== 'create_section') {
    return errorResponse('listingId is required');
  }

  if (action === 'assign_section') {
    if (!watchlistId) return errorResponse('watchlistId is required');
    ops.assignStockToSection(Number(watchlistId), Number(listingId), sectionId !== undefined ? (sectionId === null ? null : Number(sectionId)) : null);
    const updated = ops.getStockStatusAndWatchlists(Number(listingId));
    return jsonResponse({ success: true, updated });
  }

  if (action === 'remove_section') {
    // Moving stock to Uncategorized (section_id = null)
    if (!watchlistId) return errorResponse('watchlistId is required');
    ops.assignStockToSection(Number(watchlistId), Number(listingId), null);
    const updated = ops.getStockStatusAndWatchlists(Number(listingId));
    return jsonResponse({ success: true, updated });
  }

  if (action === 'remove_watchlist') {
    if (!watchlistId) return errorResponse('watchlistId is required');
    ops.removeStockFromWatchlist(Number(watchlistId), Number(listingId));
    const updated = ops.getStockStatusAndWatchlists(Number(listingId));
    return jsonResponse({ success: true, updated });
  }

  if (action === 'remove_all_watchlists') {
    const result = ops.removeStockFromAllWatchlists(Number(listingId));
    const updated = ops.getStockStatusAndWatchlists(Number(listingId));
    return jsonResponse({ success: true, result, updated });
  }

  if (action === 'create_section') {
    if (!watchlistId || !sectionName?.trim()) {
      return errorResponse('watchlistId and sectionName required');
    }
    const newSection = ops.createSection(Number(watchlistId), sectionName.trim());
    return jsonResponse({ success: true, section: newSection });
  }

  return errorResponse('Invalid action');
}
