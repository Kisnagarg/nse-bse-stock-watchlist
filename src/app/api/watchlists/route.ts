import { NextRequest } from 'next/server';
import { ensureDb, jsonResponse, errorResponse } from '@/app/api/_helpers';
import * as ops from '@/lib/db/operations';

export async function GET() {
  ensureDb();
  const watchlists = ops.getAllWatchlists();
  return jsonResponse(watchlists);
}

export async function POST(req: NextRequest) {
  ensureDb();
  const body = await req.json();
  const { name, color } = body;
  if (!name?.trim()) return errorResponse('Name is required');
  const watchlist = ops.createWatchlist(name.trim(), color);
  return jsonResponse(watchlist, 201);
}

export async function PUT(req: NextRequest) {
  ensureDb();
  const body = await req.json();
  const { orderedIds } = body;
  if (!Array.isArray(orderedIds)) return errorResponse('orderedIds array required');
  ops.reorderWatchlists(orderedIds);
  return jsonResponse({ success: true });
}

