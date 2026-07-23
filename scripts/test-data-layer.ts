import Database from 'better-sqlite3';
import { fetchSinglePokemon, fetchGenerations } from '../src/api/pokeapi';
import { CREATE_TABLES_SQL } from '../src/db/schema';
import { syncNationalPokemon } from '../src/db/sync';
import {
  getAllPokemon,
  getPokemonById,
  searchPokemon,
  filterPokemon,
  toggleFavorite,
  getFavorites,
  addToTeam,
  getTeam,
  getEvolutionChainForPokemon,
  getGenerations,
} from '../src/db/queries';

async function runTests() {
  console.log('🧪 Starting National Pokédex Data Layer Verification...\n');

  // Test 1: PokeAPI Single Pokemon Fetch across generations
  console.log('1️⃣ Fetching Single Pokémon #6 (Charizard - Gen 1) and #448 (Lucario - Gen 4)...');
  const charizardData = await fetchSinglePokemon(6);
  const lucarioData = await fetchSinglePokemon(448);

  console.log('  Charizard:', charizardData.pokemon.name, charizardData.pokemon.number, charizardData.pokemon.primary_type);
  console.log('  Lucario:', lucarioData.pokemon.name, lucarioData.pokemon.number, lucarioData.pokemon.primary_type, lucarioData.pokemon.secondary_type);

  if (charizardData.pokemon.name !== 'charizard' || lucarioData.pokemon.name !== 'lucario') {
    throw new Error('FAILED: Expected Charizard and Lucario names to match');
  }
  console.log('  ✅ Single Pokémon cross-generation fetch test passed!\n');

  // Test 2: In-Memory SQLite Sync & Queries
  console.log('2️⃣ Initializing SQLite database and schema...');
  const db = new Database(':memory:');
  db.exec(CREATE_TABLES_SQL);

  console.log('3️⃣ Testing Generation Fetch & DB Insertion...');
  const gens = await fetchGenerations();
  console.log(`  Fetched ${gens.length} generations:`);
  gens.forEach((g) => console.log(`   - ${g.name} (${g.regionName}): #${g.startId} to #${g.endId}`));

  if (gens.length === 0) {
    throw new Error('FAILED: Expected at least 1 generation');
  }

  // Insert mock test species for fast unit test run (Gen 1 + Gen 4 + Eevee line + Lucario line)
  const testIds = [1, 4, 6, 15, 25, 133, 134, 135, 136, 150, 447, 448, 700];
  console.log(`\n4️⃣ Inserting mock species batch [${testIds.join(', ')}] into test SQLite DB...`);

  const insertGen = db.prepare(
    `INSERT INTO generations (id, name, region_name, start_id, end_id) VALUES (?, ?, ?, ?, ?)`
  );
  for (const g of gens) {
    insertGen.run(g.id, g.name, g.regionName, g.startId, g.endId);
  }

  const insertPokemon = db.prepare(
    `INSERT INTO pokemon (id, name, number, height, weight, primary_type, secondary_type, is_legendary, is_mythical, flavor_text, sprite_url, shiny_sprite_url, official_artwork_url, shiny_artwork_url)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const insertEvo = db.prepare(
    `INSERT INTO evolution_chain (pokemon_id, evolves_from_id, evolution_trigger) VALUES (?, ?, ?)`
  );

  for (const id of testIds) {
    const pData = await fetchSinglePokemon(id);
    insertPokemon.run(
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
    if (pData.evolution.evolves_from_id) {
      insertEvo.run(pData.pokemon.id, pData.evolution.evolves_from_id, pData.evolution.evolution_trigger);
    }
  }

  console.log('  ✅ Test DB populated successfully!\n');

  // Test 5: Multi-branch Evolution Chain test (Eevee family)
  console.log('5️⃣ Testing Multi-Branch Evolution Chain for Eevee (#133)...');
  const eeveeFamily = await getEvolutionChainForPokemon(db, 133);
  console.log(`  Eevee Family Members (${eeveeFamily.length}):`, eeveeFamily.map((f) => `${f.name} (#${f.id})`).join(', '));

  if (eeveeFamily.length < 5) {
    throw new Error('FAILED: Expected Eevee family to include multi-branch evolutions');
  }
  console.log('  ✅ Multi-branch evolution chain test passed!\n');

  // Test 6: Generation Filtering Test
  console.log('6️⃣ Testing Generation Filter (Gen 4)...');
  const gen4Filter = await filterPokemon(db, { generations: [4] });
  console.log(`  Gen 4 filter result:`, gen4Filter.map((p) => p.name).join(', '));
  if (!gen4Filter.some((p) => p.name === 'lucario')) {
    throw new Error('FAILED: Expected Lucario in Gen 4 filter results');
  }
  console.log('  ✅ Generation filter test passed!\n');

  console.log('🎉 ALL NATIONAL POKÉDEX DATA LAYER TESTS PASSED SUCCESSFULLY!');
}

runTests().catch((err) => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
