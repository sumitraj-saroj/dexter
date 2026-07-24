export const CREATE_TABLES_SQL = `
CREATE TABLE IF NOT EXISTS pokemon (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  number TEXT NOT NULL,
  height INTEGER,
  weight INTEGER,
  primary_type TEXT NOT NULL,
  secondary_type TEXT,
  is_legendary INTEGER DEFAULT 0,
  is_mythical INTEGER DEFAULT 0,
  flavor_text TEXT,
  sprite_url TEXT,
  shiny_sprite_url TEXT,
  official_artwork_url TEXT,
  shiny_artwork_url TEXT,
  egg_groups TEXT,
  hatch_counter INTEGER,
  gender_rate INTEGER
);

CREATE TABLE IF NOT EXISTS pokemon_stats (
  pokemon_id INTEGER PRIMARY KEY,
  hp INTEGER NOT NULL,
  attack INTEGER NOT NULL,
  defense INTEGER NOT NULL,
  sp_attack INTEGER NOT NULL,
  sp_defense INTEGER NOT NULL,
  speed INTEGER NOT NULL,
  FOREIGN KEY (pokemon_id) REFERENCES pokemon(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS pokemon_abilities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pokemon_id INTEGER NOT NULL,
  ability_name TEXT NOT NULL,
  effect_text TEXT,
  is_hidden INTEGER DEFAULT 0,
  FOREIGN KEY (pokemon_id) REFERENCES pokemon(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS pokemon_moves (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pokemon_id INTEGER NOT NULL,
  move_name TEXT NOT NULL,
  level_learned INTEGER,
  learn_method TEXT,
  FOREIGN KEY (pokemon_id) REFERENCES pokemon(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS evolution_chain (
  pokemon_id INTEGER PRIMARY KEY,
  evolves_from_id INTEGER,
  evolution_trigger TEXT,
  FOREIGN KEY (pokemon_id) REFERENCES pokemon(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS team (
  slot INTEGER PRIMARY KEY CHECK(slot >= 1 AND slot <= 6),
  pokemon_id INTEGER NOT NULL,
  FOREIGN KEY (pokemon_id) REFERENCES pokemon(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS pokemon_collection_status (
  pokemon_id INTEGER PRIMARY KEY,
  is_favorite INTEGER DEFAULT 0,
  shiny_owned INTEGER DEFAULT 0,
  is_alpha INTEGER DEFAULT 0,
  has_competitive_build INTEGER DEFAULT 0,
  ash_owned INTEGER DEFAULT 0,
  FOREIGN KEY (pokemon_id) REFERENCES pokemon(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_pokemon_name ON pokemon(name);
CREATE INDEX IF NOT EXISTS idx_pokemon_number ON pokemon(number);
CREATE INDEX IF NOT EXISTS idx_pokemon_primary_type ON pokemon(primary_type);
CREATE INDEX IF NOT EXISTS idx_pokemon_secondary_type ON pokemon(secondary_type);
CREATE INDEX IF NOT EXISTS idx_pokemon_legendary ON pokemon(is_legendary);
CREATE INDEX IF NOT EXISTS idx_pokemon_mythical ON pokemon(is_mythical);
CREATE INDEX IF NOT EXISTS idx_pokemon_abilities_name ON pokemon_abilities(ability_name);
CREATE INDEX IF NOT EXISTS idx_pokemon_abilities_pokemon_id ON pokemon_abilities(pokemon_id);
CREATE INDEX IF NOT EXISTS idx_pokemon_moves_pokemon_id ON pokemon_moves(pokemon_id);
CREATE INDEX IF NOT EXISTS idx_pcs_fav ON pokemon_collection_status(is_favorite);
CREATE INDEX IF NOT EXISTS idx_pcs_ash ON pokemon_collection_status(ash_owned);
CREATE INDEX IF NOT EXISTS idx_pcs_shiny ON pokemon_collection_status(shiny_owned);

CREATE TABLE IF NOT EXISTS generations (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  region_name TEXT NOT NULL,
  start_id INTEGER NOT NULL,
  end_id INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS user_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS quiz_scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  score INTEGER NOT NULL,
  best_streak INTEGER NOT NULL,
  date_played TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS pokemon_variants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  base_pokemon_id INTEGER NOT NULL,
  variant_name TEXT NOT NULL,
  region_label TEXT NOT NULL,
  primary_type TEXT NOT NULL,
  secondary_type TEXT,
  height INTEGER,
  weight INTEGER,
  flavor_text TEXT,
  hp INTEGER NOT NULL,
  attack INTEGER NOT NULL,
  defense INTEGER NOT NULL,
  sp_attack INTEGER NOT NULL,
  sp_defense INTEGER NOT NULL,
  speed INTEGER NOT NULL,
  sprite_url TEXT,
  shiny_sprite_url TEXT,
  official_artwork_url TEXT,
  shiny_artwork_url TEXT,
  FOREIGN KEY (base_pokemon_id) REFERENCES pokemon(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS pokemon_variant_abilities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  variant_id INTEGER NOT NULL,
  ability_name TEXT NOT NULL,
  effect_text TEXT,
  is_hidden INTEGER DEFAULT 0,
  FOREIGN KEY (variant_id) REFERENCES pokemon_variants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_variant_base_pokemon_id ON pokemon_variants(base_pokemon_id);
CREATE INDEX IF NOT EXISTS idx_variant_abilities_variant_id ON pokemon_variant_abilities(variant_id);

CREATE TABLE IF NOT EXISTS pokemon_special_forms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  base_pokemon_id INTEGER NOT NULL,
  form_type TEXT NOT NULL,
  form_name TEXT NOT NULL,
  form_label TEXT NOT NULL,
  primary_type TEXT NOT NULL,
  secondary_type TEXT,
  height INTEGER,
  weight INTEGER,
  flavor_text TEXT,
  hp INTEGER NOT NULL,
  attack INTEGER NOT NULL,
  defense INTEGER NOT NULL,
  sp_attack INTEGER NOT NULL,
  sp_defense INTEGER NOT NULL,
  speed INTEGER NOT NULL,
  sprite_url TEXT,
  shiny_sprite_url TEXT,
  official_artwork_url TEXT,
  shiny_artwork_url TEXT,
  FOREIGN KEY (base_pokemon_id) REFERENCES pokemon(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS pokemon_special_form_abilities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  form_id INTEGER NOT NULL,
  ability_name TEXT NOT NULL,
  effect_text TEXT,
  is_hidden INTEGER DEFAULT 0,
  FOREIGN KEY (form_id) REFERENCES pokemon_special_forms(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_special_forms_base_pokemon_id ON pokemon_special_forms(base_pokemon_id);
CREATE INDEX IF NOT EXISTS idx_special_form_abilities_form_id ON pokemon_special_form_abilities(form_id);

CREATE TABLE IF NOT EXISTS pokemon_seen (
  pokemon_id INTEGER PRIMARY KEY,
  first_seen_date TEXT NOT NULL,
  FOREIGN KEY (pokemon_id) REFERENCES pokemon(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS pokemon_caught (
  pokemon_id INTEGER PRIMARY KEY,
  caught_date TEXT NOT NULL,
  FOREIGN KEY (pokemon_id) REFERENCES pokemon(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS trainer_profile (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  name TEXT NOT NULL DEFAULT 'Trainer',
  avatar_id TEXT NOT NULL DEFAULT 'pikachu',
  xp INTEGER NOT NULL DEFAULT 0,
  current_streak INTEGER NOT NULL DEFAULT 0,
  total_correct INTEGER NOT NULL DEFAULT 0,
  total_answered INTEGER NOT NULL DEFAULT 0,
  last_open_date TEXT,
  created_date TEXT
);

CREATE TABLE IF NOT EXISTS competitive_builds (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pokemon_id INTEGER NOT NULL,
  build_name TEXT NOT NULL DEFAULT 'Standard Build',
  nature TEXT NOT NULL DEFAULT 'Adamant',
  evs_hp INTEGER DEFAULT 0,
  evs_attack INTEGER DEFAULT 0,
  evs_defense INTEGER DEFAULT 0,
  evs_sp_attack INTEGER DEFAULT 0,
  evs_sp_defense INTEGER DEFAULT 0,
  evs_speed INTEGER DEFAULT 0,
  ivs_hp INTEGER DEFAULT 31,
  ivs_attack INTEGER DEFAULT 31,
  ivs_defense INTEGER DEFAULT 31,
  ivs_sp_attack INTEGER DEFAULT 31,
  ivs_sp_defense INTEGER DEFAULT 31,
  ivs_speed INTEGER DEFAULT 31,
  move_1 TEXT,
  move_2 TEXT,
  move_3 TEXT,
  move_4 TEXT,
  held_item TEXT,
  notes TEXT,
  FOREIGN KEY (pokemon_id) REFERENCES pokemon(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_comp_builds_pokemon_id ON competitive_builds(pokemon_id);

CREATE TABLE IF NOT EXISTS achievements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  category TEXT NOT NULL,
  unlocked_date TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_achievements_key ON achievements(key);

CREATE TABLE IF NOT EXISTS pokemon_sprites (
  pokemon_id INTEGER PRIMARY KEY,
  official_artwork_url TEXT,
  shiny_artwork_url TEXT,
  home_artwork_url TEXT,
  shiny_home_artwork_url TEXT,
  dream_world_url TEXT,
  pixel_default_url TEXT,
  pixel_gen1_url TEXT,
  pixel_gen3_url TEXT,
  animated_url TEXT,
  FOREIGN KEY (pokemon_id) REFERENCES pokemon(id) ON DELETE CASCADE
);
`;


