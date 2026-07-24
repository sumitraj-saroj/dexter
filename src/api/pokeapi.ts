import { FullPokemonData, Generation } from '../types';

const BASE_URL = 'https://pokeapi.co/api/v2';

// In-memory cache for ability effect text to avoid redundant network calls
const abilityEffectCache = new Map<string, string>();

async function fetchWithRetry(url: string, retries: number = 3, delayMs: number = 500): Promise<Response> {
  let lastError: any;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(url);
      if (res.ok) return res;
      lastError = new Error(`HTTP ${res.status}: ${res.statusText} for ${url}`);
    } catch (err) {
      lastError = err;
    }
    if (attempt < retries - 1) {
      await new Promise((r) => setTimeout(r, delayMs * Math.pow(2, attempt)));
    }
  }
  throw lastError;
}

async function fetchAbilityEffect(url: string, name: string): Promise<string> {
  if (abilityEffectCache.has(name)) {
    return abilityEffectCache.get(name)!;
  }
  try {
    const res = await fetchWithRetry(url, 2, 300);
    const data = await res.json();
    const englishEntry = data.effect_entries?.find(
      (e: any) => e.language?.name === 'en'
    );
    const effect = (englishEntry?.short_effect || englishEntry?.effect || '')
      .replace(/[\n\f\r]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    abilityEffectCache.set(name, effect);
    return effect;
  } catch (error) {
    return '';
  }
}

export async function fetchTotalSpeciesCount(): Promise<number> {
  try {
    const res = await fetchWithRetry(`${BASE_URL}/pokemon-species?limit=1`);
    const data = await res.json();
    return data.count || 1025;
  } catch (err) {
    console.warn('Failed to fetch total species count, fallback to 1025', err);
    return 1025;
  }
}

export async function fetchGenerations(): Promise<Generation[]> {
  try {
    const res = await fetchWithRetry(`${BASE_URL}/generation`);
    const data = await res.json();
    const results = data.results || [];

    const generations: Generation[] = [];

    await Promise.all(
      results.map(async (genRef: { name: string; url: string }, index: number) => {
        try {
          const genRes = await fetchWithRetry(genRef.url);
          const genData = await genRes.json();

          const mainRegion = genData.main_region?.name || `Region ${index + 1}`;
          const formattedRegion =
            mainRegion.charAt(0).toUpperCase() + mainRegion.slice(1);

          const speciesUrls: string[] = (genData.pokemon_species || []).map(
            (s: any) => s.url
          );
          const speciesIds = speciesUrls
            .map((url) => {
              const match = url.match(/\/pokemon-species\/(\d+)\//);
              return match ? parseInt(match[1], 10) : null;
            })
            .filter((id): id is number => id !== null);

          if (speciesIds.length > 0) {
            const startId = Math.min(...speciesIds);
            const endId = Math.max(...speciesIds);

            generations.push({
              id: genData.id || index + 1,
              name: `Gen ${genData.id || index + 1}`,
              regionName: formattedRegion,
              startId,
              endId,
            });
          }
        } catch (err) {
          console.error(`Failed to fetch generation ${genRef.name}:`, err);
        }
      })
    );

    return generations.sort((a, b) => a.id - b.id);
  } catch (err) {
    console.error('Failed to fetch generations list from PokeAPI:', err);
    // Hardcoded fallback generation ranges if offline / API error
    return [
      { id: 1, name: 'Gen 1', regionName: 'Kanto', startId: 1, endId: 151 },
      { id: 2, name: 'Gen 2', regionName: 'Johto', startId: 152, endId: 251 },
      { id: 3, name: 'Gen 3', regionName: 'Hoenn', startId: 252, endId: 386 },
      { id: 4, name: 'Gen 4', regionName: 'Sinnoh', startId: 387, endId: 493 },
      { id: 5, name: 'Gen 5', regionName: 'Unova', startId: 494, endId: 649 },
      { id: 6, name: 'Gen 6', regionName: 'Kalos', startId: 650, endId: 721 },
      { id: 7, name: 'Gen 7', regionName: 'Alola', startId: 722, endId: 809 },
      { id: 8, name: 'Gen 8', regionName: 'Galar', startId: 810, endId: 905 },
      { id: 9, name: 'Gen 9', regionName: 'Paldea', startId: 906, endId: 1025 },
    ];
  }
}

export async function fetchSinglePokemon(speciesId: number): Promise<FullPokemonData> {
  const speciesRes = await fetchWithRetry(`${BASE_URL}/pokemon-species/${speciesId}`);
  if (!speciesRes.ok) {
    throw new Error(`Failed to fetch pokemon-species ${speciesId}`);
  }
  const sData = await speciesRes.json();

  // Find default base form variety URL or default variety name
  const defaultVariety =
    (sData.varieties || []).find((v: any) => v.is_default) || sData.varieties?.[0];
  const pokemonEndpoint = defaultVariety?.pokemon?.url || `${BASE_URL}/pokemon/${speciesId}`;

  const pokemonRes = await fetchWithRetry(pokemonEndpoint);
  if (!pokemonRes.ok) {
    throw new Error(`Failed to fetch pokemon from ${pokemonEndpoint}`);
  }
  const pData = await pokemonRes.json();

  // Extract Types
  const sortedTypes = (pData.types || []).sort(
    (a: any, b: any) => a.slot - b.slot
  );
  const primary_type = sortedTypes[0]?.type?.name || 'normal';
  const secondary_type = sortedTypes[1]?.type?.name || null;

  // Extract Stats
  const getStat = (statName: string) => {
    const found = pData.stats?.find((s: any) => s.stat?.name === statName);
    return found ? found.base_stat : 0;
  };

  const stats = {
    hp: getStat('hp'),
    attack: getStat('attack'),
    defense: getStat('defense'),
    sp_attack: getStat('special-attack'),
    sp_defense: getStat('special-defense'),
    speed: getStat('speed'),
  };

  // Extract Flavor Text (English)
  const englishFlavor = sData.flavor_text_entries?.find(
    (entry: any) => entry.language?.name === 'en'
  );
  const flavor_text = englishFlavor
    ? englishFlavor.flavor_text.replace(/[\n\f\r]/g, ' ').replace(/\s+/g, ' ').trim()
    : 'No flavor text available.';

  // Extract Evolution details
  let evolves_from_id: number | null = null;
  if (sData.evolves_from_species?.url) {
    const matches = sData.evolves_from_species.url.match(/\/pokemon-species\/(\d+)\//);
    if (matches && matches[1]) {
      evolves_from_id = parseInt(matches[1], 10);
    }
  }

  // Extract Egg Groups, Hatch Counter, Gender Rate
  const eggGroupMap: Record<string, string> = {
    monster: 'Monster',
    water1: 'Water 1',
    water2: 'Water 2',
    water3: 'Water 3',
    bug: 'Bug',
    flying: 'Flying',
    ground: 'Field',
    fairy: 'Fairy',
    plant: 'Grass',
    dragon: 'Dragon',
    'no-eggs': 'Undiscovered',
    indeterminate: 'Amorphous',
    humanshape: 'Human-Like',
    mineral: 'Mineral',
    ditto: 'Ditto',
  };

  const rawEggGroups: Array<{ name: string }> = sData.egg_groups || [];
  const egg_groups = rawEggGroups.map((g) => {
    const rawName = g.name?.toLowerCase() || '';
    if (eggGroupMap[rawName]) return eggGroupMap[rawName];
    return rawName
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  });
  const hatch_counter: number | null = typeof sData.hatch_counter === 'number' ? sData.hatch_counter : null;
  const gender_rate: number | null = typeof sData.gender_rate === 'number' ? sData.gender_rate : null;

  // Extract Abilities with effect text
  const abilities = await Promise.all(
    (pData.abilities || []).map(async (a: any) => {
      const abilityName = a.ability.name;
      const effectText = await fetchAbilityEffect(a.ability.url, abilityName);
      return {
        ability_name: abilityName,
        effect_text: effectText,
        is_hidden: Boolean(a.is_hidden),
      };
    })
  );

  // Extract Level-Up Moves & Egg Moves
  const allMoves: Array<{ move_name: string; level_learned: number; learn_method: string }> = [];
  const levelUpMap = new Map<string, number>();
  const eggMoveSet = new Set<string>();

  for (const item of pData.moves || []) {
    for (const detail of item.version_group_details || []) {
      const method = detail.move_learn_method?.name;
      if (method === 'level-up') {
        const moveName = item.move.name;
        const level = detail.level_learned_at || 0;
        const existing = levelUpMap.get(moveName);
        if (existing === undefined || level < existing) {
          levelUpMap.set(moveName, level);
        }
      } else if (method === 'egg') {
        eggMoveSet.add(item.move.name);
      }
    }
  }

  levelUpMap.forEach((level, name) => {
    allMoves.push({
      move_name: name,
      level_learned: level,
      learn_method: 'level-up',
    });
  });

  eggMoveSet.forEach((name) => {
    allMoves.push({
      move_name: name,
      level_learned: 0,
      learn_method: 'egg',
    });
  });

  allMoves.sort((a, b) => {
    if (a.learn_method !== b.learn_method) {
      return a.learn_method === 'level-up' ? -1 : 1;
    }
    return a.level_learned - b.level_learned;
  });

  // Sprites
  const sprite_url =
    pData.sprites?.front_default ||
    `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pData.id}.png`;
  const shiny_sprite_url =
    pData.sprites?.front_shiny ||
    `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${pData.id}.png`;
  const official_artwork_url =
    pData.sprites?.other?.['official-artwork']?.front_default ||
    `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pData.id}.png`;
  const shiny_artwork_url =
    pData.sprites?.other?.['official-artwork']?.front_shiny ||
    `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/shiny/${pData.id}.png`;

  const home_artwork_url = pData.sprites?.other?.home?.front_default || null;
  const shiny_home_artwork_url = pData.sprites?.other?.home?.front_shiny || null;
  const dream_world_url = pData.sprites?.other?.dream_world?.front_default || null;
  const pixel_default_url = pData.sprites?.front_default || null;
  const pixel_gen1_url = pData.sprites?.versions?.['generation-i']?.['red-blue']?.front_default || null;
  const pixel_gen3_url = pData.sprites?.versions?.['generation-iii']?.['emerald']?.front_default || null;
  const animated_url = pData.sprites?.versions?.['generation-v']?.['black-white']?.animated?.front_default || null;

  const spritesObj = {
    official_artwork_url,
    shiny_artwork_url,
    home_artwork_url,
    shiny_home_artwork_url,
    dream_world_url,
    pixel_default_url,
    pixel_gen1_url,
    pixel_gen3_url,
    animated_url,
  };

  const formattedNumber = `#${String(speciesId).padStart(3, '0')}`;

  const speciesName = sData.name || pData.name;

  // Fetch Regional Variants and Special Forms if any exist in varieties
  const [variantDataList, specialFormsList] = await Promise.all([
    fetchRegionalVariantsForSpecies(speciesId, sData.varieties, flavor_text),
    fetchSpecialFormsForSpecies(speciesId, speciesName, sData.varieties, flavor_text),
  ]);

  return {
    sprites: spritesObj,
    pokemon: {
      id: speciesId,
      name: speciesName,
      number: formattedNumber,
      height: pData.height,
      weight: pData.weight,
      primary_type,
      secondary_type,
      is_legendary: Boolean(sData.is_legendary),
      is_mythical: Boolean(sData.is_mythical),
      flavor_text,
      sprite_url,
      shiny_sprite_url,
      official_artwork_url,
      shiny_artwork_url,
      egg_groups,
      hatch_counter,
      gender_rate,
    },
    stats,
    abilities,
    moves: allMoves,
    evolution: {
      evolves_from_id,
      evolution_trigger: null,
    },
    variants: variantDataList,
    specialForms: specialFormsList,
  };
}

export function getRegionFromVarietyName(name: string): string | null {
  const lower = name.toLowerCase();
  if (lower.endsWith('-alola') || lower.includes('-alola-')) return 'Alolan';
  if (lower.endsWith('-galar') || lower.includes('-galar-')) return 'Galarian';
  if (lower.endsWith('-hisui') || lower.includes('-hisui-')) return 'Hisuian';
  if (lower.endsWith('-paldea') || lower.includes('-paldea-')) return 'Paldean';
  return null;
}

export async function fetchRegionalVariantsForSpecies(
  speciesId: number,
  varieties?: any[],
  fallbackFlavorText: string = ''
): Promise<NonNullable<FullPokemonData['variants']>> {
  let varsList = varieties;
  if (!varsList) {
    try {
      const speciesRes = await fetchWithRetry(`${BASE_URL}/pokemon-species/${speciesId}`);
      if (speciesRes.ok) {
        const sData = await speciesRes.json();
        varsList = sData.varieties || [];
      }
    } catch (e) {
      return [];
    }
  }

  if (!varsList || varsList.length === 0) return [];

  const regionalVarieties = varsList.filter((v: any) => {
    if (v.is_default) return false;
    const name = v.pokemon?.name || '';
    return getRegionFromVarietyName(name) !== null;
  });

  if (regionalVarieties.length === 0) return [];

  const results: NonNullable<FullPokemonData['variants']> = [];

  for (const v of regionalVarieties) {
    try {
      const varName = v.pokemon.name;
      const regionLabel = getRegionFromVarietyName(varName) || 'Regional';
      const varRes = await fetchWithRetry(v.pokemon.url);
      if (!varRes.ok) continue;
      const pData = await varRes.json();

      const sortedTypes = (pData.types || []).sort((a: any, b: any) => a.slot - b.slot);
      const primary_type = sortedTypes[0]?.type?.name || 'normal';
      const secondary_type = sortedTypes[1]?.type?.name || null;

      const getStat = (statName: string) => {
        const found = pData.stats?.find((s: any) => s.stat?.name === statName);
        return found ? found.base_stat : 0;
      };

      const stats = {
        hp: getStat('hp'),
        attack: getStat('attack'),
        defense: getStat('defense'),
        sp_attack: getStat('special-attack'),
        sp_defense: getStat('special-defense'),
        speed: getStat('speed'),
      };

      const abilities = await Promise.all(
        (pData.abilities || []).map(async (a: any) => {
          const abilityName = a.ability.name;
          const effectText = await fetchAbilityEffect(a.ability.url, abilityName);
          return {
            ability_name: abilityName,
            effect_text: effectText,
            is_hidden: Boolean(a.is_hidden),
          };
        })
      );

      const sprite_url =
        pData.sprites?.front_default ||
        `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pData.id}.png`;
      const shiny_sprite_url =
        pData.sprites?.front_shiny ||
        `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${pData.id}.png`;
      const official_artwork_url =
        pData.sprites?.other?.['official-artwork']?.front_default ||
        `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pData.id}.png`;
      const shiny_artwork_url =
        pData.sprites?.other?.['official-artwork']?.front_shiny ||
        `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/shiny/${pData.id}.png`;

      results.push({
        base_pokemon_id: speciesId,
        variant_name: varName,
        region_label: regionLabel,
        primary_type,
        secondary_type,
        height: pData.height,
        weight: pData.weight,
        flavor_text: fallbackFlavorText,
        sprite_url,
        shiny_sprite_url,
        official_artwork_url,
        shiny_artwork_url,
        stats,
        abilities,
      });
    } catch (err) {
      console.error(`Failed to fetch variant ${v.pokemon?.name}:`, err);
    }
  }

  return results;
}

export async function fetchAllNationalPokemon(
  onProgress?: (current: number, total: number) => void,
  concurrency: number = 12
): Promise<{ pokemonList: FullPokemonData[]; generations: Generation[] }> {
  const [total, generations] = await Promise.all([
    fetchTotalSpeciesCount(),
    fetchGenerations(),
  ]);

  const results: FullPokemonData[] = [];
  let completed = 0;

  const ids = Array.from({ length: total }, (_, i) => i + 1);

  // Run in concurrent chunks of size 12 with error resilience per item
  for (let i = 0; i < ids.length; i += concurrency) {
    const chunk = ids.slice(i, i + concurrency);
    const chunkResults = await Promise.all(
      chunk.map(async (id) => {
        try {
          const data = await fetchSinglePokemon(id);
          completed++;
          if (onProgress) {
            onProgress(completed, total);
          }
          return data;
        } catch (err) {
          console.error(`Failed to fetch species #${id} after retries:`, err);
          completed++;
          if (onProgress) {
            onProgress(completed, total);
          }
          return null;
        }
      })
    );

    for (const res of chunkResults) {
      if (res) results.push(res);
    }
  }

  results.sort((a, b) => a.pokemon.id - b.pokemon.id);
  return { pokemonList: results, generations };
}

const flaggedCosmeticSpeciesSet = new Set<string>();

export function getFlaggedCosmeticSpecies(): string[] {
  return Array.from(flaggedCosmeticSpeciesSet);
}

function capitalizeStr(str: string): string {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
}

export function classifySpecialForm(
  varName: string,
  speciesName: string
): { isSpecialForm: boolean; isCosmeticOnly: boolean; formType: import('../types').SpecialFormType; formLabel: string } | null {
  const lower = varName.toLowerCase();
  const sLower = speciesName.toLowerCase();

  // If regional variant, ignore here
  if (getRegionFromVarietyName(lower) !== null) return null;

  // Mega Evolutions
  if (lower.endsWith('-mega-x') || lower.includes('-mega-x-')) {
    return { isSpecialForm: true, isCosmeticOnly: false, formType: 'mega_x', formLabel: `Mega ${capitalizeStr(speciesName)} X` };
  }
  if (lower.endsWith('-mega-y') || lower.includes('-mega-y-')) {
    return { isSpecialForm: true, isCosmeticOnly: false, formType: 'mega_y', formLabel: `Mega ${capitalizeStr(speciesName)} Y` };
  }
  if (lower.endsWith('-mega') || lower.includes('-mega-')) {
    return { isSpecialForm: true, isCosmeticOnly: false, formType: 'mega', formLabel: `Mega ${capitalizeStr(speciesName)}` };
  }

  // Gigantamax / Eternamax
  if (lower.endsWith('-gmax') || lower.includes('-gmax-')) {
    return { isSpecialForm: true, isCosmeticOnly: false, formType: 'gmax', formLabel: `Gigantamax ${capitalizeStr(speciesName)}` };
  }
  if (lower.endsWith('-eternamax')) {
    return { isSpecialForm: true, isCosmeticOnly: false, formType: 'gmax', formLabel: `Eternamax ${capitalizeStr(speciesName)}` };
  }

  // Cosmetic-only species (for non-mega, non-gmax forms)
  const cosmeticSpeciesList = [
    'alcremie',
    'unown',
    'vivillon',
    'furfrou',
    'flabebe',
    'florges',
    'deerling',
    'sawsbuck',
    'tatsugiri',
    'squawkabilly',
    'sinistea',
    'polteageist',
    'poltchageist',
    'sinistcha',
    'maushold',
    'dudunsparce',
    'spinda',
  ];

  if (sLower === 'minior') {
    if (lower === 'minior-red-meteor' || lower === 'minior-meteor') {
      return { isSpecialForm: true, isCosmeticOnly: false, formType: 'special', formLabel: 'Meteor Form' };
    }
    flaggedCosmeticSpeciesSet.add(`${speciesName} (${varName})`);
    return { isSpecialForm: false, isCosmeticOnly: true, formType: 'special', formLabel: '' };
  }

  if (sLower === 'floette' && !lower.includes('eternal')) {
    flaggedCosmeticSpeciesSet.add(`${speciesName} (${varName})`);
    return { isSpecialForm: false, isCosmeticOnly: true, formType: 'special', formLabel: '' };
  }

  if (cosmeticSpeciesList.includes(sLower)) {
    flaggedCosmeticSpeciesSet.add(`${speciesName} (${varName})`);
    return { isSpecialForm: false, isCosmeticOnly: true, formType: 'special', formLabel: '' };
  }

  // Special Alternate Formes
  if (sLower === 'deoxys') {
    if (lower.endsWith('-attack')) return { isSpecialForm: true, isCosmeticOnly: false, formType: 'special', formLabel: 'Attack Forme' };
    if (lower.endsWith('-defense')) return { isSpecialForm: true, isCosmeticOnly: false, formType: 'special', formLabel: 'Defense Forme' };
    if (lower.endsWith('-speed')) return { isSpecialForm: true, isCosmeticOnly: false, formType: 'special', formLabel: 'Speed Forme' };
  }

  if (sLower === 'rotom') {
    if (lower.endsWith('-heat')) return { isSpecialForm: true, isCosmeticOnly: false, formType: 'special', formLabel: 'Heat Rotom' };
    if (lower.endsWith('-wash')) return { isSpecialForm: true, isCosmeticOnly: false, formType: 'special', formLabel: 'Wash Rotom' };
    if (lower.endsWith('-frost')) return { isSpecialForm: true, isCosmeticOnly: false, formType: 'special', formLabel: 'Frost Rotom' };
    if (lower.endsWith('-fan')) return { isSpecialForm: true, isCosmeticOnly: false, formType: 'special', formLabel: 'Fan Rotom' };
    if (lower.endsWith('-mow')) return { isSpecialForm: true, isCosmeticOnly: false, formType: 'special', formLabel: 'Mow Rotom' };
  }

  if (sLower === 'giratina' && lower.endsWith('-origin')) {
    return { isSpecialForm: true, isCosmeticOnly: false, formType: 'special', formLabel: 'Origin Forme' };
  }

  if (sLower === 'shaymin' && lower.endsWith('-sky')) {
    return { isSpecialForm: true, isCosmeticOnly: false, formType: 'special', formLabel: 'Sky Forme' };
  }

  if (sLower === 'kyurem') {
    if (lower.endsWith('-black')) return { isSpecialForm: true, isCosmeticOnly: false, formType: 'special', formLabel: 'Black Kyurem' };
    if (lower.endsWith('-white')) return { isSpecialForm: true, isCosmeticOnly: false, formType: 'special', formLabel: 'White Kyurem' };
  }

  if (sLower === 'necrozma') {
    if (lower.endsWith('-dusk')) return { isSpecialForm: true, isCosmeticOnly: false, formType: 'special', formLabel: 'Dusk Mane' };
    if (lower.endsWith('-dawn')) return { isSpecialForm: true, isCosmeticOnly: false, formType: 'special', formLabel: 'Dawn Wings' };
    if (lower.endsWith('-ultra')) return { isSpecialForm: true, isCosmeticOnly: false, formType: 'special', formLabel: 'Ultra Necrozma' };
  }

  if (sLower === 'zacian' && lower.endsWith('-crowned')) {
    return { isSpecialForm: true, isCosmeticOnly: false, formType: 'special', formLabel: 'Crowned Sword' };
  }
  if (sLower === 'zamazenta' && lower.endsWith('-crowned')) {
    return { isSpecialForm: true, isCosmeticOnly: false, formType: 'special', formLabel: 'Crowned Shield' };
  }

  if (sLower === 'calyrex') {
    if (lower.endsWith('-ice')) return { isSpecialForm: true, isCosmeticOnly: false, formType: 'special', formLabel: 'Ice Rider' };
    if (lower.endsWith('-shadow')) return { isSpecialForm: true, isCosmeticOnly: false, formType: 'special', formLabel: 'Shadow Rider' };
  }

  if (sLower === 'aegislash' && lower.endsWith('-blade')) {
    return { isSpecialForm: true, isCosmeticOnly: false, formType: 'special', formLabel: 'Blade Forme' };
  }

  if (sLower === 'darmanitan' && lower.endsWith('-zen')) {
    return { isSpecialForm: true, isCosmeticOnly: false, formType: 'special', formLabel: 'Zen Mode' };
  }

  if (sLower === 'meloetta' && lower.endsWith('-pirouette')) {
    return { isSpecialForm: true, isCosmeticOnly: false, formType: 'special', formLabel: 'Pirouette Forme' };
  }

  if (sLower === 'hoopa' && lower.endsWith('-unbound')) {
    return { isSpecialForm: true, isCosmeticOnly: false, formType: 'special', formLabel: 'Hoopa Unbound' };
  }

  if (sLower === 'wishiwashi' && lower.endsWith('-school')) {
    return { isSpecialForm: true, isCosmeticOnly: false, formType: 'special', formLabel: 'School Form' };
  }

  if (sLower === 'greninja' && lower.endsWith('-ash')) {
    return { isSpecialForm: true, isCosmeticOnly: false, formType: 'special', formLabel: 'Ash-Greninja' };
  }

  if (sLower === 'zygarde') {
    if (lower.endsWith('-10')) return { isSpecialForm: true, isCosmeticOnly: false, formType: 'special', formLabel: '10% Forme' };
    if (lower.endsWith('-complete')) return { isSpecialForm: true, isCosmeticOnly: false, formType: 'special', formLabel: 'Complete Forme' };
  }

  if (sLower === 'minior' && (lower.endsWith('-meteor') || lower.includes('-meteor'))) {
    return { isSpecialForm: true, isCosmeticOnly: false, formType: 'special', formLabel: 'Meteor Form' };
  }

  if (sLower === 'floette' && lower.includes('-eternal')) {
    return { isSpecialForm: true, isCosmeticOnly: false, formType: 'special', formLabel: 'Eternal Flower' };
  }

  if (sLower === 'ogerpon') {
    if (lower.includes('wellspring')) return { isSpecialForm: true, isCosmeticOnly: false, formType: 'special', formLabel: 'Wellspring Mask' };
    if (lower.includes('hearthflame')) return { isSpecialForm: true, isCosmeticOnly: false, formType: 'special', formLabel: 'Hearthflame Mask' };
    if (lower.includes('cornerstone')) return { isSpecialForm: true, isCosmeticOnly: false, formType: 'special', formLabel: 'Cornerstone Mask' };
  }

  if (sLower === 'terapagos') {
    if (lower.endsWith('-terastal')) return { isSpecialForm: true, isCosmeticOnly: false, formType: 'special', formLabel: 'Terastal Form' };
    if (lower.endsWith('-stellar')) return { isSpecialForm: true, isCosmeticOnly: false, formType: 'special', formLabel: 'Stellar Form' };
  }

  if (sLower === 'palafin' && lower.endsWith('-hero')) {
    return { isSpecialForm: true, isCosmeticOnly: false, formType: 'special', formLabel: 'Hero Form' };
  }

  if (sLower === 'toxtricity' && lower.endsWith('-low-key')) {
    return { isSpecialForm: true, isCosmeticOnly: false, formType: 'special', formLabel: 'Low Key Form' };
  }

  if (sLower === 'lycanroc') {
    if (lower.endsWith('-midnight')) return { isSpecialForm: true, isCosmeticOnly: false, formType: 'special', formLabel: 'Midnight Form' };
    if (lower.endsWith('-dusk')) return { isSpecialForm: true, isCosmeticOnly: false, formType: 'special', formLabel: 'Dusk Form' };
  }

  if (sLower === 'arceus' && lower.includes('-')) {
    const typeName = lower.replace('arceus-', '');
    return { isSpecialForm: true, isCosmeticOnly: false, formType: 'special', formLabel: `${capitalizeStr(typeName)} Plate` };
  }

  if (sLower === 'silvally' && lower.includes('-')) {
    const typeName = lower.replace('silvally-', '');
    return { isSpecialForm: true, isCosmeticOnly: false, formType: 'special', formLabel: `${capitalizeStr(typeName)} Memory` };
  }

  // Generic fallback if varName has a non-default suffix and is not base species name
  if (lower.includes('-') && lower !== sLower) {
    const rawLabel = lower.replace(`${sLower}-`, '').split('-').map(capitalizeStr).join(' ');
    return { isSpecialForm: true, isCosmeticOnly: false, formType: 'special', formLabel: `${rawLabel} Form` };
  }

  return null;
}

export async function fetchSpecialFormsForSpecies(
  speciesId: number,
  speciesName: string,
  varieties?: any[],
  fallbackFlavorText: string = ''
): Promise<NonNullable<FullPokemonData['specialForms']>> {
  let varsList = varieties;
  if (!varsList) {
    try {
      const speciesRes = await fetchWithRetry(`${BASE_URL}/pokemon-species/${speciesId}`);
      if (speciesRes.ok) {
        const sData = await speciesRes.json();
        varsList = sData.varieties || [];
      }
    } catch (e) {
      return [];
    }
  }

  if (!varsList || varsList.length === 0) return [];

  const candidateVarieties = varsList.filter((v: any) => !v.is_default);

  if (candidateVarieties.length === 0) return [];

  const results: NonNullable<FullPokemonData['specialForms']> = [];

  for (const v of candidateVarieties) {
    const varName = v.pokemon?.name || '';
    const classified = classifySpecialForm(varName, speciesName);

    if (!classified || !classified.isSpecialForm) continue;

    try {
      const varRes = await fetchWithRetry(v.pokemon.url);
      if (!varRes.ok) continue;
      const pData = await varRes.json();

      const sortedTypes = (pData.types || []).sort((a: any, b: any) => a.slot - b.slot);
      const primary_type = sortedTypes[0]?.type?.name || 'normal';
      const secondary_type = sortedTypes[1]?.type?.name || null;

      const getStat = (statName: string) => {
        const found = pData.stats?.find((s: any) => s.stat?.name === statName);
        return found ? found.base_stat : 0;
      };

      const stats = {
        hp: getStat('hp'),
        attack: getStat('attack'),
        defense: getStat('defense'),
        sp_attack: getStat('special-attack'),
        sp_defense: getStat('special-defense'),
        speed: getStat('speed'),
      };

      const abilities = await Promise.all(
        (pData.abilities || []).map(async (a: any) => {
          const abilityName = a.ability.name;
          const effectText = await fetchAbilityEffect(a.ability.url, abilityName);
          return {
            ability_name: abilityName,
            effect_text: effectText,
            is_hidden: Boolean(a.is_hidden),
          };
        })
      );

      const sprite_url =
        pData.sprites?.front_default ||
        `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pData.id}.png`;
      const shiny_sprite_url =
        pData.sprites?.front_shiny ||
        `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${pData.id}.png`;
      const official_artwork_url =
        pData.sprites?.other?.['official-artwork']?.front_default ||
        `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pData.id}.png`;
      const shiny_artwork_url =
        pData.sprites?.other?.['official-artwork']?.front_shiny ||
        `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/shiny/${pData.id}.png`;

      results.push({
        base_pokemon_id: speciesId,
        form_type: classified.formType,
        form_name: varName,
        form_label: classified.formLabel,
        primary_type,
        secondary_type,
        height: pData.height,
        weight: pData.weight,
        flavor_text: fallbackFlavorText,
        sprite_url,
        shiny_sprite_url,
        official_artwork_url,
        shiny_artwork_url,
        stats,
        abilities,
      });
    } catch (err) {
      console.error(`Failed to fetch special form ${varName}:`, err);
    }
  }

  return results;
}
