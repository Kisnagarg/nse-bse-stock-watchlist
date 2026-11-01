import { NextRequest } from 'next/server';
import { ensureDb, jsonResponse, errorResponse } from '@/app/api/_helpers';
import * as ops from '@/lib/db/operations';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  ensureDb();
  const { id } = await params;
  const body = await req.json();
  const result = ops.updateSection(parseInt(id), body);
  if (!result) return errorResponse('Section not found', 404);
  return jsonResponse(result);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  ensureDb();
  const { id } = await params;
  ops.deleteSection(parseInt(id));
  return jsonResponse({ success: true });
}

