import { NextRequest } from 'next/server';
import { ensureDb, jsonResponse, errorResponse } from '@/app/api/_helpers';
import * as ops from '@/lib/db/operations';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  ensureDb();
  const { id } = await params;
  const result = ops.exportWatchlist(parseInt(id));
  if (!result) return errorResponse('Watchlist not found', 404);
  return jsonResponse(result);
}

