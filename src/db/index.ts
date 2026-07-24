import { type SQLiteDatabase } from 'expo-sqlite';
import { CREATE_TABLES_SQL } from './schema';
import { ASH_POKEMON_IDS } from '../data/ashPokemon';

export async function migrateDbIfNeeded(db: any) {
  try {
    if (typeof db.execAsync === 'function') {
      await db.execAsync(CREATE_TABLES_SQL);
      try {
        await db.execAsync('ALTER TABLE pokemon ADD COLUMN shiny_artwork_url TEXT;');
      } catch (e) {
        // Column already exists or table was just created with it
      }
      try {
        await db.execAsync('ALTER TABLE pokemon_collection_status ADD COLUMN ash_owned INTEGER DEFAULT 0;');
      } catch (e) {
        // Column already exists or table was just created with it
      }
      try {
        await db.execAsync(`
          INSERT OR IGNORE INTO pokemon_collection_status (pokemon_id, is_favorite)
          SELECT pokemon_id, 1 FROM favorites;
          DROP TABLE IF EXISTS favorites;
        `);
      } catch (e) {
        // Legacy favorites table does not exist or already migrated
      }
      try {
        const ashValues = ASH_POKEMON_IDS.map((id) => `(${id}, 1)`).join(',');
        await db.execAsync(`
          INSERT INTO pokemon_collection_status (pokemon_id, ash_owned)
          VALUES ${ashValues}
          ON CONFLICT(pokemon_id) DO UPDATE SET ash_owned = 1;
        `);
      } catch (e) {
        // Pre-seeding error safeguard
      }
      try {
        await db.execAsync('ALTER TABLE pokemon ADD COLUMN egg_groups TEXT;');
      } catch (e) {}
      try {
        await db.execAsync('ALTER TABLE pokemon ADD COLUMN hatch_counter INTEGER;');
      } catch (e) {}
      try {
        await db.execAsync('ALTER TABLE pokemon ADD COLUMN gender_rate INTEGER;');
      } catch (e) {}
    } else if (typeof db.exec === 'function') {
      db.exec(CREATE_TABLES_SQL);
      try {
        db.exec('ALTER TABLE pokemon ADD COLUMN shiny_artwork_url TEXT;');
      } catch (e) {
        // Column already exists or table was just created with it
      }
      try {
        db.exec('ALTER TABLE pokemon_collection_status ADD COLUMN ash_owned INTEGER DEFAULT 0;');
      } catch (e) {
        // Column already exists or table was just created with it
      }
      try {
        db.exec('ALTER TABLE pokemon ADD COLUMN egg_groups TEXT;');
      } catch (e) {}
      try {
        db.exec('ALTER TABLE pokemon ADD COLUMN hatch_counter INTEGER;');
      } catch (e) {}
      try {
        db.exec('ALTER TABLE pokemon ADD COLUMN gender_rate INTEGER;');
      } catch (e) {}
      try {
        db.exec(`
          INSERT OR IGNORE INTO pokemon_collection_status (pokemon_id, is_favorite)
          SELECT pokemon_id, 1 FROM favorites;
          DROP TABLE IF EXISTS favorites;
        `);
      } catch (e) {
        // Legacy favorites table does not exist or already migrated
      }
      try {
        const ashValues = ASH_POKEMON_IDS.map((id) => `(${id}, 1)`).join(',');
        db.exec(`
          INSERT INTO pokemon_collection_status (pokemon_id, ash_owned)
          VALUES ${ashValues}
          ON CONFLICT(pokemon_id) DO UPDATE SET ash_owned = 1;
        `);
      } catch (e) {
        // Pre-seeding error safeguard
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
