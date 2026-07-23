import Database from 'better-sqlite3';
import { fetchSinglePokemon, fetchRegionalVariantsForSpecies } from '../src/api/pokeapi';
import { CREATE_TABLES_SQL } from '../src/db/schema';
import { getVariantsForPokemon, getPokemonById } from '../src/db/queries';

async function runVariantTests() {
  console.log('🧪 Testing Regional Variant Data Layer & Fetching...\n');

  const db = new Database(':memory:');
  db.exec(CREATE_TABLES_SQL);

  const testCases = [
    { id: 37, name: 'Vulpix', expectedRegion: 'Alolan', expectedType: 'ice' },
    { id: 52, name: 'Meowth', expectedRegion: 'Galarian', expectedType: 'steel' },
    { id: 100, name: 'Voltorb', expectedRegion: 'Hisuian', expectedType: 'electric' },
    { id: 194, name: 'Wooper', expectedRegion: 'Paldean', expectedType: 'poison' },
  ];

  const insertBasePokemonStmt = db.prepare(
    `INSERT INTO pokemon (id, name, number, height, weight, primary_type, secondary_type, is_legendary, is_mythical, flavor_text, sprite_url, shiny_sprite_url, official_artwork_url, shiny_artwork_url)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  const insertVariantStmt = db.prepare(
    `INSERT INTO pokemon_variants (base_pokemon_id, variant_name, region_label, primary_type, secondary_type, height, weight, flavor_text, hp, attack, defense, sp_attack, sp_defense, speed, sprite_url, shiny_sprite_url, official_artwork_url, shiny_artwork_url)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  const insertAbilityStmt = db.prepare(
    `INSERT INTO pokemon_variant_abilities (variant_id, ability_name, effect_text, is_hidden) VALUES (?, ?, ?, ?)`
  );

  for (const tc of testCases) {
    console.log(`Checking ${tc.name} (#${tc.id})...`);
    const pData = await fetchSinglePokemon(tc.id);

    console.log(`  Base Form: ${pData.pokemon.name} - Types: ${pData.pokemon.primary_type}${pData.pokemon.secondary_type ? '/' + pData.pokemon.secondary_type : ''}`);
    console.log(`  Variants fetched: ${pData.variants?.length || 0}`);

    if (!pData.variants || pData.variants.length === 0) {
      throw new Error(`FAILED: Expected ${tc.name} to have at least 1 regional variant.`);
    }

    const foundTargetVariant = pData.variants.find(
      (v) => v.region_label.toLowerCase() === tc.expectedRegion.toLowerCase()
    );

    if (!foundTargetVariant) {
      throw new Error(`FAILED: Expected to find ${tc.expectedRegion} variant for ${tc.name}`);
    }

    console.log(`  Found ${foundTargetVariant.region_label} variant: ${foundTargetVariant.variant_name}`);
    console.log(`    Primary type: ${foundTargetVariant.primary_type}, Secondary: ${foundTargetVariant.secondary_type || 'none'}`);
    console.log(`    Official Artwork: ${foundTargetVariant.official_artwork_url}`);
    console.log(`    Shiny Artwork: ${foundTargetVariant.shiny_artwork_url}`);
    console.log(`    Abilities count: ${foundTargetVariant.abilities.length}`);

    // Insert Base Pokemon into SQLite DB
    insertBasePokemonStmt.run(
      pData.pokemon.id,
      pData.pokemon.name,
      pData.pokemon.number,
      pData.pokemon.height,
      pData.pokemon.weight,
      pData.pokemon.primary_type,
      pData.pokemon.secondary_type,
      pData.pokemon.is_legendary ? 1 : 0,
      pData.pokemon.is_mythical ? 1 : 0,
      pData.pokemon.flavor_text,
      pData.pokemon.sprite_url,
      pData.pokemon.shiny_sprite_url,
      pData.pokemon.official_artwork_url,
      pData.pokemon.shiny_artwork_url
    );

    // Insert into SQLite DB
    const info = insertVariantStmt.run(
      foundTargetVariant.base_pokemon_id,
      foundTargetVariant.variant_name,
      foundTargetVariant.region_label,
      foundTargetVariant.primary_type,
      foundTargetVariant.secondary_type,
      foundTargetVariant.height,
      foundTargetVariant.weight,
      foundTargetVariant.flavor_text,
      foundTargetVariant.stats.hp,
      foundTargetVariant.stats.attack,
      foundTargetVariant.stats.defense,
      foundTargetVariant.stats.sp_attack,
      foundTargetVariant.stats.sp_defense,
      foundTargetVariant.stats.speed,
      foundTargetVariant.sprite_url,
      foundTargetVariant.shiny_sprite_url,
      foundTargetVariant.official_artwork_url,
      foundTargetVariant.shiny_artwork_url
    );

    const variantId = Number(info.lastInsertRowid);
    for (const ab of foundTargetVariant.abilities) {
      insertAbilityStmt.run(variantId, ab.ability_name, ab.effect_text, ab.is_hidden ? 1 : 0);
    }

    // Query back from DB
    const dbVariants = await getVariantsForPokemon(db, tc.id);
    console.log(`  Queried from DB: ${dbVariants.length} variant(s) retrieved`);
    const queriedVar = dbVariants.find((v) => v.regionLabel.toLowerCase() === tc.expectedRegion.toLowerCase());

    if (!queriedVar) {
      throw new Error(`FAILED: Could not retrieve ${tc.expectedRegion} ${tc.name} from DB`);
    }

    if (queriedVar.primaryType !== tc.expectedType) {
      throw new Error(`FAILED: Expected type ${tc.expectedType} for ${tc.expectedRegion} ${tc.name}, got ${queriedVar.primaryType}`);
    }

    console.log(`  ✅ ${tc.expectedRegion} ${tc.name} verified successfully!\n`);
  }

  console.log('🎉 ALL REGIONAL VARIANT DATA LAYER VERIFICATION TESTS PASSED!');
}

runVariantTests().catch((err) => {
  console.error('❌ Variant test failed with error:', err);
  process.exit(1);
});
