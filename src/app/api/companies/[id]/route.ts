import { NextRequest } from 'next/server';
import { ensureDb, jsonResponse, errorResponse } from '@/app/api/_helpers';
import * as ops from '@/lib/db/operations';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  ensureDb();
  const { id } = await params;
  const company = ops.getCompanyDetails(parseInt(id));
  if (!company) return errorResponse('Company not found', 404);
  return jsonResponse(company);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  ensureDb();
  const { id } = await params;
  const body = await req.json();
  const companyId = parseInt(id);

  if (body.action === 'classify') {
    ops.updateCompanyClassification(companyId, body.sectorId, body.subsectorId);
    return jsonResponse({ success: true });
  }

  if (body.action === 'addTag') {
    const result = ops.addTagToCompany(companyId, body.tagId);
    return jsonResponse(result);
  }

  if (body.action === 'removeTag') {
    ops.removeTagFromCompany(companyId, body.tagId);
    return jsonResponse({ success: true });
  }

  return errorResponse('Invalid action');
}

