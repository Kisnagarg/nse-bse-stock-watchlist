import { NextRequest, NextResponse } from 'next/server';
import { initializeDatabase } from '@/lib/db/operations';

// Initialize DB on first API call
let initialized = false;
export function ensureDb() {
  if (!initialized) {
    initializeDatabase();
    initialized = true;
  }
}

export function jsonResponse(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function errorResponse(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function getSearchParams(req: NextRequest) {
  const url = new URL(req.url);
  const params: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    params[key] = value;
  });
  return params;
}

