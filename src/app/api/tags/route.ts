import { NextRequest } from 'next/server';
import { ensureDb, jsonResponse, errorResponse } from '@/app/api/_helpers';
import * as ops from '@/lib/db/operations';

export async function GET() {
  ensureDb();
  return jsonResponse(ops.getAllTags());
}

export async function POST(req: NextRequest) {
  ensureDb();
  const body = await req.json();
  const { name, color } = body;
  if (!name?.trim()) return errorResponse('Name is required');
  try {
    const tag = ops.createTag(name.trim(), color);
    return jsonResponse(tag, 201);
  } catch {
    return errorResponse('Tag already exists');
  }
}

