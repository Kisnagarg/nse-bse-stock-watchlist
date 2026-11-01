import { NextRequest } from 'next/server';
import { ensureDb, jsonResponse, errorResponse } from '@/app/api/_helpers';
import * as ops from '@/lib/db/operations';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  ensureDb();
  const { id } = await params;
  const watchlistId = parseInt(id);
  const stocks = ops.getWatchlistStocks(watchlistId);
  return jsonResponse(stocks);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  ensureDb();
  const { id } = await params;
  const watchlistId = parseInt(id);
  const body = await req.json();
  const result = ops.updateWatchlist(watchlistId, body);
  if (!result) return errorResponse('Watchlist not found', 404);
  return jsonResponse(result);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  ensureDb();
  const { id } = await params;
  ops.deleteWatchlist(parseInt(id));
  return jsonResponse({ success: true });
}

