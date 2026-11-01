import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
import path from 'path';
import fs from 'fs';

let DB_PATH: string;

if (process.env.VERCEL) {
  // On Vercel, the lambda execution filesystem is read-only, so copy to /tmp
  const sourceDb = path.join(process.cwd(), 'data', 'watchlist.db');
  DB_PATH = path.join('/tmp', 'watchlist.db');
  if (!fs.existsSync(DB_PATH) && fs.existsSync(sourceDb)) {
    try {
      fs.copyFileSync(sourceDb, DB_PATH);
    } catch (err) {
      console.error('Failed to copy database to /tmp:', err);
    }
  }
} else {
  DB_PATH = path.join(process.cwd(), 'data', 'watchlist.db');
  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

const sqlite = new Database(DB_PATH);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

export const db = drizzle(sqlite, { schema });
export const rawDb = sqlite;
export { schema };
