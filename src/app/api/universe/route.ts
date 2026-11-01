import { NextRequest } from 'next/server';
import { ensureDb, jsonResponse, errorResponse } from '@/app/api/_helpers';
import * as ops from '@/lib/db/operations';
import { parseStockUniverseCSV } from '@/lib/csv-parser';

export async function GET() {
  ensureDb();
  const stats = ops.getStockUniverseStats();
  return jsonResponse(stats);
}

export async function POST(req: NextRequest) {
  ensureDb();
  const body = await req.json();
  const { csvContent } = body;
  if (!csvContent) return errorResponse('CSV content required');

  const parsed = parseStockUniverseCSV(csvContent);
  if (parsed.errors.length > 0) {
    return jsonResponse({ errors: parsed.errors }, 400);
  }

  const result = ops.importStockUniverse(parsed.records);
  return jsonResponse(result);
}

