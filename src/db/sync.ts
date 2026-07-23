import { fetchAllNationalPokemon } from '../api/pokeapi';
import { getUserSetting, setUserSetting } from './queries';

const CURRENT_DATA_VERSION = '3';

export async function isDatabaseSynced(db: any): Promise<boolean> {
  try {
    let count = 0;
    if (typeof db.getFirstAsync === 'function') {
      const row: any = await db.getFirstAsync(
        'SELECT COUNT(*) as count FROM pokemon WHERE shiny_artwork_url IS NOT NULL AND shiny_artwork_url != ""'
      );
      count = row?.count || 0;
    } else if (typeof db.prepare === 'function') {
      // Node.js sqlite fallback (e.g. better-sqlite3)
      const row: any = db
        .prepare(
          'SELECT COUNT(*) as count FROM pokemon WHERE shiny_artwork_url IS NOT NULL AND shiny_artwork_url != ""'
        )
        .get();
      count = row?.count || 0;
    }

    const version = await getUserSetting(db, 'data_version', '0');
    return count >= 1000 && version === CURRENT_DATA_VERSION;
  } catch (error) {
    return false;
  }
}

export async function syncNationalPokemon(
  db: any,
  onProgress?: (current: number, total: number) => void,
  force: boolean = false
): Promise<void> {
  if (!force) {
    const synced = await isDatabaseSynced(db);
    if (synced) {
      if (onProgress) onProgress(1025, 1025);
      return;
    }
  }

  const { pokemonList, generations } = await fetchAllNationalPokemon(onProgress);

  if (typeof db.withTransactionAsync === 'function') {
    // Expo SQLite transaction API
    await db.withTransactionAsync(async () => {
      // Clear existing records before sync
      await db.execAsync(`
        DELETE FROM pokemon_moves;
        DELETE FROM pokemon_abilities;
        DELETE FROM pokemon_stats;
        DELETE FROM evolution_chain;
        DELETE FROM generations;
        DELETE FROM pokemon;
      `);

      for (const gen of generations) {
        await db.runAsync(
          `INSERT INTO generations (id, name, region_name, start_id, end_id) VALUES (?, ?, ?, ?, ?)`,
          [gen.id, gen.name, gen.regionName, gen.startId, gen.endId]
        );
      }

      for (const item of pokemonList) {
        const { pokemon, stats, abilities, moves, evolution } = item;

        await db.runAsync(
          `INSERT INTO pokemon (id, name, number, height, weight, primary_type, secondary_type, is_legendary, is_mythical, flavor_text, sprite_url, shiny_sprite_url, official_artwork_url, shiny_artwork_url)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            pokemon.id,
            pokemon.name,
            pokemon.number,
            pokemon.height,
            pokemon.weight,
            pokemon.primary_type,
            pokemon.secondary_type,
            pokemon.is_legendary ? 1 : 0,
            pokemon.is_mythical ? 1 : 0,
            pokemon.flavor_text,
            pokemon.sprite_url,
            pokemon.shiny_sprite_url,
            pokemon.official_artwork_url,
            pokemon.shiny_artwork_url,
          ]
        );

        await db.runAsync(
          `INSERT INTO pokemon_stats (pokemon_id, hp, attack, defense, sp_attack, sp_defense, speed)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            pokemon.id,
            stats.hp,
            stats.attack,
            stats.defense,
            stats.sp_attack,
            stats.sp_defense,
            stats.speed,
          ]
        );

        for (const ab of abilities) {
          await db.runAsync(
            `INSERT INTO pokemon_abilities (pokemon_id, ability_name, effect_text, is_hidden)
             VALUES (?, ?, ?, ?)`,
            [pokemon.id, ab.ability_name, ab.effect_text, ab.is_hidden ? 1 : 0]
          );
        }

        for (const mv of moves) {
          await db.runAsync(
            `INSERT INTO pokemon_moves (pokemon_id, move_name, level_learned, learn_method)
             VALUES (?, ?, ?, ?)`,
            [pokemon.id, mv.move_name, mv.level_learned, mv.learn_method]
          );
        }

        if (evolution.evolves_from_id !== null) {
          await db.runAsync(
            `INSERT INTO evolution_chain (pokemon_id, evolves_from_id, evolution_trigger)
             VALUES (?, ?, ?)`,
            [pokemon.id, evolution.evolves_from_id, evolution.evolution_trigger]
          );
        }
      }
    });
    await setUserSetting(db, 'data_version', CURRENT_DATA_VERSION);
  } else if (typeof db.prepare === 'function') {
    // Node.js sqlite (better-sqlite3 style) for testing
    const deleteQueries = [
      'DELETE FROM pokemon_moves;',
      'DELETE FROM pokemon_abilities;',
      'DELETE FROM pokemon_stats;',
      'DELETE FROM evolution_chain;',
      'DELETE FROM generations;',
      'DELETE FROM pokemon;',
    ];
    for (const q of deleteQueries) db.prepare(q).run();

    const insertGen = db.prepare(
      `INSERT INTO generations (id, name, region_name, start_id, end_id) VALUES (?, ?, ?, ?, ?)`
    );

    const insertPokemon = db.prepare(
      `INSERT INTO pokemon (id, name, number, height, weight, primary_type, secondary_type, is_legendary, is_mythical, flavor_text, sprite_url, shiny_sprite_url, official_artwork_url, shiny_artwork_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    const insertStats = db.prepare(
      `INSERT INTO pokemon_stats (pokemon_id, hp, attack, defense, sp_attack, sp_defense, speed)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    );
    const insertAbility = db.prepare(
      `INSERT INTO pokemon_abilities (pokemon_id, ability_name, effect_text, is_hidden)
       VALUES (?, ?, ?, ?)`
    );
    const insertMove = db.prepare(
      `INSERT INTO pokemon_moves (pokemon_id, move_name, level_learned, learn_method)
       VALUES (?, ?, ?, ?)`
    );
    const insertEvo = db.prepare(
      `INSERT INTO evolution_chain (pokemon_id, evolves_from_id, evolution_trigger)
       VALUES (?, ?, ?)`
    );

    const transaction = db.transaction(
      (gensList: typeof generations, pList: typeof pokemonList) => {
        for (const gen of gensList) {
          insertGen.run(gen.id, gen.name, gen.regionName, gen.startId, gen.endId);
        }

        for (const item of pList) {
          const { pokemon, stats, abilities, moves, evolution } = item;
          insertPokemon.run(
            pokemon.id,
            pokemon.name,
            pokemon.number,
            pokemon.height,
            pokemon.weight,
            pokemon.primary_type,
            pokemon.secondary_type,
            pokemon.is_legendary ? 1 : 0,
            pokemon.is_mythical ? 1 : 0,
            pokemon.flavor_text,
            pokemon.sprite_url,
            pokemon.shiny_sprite_url,
            pokemon.official_artwork_url,
            pokemon.shiny_artwork_url
          );
          insertStats.run(
            pokemon.id,
            stats.hp,
            stats.attack,
            stats.defense,
            stats.sp_attack,
            stats.sp_defense,
            stats.speed
          );
          for (const ab of abilities) {
            insertAbility.run(pokemon.id, ab.ability_name, ab.effect_text, ab.is_hidden ? 1 : 0);
          }
          for (const mv of moves) {
            insertMove.run(pokemon.id, mv.move_name, mv.level_learned, mv.learn_method);
          }
          if (evolution.evolves_from_id !== null) {
            insertEvo.run(pokemon.id, evolution.evolves_from_id, evolution.evolution_trigger);
          }
        }
      }
    );

    transaction(generations, pokemonList);
    await setUserSetting(db, 'data_version', CURRENT_DATA_VERSION);
  }
}

// Alias for backwards compatibility
export const syncKantoPokemon = syncNationalPokemon;
