import { fetchAllNationalPokemon, fetchRegionalVariantsForSpecies, fetchSpecialFormsForSpecies } from '../api/pokeapi';
import { getUserSetting, setUserSetting } from './queries';
import { FullPokemonData } from '../types';

const CURRENT_DATA_VERSION = '5';

export async function insertVariant(db: any, v: NonNullable<FullPokemonData['variants']>[0]): Promise<void> {
  let variantId: number | null = null;
  if (typeof db.runAsync === 'function') {
    const res: any = await db.runAsync(
      `INSERT INTO pokemon_variants (base_pokemon_id, variant_name, region_label, primary_type, secondary_type, height, weight, flavor_text, hp, attack, defense, sp_attack, sp_defense, speed, sprite_url, shiny_sprite_url, official_artwork_url, shiny_artwork_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        v.base_pokemon_id,
        v.variant_name,
        v.region_label,
        v.primary_type,
        v.secondary_type,
        v.height,
        v.weight,
        v.flavor_text,
        v.stats.hp,
        v.stats.attack,
        v.stats.defense,
        v.stats.sp_attack,
        v.stats.sp_defense,
        v.stats.speed,
        v.sprite_url,
        v.shiny_sprite_url,
        v.official_artwork_url,
        v.shiny_artwork_url,
      ]
    );
    variantId = res?.lastInsertRowId || null;
    if (variantId) {
      for (const ab of v.abilities) {
        await db.runAsync(
          `INSERT INTO pokemon_variant_abilities (variant_id, ability_name, effect_text, is_hidden) VALUES (?, ?, ?, ?)`,
          [variantId, ab.ability_name, ab.effect_text, ab.is_hidden ? 1 : 0]
        );
      }
    }
  } else if (typeof db.prepare === 'function') {
    const stmt = db.prepare(
      `INSERT INTO pokemon_variants (base_pokemon_id, variant_name, region_label, primary_type, secondary_type, height, weight, flavor_text, hp, attack, defense, sp_attack, sp_defense, speed, sprite_url, shiny_sprite_url, official_artwork_url, shiny_artwork_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    const info = stmt.run(
      v.base_pokemon_id,
      v.variant_name,
      v.region_label,
      v.primary_type,
      v.secondary_type,
      v.height,
      v.weight,
      v.flavor_text,
      v.stats.hp,
      v.stats.attack,
      v.stats.defense,
      v.stats.sp_attack,
      v.stats.sp_defense,
      v.stats.speed,
      v.sprite_url,
      v.shiny_sprite_url,
      v.official_artwork_url,
      v.shiny_artwork_url
    );
    variantId = Number(info.lastInsertRowid);
    const abStmt = db.prepare(
      `INSERT INTO pokemon_variant_abilities (variant_id, ability_name, effect_text, is_hidden) VALUES (?, ?, ?, ?)`
    );
    for (const ab of v.abilities) {
      abStmt.run(variantId, ab.ability_name, ab.effect_text, ab.is_hidden ? 1 : 0);
    }
  }
}

export async function insertSpecialForm(db: any, sf: NonNullable<FullPokemonData['specialForms']>[0]): Promise<void> {
  let formId: number | null = null;
  if (typeof db.runAsync === 'function') {
    const res: any = await db.runAsync(
      `INSERT INTO pokemon_special_forms (base_pokemon_id, form_type, form_name, form_label, primary_type, secondary_type, height, weight, flavor_text, hp, attack, defense, sp_attack, sp_defense, speed, sprite_url, shiny_sprite_url, official_artwork_url, shiny_artwork_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        sf.base_pokemon_id,
        sf.form_type,
        sf.form_name,
        sf.form_label,
        sf.primary_type,
        sf.secondary_type,
        sf.height,
        sf.weight,
        sf.flavor_text,
        sf.stats.hp,
        sf.stats.attack,
        sf.stats.defense,
        sf.stats.sp_attack,
        sf.stats.sp_defense,
        sf.stats.speed,
        sf.sprite_url,
        sf.shiny_sprite_url,
        sf.official_artwork_url,
        sf.shiny_artwork_url,
      ]
    );
    formId = res?.lastInsertRowId || null;
    if (formId) {
      for (const ab of sf.abilities) {
        await db.runAsync(
          `INSERT INTO pokemon_special_form_abilities (form_id, ability_name, effect_text, is_hidden) VALUES (?, ?, ?, ?)`,
          [formId, ab.ability_name, ab.effect_text, ab.is_hidden ? 1 : 0]
        );
      }
    }
  } else if (typeof db.prepare === 'function') {
    const stmt = db.prepare(
      `INSERT INTO pokemon_special_forms (base_pokemon_id, form_type, form_name, form_label, primary_type, secondary_type, height, weight, flavor_text, hp, attack, defense, sp_attack, sp_defense, speed, sprite_url, shiny_sprite_url, official_artwork_url, shiny_artwork_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    const info = stmt.run(
      sf.base_pokemon_id,
      sf.form_type,
      sf.form_name,
      sf.form_label,
      sf.primary_type,
      sf.secondary_type,
      sf.height,
      sf.weight,
      sf.flavor_text,
      sf.stats.hp,
      sf.stats.attack,
      sf.stats.defense,
      sf.stats.sp_attack,
      sf.stats.sp_defense,
      sf.stats.speed,
      sf.sprite_url,
      sf.shiny_sprite_url,
      sf.official_artwork_url,
      sf.shiny_artwork_url
    );
    formId = Number(info.lastInsertRowid);
    const abStmt = db.prepare(
      `INSERT INTO pokemon_special_form_abilities (form_id, ability_name, effect_text, is_hidden) VALUES (?, ?, ?, ?)`
    );
    for (const ab of sf.abilities) {
      abStmt.run(formId, ab.ability_name, ab.effect_text, ab.is_hidden ? 1 : 0);
    }
  }
}

export async function isDatabaseSynced(db: any): Promise<boolean> {
  try {
    let count = 0;
    if (typeof db.getFirstAsync === 'function') {
      const row: any = await db.getFirstAsync(
        'SELECT COUNT(*) as count FROM pokemon WHERE shiny_artwork_url IS NOT NULL AND shiny_artwork_url != ""'
      );
      count = row?.count || 0;
    } else if (typeof db.prepare === 'function') {
      const row: any = db
        .prepare(
          'SELECT COUNT(*) as count FROM pokemon WHERE shiny_artwork_url IS NOT NULL AND shiny_artwork_url != ""'
        )
        .get();
      count = row?.count || 0;
    }

    return count >= 1000;
  } catch (error) {
    return false;
  }
}

export async function syncRegionalVariantsOnly(db: any): Promise<void> {
  let pokemonList: Array<{ id: number; name: string }> = [];
  if (typeof db.getAllAsync === 'function') {
    const rows = await db.getAllAsync('SELECT id, name FROM pokemon ORDER BY id ASC');
    pokemonList = rows.map((r: any) => ({ id: r.id, name: r.name }));
  } else if (typeof db.prepare === 'function') {
    const rows = db.prepare('SELECT id, name FROM pokemon ORDER BY id ASC').all();
    pokemonList = rows.map((r: any) => ({ id: r.id, name: r.name }));
  }

  // Clear existing variants and special forms before backfill
  if (typeof db.runAsync === 'function') {
    await db.runAsync('DELETE FROM pokemon_variant_abilities;');
    await db.runAsync('DELETE FROM pokemon_variants;');
    await db.runAsync('DELETE FROM pokemon_special_form_abilities;');
    await db.runAsync('DELETE FROM pokemon_special_forms;');
  } else if (typeof db.prepare === 'function') {
    db.prepare('DELETE FROM pokemon_variant_abilities;').run();
    db.prepare('DELETE FROM pokemon_variants;').run();
    db.prepare('DELETE FROM pokemon_special_form_abilities;').run();
    db.prepare('DELETE FROM pokemon_special_forms;').run();
  }

  const batchSize = 10;
  for (let i = 0; i < pokemonList.length; i += batchSize) {
    const batch = pokemonList.slice(i, i + batchSize);
    await Promise.all(
      batch.map(async (item) => {
        const [variants, specialForms] = await Promise.all([
          fetchRegionalVariantsForSpecies(item.id),
          fetchSpecialFormsForSpecies(item.id, item.name),
        ]);
        if (variants && variants.length > 0) {
          for (const v of variants) {
            await insertVariant(db, v);
          }
        }
        if (specialForms && specialForms.length > 0) {
          for (const sf of specialForms) {
            await insertSpecialForm(db, sf);
          }
        }
      })
    );
  }

  await setUserSetting(db, 'data_version', CURRENT_DATA_VERSION);
}

export async function syncNationalPokemon(
  db: any,
  onProgress?: (current: number, total: number) => void,
  force: boolean = false
): Promise<void> {
  if (!force) {
    let count = 0;
    if (typeof db.getFirstAsync === 'function') {
      const row: any = await db.getFirstAsync('SELECT COUNT(*) as count FROM pokemon');
      count = row?.count || 0;
    } else if (typeof db.prepare === 'function') {
      const row: any = db.prepare('SELECT COUNT(*) as count FROM pokemon').get();
      count = row?.count || 0;
    }

    if (count >= 1000) {
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
        DELETE FROM pokemon_special_form_abilities;
        DELETE FROM pokemon_special_forms;
        DELETE FROM pokemon_variant_abilities;
        DELETE FROM pokemon_variants;
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
        const { pokemon, stats, abilities, moves, evolution, variants, specialForms } = item;

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

        if (variants && variants.length > 0) {
          for (const v of variants) {
            await insertVariant(db, v);
          }
        }

        if (specialForms && specialForms.length > 0) {
          for (const sf of specialForms) {
            await insertSpecialForm(db, sf);
          }
        }
      }
    });
    await setUserSetting(db, 'data_version', CURRENT_DATA_VERSION);
  } else if (typeof db.prepare === 'function') {
    // Node.js sqlite (better-sqlite3 style) for testing
    const deleteQueries = [
      'DELETE FROM pokemon_special_form_abilities;',
      'DELETE FROM pokemon_special_forms;',
      'DELETE FROM pokemon_variant_abilities;',
      'DELETE FROM pokemon_variants;',
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
          const { pokemon, stats, abilities, moves, evolution, variants, specialForms } = item;
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
          if (variants && variants.length > 0) {
            for (const v of variants) {
              insertVariant(db, v);
            }
          }
          if (specialForms && specialForms.length > 0) {
            for (const sf of specialForms) {
              insertSpecialForm(db, sf);
            }
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
