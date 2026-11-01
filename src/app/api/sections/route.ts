import { NextRequest } from 'next/server';
import { ensureDb, jsonResponse, errorResponse } from '@/app/api/_helpers';
import * as ops from '@/lib/db/operations';

export async function POST(req: NextRequest) {
  ensureDb();
  const body = await req.json();
  const { watchlistId, name } = body;
  if (!watchlistId || !name?.trim()) return errorResponse('watchlistId and name required');
  const section = ops.createSection(watchlistId, name.trim());
  return jsonResponse(section, 201);
}

