import { NextRequest } from 'next/server';
import { ensureDb, jsonResponse, errorResponse } from '@/app/api/_helpers';
import * as ops from '@/lib/db/operations';

export async function POST(req: NextRequest) {
  ensureDb();
  const body = await req.json();
  const { input } = body;
  if (!input?.trim()) return errorResponse('Input required');
  const results = ops.parseAndValidateSymbols(input);
  return jsonResponse(results);
}

