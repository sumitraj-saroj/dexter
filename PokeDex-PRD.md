# PokéDex — Product Requirements Document

**A personal, nostalgia-driven Pokédex app for Gen 1 (Kanto, #001–#151)**

---

## 1. Vision

A Pokédex that a 10-year-old version of you would have been obsessed with. Not a data browser — a toy. The signature hook: **the entire app's color theme shifts to match whichever Pokémon you're looking at**, Material You style. Look at Pikachu → the app glows soft yellow. Look at Charizard → it turns warm red/orange. It should feel alive and personal, not like a spreadsheet with sprites.

Scope is intentionally tight: **Kanto only (151 Pokémon)**, built well, rather than 1000+ built shallow. Expand later if it's fun.

---

## 2. Target User

You — a React Native developer who loves Pokémon and wants a self-directed, well-executed passion project. Secondary audience: none. This is not a portfolio piece or a freelance deliverable; it's built for the joy of building and using it. That means it's fine to over-polish the theming/animation even if "unnecessary."

---

## 3. Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Expo (React Native) + TypeScript | Matches your existing setup (Portl, habit tracker) |
| Navigation | Expo Router | File-based routing, less boilerplate |
| Data source | [PokeAPI](https://pokeapi.co) | Free, complete, no auth needed |
| Offline cache | `expo-sqlite` | Kanto data (151 entries) is small — cache full dataset on first launch, then fully offline |
| State/data fetching | TanStack Query (React Query) | Handles cache-then-network, background refetch, loading/error states cleanly |
| Theming engine | Custom dynamic color system (see §6) using `react-native-reanimated` for transitions | Material You isn't natively available in RN; we hand-roll a token-based version |
| Animations | Reanimated 3 + `moti` (optional, thin wrapper) | Smooth theme-transition and screen animations |
| Local sprite/image cache | `expo-image` (built-in disk caching) | Avoids re-downloading sprites |
| Storage for favorites/team | SQLite (same DB as Pokédex cache) | One local DB, simple |

---

## 4. Core Features

### 4.1 Search & Browse
- Search by **name** (fuzzy, e.g. "char" → Charmander, Charmeleon, Charizard) or **Pokédex number** (exact or partial, e.g. "6" or "006").
- Default view: **classic grid of cards** — sprite, name, #number, and 1–2 small type-color chips per card.
- Grid respects the active dynamic theme's accent color for card borders/highlights.

### 4.2 Filters
Filter bar/sheet above or below search, combinable (AND logic):
- **Region/Generation** — for this scope, effectively "Kanto" only, but build the filter as a proper multi-select so it's trivial to extend to Johto etc. later.
- **Type** — multi-select chips (Fire, Water, Grass, Electric, etc.), Pokémon matching **any** selected type shown.
- **Legendary / Mythical only** — toggle.
- **Ability search** — text search matching Pokémon that have a given ability (e.g. "Levitate").

Filters + search combine (e.g. type=Fire AND search="char").

### 4.3 Pokémon Detail Screen
Tapping a card opens a detail screen that:
- **Triggers the full app theme change** (see §6) with a smooth animated transition.
- Shows: official artwork (large), name, number, types, height/weight, description (flavor text).
- **Base stats** — animated bar chart (HP, Atk, Def, Sp.Atk, Sp.Def, Speed).
- **Evolution chain** — visual tree/horizontal flow (e.g. Charmander → Charmeleon → Charizard) with tap-to-jump navigation between evolution stages.
- **Moves & abilities** — abilities listed with short effect description; moves in a scrollable/searchable list (level-up moves prioritized, TM/egg moves collapsible).
- **Shiny toggle** — switch between normal/shiny sprite; shiny sprite optionally shifts the theme's color variant too (a fun detail: shiny Charizard could shift to a moodier gold-black variant instead of red).
- **Add to Team** button (see §4.4).

### 4.4 Team Builder / Favorites
- Build a **squad of up to 6 Pokémon** (classic team-of-6 constraint).
- Team screen shows the 6 as cards; app theme on this screen can either follow the last-added Pokémon or cycle/blend — simplest v1: follows the most recently added.
- Persisted locally (SQLite) — survives app restarts.
- Basic team view: types covered, weaknesses at a glance (nice-to-have, not core v1).

### 4.5 Compare Screen
- Pick any 2 Pokémon → side-by-side stat comparison (bars overlaid or paired), types, and a simple type-effectiveness note if easy to compute from data.
- Theme for this screen: split/blended background (left half tinted to Pokémon A, right half to Pokémon B) — a nice visual flex of the theming system.

### 4.6 Offline-First Behavior
- On first launch: fetch all 151 Kanto entries (species, forms, evolution chains, moves, abilities) once, store in SQLite, show a friendly one-time loading/"filling the Pokédex" screen.
- After that: app works fully offline. React Query serves from cache instantly; background revalidation only when online (low priority, data barely changes).
- Sprites cached to disk via `expo-image` as they're viewed (don't need to prefetch all 151 images upfront — lazy load + cache).

---

## 5. Screens (Information Architecture)

1. **Home / Pokédex Grid** — search bar, filter chip row, grid of 151 cards.
2. **Pokémon Detail** — full themed screen per §4.3.
3. **Team** — your squad of up to 6.
4. **Compare** — pick 2, see them side by side.
5. **Settings** (small, optional v1) — reset cache, toggle shiny-default, about/credits to PokeAPI.

---

## 6. Dynamic Material-You Theming — Design Spec

This is the app's signature feature, so it deserves its own section.

### 6.1 Behavior
- Each Pokémon has a **seed color** derived from its **primary type** (not raw sprite pixel-averaging — more reliable and on-brand). Example seed palette:
  - Fire → warm red/orange
  - Water → blue
  - Grass → green
  - Electric → yellow (Pikachu example from your brief)
  - Psychic → pink/magenta
  - Dragon → indigo/purple
  - etc. (18 types → 18 seed colors, tunable)
- Dual-type Pokémon: primary type drives the dominant seed color; secondary type can tint accents (e.g. a subtle gradient or the FAB/accent color pulls from type 2).
- From the seed color, generate a full **Material 3 tonal palette** (primary, on-primary, primary-container, surface, surface-variant, etc.) using an HCT-based color algorithm (there are RN-friendly ports of Material Color Utilities you can use, or implement a simplified HSL-tonal-ramp version — flagged as a build decision in the prompts doc).
- **All M3 tokens re-tint app-wide** when viewing a Pokémon's detail screen: background, surfaces, buttons, icons, status bar color — not just an accent stripe.
- Transition between Pokémon (e.g. swiping to next evolution, or navigating detail → detail) **animates** the color shift rather than hard-cutting, using Reanimated shared values interpolating between the two token sets.
- List/grid/team/compare screens use a **neutral default theme** (not tied to any single Pokémon) so the "wow" moment is reserved for the detail screen — keeps it special rather than exhausting.

### 6.2 Light/Dark Mode
- Respect system light/dark mode; the tonal palette generation should produce a sensible dark-mode variant too (M3 tonal palettes support this natively — same hue, different tone steps).

---

## 7. Data Model (SQLite, simplified)

```
pokemon (id, name, number, height, weight, primary_type, secondary_type,
         is_legendary, is_mythical, flavor_text, sprite_url, shiny_sprite_url,
         official_artwork_url)

pokemon_stats (pokemon_id, hp, attack, defense, sp_attack, sp_defense, speed)

pokemon_abilities (pokemon_id, ability_name, effect_text, is_hidden)

pokemon_moves (pokemon_id, move_name, level_learned, learn_method)

evolution_chain (pokemon_id, evolves_from_id, evolves_to_id[], evolution_trigger)

team (slot 1-6, pokemon_id)

favorites (pokemon_id)
```

---

## 8. Non-Functional Requirements

- **Performance**: grid of 151 cards should scroll at 60fps — use `FlashList` (Shopify) instead of vanilla `FlatList`.
- **Cold start**: first-launch full sync should complete in a reasonable time on average mobile data; show progress, not a frozen spinner.
- **No backend of your own** — PokeAPI + local SQLite only, no server to maintain.
- **Accessibility**: minimum tap target sizes, decent color contrast even as themes shift (M3 tonal system handles this if tokens are respected correctly — don't hardcode text colors).

---

## 9. Explicit Non-Goals (v1)

- No multiplayer/social features.
- No battle simulator.
- No regions beyond Kanto (structure the code so this is an easy v2, but don't build it now).
- No account/login/cloud sync — fully local.
- No Pokémon cries/sound effects (descoped per your preference).

---

## 10. Success Criteria

This is a personal project — "success" = you actually enjoy using it. Concretely:
- All 151 Kanto Pokémon browsable, searchable, filterable, fully offline after first sync.
- Detail screen theme change feels smooth and delightful, not janky.
- Team builder and compare screen both functional and fun to poke at.
- Code structured cleanly enough that adding Johto (#152–251) later is a data problem, not a rewrite.
