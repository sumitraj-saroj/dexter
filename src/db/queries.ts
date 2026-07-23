import { FilterOptions, Generation, Pokemon, PokemonAbility, PokemonMove, PokemonStat, QuizScoreRecord, TeamMember } from '../types';

function mapRowToPokemon(row: any): Pokemon {
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
    isFavorite: Boolean(row.is_favorite),
    isInTeam: Boolean(row.is_in_team),
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

export async function getAllPokemon(db: any): Promise<Pokemon[]> {
  const sql = `
    SELECT p.*,
      EXISTS(SELECT 1 FROM favorites f WHERE f.pokemon_id = p.id) as is_favorite,
      EXISTS(SELECT 1 FROM team t WHERE t.pokemon_id = p.id) as is_in_team
    FROM pokemon p
    ORDER BY p.id ASC;
  `;
  const rows = await runSelectQuery(db, sql);
  return rows.map(mapRowToPokemon);
}

export async function getPokemonById(db: any, id: number): Promise<Pokemon | null> {
  const pokemonSql = `
    SELECT p.*,
      EXISTS(SELECT 1 FROM favorites f WHERE f.pokemon_id = p.id) as is_favorite,
      EXISTS(SELECT 1 FROM team t WHERE t.pokemon_id = p.id) as is_in_team
    FROM pokemon p
    WHERE p.id = ?;
  `;
  const row = await runSingleQuery(db, pokemonSql, [id]);
  if (!row) return null;

  const pokemon = mapRowToPokemon(row);

  // Fetch Stats
  const statsSql = `SELECT hp, attack, defense, sp_attack, sp_defense, speed FROM pokemon_stats WHERE pokemon_id = ?;`;
  const statsRow = await runSingleQuery(db, statsSql, [id]);
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

  // Fetch Abilities
  const abilitiesSql = `SELECT ability_name as name, effect_text as effect, is_hidden as isHidden FROM pokemon_abilities WHERE pokemon_id = ?;`;
  const abilityRows = await runSelectQuery(db, abilitiesSql, [id]);
  pokemon.abilities = abilityRows.map((a) => ({
    name: a.name,
    effect: a.effect || '',
    isHidden: Boolean(a.isHidden),
  }));

  // Fetch Moves
  const movesSql = `SELECT move_name as name, level_learned as levelLearned, learn_method as learnMethod FROM pokemon_moves WHERE pokemon_id = ? ORDER BY level_learned ASC;`;
  const moveRows = await runSelectQuery(db, movesSql, [id]);
  pokemon.moves = moveRows.map((m) => ({
    name: m.name,
    levelLearned: m.levelLearned,
    learnMethod: m.learnMethod,
  }));

  // Fetch Evolution
  const evoSql = `SELECT evolves_from_id, evolution_trigger FROM evolution_chain WHERE pokemon_id = ?;`;
  const evoRow = await runSingleQuery(db, evoSql, [id]);
  if (evoRow) {
    pokemon.evolvesFromId = evoRow.evolves_from_id;
    pokemon.evolutionTrigger = evoRow.evolution_trigger;
  }

  return pokemon;
}

export async function searchPokemon(db: any, query: string): Promise<Pokemon[]> {
  const cleanQuery = query.trim().toLowerCase();
  if (!cleanQuery) return getAllPokemon(db);

  const sql = `
    SELECT p.*,
      EXISTS(SELECT 1 FROM favorites f WHERE f.pokemon_id = p.id) as is_favorite,
      EXISTS(SELECT 1 FROM team t WHERE t.pokemon_id = p.id) as is_in_team
    FROM pokemon p
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
  const { types, generations, legendaryOnly, ability, searchQuery } = options;

  let sql = `
    SELECT DISTINCT p.*,
      EXISTS(SELECT 1 FROM favorites f WHERE f.pokemon_id = p.id) as is_favorite,
      EXISTS(SELECT 1 FROM team t WHERE t.pokemon_id = p.id) as is_in_team
    FROM pokemon p
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

    // Fallback generation range map if generations table is empty or unpopulated
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
  const checkSql = `SELECT 1 FROM favorites WHERE pokemon_id = ?;`;
  const existing = await runSingleQuery(db, checkSql, [pokemonId]);

  if (existing) {
    const deleteSql = `DELETE FROM favorites WHERE pokemon_id = ?;`;
    if (typeof db.runAsync === 'function') {
      await db.runAsync(deleteSql, [pokemonId]);
    } else if (typeof db.prepare === 'function') {
      db.prepare(deleteSql).run(pokemonId);
    }
    return false;
  } else {
    const insertSql = `INSERT INTO favorites (pokemon_id) VALUES (?);`;
    if (typeof db.runAsync === 'function') {
      await db.runAsync(insertSql, [pokemonId]);
    } else if (typeof db.prepare === 'function') {
      db.prepare(insertSql).run(pokemonId);
    }
    return true;
  }
}

export async function getFavorites(db: any): Promise<Pokemon[]> {
  const sql = `
    SELECT p.*, 1 as is_favorite,
      EXISTS(SELECT 1 FROM team t WHERE t.pokemon_id = p.id) as is_in_team
    FROM favorites f
    JOIN pokemon p ON p.id = f.pokemon_id
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
      EXISTS(SELECT 1 FROM favorites f WHERE f.pokemon_id = p.id) as is_favorite,
      1 as is_in_team
    FROM team t
    JOIN pokemon p ON p.id = t.pokemon_id
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
      EXISTS(SELECT 1 FROM favorites f WHERE f.pokemon_id = p.id) as is_favorite,
      EXISTS(SELECT 1 FROM team t WHERE t.pokemon_id = p.id) as is_in_team
    FROM pokemon p
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




