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
  shiny_artwork_url TEXT
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

CREATE TABLE IF NOT EXISTS favorites (
  pokemon_id INTEGER PRIMARY KEY,
  FOREIGN KEY (pokemon_id) REFERENCES pokemon(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_pokemon_name ON pokemon(name);
CREATE INDEX IF NOT EXISTS idx_pokemon_number ON pokemon(number);
CREATE INDEX IF NOT EXISTS idx_pokemon_primary_type ON pokemon(primary_type);
CREATE INDEX IF NOT EXISTS idx_pokemon_secondary_type ON pokemon(secondary_type);
CREATE INDEX IF NOT EXISTS idx_pokemon_legendary ON pokemon(is_legendary);
CREATE INDEX IF NOT EXISTS idx_pokemon_mythical ON pokemon(is_mythical);
CREATE INDEX IF NOT EXISTS idx_pokemon_abilities_name ON pokemon_abilities(ability_name);

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
`;
