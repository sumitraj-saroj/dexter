import { type SQLiteDatabase } from 'expo-sqlite';
import { CREATE_TABLES_SQL } from './schema';

export async function migrateDbIfNeeded(db: any) {
  try {
    if (typeof db.execAsync === 'function') {
      await db.execAsync(CREATE_TABLES_SQL);
      try {
        await db.execAsync('ALTER TABLE pokemon ADD COLUMN shiny_artwork_url TEXT;');
      } catch (e) {
        // Column already exists or table was just created with it
      }
    } else if (typeof db.exec === 'function') {
      db.exec(CREATE_TABLES_SQL);
      try {
        db.exec('ALTER TABLE pokemon ADD COLUMN shiny_artwork_url TEXT;');
      } catch (e) {
        // Column already exists or table was just created with it
      }
    }
  } catch (error) {
    console.error('Failed to run SQLite migrations:', error);
    throw error;
  }
}

export * from './schema';
export * from './sync';
export * from './queries';
