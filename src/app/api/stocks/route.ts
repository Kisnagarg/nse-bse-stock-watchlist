import { NextRequest } from 'next/server';
import { ensureDb, jsonResponse, errorResponse } from '@/app/api/_helpers';
import * as ops from '@/lib/db/operations';

export async function POST(req: NextRequest) {
  ensureDb();
  const body = await req.json();
  const { watchlistId, exchangeListingId, sectionId } = body;
  if (!watchlistId || !exchangeListingId) {
    return errorResponse('watchlistId and exchangeListingId required');
  }
  const result = ops.addStockToWatchlist(watchlistId, exchangeListingId, sectionId || null);
  if (!result.success) return errorResponse(result.message || 'Failed to add stock');
  return jsonResponse(result, 201);
}

export async function PUT(req: NextRequest) {
  ensureDb();
  const body = await req.json();

  if (body.action === 'move') {
    const { stockId, targetWatchlistId, targetSectionId, sortOrder } = body;
    const result = ops.moveStock(stockId, targetWatchlistId, targetSectionId ?? null, sortOrder ?? 0);
    return jsonResponse(result);
  }

  if (body.action === 'copy') {
    const { exchangeListingId, targetWatchlistId, targetSectionId } = body;
    const result = ops.copyStock(exchangeListingId, targetWatchlistId, targetSectionId ?? null);
    return jsonResponse(result);
  }

  if (body.action === 'bulk_move') {
    const { stockIds, targetWatchlistId, targetSectionId } = body;
    const result = ops.bulkMoveStocks(stockIds, targetWatchlistId, targetSectionId ?? null);
    return jsonResponse(result);
  }

  if (body.action === 'bulk_copy') {
    const { exchangeListingIds, targetWatchlistId, targetSectionId } = body;
    const result = ops.bulkCopyStocks(exchangeListingIds, targetWatchlistId, targetSectionId ?? null);
    return jsonResponse(result);
  }

  if (body.action === 'reorder') {
    const { items } = body;
    ops.reorderStocks(items);
    return jsonResponse({ success: true });
  }

  return errorResponse('Invalid action');
}

export async function DELETE(req: NextRequest) {
  ensureDb();
  const body = await req.json();
  const { watchlistId, exchangeListingId } = body;
  if (!watchlistId || !exchangeListingId) {
    return errorResponse('watchlistId and exchangeListingId required');
  }
  ops.removeStockFromWatchlist(watchlistId, exchangeListingId);
  return jsonResponse({ success: true });
}

