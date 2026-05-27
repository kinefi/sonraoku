import * as SQLite from 'expo-sqlite';
import { drizzle, ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite';
import { migrate } from 'drizzle-orm/expo-sqlite/migrator';
import migrations from '@/drizzle/migrations';
import * as schema from '@/lib/db/schema';
import { DATABASE_NAME } from '@/lib/constants';
import { DbAction } from '@/lib/db/types';
export type { DbAction };

export const sqlite = SQLite.openDatabaseSync(DATABASE_NAME);
export const db = drizzle(sqlite, { schema });

export async function initDb(): Promise<DbAction> {
  // Always disable foreign keys during migration to prevent constraint errors
  sqlite.execSync('PRAGMA foreign_keys = OFF');
  
  // Always enable Write-Ahead Logging (WAL) mode
  sqlite.execSync('PRAGMA journal_mode = WAL');
  
  // Check if we are in a broken state by attempting to create the migrations table safely
  try {
    // Pre-emptively ensuring the migrations table exists with correct SQLite types
    sqlite.execSync('CREATE TABLE IF NOT EXISTS "__drizzle_migrations" (id INTEGER PRIMARY KEY, hash TEXT NOT NULL, created_at INTEGER);');

    // Use the imported migrations object for Expo runtime stability
    await migrate(db as unknown as ExpoSQLiteDatabase<typeof schema>, migrations);
    
    // Verify the tables exist (optional safety check)
    const tableCheck = sqlite.getAllSync("SELECT name FROM sqlite_master WHERE type='table' AND name='articles';");
    if (tableCheck.length === 0) throw new Error('Articles table missing after migration');

    return { error: null };
  } catch (e) {
    console.error('Database migration failed:', e);
    return { error: e };
  } finally {
    // Always attempt to re-enable foreign keys
    try { sqlite.execSync('PRAGMA foreign_keys = ON'); } catch { /* ignore */ }
  }
}