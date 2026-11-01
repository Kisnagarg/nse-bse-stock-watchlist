import { NextRequest } from 'next/server';
import { ensureDb, jsonResponse, errorResponse } from '@/app/api/_helpers';
import * as ops from '@/lib/db/operations';
import { parseClassificationCSV } from '@/lib/csv-parser';

export async function POST(req: NextRequest) {
  ensureDb();
  const body = await req.json();
  const { csvContent, action, overwriteManual } = body;

  if (!csvContent) return errorResponse('CSV content required');

  const parsed = parseClassificationCSV(csvContent);

  if (action === 'preview') {
    const preview = ops.previewClassification(parsed.records);
    return jsonResponse({
      ...preview,
      parseErrors: parsed.errors,
      totalParsed: parsed.records.length,
    });
  }

  if (action === 'apply') {
    const result = ops.applyClassification(parsed.records, overwriteManual === true);
    return jsonResponse(result);
  }

  return errorResponse('action must be "preview" or "apply"');
}

