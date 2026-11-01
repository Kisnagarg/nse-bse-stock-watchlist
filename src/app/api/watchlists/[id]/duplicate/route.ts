import { NextRequest } from 'next/server';
import { ensureDb, jsonResponse, errorResponse } from '@/app/api/_helpers';
import * as ops from '@/lib/db/operations';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  ensureDb();
  const { id } = await params;
  const body = await req.json();
  const { name } = body;
  if (!name?.trim()) return errorResponse('Name is required');
  const result = ops.duplicateWatchlist(parseInt(id), name.trim());
  if (!result) return errorResponse('Watchlist not found', 404);
  return jsonResponse(result, 201);
}

