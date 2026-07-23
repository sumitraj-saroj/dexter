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

  // Extract Level-Up Moves
  const levelUpMoves: Array<{ move_name: string; level_learned: number; learn_method: string }> = [];
  const moveMap = new Map<string, number>();

  for (const item of pData.moves || []) {
    for (const detail of item.version_group_details || []) {
      if (detail.move_learn_method?.name === 'level-up') {
        const moveName = item.move.name;
        const level = detail.level_learned_at || 0;
        const existing = moveMap.get(moveName);
        if (existing === undefined || level < existing) {
          moveMap.set(moveName, level);
        }
      }
    }
  }

  moveMap.forEach((level, name) => {
    levelUpMoves.push({
      move_name: name,
      level_learned: level,
      learn_method: 'level-up',
    });
  });

  levelUpMoves.sort((a, b) => a.level_learned - b.level_learned);

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

  const formattedNumber = `#${String(speciesId).padStart(3, '0')}`;

  return {
    pokemon: {
      id: speciesId,
      name: sData.name || pData.name,
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
    },
    stats,
    abilities,
    moves: levelUpMoves,
    evolution: {
      evolves_from_id,
      evolution_trigger: null,
    },
  };
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
