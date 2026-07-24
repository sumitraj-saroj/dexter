import {
  FilterOptions,
  Generation,
  Pokemon,
  PokemonAbility,
  PokemonMove,
  PokemonSpecialForm,
  PokemonSprites,
  PokemonStat,
  PokemonType,
  PokemonVariant,
  QuizScoreRecord,
  TeamMember,
  TrainerProfile,
  CompetitiveBuild,
  AchievementRecord,
  AchievementWithStatus,
  AchievementDataStats,
  AchievementDefinition,
  BreedingInfo,
} from '../types';
import { ACHIEVEMENTS } from '../data/achievements';
import { fetchSinglePokemon } from '../api/pokeapi';
import { requestDexterWidgetUpdate } from '../widgets/widget-updater';

function mapRowToPokemon(row: any): Pokemon {
  const eggGroups = row.egg_groups
    ? row.egg_groups
        .split(',')
        .map((s: string) => s.trim())
        .filter(Boolean)
    : [];
  return {
    id: row.id,
    name: row.name,
    number: row.number,
    height: row.height,
    weight: row.weight,
    primaryType: row.primary_type,
    secondaryType: row.secondary_type || null,
    isLegendary: Boolean(row.is_legendary),
    isMythical: Boolean(row.is_mythical),
    flavorText: row.flavor_text || '',
    spriteUrl: row.sprite_url || '',
    shinySpriteUrl: row.shiny_sprite_url || '',
    officialArtworkUrl: row.official_artwork_url || '',
    shinyArtworkUrl: row.shiny_artwork_url || '',
    eggGroups,
    hatchCounter: row.hatch_counter ?? null,
    genderRate: row.gender_rate ?? null,
    isFavorite: Boolean(row.is_favorite),
    shinyOwned: Boolean(row.shiny_owned),
    isAlpha: Boolean(row.is_alpha),
    hasCompetitiveBuild: Boolean(row.has_competitive_build),
    ashOwned: Boolean(row.ash_owned),
    isInTeam: Boolean(row.is_in_team),
    isCaught: Boolean(row.is_caught),
    isSeen: Boolean(row.is_seen),
  };
}

async function runSelectQuery(db: any, sql: string, params: any[] = []): Promise<any[]> {
  if (typeof db.getAllAsync === 'function') {
    return await db.getAllAsync(sql, params);
  } else if (typeof db.prepare === 'function') {
    // Node.js sqlite (better-sqlite3 style)
    return db.prepare(sql).all(...params);
  }
  return [];
}

async function runSingleQuery(db: any, sql: string, params: any[] = []): Promise<any> {
  if (typeof db.getFirstAsync === 'function') {
    return await db.getFirstAsync(sql, params);
  } else if (typeof db.prepare === 'function') {
    return db.prepare(sql).get(...params);
  }
  return null;
}

export async function runExecuteQuery(db: any, sql: string, params: any[] = []): Promise<void> {
  if (typeof db.runAsync === 'function') {
    await db.runAsync(sql, params);
  } else if (typeof db.prepare === 'function') {
    db.prepare(sql).run(...params);
  } else if (typeof db.execAsync === 'function') {
    await db.execAsync(sql);
  }
}

export async function getAllPokemon(db: any): Promise<Pokemon[]> {
  const sql = `
    SELECT p.*,
      COALESCE(pcs.is_favorite, 0) as is_favorite,
      COALESCE(pcs.shiny_owned, 0) as shiny_owned,
      COALESCE(pcs.is_alpha, 0) as is_alpha,
      COALESCE(pcs.has_competitive_build, 0) as has_competitive_build,
      COALESCE(pcs.ash_owned, 0) as ash_owned,
      CASE WHEN t.pokemon_id IS NOT NULL THEN 1 ELSE 0 END as is_in_team,
      CASE WHEN c.pokemon_id IS NOT NULL THEN 1 ELSE 0 END as is_caught,
      CASE WHEN s.pokemon_id IS NOT NULL THEN 1 ELSE 0 END as is_seen
    FROM pokemon p
    LEFT JOIN pokemon_collection_status pcs ON pcs.pokemon_id = p.id
    LEFT JOIN team t ON t.pokemon_id = p.id
    LEFT JOIN pokemon_caught c ON c.pokemon_id = p.id
    LEFT JOIN pokemon_seen s ON s.pokemon_id = p.id
    ORDER BY p.id ASC;
  `;
  const rows = await runSelectQuery(db, sql);
  return rows.map(mapRowToPokemon);
}

export async function getPokemonById(db: any, id: number): Promise<Pokemon | null> {
  const pokemonSql = `
    SELECT p.*,
      COALESCE(pcs.is_favorite, 0) as is_favorite,
      COALESCE(pcs.shiny_owned, 0) as shiny_owned,
      COALESCE(pcs.is_alpha, 0) as is_alpha,
      COALESCE(pcs.has_competitive_build, 0) as has_competitive_build,
      COALESCE(pcs.ash_owned, 0) as ash_owned,
      CASE WHEN t.pokemon_id IS NOT NULL THEN 1 ELSE 0 END as is_in_team,
      CASE WHEN c.pokemon_id IS NOT NULL THEN 1 ELSE 0 END as is_caught,
      CASE WHEN s.pokemon_id IS NOT NULL THEN 1 ELSE 0 END as is_seen
    FROM pokemon p
    LEFT JOIN pokemon_collection_status pcs ON pcs.pokemon_id = p.id
    LEFT JOIN team t ON t.pokemon_id = p.id
    LEFT JOIN pokemon_caught c ON c.pokemon_id = p.id
    LEFT JOIN pokemon_seen s ON s.pokemon_id = p.id
    WHERE p.id = ?;
  `;
  const row = await runSingleQuery(db, pokemonSql, [id]);
  if (!row) return null;

  const pokemon = mapRowToPokemon(row);

  // Execute child queries in parallel via Promise.all to reduce IPC round-trips
  const [statsRow, abilityRows, moveRows, evoRow] = await Promise.all([
    runSingleQuery(db, `SELECT hp, attack, defense, sp_attack, sp_defense, speed FROM pokemon_stats WHERE pokemon_id = ?;`, [id]),
    runSelectQuery(db, `SELECT ability_name as name, effect_text as effect, is_hidden as isHidden FROM pokemon_abilities WHERE pokemon_id = ?;`, [id]),
    runSelectQuery(db, `SELECT move_name as name, level_learned as levelLearned, learn_method as learnMethod FROM pokemon_moves WHERE pokemon_id = ? ORDER BY level_learned ASC;`, [id]),
    runSingleQuery(db, `SELECT evolves_from_id, evolution_trigger FROM evolution_chain WHERE pokemon_id = ?;`, [id]),
  ]);

  if (statsRow) {
    pokemon.stats = {
      hp: statsRow.hp,
      attack: statsRow.attack,
      defense: statsRow.defense,
      specialAttack: statsRow.sp_attack,
      specialDefense: statsRow.sp_defense,
      speed: statsRow.speed,
    };
  }

  pokemon.abilities = abilityRows.map((a) => ({
    name: a.name,
    effect: a.effect || '',
    isHidden: Boolean(a.isHidden),
  }));

  pokemon.moves = moveRows.map((m) => ({
    name: m.name,
    levelLearned: m.levelLearned,
    learnMethod: m.learnMethod,
  }));

  if (evoRow) {
    pokemon.evolvesFromId = evoRow.evolves_from_id;
    pokemon.evolutionTrigger = evoRow.evolution_trigger;
  }

  return pokemon;
}

export async function getSpritesForPokemon(db: any, pokemonId: number): Promise<PokemonSprites | null> {
  const sql = `SELECT * FROM pokemon_sprites WHERE pokemon_id = ?;`;
  const row = await runSingleQuery(db, sql, [pokemonId]);
  if (!row) return null;
  return {
    pokemonId: row.pokemon_id,
    officialArtworkUrl: row.official_artwork_url || null,
    shinyArtworkUrl: row.shiny_artwork_url || null,
    homeArtworkUrl: row.home_artwork_url || null,
    shinyHomeArtworkUrl: row.shiny_home_artwork_url || null,
    dreamWorldUrl: row.dream_world_url || null,
    pixelDefaultUrl: row.pixel_default_url || null,
    pixelGen1Url: row.pixel_gen1_url || null,
    pixelGen3Url: row.pixel_gen3_url || null,
    animatedUrl: row.animated_url || null,
  };
}

export async function searchPokemon(db: any, query: string): Promise<Pokemon[]> {
  const cleanQuery = query.trim().toLowerCase();
  if (!cleanQuery) return getAllPokemon(db);

  const sql = `
    SELECT p.*,
      COALESCE(pcs.is_favorite, 0) as is_favorite,
      COALESCE(pcs.shiny_owned, 0) as shiny_owned,
      COALESCE(pcs.is_alpha, 0) as is_alpha,
      COALESCE(pcs.has_competitive_build, 0) as has_competitive_build,
      COALESCE(pcs.ash_owned, 0) as ash_owned,
      CASE WHEN t.pokemon_id IS NOT NULL THEN 1 ELSE 0 END as is_in_team,
      CASE WHEN c.pokemon_id IS NOT NULL THEN 1 ELSE 0 END as is_caught,
      CASE WHEN s.pokemon_id IS NOT NULL THEN 1 ELSE 0 END as is_seen
    FROM pokemon p
    LEFT JOIN pokemon_collection_status pcs ON pcs.pokemon_id = p.id
    LEFT JOIN team t ON t.pokemon_id = p.id
    LEFT JOIN pokemon_caught c ON c.pokemon_id = p.id
    LEFT JOIN pokemon_seen s ON s.pokemon_id = p.id
    WHERE LOWER(p.name) LIKE ?
       OR p.number LIKE ?
       OR CAST(p.id AS TEXT) = ?
    ORDER BY p.id ASC;
  `;
  const searchPattern = `%${cleanQuery}%`;
  const rows = await runSelectQuery(db, sql, [searchPattern, searchPattern, cleanQuery]);
  return rows.map(mapRowToPokemon);
}

export async function getGenerations(db: any): Promise<Generation[]> {
  const sql = `SELECT id, name, region_name as regionName, start_id as startId, end_id as endId FROM generations ORDER BY id ASC;`;
  return await runSelectQuery(db, sql);
}

export async function filterPokemon(db: any, options: FilterOptions): Promise<Pokemon[]> {
  const {
    types,
    generations,
    legendaryOnly,
    ability,
    searchQuery,
    collectionFilters,
    caughtOnly,
    notCaughtOnly,
    favoritesOnly,
    shinyOwnedOnly,
    alphaOnly,
    hasCompetitiveBuildOnly,
  } = options;

  let sql = `
    SELECT DISTINCT p.*,
      COALESCE(pcs.is_favorite, 0) as is_favorite,
      COALESCE(pcs.shiny_owned, 0) as shiny_owned,
      COALESCE(pcs.is_alpha, 0) as is_alpha,
      COALESCE(pcs.has_competitive_build, 0) as has_competitive_build,
      COALESCE(pcs.ash_owned, 0) as ash_owned,
      CASE WHEN t.pokemon_id IS NOT NULL THEN 1 ELSE 0 END as is_in_team,
      CASE WHEN c.pokemon_id IS NOT NULL THEN 1 ELSE 0 END as is_caught,
      CASE WHEN s.pokemon_id IS NOT NULL THEN 1 ELSE 0 END as is_seen
    FROM pokemon p
    LEFT JOIN pokemon_collection_status pcs ON pcs.pokemon_id = p.id
    LEFT JOIN team t ON t.pokemon_id = p.id
    LEFT JOIN pokemon_caught c ON c.pokemon_id = p.id
    LEFT JOIN pokemon_seen s ON s.pokemon_id = p.id
  `;

  const joins: string[] = [];
  const whereClauses: string[] = [];
  const params: any[] = [];

  if (ability && ability.trim().length > 0) {
    joins.push(`INNER JOIN pokemon_abilities pa ON pa.pokemon_id = p.id`);
    whereClauses.push(`LOWER(pa.ability_name) LIKE ?`);
    params.push(`%${ability.trim().toLowerCase()}%`);
  }

  if (types && types.length > 0) {
    const typePlaceholders = types.map(() => '?').join(', ');
    whereClauses.push(`(p.primary_type IN (${typePlaceholders}) OR p.secondary_type IN (${typePlaceholders}))`);
    params.push(...types, ...types);
  }

  if (generations && generations.length > 0) {
    let genRows: Array<{ start_id: number; end_id: number }> = [];
    try {
      genRows = await runSelectQuery(
        db,
        `SELECT start_id, end_id FROM generations WHERE id IN (${generations.map(() => '?').join(',')})`,
        generations
      );
    } catch (e) {
      genRows = [];
    }

    if (!genRows || genRows.length === 0) {
      const FALLBACK_GEN_RANGES: Record<number, { start_id: number; end_id: number }> = {
        1: { start_id: 1, end_id: 151 },
        2: { start_id: 152, end_id: 251 },
        3: { start_id: 252, end_id: 386 },
        4: { start_id: 387, end_id: 493 },
        5: { start_id: 494, end_id: 649 },
        6: { start_id: 650, end_id: 721 },
        7: { start_id: 722, end_id: 809 },
        8: { start_id: 810, end_id: 905 },
        9: { start_id: 906, end_id: 1025 },
      };
      genRows = generations
        .map((g) => FALLBACK_GEN_RANGES[g])
        .filter((g): g is { start_id: number; end_id: number } => Boolean(g));
    }

    if (genRows.length > 0) {
      const genClauses = genRows.map((g) => {
        params.push(g.start_id, g.end_id);
        return `(p.id BETWEEN ? AND ?)`;
      });
      whereClauses.push(`(${genClauses.join(' OR ')})`);
    }
  }

  if (legendaryOnly) {
    whereClauses.push(`(p.is_legendary = 1 OR p.is_mythical = 1)`);
  }

  if (searchQuery && searchQuery.trim().length > 0) {
    const cleanSearch = searchQuery.trim().toLowerCase();
    whereClauses.push(`(LOWER(p.name) LIKE ? OR p.number LIKE ? OR CAST(p.id AS TEXT) = ?)`);
    params.push(`%${cleanSearch}%`, `%${cleanSearch}%`, cleanSearch);
  }

  // Collection Status Filters
  const isCaughtFilter = caughtOnly || collectionFilters?.includes('caught');
  const isUncaughtFilter = notCaughtOnly || collectionFilters?.includes('uncaught');
  const isFavoriteFilter = favoritesOnly || collectionFilters?.includes('favorite');
  const isShinyFilter = shinyOwnedOnly || collectionFilters?.includes('shiny_owned');
  const isAlphaFilter = alphaOnly || collectionFilters?.includes('alpha');
  const isCompFilter = hasCompetitiveBuildOnly || collectionFilters?.includes('competitive_build');
  const isAshFilter = options.ashOwnedOnly || collectionFilters?.includes('ash_owned');

  if (isCaughtFilter) {
    whereClauses.push(`EXISTS(SELECT 1 FROM pokemon_caught c WHERE c.pokemon_id = p.id)`);
  }
  if (isUncaughtFilter) {
    whereClauses.push(`NOT EXISTS(SELECT 1 FROM pokemon_caught c WHERE c.pokemon_id = p.id)`);
  }
  if (isFavoriteFilter) {
    whereClauses.push(`COALESCE(pcs.is_favorite, 0) = 1`);
  }
  if (isShinyFilter) {
    whereClauses.push(`COALESCE(pcs.shiny_owned, 0) = 1`);
  }
  if (isAlphaFilter) {
    whereClauses.push(`COALESCE(pcs.is_alpha, 0) = 1`);
  }
  if (isCompFilter) {
    whereClauses.push(`COALESCE(pcs.has_competitive_build, 0) = 1`);
  }
  if (isAshFilter) {
    whereClauses.push(`COALESCE(pcs.ash_owned, 0) = 1`);
  }

  if (joins.length > 0) {
    sql += ' ' + joins.join(' ');
  }

  if (whereClauses.length > 0) {
    sql += ' WHERE ' + whereClauses.join(' AND ');
  }

  sql += ` ORDER BY p.id ASC;`;

  const rows = await runSelectQuery(db, sql, params);
  return rows.map(mapRowToPokemon);
}

export async function toggleFavorite(db: any, pokemonId: number): Promise<boolean> {
  const current = await runSingleQuery(
    db,
    `SELECT is_favorite FROM pokemon_collection_status WHERE pokemon_id = ?;`,
    [pokemonId]
  );
  const nextVal = current && current.is_favorite ? 0 : 1;

  await runExecuteQuery(
    db,
    `INSERT INTO pokemon_collection_status (pokemon_id, is_favorite) VALUES (?, ?)
     ON CONFLICT(pokemon_id) DO UPDATE SET is_favorite = excluded.is_favorite;`,
    [pokemonId, nextVal]
  );
  return Boolean(nextVal);
}

export async function toggleShinyOwned(db: any, pokemonId: number): Promise<boolean> {
  const current = await runSingleQuery(
    db,
    `SELECT shiny_owned FROM pokemon_collection_status WHERE pokemon_id = ?;`,
    [pokemonId]
  );
  const nextVal = current && current.shiny_owned ? 0 : 1;

  await runExecuteQuery(
    db,
    `INSERT INTO pokemon_collection_status (pokemon_id, shiny_owned) VALUES (?, ?)
     ON CONFLICT(pokemon_id) DO UPDATE SET shiny_owned = excluded.shiny_owned;`,
    [pokemonId, nextVal]
  );
  return Boolean(nextVal);
}

export async function toggleAlpha(db: any, pokemonId: number): Promise<boolean> {
  const current = await runSingleQuery(
    db,
    `SELECT is_alpha FROM pokemon_collection_status WHERE pokemon_id = ?;`,
    [pokemonId]
  );
  const nextVal = current && current.is_alpha ? 0 : 1;

  await runExecuteQuery(
    db,
    `INSERT INTO pokemon_collection_status (pokemon_id, is_alpha) VALUES (?, ?)
     ON CONFLICT(pokemon_id) DO UPDATE SET is_alpha = excluded.is_alpha;`,
    [pokemonId, nextVal]
  );
  return Boolean(nextVal);
}

export async function toggleCompetitiveBuild(db: any, pokemonId: number): Promise<boolean> {
  const current = await runSingleQuery(
    db,
    `SELECT has_competitive_build FROM pokemon_collection_status WHERE pokemon_id = ?;`,
    [pokemonId]
  );
  const nextVal = current && current.has_competitive_build ? 0 : 1;

  await runExecuteQuery(
    db,
    `INSERT INTO pokemon_collection_status (pokemon_id, has_competitive_build) VALUES (?, ?)
     ON CONFLICT(pokemon_id) DO UPDATE SET has_competitive_build = excluded.has_competitive_build;`,
    [pokemonId, nextVal]
  );
  return Boolean(nextVal);
}

export async function toggleAshOwned(db: any, pokemonId: number): Promise<boolean> {
  const current = await runSingleQuery(
    db,
    `SELECT ash_owned FROM pokemon_collection_status WHERE pokemon_id = ?;`,
    [pokemonId]
  );
  const nextVal = current && current.ash_owned ? 0 : 1;

  await runExecuteQuery(
    db,
    `INSERT INTO pokemon_collection_status (pokemon_id, ash_owned) VALUES (?, ?)
     ON CONFLICT(pokemon_id) DO UPDATE SET ash_owned = excluded.ash_owned;`,
    [pokemonId, nextVal]
  );
  return Boolean(nextVal);
}

export async function getFavorites(db: any): Promise<Pokemon[]> {
  const sql = `
    SELECT p.*,
      COALESCE(pcs.is_favorite, 0) as is_favorite,
      COALESCE(pcs.shiny_owned, 0) as shiny_owned,
      COALESCE(pcs.is_alpha, 0) as is_alpha,
      COALESCE(pcs.has_competitive_build, 0) as has_competitive_build,
      COALESCE(pcs.ash_owned, 0) as ash_owned,
      EXISTS(SELECT 1 FROM team t WHERE t.pokemon_id = p.id) as is_in_team,
      EXISTS(SELECT 1 FROM pokemon_caught c WHERE c.pokemon_id = p.id) as is_caught,
      EXISTS(SELECT 1 FROM pokemon_seen s WHERE s.pokemon_id = p.id) as is_seen
    FROM pokemon p
    JOIN pokemon_collection_status pcs ON pcs.pokemon_id = p.id
    WHERE pcs.is_favorite = 1
    ORDER BY p.id ASC;
  `;
  const rows = await runSelectQuery(db, sql);
  return rows.map(mapRowToPokemon);
}

export async function addToTeam(db: any, slot: number, pokemonId: number): Promise<void> {
  if (slot < 1 || slot > 6) {
    throw new Error('Team slot must be between 1 and 6.');
  }
  const sql = `INSERT OR REPLACE INTO team (slot, pokemon_id) VALUES (?, ?);`;
  if (typeof db.runAsync === 'function') {
    await db.runAsync(sql, [slot, pokemonId]);
  } else if (typeof db.prepare === 'function') {
    db.prepare(sql).run(slot, pokemonId);
  }
}

export async function removeFromTeam(db: any, slot: number): Promise<void> {
  const sql = `DELETE FROM team WHERE slot = ?;`;
  if (typeof db.runAsync === 'function') {
    await db.runAsync(sql, [slot]);
  } else if (typeof db.prepare === 'function') {
    db.prepare(sql).run(slot);
  }
}

export async function removePokemonFromTeam(db: any, pokemonId: number): Promise<void> {
  const sql = `DELETE FROM team WHERE pokemon_id = ?;`;
  if (typeof db.runAsync === 'function') {
    await db.runAsync(sql, [pokemonId]);
  } else if (typeof db.prepare === 'function') {
    db.prepare(sql).run(pokemonId);
  }
}

export async function isPokemonInSquad(db: any, pokemonId: number): Promise<boolean> {
  const row = await runSingleQuery(db, `SELECT 1 FROM team WHERE pokemon_id = ?;`, [pokemonId]);
  return Boolean(row);
}

export async function toggleSquadMember(
  db: any,
  pokemonId: number
): Promise<{ success: boolean; inTeam: boolean; message?: string }> {
  // Check if already in squad
  const inTeam = await isPokemonInSquad(db, pokemonId);
  if (inTeam) {
    await removePokemonFromTeam(db, pokemonId);
    return { success: true, inTeam: false, message: 'Removed from Squad' };
  }

  // Get current active slots
  const currentTeam = await getTeam(db);
  if (currentTeam.length >= 6) {
    return {
      success: false,
      inTeam: false,
      message: 'Squad is full! Maximum 6 Pokémon allowed.',
    };
  }

  // Find first available slot (1-6)
  const occupiedSlots = new Set(currentTeam.map((t) => t.slot));
  let openSlot = 1;
  for (let s = 1; s <= 6; s++) {
    if (!occupiedSlots.has(s)) {
      openSlot = s;
      break;
    }
  }

  await addToTeam(db, openSlot, pokemonId);
  return { success: true, inTeam: true, message: 'Added to Squad!' };
}

export async function getTeam(db: any): Promise<TeamMember[]> {
  const sql = `
    SELECT t.slot, t.pokemon_id, p.*,
      COALESCE(pcs.is_favorite, 0) as is_favorite,
      COALESCE(pcs.shiny_owned, 0) as shiny_owned,
      COALESCE(pcs.is_alpha, 0) as is_alpha,
      COALESCE(pcs.has_competitive_build, 0) as has_competitive_build,
      COALESCE(pcs.ash_owned, 0) as ash_owned,
      1 as is_in_team,
      EXISTS(SELECT 1 FROM pokemon_caught c WHERE c.pokemon_id = p.id) as is_caught,
      EXISTS(SELECT 1 FROM pokemon_seen s WHERE s.pokemon_id = p.id) as is_seen
    FROM team t
    JOIN pokemon p ON p.id = t.pokemon_id
    LEFT JOIN pokemon_collection_status pcs ON pcs.pokemon_id = p.id
    ORDER BY t.slot ASC;
  `;
  const rows = await runSelectQuery(db, sql);
  return rows.map((r) => ({
    slot: r.slot,
    pokemonId: r.pokemon_id,
    pokemon: mapRowToPokemon(r),
  }));
}

export async function getFullTeam6Slots(
  db: any
): Promise<Array<{ slot: number; pokemon: Pokemon | null }>> {
  const activeMembers = await getTeam(db);
  const memberMap = new Map<number, Pokemon>();
  activeMembers.forEach((m) => {
    if (m.pokemon) memberMap.set(m.slot, m.pokemon);
  });

  const fullSlots: Array<{ slot: number; pokemon: Pokemon | null }> = [];
  for (let s = 1; s <= 6; s++) {
    fullSlots.push({
      slot: s,
      pokemon: memberMap.get(s) || null,
    });
  }
  return fullSlots;
}

export async function getEvolutionChainForPokemon(
  db: any,
  pokemonId: number
): Promise<Array<{ id: number; name: string; number: string; spriteUrl: string; evolvesFromId?: number | null; trigger?: string | null }>> {
  // Step 1: Trace back to root base stage
  let rootId = pokemonId;
  let guard = 0;
  while (guard < 10) {
    const parentRow = await runSingleQuery(
      db,
      `SELECT evolves_from_id FROM evolution_chain WHERE pokemon_id = ?;`,
      [rootId]
    );
    if (parentRow && parentRow.evolves_from_id) {
      rootId = parentRow.evolves_from_id;
      guard++;
    } else {
      break;
    }
  }

  // Step 2: Collect all family members starting from root
  const familyIds: number[] = [rootId];
  const queue: number[] = [rootId];

  while (queue.length > 0) {
    const curr = queue.shift()!;
    const childrenRows = await runSelectQuery(
      db,
      `SELECT pokemon_id FROM evolution_chain WHERE evolves_from_id = ? ORDER BY pokemon_id ASC;`,
      [curr]
    );
    for (const row of childrenRows) {
      if (!familyIds.includes(row.pokemon_id)) {
        familyIds.push(row.pokemon_id);
        queue.push(row.pokemon_id);
      }
    }
  }

  const nodes: Array<{ id: number; name: string; number: string; spriteUrl: string; evolvesFromId?: number | null; trigger?: string | null }> = [];
  for (const id of familyIds) {
    const pRow = await runSingleQuery(
      db,
      `SELECT id, name, number, sprite_url, official_artwork_url FROM pokemon WHERE id = ?;`,
      [id]
    );
    if (!pRow) continue;

    const evoRow = await runSingleQuery(
      db,
      `SELECT evolves_from_id, evolution_trigger FROM evolution_chain WHERE pokemon_id = ?;`,
      [id]
    );

    nodes.push({
      id: pRow.id,
      name: pRow.name,
      number: pRow.number,
      spriteUrl: pRow.official_artwork_url || pRow.sprite_url,
      evolvesFromId: evoRow?.evolves_from_id || null,
      trigger: evoRow?.evolution_trigger || null,
    });
  }

  return nodes;
}

export async function getUserSetting(db: any, key: string, defaultValue: string = ''): Promise<string> {
  try {
    const row = await runSingleQuery(db, `SELECT value FROM user_settings WHERE key = ?;`, [key]);
    return row ? row.value : defaultValue;
  } catch (err) {
    return defaultValue;
  }
}

export async function setUserSetting(db: any, key: string, value: string): Promise<void> {
  const sql = `INSERT OR REPLACE INTO user_settings (key, value) VALUES (?, ?);`;
  if (typeof db.runAsync === 'function') {
    await db.runAsync(sql, [key, value]);
  } else if (typeof db.prepare === 'function') {
    db.prepare(sql).run(key, value);
  }
}

export async function getQuizQuestionPokemon(db: any): Promise<{ target: Pokemon; options: Pokemon[] } | null> {
  const sql = `
    SELECT p.*,
      COALESCE(pcs.is_favorite, 0) as is_favorite,
      COALESCE(pcs.shiny_owned, 0) as shiny_owned,
      COALESCE(pcs.is_alpha, 0) as is_alpha,
      COALESCE(pcs.has_competitive_build, 0) as has_competitive_build,
      COALESCE(pcs.ash_owned, 0) as ash_owned,
      EXISTS(SELECT 1 FROM team t WHERE t.pokemon_id = p.id) as is_in_team,
      EXISTS(SELECT 1 FROM pokemon_caught c WHERE c.pokemon_id = p.id) as is_caught,
      EXISTS(SELECT 1 FROM pokemon_seen s WHERE s.pokemon_id = p.id) as is_seen
    FROM pokemon p
    LEFT JOIN pokemon_collection_status pcs ON pcs.pokemon_id = p.id
    WHERE p.official_artwork_url IS NOT NULL AND p.official_artwork_url != ''
    ORDER BY RANDOM()
    LIMIT 4;
  `;
  const rows = await runSelectQuery(db, sql);
  if (!rows || rows.length < 4) return null;
  const pokemons = rows.map(mapRowToPokemon);
  const target = pokemons[0];

  // Fisher-Yates shuffle options so target position is random
  const options = [...pokemons];
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }

  return { target, options };
}

export async function saveQuizScore(
  db: any,
  score: number,
  bestStreak: number
): Promise<{ isNewHighScore: boolean; scoreId: number }> {
  // Check previous max score
  const maxRow = await runSingleQuery(db, `SELECT MAX(score) as max_score FROM quiz_scores;`);
  const previousMax = maxRow?.max_score != null ? Number(maxRow.max_score) : -1;

  const isNewHighScore = score > previousMax && score > 0;
  const datePlayed = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const sql = `INSERT INTO quiz_scores (score, best_streak, date_played) VALUES (?, ?, ?);`;
  let scoreId = 0;
  if (typeof db.runAsync === 'function') {
    const res = await db.runAsync(sql, [score, bestStreak, datePlayed]);
    scoreId = res.lastInsertRowId;
  } else if (typeof db.prepare === 'function') {
    const info = db.prepare(sql).run(score, bestStreak, datePlayed);
    scoreId = Number(info.lastInsertRowid);
  }

  return { isNewHighScore, scoreId };
}

export async function getTopQuizScores(
  db: any,
  limit: number = 10
): Promise<QuizScoreRecord[]> {
  const sql = `
    SELECT id, score, best_streak, date_played
    FROM quiz_scores
    ORDER BY score DESC, best_streak DESC, id DESC
    LIMIT ?;
  `;
  const rows = await runSelectQuery(db, sql, [limit]);
  if (!rows || rows.length === 0) return [];

  // Find max score among all records
  const maxScore = Math.max(...rows.map((r: any) => Number(r.score)));

  return rows.map((r: any, idx: number) => ({
    id: r.id,
    score: Number(r.score),
    bestStreak: Number(r.best_streak),
    datePlayed: r.date_played || '',
    isAllTimeBest: idx === 0 && Number(r.score) === maxScore && maxScore > 0,
  }));
}

function getTodayDateString(overrideDate?: string): string {
  if (overrideDate) return overrideDate;
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function hashDateString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

export async function getPokemonOfTheDay(db: any, overrideDate?: string): Promise<Pokemon | null> {
  const todayDate = getTodayDateString(overrideDate);

  // Check stored setting
  const storedDate = await getUserSetting(db, 'pokemon_of_the_day_date', '');
  const storedIdStr = await getUserSetting(db, 'pokemon_of_the_day_id', '');

  if (storedDate === todayDate && storedIdStr) {
    const pokemonId = parseInt(storedIdStr, 10);
    if (!isNaN(pokemonId)) {
      const pokemon = await getPokemonById(db, pokemonId);
      if (pokemon) return pokemon;
    }
  }

  // Fetch all available Pokemon IDs
  const rows = await runSelectQuery(db, `SELECT id FROM pokemon ORDER BY id ASC;`);
  if (!rows || rows.length === 0) return null;

  const ids = rows.map((r: any) => r.id);
  const hashVal = hashDateString(todayDate);
  const selectedId = ids[hashVal % ids.length];

  // Save new pick to user_settings
  await setUserSetting(db, 'pokemon_of_the_day_date', todayDate);
  await setUserSetting(db, 'pokemon_of_the_day_id', String(selectedId));

  return getPokemonById(db, selectedId);
}

export async function getVariantsForPokemon(db: any, basePokemonId: number): Promise<PokemonVariant[]> {
  const sql = `
    SELECT * FROM pokemon_variants WHERE base_pokemon_id = ? ORDER BY id ASC;
  `;
  const rows = await runSelectQuery(db, sql, [basePokemonId]);
  if (!rows || rows.length === 0) return [];

  const variants: PokemonVariant[] = [];

  for (const r of rows) {
    const abSql = `SELECT ability_name as name, effect_text as effect, is_hidden as isHidden FROM pokemon_variant_abilities WHERE variant_id = ?;`;
    const abRows = await runSelectQuery(db, abSql, [r.id]);

    variants.push({
      id: r.id,
      basePokemonId: r.base_pokemon_id,
      variantName: r.variant_name,
      regionLabel: r.region_label,
      primaryType: r.primary_type as any,
      secondaryType: r.secondary_type ? (r.secondary_type as any) : null,
      height: r.height,
      weight: r.weight,
      flavorText: r.flavor_text || '',
      spriteUrl: r.sprite_url || '',
      shinySpriteUrl: r.shiny_sprite_url || '',
      officialArtworkUrl: r.official_artwork_url || '',
      shinyArtworkUrl: r.shiny_artwork_url || '',
      stats: {
        hp: r.hp,
        attack: r.attack,
        defense: r.defense,
        specialAttack: r.sp_attack,
        specialDefense: r.sp_defense,
        speed: r.speed,
      },
      abilities: abRows.map((a: any) => ({
        name: a.name,
        effect: a.effect || '',
        isHidden: Boolean(a.isHidden),
      })),
    });
  }

  return variants;
}

export async function getSpecialFormsForPokemon(db: any, basePokemonId: number): Promise<PokemonSpecialForm[]> {
  const sql = `
    SELECT * FROM pokemon_special_forms WHERE base_pokemon_id = ? ORDER BY id ASC;
  `;
  const rows = await runSelectQuery(db, sql, [basePokemonId]);
  if (!rows || rows.length === 0) return [];

  const forms: PokemonSpecialForm[] = [];

  for (const r of rows) {
    const abSql = `SELECT ability_name as name, effect_text as effect, is_hidden as isHidden FROM pokemon_special_form_abilities WHERE form_id = ?;`;
    const abRows = await runSelectQuery(db, abSql, [r.id]);

    forms.push({
      id: r.id,
      basePokemonId: r.base_pokemon_id,
      formType: r.form_type as any,
      formName: r.form_name,
      formLabel: r.form_label,
      primaryType: r.primary_type as any,
      secondaryType: r.secondary_type ? (r.secondary_type as any) : null,
      height: r.height,
      weight: r.weight,
      flavorText: r.flavor_text || '',
      spriteUrl: r.sprite_url || '',
      shinySpriteUrl: r.shiny_sprite_url || '',
      officialArtworkUrl: r.official_artwork_url || '',
      shinyArtworkUrl: r.shiny_artwork_url || '',
      stats: {
        hp: r.hp,
        attack: r.attack,
        defense: r.defense,
        specialAttack: r.sp_attack,
        specialDefense: r.sp_defense,
        speed: r.speed,
      },
      abilities: abRows.map((a: any) => ({
        name: a.name,
        effect: a.effect || '',
        isHidden: Boolean(a.isHidden),
      })),
    });
  }

  return forms;
}

export async function getTrainerProfile(db: any): Promise<TrainerProfile> {
  let row = await runSingleQuery(db, `SELECT * FROM trainer_profile WHERE id = 1;`);
  if (!row) {
    const today = new Date().toISOString().split('T')[0];
    await runExecuteQuery(
      db,
      `INSERT OR IGNORE INTO trainer_profile (id, name, avatar_id, xp, current_streak, total_correct, total_answered, last_open_date, created_date) VALUES (1, 'Trainer', 'pikachu', 0, 1, 0, 0, ?, ?);`,
      [today, today]
    );
    row = await runSingleQuery(db, `SELECT * FROM trainer_profile WHERE id = 1;`);
  }
  const xp = row?.xp || 0;
  const level = Math.floor(xp / 500) + 1;
  const xpProgress = xp % 500;

  return {
    id: 1,
    name: row?.name || 'Trainer',
    avatarId: row?.avatar_id || 'pikachu',
    xp,
    currentStreak: row?.current_streak || 0,
    totalCorrect: row?.total_correct || 0,
    totalAnswered: row?.total_answered || 0,
    lastOpenDate: row?.last_open_date || null,
    createdDate: row?.created_date || null,
    level,
    xpProgress,
  };
}

export async function updateTrainerProfile(
  db: any,
  updates: { name?: string; avatarId?: string }
): Promise<TrainerProfile> {
  await getTrainerProfile(db);
  if (updates.name !== undefined) {
    await runExecuteQuery(db, `UPDATE trainer_profile SET name = ? WHERE id = 1;`, [updates.name]);
  }
  if (updates.avatarId !== undefined) {
    await runExecuteQuery(db, `UPDATE trainer_profile SET avatar_id = ? WHERE id = 1;`, [updates.avatarId]);
  }
  requestDexterWidgetUpdate().catch(() => {});
  return await getTrainerProfile(db);
}

export async function checkAndUpdateDailyStreak(
  db: any
): Promise<{ streakAwarded: boolean; streak: number }> {
  const profile = await getTrainerProfile(db);
  const todayStr = new Date().toISOString().split('T')[0];

  if (!profile.lastOpenDate) {
    await runExecuteQuery(
      db,
      `UPDATE trainer_profile SET current_streak = 1, xp = xp + 10, last_open_date = ?, created_date = ? WHERE id = 1;`,
      [todayStr, todayStr]
    );
    requestDexterWidgetUpdate().catch(() => {});
    return { streakAwarded: true, streak: 1 };
  }

  if (profile.lastOpenDate === todayStr) {
    return { streakAwarded: false, streak: profile.currentStreak };
  }

  const lastDate = new Date(profile.lastOpenDate + 'T00:00:00');
  const todayDate = new Date(todayStr + 'T00:00:00');
  const diffTime = todayDate.getTime() - lastDate.getTime();
  const diffDays = Math.round(diffTime / (1000 * 3600 * 24));

  if (diffDays === 1) {
    const nextStreak = profile.currentStreak + 1;
    await runExecuteQuery(
      db,
      `UPDATE trainer_profile SET current_streak = ?, xp = xp + 10, last_open_date = ? WHERE id = 1;`,
      [nextStreak, todayStr]
    );
    requestDexterWidgetUpdate().catch(() => {});
    return { streakAwarded: true, streak: nextStreak };
  } else if (diffDays > 1) {
    await runExecuteQuery(
      db,
      `UPDATE trainer_profile SET current_streak = 1, xp = xp + 10, last_open_date = ? WHERE id = 1;`,
      [todayStr]
    );
    requestDexterWidgetUpdate().catch(() => {});
    return { streakAwarded: true, streak: 1 };
  }

  return { streakAwarded: false, streak: profile.currentStreak };
}

export async function recordPokemonSeen(
  db: any,
  pokemonId: number
): Promise<{ newlySeen: boolean }> {
  const existing = await runSingleQuery(db, `SELECT 1 FROM pokemon_seen WHERE pokemon_id = ?;`, [
    pokemonId,
  ]);
  if (existing) {
    return { newlySeen: false };
  }

  const todayStr = new Date().toISOString().split('T')[0];
  await runExecuteQuery(
    db,
    `INSERT OR IGNORE INTO pokemon_seen (pokemon_id, first_seen_date) VALUES (?, ?);`,
    [pokemonId, todayStr]
  );
  await runExecuteQuery(db, `UPDATE trainer_profile SET xp = xp + 5 WHERE id = 1;`);
  requestDexterWidgetUpdate().catch(() => {});
  return { newlySeen: true };
}

export async function togglePokemonCaught(
  db: any,
  pokemonId: number
): Promise<{ isCaught: boolean; newlyCaught: boolean }> {
  const existing = await runSingleQuery(
    db,
    `SELECT 1 FROM pokemon_caught WHERE pokemon_id = ?;`,
    [pokemonId]
  );

  if (existing) {
    await runExecuteQuery(db, `DELETE FROM pokemon_caught WHERE pokemon_id = ?;`, [pokemonId]);
    requestDexterWidgetUpdate().catch(() => {});
    return { isCaught: false, newlyCaught: false };
  } else {
    await recordPokemonSeen(db, pokemonId);
    const todayStr = new Date().toISOString().split('T')[0];
    await runExecuteQuery(
      db,
      `INSERT INTO pokemon_caught (pokemon_id, caught_date) VALUES (?, ?);`,
      [pokemonId, todayStr]
    );
    await runExecuteQuery(db, `UPDATE trainer_profile SET xp = xp + 20 WHERE id = 1;`);
    requestDexterWidgetUpdate().catch(() => {});
    return { isCaught: true, newlyCaught: true };
  }
}

export async function recordQuizAnswer(db: any, isCorrect: boolean): Promise<void> {
  const xpBonus = isCorrect ? 3 : 0;
  const correctInc = isCorrect ? 1 : 0;
  await runExecuteQuery(
    db,
    `UPDATE trainer_profile SET total_answered = total_answered + 1, total_correct = total_correct + ?, xp = xp + ? WHERE id = 1;`,
    [correctInc, xpBonus]
  );
  requestDexterWidgetUpdate().catch(() => {});
}

export async function getPokedexCompletionStats(
  db: any
): Promise<{ seenCount: number; caughtCount: number; totalCount: number }> {
  const totalRow = await runSingleQuery(db, `SELECT COUNT(*) as cnt FROM pokemon;`);
  const seenRow = await runSingleQuery(db, `SELECT COUNT(*) as cnt FROM pokemon_seen;`);
  const caughtRow = await runSingleQuery(db, `SELECT COUNT(*) as cnt FROM pokemon_caught;`);

  return {
    totalCount: totalRow?.cnt || 1025,
    seenCount: seenRow?.cnt || 0,
    caughtCount: caughtRow?.cnt || 0,
  };
}

export async function getFavoriteType(db: any): Promise<PokemonType | null> {
  const sql = `
    SELECT p.primary_type, COUNT(*) as cnt, MAX(c.caught_date) as latest_caught
    FROM pokemon_caught c
    JOIN pokemon p ON p.id = c.pokemon_id
    GROUP BY p.primary_type
    ORDER BY cnt DESC, latest_caught DESC, p.primary_type ASC
    LIMIT 1;
  `;
  const row = await runSingleQuery(db, sql);
  return row ? (row.primary_type as PokemonType) : null;
}

export async function getCompetitiveBuildsForPokemon(
  db: any,
  pokemonId: number
): Promise<CompetitiveBuild[]> {
  const sql = `SELECT * FROM competitive_builds WHERE pokemon_id = ? ORDER BY id ASC;`;
  const rows = await runSelectQuery(db, sql, [pokemonId]);
  return rows.map((r: any) => ({
    id: r.id,
    pokemonId: r.pokemon_id,
    buildName: r.build_name || 'Standard Build',
    nature: r.nature || 'Adamant',
    evs: {
      hp: r.evs_hp || 0,
      attack: r.evs_attack || 0,
      defense: r.evs_defense || 0,
      specialAttack: r.evs_sp_attack || 0,
      specialDefense: r.evs_sp_defense || 0,
      speed: r.evs_speed || 0,
    },
    ivs: {
      hp: r.ivs_hp ?? 31,
      attack: r.ivs_attack ?? 31,
      defense: r.ivs_defense ?? 31,
      specialAttack: r.ivs_sp_attack ?? 31,
      specialDefense: r.ivs_sp_defense ?? 31,
      speed: r.ivs_speed ?? 31,
    },
    move1: r.move_1 || null,
    move2: r.move_2 || null,
    move3: r.move_3 || null,
    move4: r.move_4 || null,
    heldItem: r.held_item || null,
    notes: r.notes || null,
  }));
}

export async function syncHasCompetitiveBuildFlag(db: any, pokemonId: number): Promise<void> {
  const countRow = await runSingleQuery(
    db,
    `SELECT COUNT(*) as cnt FROM competitive_builds WHERE pokemon_id = ?;`,
    [pokemonId]
  );
  const hasBuilds = countRow && countRow.cnt > 0 ? 1 : 0;

  await runExecuteQuery(
    db,
    `INSERT INTO pokemon_collection_status (pokemon_id, has_competitive_build) VALUES (?, ?)
     ON CONFLICT(pokemon_id) DO UPDATE SET has_competitive_build = excluded.has_competitive_build;`,
    [pokemonId, hasBuilds]
  );
}

export async function saveCompetitiveBuild(
  db: any,
  build: CompetitiveBuild
): Promise<number> {
  if (build.id) {
    const updateSql = `
      UPDATE competitive_builds SET
        build_name = ?, nature = ?,
        evs_hp = ?, evs_attack = ?, evs_defense = ?, evs_sp_attack = ?, evs_sp_defense = ?, evs_speed = ?,
        ivs_hp = ?, ivs_attack = ?, ivs_defense = ?, ivs_sp_attack = ?, ivs_sp_defense = ?, ivs_speed = ?,
        move_1 = ?, move_2 = ?, move_3 = ?, move_4 = ?,
        held_item = ?, notes = ?
      WHERE id = ? AND pokemon_id = ?;
    `;
    await runExecuteQuery(db, updateSql, [
      build.buildName,
      build.nature,
      build.evs.hp,
      build.evs.attack,
      build.evs.defense,
      build.evs.specialAttack,
      build.evs.specialDefense,
      build.evs.speed,
      build.ivs.hp,
      build.ivs.attack,
      build.ivs.defense,
      build.ivs.specialAttack,
      build.ivs.specialDefense,
      build.ivs.speed,
      build.move1 || null,
      build.move2 || null,
      build.move3 || null,
      build.move4 || null,
      build.heldItem || null,
      build.notes || null,
      build.id,
      build.pokemonId,
    ]);
    await syncHasCompetitiveBuildFlag(db, build.pokemonId);
    return build.id;
  } else {
    const insertSql = `
      INSERT INTO competitive_builds (
        pokemon_id, build_name, nature,
        evs_hp, evs_attack, evs_defense, evs_sp_attack, evs_sp_defense, evs_speed,
        ivs_hp, ivs_attack, ivs_defense, ivs_sp_attack, ivs_sp_defense, ivs_speed,
        move_1, move_2, move_3, move_4, held_item, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `;
    await runExecuteQuery(db, insertSql, [
      build.pokemonId,
      build.buildName,
      build.nature,
      build.evs.hp,
      build.evs.attack,
      build.evs.defense,
      build.evs.specialAttack,
      build.evs.specialDefense,
      build.evs.speed,
      build.ivs.hp,
      build.ivs.attack,
      build.ivs.defense,
      build.ivs.specialAttack,
      build.ivs.specialDefense,
      build.ivs.speed,
      build.move1 || null,
      build.move2 || null,
      build.move3 || null,
      build.move4 || null,
      build.heldItem || null,
      build.notes || null,
    ]);
    await syncHasCompetitiveBuildFlag(db, build.pokemonId);
    const lastRow = await runSingleQuery(
      db,
      `SELECT MAX(id) as maxId FROM competitive_builds WHERE pokemon_id = ?;`,
      [build.pokemonId]
    );
    return lastRow?.maxId || 0;
  }
}

export async function deleteCompetitiveBuild(
  db: any,
  buildId: number,
  pokemonId: number
): Promise<void> {
  await runExecuteQuery(db, `DELETE FROM competitive_builds WHERE id = ?;`, [buildId]);
  await syncHasCompetitiveBuildFlag(db, pokemonId);
}

// --- Achievement System Queries ---

export async function getUnlockedAchievements(db: any): Promise<AchievementRecord[]> {
  const sql = `SELECT * FROM achievements ORDER BY id ASC;`;
  const rows = await runSelectQuery(db, sql);
  return rows.map((r: any) => ({
    id: r.id,
    key: r.key,
    title: r.title,
    description: r.description,
    icon: r.icon,
    category: r.category,
    unlockedDate: r.unlocked_date,
  }));
}

export async function getAchievementDataStats(
  db: any,
  sessionQuizStreak?: number
): Promise<AchievementDataStats> {
  const caughtRow = await runSingleQuery(db, `SELECT COUNT(*) as count FROM pokemon_caught;`);
  const totalDexRow = await runSingleQuery(db, `SELECT COUNT(*) as count FROM pokemon;`);

  // Gen stats
  const genRows = await runSelectQuery(
    db,
    `SELECT g.id as gen_id,
            COUNT(c.pokemon_id) as caught,
            (g.end_id - g.start_id + 1) as total
     FROM generations g
     LEFT JOIN pokemon_caught c ON c.pokemon_id >= g.start_id AND c.pokemon_id <= g.end_id
     GROUP BY g.id;`
  );
  const genStats: Record<number, { caught: number; total: number }> = {};
  for (const r of genRows) {
    genStats[r.gen_id] = { caught: r.caught || 0, total: r.total || 0 };
  }

  // Type counts for caught pokemon
  const typeRows = await runSelectQuery(
    db,
    `SELECT p.primary_type, p.secondary_type
     FROM pokemon p
     JOIN pokemon_caught c ON c.pokemon_id = p.id;`
  );
  const typeCounts: Record<string, number> = {};
  for (const r of typeRows) {
    if (r.primary_type) {
      const pt = r.primary_type.toLowerCase();
      typeCounts[pt] = (typeCounts[pt] || 0) + 1;
    }
    if (r.secondary_type) {
      const st = r.secondary_type.toLowerCase();
      typeCounts[st] = (typeCounts[st] || 0) + 1;
    }
  }

  // Legendary / Mythical caught count
  const legRow = await runSingleQuery(
    db,
    `SELECT COUNT(*) as count
     FROM pokemon_caught c
     JOIN pokemon p ON p.id = c.pokemon_id
     WHERE p.is_legendary = 1 OR p.is_mythical = 1;`
  );

  // Shiny & Alpha owned counts
  const shinyRow = await runSingleQuery(
    db,
    `SELECT COUNT(*) as count FROM pokemon_collection_status WHERE shiny_owned = 1;`
  );
  const alphaRow = await runSingleQuery(
    db,
    `SELECT COUNT(*) as count FROM pokemon_collection_status WHERE is_alpha = 1;`
  );

  // Profile stats
  const profileRow = await runSingleQuery(
    db,
    `SELECT total_correct, total_answered, current_streak FROM trainer_profile WHERE id = 1;`
  );

  // Quiz best streak across sessions
  const quizStreakRow = await runSingleQuery(
    db,
    `SELECT MAX(best_streak) as max_streak FROM quiz_scores;`
  );

  // Competitive builds count
  const buildsRow = await runSingleQuery(
    db,
    `SELECT COUNT(*) as count FROM competitive_builds;`
  );

  const dbMaxQuizStreak = quizStreakRow?.max_streak || 0;
  const finalQuizBestStreak = Math.max(dbMaxQuizStreak, sessionQuizStreak || 0);

  return {
    totalCaughtCount: caughtRow?.count || 0,
    totalDexCount: totalDexRow?.count || 0,
    genStats,
    typeCounts,
    legendaryMythicalCount: legRow?.count || 0,
    shinyOwnedCount: shinyRow?.count || 0,
    alphaOwnedCount: alphaRow?.count || 0,
    quizTotalCorrect: profileRow?.total_correct || 0,
    quizTotalAnswered: profileRow?.total_answered || 0,
    quizBestStreak: finalQuizBestStreak,
    openStreakDays: profileRow?.current_streak || 0,
    competitiveBuildsCount: buildsRow?.count || 0,
  };
}

export async function checkAchievements(
  db: any,
  sessionQuizStats?: { streak?: number }
): Promise<AchievementDefinition[]> {
  try {
    const unlockedList = await getUnlockedAchievements(db);
    const unlockedKeys = new Set(unlockedList.map((u) => u.key));

    const stats = await getAchievementDataStats(db, sessionQuizStats?.streak);
    const newlyUnlocked: AchievementDefinition[] = [];
    const nowISO = new Date().toISOString().replace('T', ' ').slice(0, 19);

    for (const ach of ACHIEVEMENTS) {
      if (unlockedKeys.has(ach.key)) continue;

      if (ach.condition(stats)) {
        await runExecuteQuery(
          db,
          `INSERT OR IGNORE INTO achievements (key, title, description, icon, category, unlocked_date) VALUES (?, ?, ?, ?, ?, ?);`,
          [ach.key, ach.title, ach.description, ach.icon, ach.category, nowISO]
        );
        newlyUnlocked.push(ach);
      }
    }

    return newlyUnlocked;
  } catch (err) {
    console.error('Failed checking achievements:', err);
    return [];
  }
}

export async function getAchievementsSummary(db: any): Promise<{
  unlockedCount: number;
  totalCount: number;
  unlockedPercentage: number;
  achievements: AchievementWithStatus[];
}> {
  const unlockedRecords = await getUnlockedAchievements(db);
  const unlockedMap = new Map<string, string>();
  for (const r of unlockedRecords) {
    unlockedMap.set(r.key, r.unlockedDate);
  }

  const achievements: AchievementWithStatus[] = ACHIEVEMENTS.map((def) => {
    const unlockedDate = unlockedMap.get(def.key) || null;
    return {
      key: def.key,
      title: def.title,
      description: def.description,
      icon: def.icon,
      category: def.category,
      isUnlocked: unlockedDate !== null,
      unlockedDate,
    };
  });

  const unlockedCount = unlockedMap.size;
  const totalCount = ACHIEVEMENTS.length;
  const unlockedPercentage = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;

  return {
    unlockedCount,
    totalCount,
    unlockedPercentage,
    achievements,
  };
}

export async function ensurePokemonBreedingData(db: any, pokemonId: number): Promise<Pokemon | null> {
  let pokemon = await getPokemonById(db, pokemonId);
  if (!pokemon) return null;

  if (pokemon.eggGroups && pokemon.eggGroups.length > 0 && pokemon.genderRate !== undefined && pokemon.genderRate !== null) {
    return pokemon;
  }

  // Fetch species info dynamically
  try {
    const fetched = await fetchSinglePokemon(pokemonId);
    if (fetched && fetched.pokemon) {
      const eggGroupsStr = fetched.pokemon.egg_groups ? fetched.pokemon.egg_groups.join(', ') : '';
      const hatchCounter = fetched.pokemon.hatch_counter ?? null;
      const genderRate = fetched.pokemon.gender_rate ?? null;

      await runExecuteQuery(
        db,
        `UPDATE pokemon SET egg_groups = ?, hatch_counter = ?, gender_rate = ? WHERE id = ?;`,
        [eggGroupsStr, hatchCounter, genderRate, pokemonId]
      );

      // Insert any egg moves if missing
      for (const mv of fetched.moves) {
        if (mv.learn_method === 'egg') {
          await runExecuteQuery(
            db,
            `INSERT INTO pokemon_moves (pokemon_id, move_name, level_learned, learn_method)
             SELECT ?, ?, 0, 'egg'
             WHERE NOT EXISTS (
               SELECT 1 FROM pokemon_moves WHERE pokemon_id = ? AND move_name = ? AND learn_method = 'egg'
             );`,
            [pokemonId, mv.move_name, pokemonId, mv.move_name]
          );
        }
      }

      pokemon = await getPokemonById(db, pokemonId);
    }
  } catch (err) {
    console.warn(`Failed to dynamically fetch breeding data for #${pokemonId}`, err);
  }

  return pokemon;
}

export async function getBreedingCompatible(
  db: any,
  pokemonId: number
): Promise<{ canBreed: boolean; reason?: string; compatiblePokemon: Pokemon[] }> {
  const pokemon = await ensurePokemonBreedingData(db, pokemonId);
  if (!pokemon) {
    return { canBreed: false, reason: 'Pokemon not found', compatiblePokemon: [] };
  }

  const eggGroups = pokemon.eggGroups || [];

  // 1. Undiscovered check
  if (eggGroups.includes('Undiscovered') || eggGroups.includes('no-eggs')) {
    return { canBreed: false, reason: 'Cannot breed (Undiscovered Egg Group)', compatiblePokemon: [] };
  }

  const isDitto = pokemon.id === 132 || pokemon.name.toLowerCase() === 'ditto' || eggGroups.includes('Ditto');
  const isGenderless = pokemon.genderRate === -1;

  // 2. Ditto
  if (isDitto) {
    const allRows = await getAllPokemon(db);
    const compatible = allRows.filter((p) => {
      if (p.id === 132 || p.name.toLowerCase() === 'ditto') return false;
      const groups = p.eggGroups || [];
      return !groups.includes('Undiscovered') && !groups.includes('no-eggs');
    });
    return { canBreed: true, compatiblePokemon: compatible };
  }

  // 3. Non-Ditto Genderless
  if (isGenderless) {
    const ditto = await getPokemonById(db, 132);
    if (ditto) {
      return { canBreed: true, compatiblePokemon: [ditto] };
    }
    const allRows = await getAllPokemon(db);
    const dittoMatch = allRows.filter((p) => p.id === 132 || p.name.toLowerCase() === 'ditto');
    return { canBreed: true, compatiblePokemon: dittoMatch };
  }

  // 4. Normal Pokemon
  const allRows = await getAllPokemon(db);
  const compatible = allRows.filter((p) => {
    if (p.id === pokemon.id) return false;
    const groups = p.eggGroups || [];
    if (groups.includes('Undiscovered') || groups.includes('no-eggs')) return false;

    // Ditto can breed with any non-Undiscovered Pokemon
    if (p.id === 132 || p.name.toLowerCase() === 'ditto' || groups.includes('Ditto')) return true;

    // Other genderless Pokemon CANNOT breed with normal Pokemon
    if (p.genderRate === -1) return false;

    // Must share at least 1 Egg Group
    return groups.some((g) => eggGroups.includes(g));
  });

  return { canBreed: true, compatiblePokemon: compatible };
}

export async function getBreedingInfo(
  db: any,
  pokemonId: number
): Promise<BreedingInfo | null> {
  const pokemon = await ensurePokemonBreedingData(db, pokemonId);
  if (!pokemon) return null;

  const compatibility = await getBreedingCompatible(db, pokemonId);
  const eggMoves = (pokemon.moves || []).filter((m) => m.learnMethod === 'egg');

  const hatchCounter = pokemon.hatchCounter ?? null;
  const hatchSteps = hatchCounter !== null ? (hatchCounter + 1) * 255 : null;

  const genderRate = pokemon.genderRate ?? null;
  const isGenderless = genderRate === -1;

  let malePercentage: number | null = null;
  let femalePercentage: number | null = null;

  if (genderRate !== null && genderRate >= 0) {
    femalePercentage = (genderRate / 8) * 100;
    malePercentage = 100 - femalePercentage;
  }

  return {
    canBreed: compatibility.canBreed,
    reason: compatibility.reason,
    eggGroups: pokemon.eggGroups || [],
    hatchCounter,
    hatchSteps,
    genderRate,
    isGenderless,
    malePercentage,
    femalePercentage,
    eggMoves,
    compatiblePokemon: compatibility.compatiblePokemon,
  };
}






