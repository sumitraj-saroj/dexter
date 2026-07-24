export type PokemonType =
  | 'normal'
  | 'fire'
  | 'water'
  | 'electric'
  | 'grass'
  | 'ice'
  | 'fighting'
  | 'poison'
  | 'ground'
  | 'flying'
  | 'psychic'
  | 'bug'
  | 'rock'
  | 'ghost'
  | 'dragon'
  | 'steel'
  | 'fairy'
  | 'dark';

export interface Generation {
  id: number;
  name: string;
  regionName: string;
  startId: number;
  endId: number;
}

export interface PokemonStat {
  hp: number;
  attack: number;
  defense: number;
  specialAttack: number;
  specialDefense: number;
  speed: number;
}

export interface PokemonAbility {
  name: string;
  effect: string;
  isHidden: boolean;
}

export interface PokemonMove {
  name: string;
  levelLearned: number;
  learnMethod: string;
}

export interface Pokemon {
  id: number;
  name: string;
  number: string;
  height: number;
  weight: number;
  primaryType: PokemonType;
  secondaryType?: PokemonType | null;
  isLegendary: boolean;
  isMythical: boolean;
  flavorText: string;
  spriteUrl: string;
  shinySpriteUrl: string;
  officialArtworkUrl: string;
  shinyArtworkUrl: string;
  stats?: PokemonStat;
  abilities?: PokemonAbility[];
  moves?: PokemonMove[];
  evolvesFromId?: number | null;
  evolutionTrigger?: string | null;
  isFavorite?: boolean;
  shinyOwned?: boolean;
  isAlpha?: boolean;
  hasCompetitiveBuild?: boolean;
  isInTeam?: boolean;
  isCaught?: boolean;
  isSeen?: boolean;
}

export type CollectionFilterStatus =
  | 'caught'
  | 'uncaught'
  | 'favorite'
  | 'shiny_owned'
  | 'alpha'
  | 'competitive_build';

export interface TrainerProfile {
  id: number;
  name: string;
  avatarId: string;
  xp: number;
  currentStreak: number;
  totalCorrect: number;
  totalAnswered: number;
  lastOpenDate: string | null;
  createdDate: string | null;
  level: number;
  xpProgress: number; // 0 to 500
}

export interface TeamMember {
  slot: number; // 1-6
  pokemonId: number;
  pokemon?: Pokemon;
}

export interface FilterOptions {
  types?: PokemonType[];
  generations?: number[];
  legendaryOnly?: boolean;
  ability?: string;
  searchQuery?: string;
  collectionFilters?: CollectionFilterStatus[];
  caughtOnly?: boolean;
  notCaughtOnly?: boolean;
  favoritesOnly?: boolean;
  shinyOwnedOnly?: boolean;
  alphaOnly?: boolean;
  hasCompetitiveBuildOnly?: boolean;
}

export interface PokemonVariant {
  id: number;
  basePokemonId: number;
  variantName: string;
  regionLabel: string; // e.g. "Alolan", "Galarian", "Hisuian", "Paldean"
  primaryType: PokemonType;
  secondaryType?: PokemonType | null;
  height?: number;
  weight?: number;
  flavorText?: string;
  spriteUrl: string;
  shinySpriteUrl: string;
  officialArtworkUrl: string;
  shinyArtworkUrl: string;
  stats: PokemonStat;
  abilities: PokemonAbility[];
}

export type SpecialFormType = 'mega' | 'mega_x' | 'mega_y' | 'gmax' | 'special';

export interface PokemonSpecialForm {
  id: number;
  basePokemonId: number;
  formType: SpecialFormType;
  formName: string;
  formLabel: string;
  primaryType: PokemonType;
  secondaryType?: PokemonType | null;
  height?: number;
  weight?: number;
  flavorText?: string;
  spriteUrl: string;
  shinySpriteUrl: string;
  officialArtworkUrl: string;
  shinyArtworkUrl: string;
  stats: PokemonStat;
  abilities: PokemonAbility[];
}

export interface FullPokemonData {
  pokemon: {
    id: number;
    name: string;
    number: string;
    height: number;
    weight: number;
    primary_type: string;
    secondary_type: string | null;
    is_legendary: boolean;
    is_mythical: boolean;
    flavor_text: string;
    sprite_url: string;
    shiny_sprite_url: string;
    official_artwork_url: string;
    shiny_artwork_url: string;
  };
  stats: {
    hp: number;
    attack: number;
    defense: number;
    sp_attack: number;
    sp_defense: number;
    speed: number;
  };
  abilities: Array<{
    ability_name: string;
    effect_text: string;
    is_hidden: boolean;
  }>;
  moves: Array<{
    move_name: string;
    level_learned: number;
    learn_method: string;
  }>;
  evolution: {
    evolves_from_id: number | null;
    evolution_trigger: string | null;
  };
  variants?: Array<{
    id?: number;
    base_pokemon_id: number;
    variant_name: string;
    region_label: string;
    primary_type: string;
    secondary_type: string | null;
    height: number;
    weight: number;
    flavor_text: string;
    sprite_url: string;
    shiny_sprite_url: string;
    official_artwork_url: string;
    shiny_artwork_url: string;
    stats: {
      hp: number;
      attack: number;
      defense: number;
      sp_attack: number;
      sp_defense: number;
      speed: number;
    };
    abilities: Array<{
      ability_name: string;
      effect_text: string;
      is_hidden: boolean;
    }>;
  }>;
  specialForms?: Array<{
    id?: number;
    base_pokemon_id: number;
    form_type: SpecialFormType;
    form_name: string;
    form_label: string;
    primary_type: string;
    secondary_type: string | null;
    height: number;
    weight: number;
    flavor_text: string;
    sprite_url: string;
    shiny_sprite_url: string;
    official_artwork_url: string;
    shiny_artwork_url: string;
    stats: {
      hp: number;
      attack: number;
      defense: number;
      sp_attack: number;
      sp_defense: number;
      speed: number;
    };
    abilities: Array<{
      ability_name: string;
      effect_text: string;
      is_hidden: boolean;
    }>;
  }>;
}

export interface M3ColorScheme {
  primary: string;
  onPrimary: string;
  primaryContainer: string;
  onPrimaryContainer: string;
  secondary: string;
  onSecondary: string;
  secondaryContainer: string;
  onSecondaryContainer: string;
  surface: string;
  onSurface: string;
  surfaceVariant: string;
  onSurfaceVariant: string;
  background: string;
  onBackground: string;
  outline: string;
}

export interface QuizScoreRecord {
  id: number;
  score: number;
  bestStreak: number;
  datePlayed: string;
  isAllTimeBest?: boolean;
}

export interface EVs {
  hp: number;
  attack: number;
  defense: number;
  specialAttack: number;
  specialDefense: number;
  speed: number;
}

export interface IVs {
  hp: number;
  attack: number;
  defense: number;
  specialAttack: number;
  specialDefense: number;
  speed: number;
}

export interface CompetitiveBuild {
  id?: number;
  pokemonId: number;
  buildName: string;
  nature: string;
  evs: EVs;
  ivs: IVs;
  move1?: string | null;
  move2?: string | null;
  move3?: string | null;
  move4?: string | null;
  heldItem?: string | null;
  notes?: string | null;
}
