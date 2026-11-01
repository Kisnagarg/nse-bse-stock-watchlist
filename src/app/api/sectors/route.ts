import { ensureDb, jsonResponse } from '@/app/api/_helpers';
import * as ops from '@/lib/db/operations';

export async function GET() {
  ensureDb();
  const sectors = ops.getAllSectors();
  return jsonResponse(sectors);
}

