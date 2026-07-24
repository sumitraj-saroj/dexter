import Database from 'better-sqlite3';
import { fetchSinglePokemon, getFlaggedCosmeticSpecies } from '../src/api/pokeapi';
import { CREATE_TABLES_SQL } from '../src/db/schema';
import { getSpecialFormsForPokemon } from '../src/db/queries';

async function runSpecialFormTests() {
  console.log('🧪 Testing Special Battle & Alternate Forms Data Layer...\n');

  const db = new Database(':memory:');
  db.exec(CREATE_TABLES_SQL);

  const insertBasePokemonStmt = db.prepare(
    `INSERT INTO pokemon (id, name, number, height, weight, primary_type, secondary_type, is_legendary, is_mythical, flavor_text, sprite_url, shiny_sprite_url, official_artwork_url, shiny_artwork_url)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  const insertSpecialFormStmt = db.prepare(
    `INSERT INTO pokemon_special_forms (base_pokemon_id, form_type, form_name, form_label, primary_type, secondary_type, height, weight, flavor_text, hp, attack, defense, sp_attack, sp_defense, speed, sprite_url, shiny_sprite_url, official_artwork_url, shiny_artwork_url)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  const insertAbilityStmt = db.prepare(
    `INSERT INTO pokemon_special_form_abilities (form_id, ability_name, effect_text, is_hidden) VALUES (?, ?, ?, ?)`
  );

  // Test Case 1: Charizard (Mega X, Mega Y, Gigantamax)
  console.log('Checking Charizard (#6)...');
  const charizardData = await fetchSinglePokemon(6);
  console.log(`  Base Form: ${charizardData.pokemon.name} - Types: ${charizardData.pokemon.primary_type}/${charizardData.pokemon.secondary_type}`);
  console.log(`  Special forms fetched: ${charizardData.specialForms?.length || 0}`);

  if (!charizardData.specialForms || charizardData.specialForms.length < 3) {
    throw new Error(`FAILED: Expected Charizard to have at least 3 special forms (Mega X, Mega Y, Gmax). Found ${charizardData.specialForms?.length}`);
  }

  const megaX = charizardData.specialForms.find(f => f.form_type === 'mega_x');
  const megaY = charizardData.specialForms.find(f => f.form_type === 'mega_y');
  const gmaxCharizard = charizardData.specialForms.find(f => f.form_type === 'gmax');

  if (!megaX || !megaY || !gmaxCharizard) {
    throw new Error('FAILED: Charizard missing Mega X, Mega Y, or Gmax form.');
  }

  console.log(`  Found Mega X: ${megaX.form_label} (${megaX.primary_type}/${megaX.secondary_type}) - Atk: ${megaX.stats.attack}`);
  console.log(`  Found Mega Y: ${megaY.form_label} (${megaY.primary_type}/${megaY.secondary_type}) - SpAtk: ${megaY.stats.sp_attack}`);
  console.log(`  Found Gigantamax: ${gmaxCharizard.form_label} (${gmaxCharizard.primary_type}/${gmaxCharizard.secondary_type})`);

  if (megaX.secondary_type !== 'dragon') {
    throw new Error(`FAILED: Mega Charizard X secondary type should be dragon, got ${megaX.secondary_type}`);
  }

  // Insert into test DB
  insertBasePokemonStmt.run(
    charizardData.pokemon.id,
    charizardData.pokemon.name,
    charizardData.pokemon.number,
    charizardData.pokemon.height,
    charizardData.pokemon.weight,
    charizardData.pokemon.primary_type,
    charizardData.pokemon.secondary_type,
    charizardData.pokemon.is_legendary ? 1 : 0,
    charizardData.pokemon.is_mythical ? 1 : 0,
    charizardData.pokemon.flavor_text,
    charizardData.pokemon.sprite_url,
    charizardData.pokemon.shiny_sprite_url,
    charizardData.pokemon.official_artwork_url,
    charizardData.pokemon.shiny_artwork_url
  );

  for (const sf of charizardData.specialForms) {
    const info = insertSpecialFormStmt.run(
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
    const formId = Number(info.lastInsertRowid);
    for (const ab of sf.abilities) {
      insertAbilityStmt.run(formId, ab.ability_name, ab.effect_text, ab.is_hidden ? 1 : 0);
    }
  }

  const dbCharizardForms = await getSpecialFormsForPokemon(db, 6);
  console.log(`  Queried from DB: ${dbCharizardForms.length} special form(s) retrieved`);
  if (dbCharizardForms.length !== charizardData.specialForms.length) {
    throw new Error(`FAILED: DB query returned ${dbCharizardForms.length} forms, expected ${charizardData.specialForms.length}`);
  }
  console.log('  ✅ Charizard forms verified successfully!\n');

  // Test Case 2: Deoxys (#386)
  console.log('Checking Deoxys (#386)...');
  const deoxysData = await fetchSinglePokemon(386);
  console.log(`  Base Form: ${deoxysData.pokemon.name}`);
  console.log(`  Special forms fetched: ${deoxysData.specialForms?.length || 0}`);

  if (!deoxysData.specialForms || deoxysData.specialForms.length < 3) {
    throw new Error(`FAILED: Expected Deoxys to have at least 3 alternate formes (Attack, Defense, Speed).`);
  }
  for (const sf of deoxysData.specialForms) {
    console.log(`  Found Forme: ${sf.form_label} - Atk: ${sf.stats.attack}, Def: ${sf.stats.defense}, Spd: ${sf.stats.speed}`);
  }
  console.log('  ✅ Deoxys formes verified successfully!\n');

  // Test Case 3: Rotom (#479)
  console.log('Checking Rotom (#479)...');
  const rotomData = await fetchSinglePokemon(479);
  console.log(`  Base Form: ${rotomData.pokemon.name} - Types: ${rotomData.pokemon.primary_type}/${rotomData.pokemon.secondary_type}`);
  console.log(`  Special forms fetched: ${rotomData.specialForms?.length || 0}`);

  if (!rotomData.specialForms || rotomData.specialForms.length < 5) {
    throw new Error(`FAILED: Expected Rotom to have 5 appliance forms (Heat, Wash, Frost, Fan, Mow).`);
  }
  const washRotom = rotomData.specialForms.find(sf => sf.form_label.includes('Wash'));
  if (!washRotom || washRotom.secondary_type !== 'water') {
    throw new Error(`FAILED: Expected Wash Rotom to have secondary type water, got ${washRotom?.secondary_type}`);
  }
  console.log(`  Wash Rotom verified with typing: ${washRotom.primary_type}/${washRotom.secondary_type}`);
  console.log('  ✅ Rotom appliances verified successfully!\n');

  // Test Case 4: Cosmetic Variant Flag Verification
  console.log('Checking Cosmetic Variant Flags for Minior (#774)...');
  await fetchSinglePokemon(774);

  const flagged = getFlaggedCosmeticSpecies();
  console.log(`  Total cosmetic variants flagged during sync: ${flagged.length}`);
  console.log(`  Sample flagged items:`, flagged.slice(0, 8));

  if (flagged.length === 0) {
    throw new Error('FAILED: Expected Minior cosmetic varieties (color cores) to be flagged during sync.');
  }

  console.log('  ✅ Cosmetic variant filtering verified successfully!\n');
  console.log('🎉 ALL SPECIAL FORMS DATA LAYER VERIFICATION TESTS PASSED!');
}

runSpecialFormTests().catch((err) => {
  console.error('❌ Special forms test failed with error:', err);
  process.exit(1);
});
