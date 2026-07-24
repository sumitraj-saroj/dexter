import Database from 'better-sqlite3';
import { fetchSinglePokemon } from '../src/api/pokeapi';
import { CREATE_TABLES_SQL } from '../src/db/schema';
import {
  getPokemonById,
  getBreedingInfo,
  getBreedingCompatible,
  ensurePokemonBreedingData,
} from '../src/db/queries';

async function runBreedingTests() {
  console.log('🧪 Starting Breeding Information & Compatibility Verification...\n');

  // Initialize SQLite test database with schema
  const db = new Database(':memory:');
  db.exec(CREATE_TABLES_SQL);

  const testIds = [1, 4, 7, 81, 132, 150]; // Bulbasaur, Charmander, Squirtle, Magnemite, Ditto, Mewtwo

  console.log(`1️⃣ Fetching species and populating test DB with Pokémon #${testIds.join(', ')}...`);

  const insertPokemon = db.prepare(
    `INSERT INTO pokemon (id, name, number, height, weight, primary_type, secondary_type, is_legendary, is_mythical, flavor_text, sprite_url, shiny_sprite_url, official_artwork_url, shiny_artwork_url, egg_groups, hatch_counter, gender_rate)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  const insertMove = db.prepare(
    `INSERT INTO pokemon_moves (pokemon_id, move_name, level_learned, learn_method)
     VALUES (?, ?, ?, ?)`
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
      pData.pokemon.shiny_artwork_url,
      pData.pokemon.egg_groups ? pData.pokemon.egg_groups.join(', ') : null,
      pData.pokemon.hatch_counter ?? null,
      pData.pokemon.gender_rate ?? null
    );

    for (const mv of pData.moves) {
      insertMove.run(pData.pokemon.id, mv.move_name, mv.level_learned, mv.learn_method);
    }
  }

  console.log('  ✅ DB populated successfully!\n');

  // Test 1: Normal Breeding Profile - Bulbasaur (#1)
  console.log('2️⃣ Testing Normal Breeding Profile for Bulbasaur (#1)...');
  const bulbaInfo = await getBreedingInfo(db, 1);
  if (!bulbaInfo) throw new Error('FAILED: Expected breeding info for Bulbasaur');

  console.log('  Bulbasaur Egg Groups:', bulbaInfo.eggGroups);
  console.log('  Bulbasaur Hatch Steps:', bulbaInfo.hatchSteps, '(counter:', bulbaInfo.hatchCounter, ')');
  console.log('  Bulbasaur Gender Ratio:', `${bulbaInfo.malePercentage}% M / ${bulbaInfo.femalePercentage}% F`);
  console.log('  Bulbasaur Egg Moves count:', bulbaInfo.eggMoves.length);
  console.log('  Bulbasaur Compatible partners:', bulbaInfo.compatiblePokemon.map((p) => p.name));

  if (!bulbaInfo.canBreed) throw new Error('FAILED: Bulbasaur should be able to breed');
  if (!bulbaInfo.eggGroups.includes('Monster') || !bulbaInfo.eggGroups.includes('Grass')) {
    throw new Error(`FAILED: Expected Bulbasaur egg groups Monster and Grass, got ${bulbaInfo.eggGroups.join(', ')}`);
  }
  if (bulbaInfo.hatchSteps !== (20 + 1) * 255) {
    throw new Error(`FAILED: Expected hatch steps 5355, got ${bulbaInfo.hatchSteps}`);
  }
  if (bulbaInfo.genderRate !== 1 || bulbaInfo.malePercentage !== 87.5 || bulbaInfo.femalePercentage !== 12.5) {
    throw new Error(`FAILED: Incorrect gender calculation for Bulbasaur`);
  }
  if (bulbaInfo.eggMoves.length === 0) {
    throw new Error('FAILED: Expected Bulbasaur to have egg moves');
  }
  if (!bulbaInfo.compatiblePokemon.some((p) => p.name === 'charmander') || !bulbaInfo.compatiblePokemon.some((p) => p.name === 'ditto')) {
    throw new Error('FAILED: Expected Charmander and Ditto in Bulbasaur compatible partners');
  }
  console.log('  ✅ Normal breeding profile test passed!\n');

  // Test 2: Genderless Pokemon - Magnemite (#81)
  console.log('3️⃣ Testing Genderless Pokémon Breeding Profile for Magnemite (#81)...');
  const magInfo = await getBreedingInfo(db, 81);
  if (!magInfo) throw new Error('FAILED: Expected breeding info for Magnemite');

  console.log('  Magnemite Egg Groups:', magInfo.eggGroups);
  console.log('  Magnemite Genderless?:', magInfo.isGenderless);
  console.log('  Magnemite Compatible partners:', magInfo.compatiblePokemon.map((p) => p.name));

  if (!magInfo.isGenderless || magInfo.genderRate !== -1) {
    throw new Error('FAILED: Magnemite should be genderless (genderRate = -1)');
  }
  if (magInfo.compatiblePokemon.length !== 1 || magInfo.compatiblePokemon[0].name.toLowerCase() !== 'ditto') {
    throw new Error(`FAILED: Genderless Pokemon should only breed with Ditto, got ${magInfo.compatiblePokemon.map((p) => p.name).join(', ')}`);
  }
  console.log('  ✅ Genderless Pokémon breeding test passed!\n');

  // Test 3: Legendary / Undiscovered Pokemon - Mewtwo (#150)
  console.log('4️⃣ Testing Undiscovered / Legendary Pokémon for Mewtwo (#150)...');
  const mewtwoInfo = await getBreedingInfo(db, 150);
  if (!mewtwoInfo) throw new Error('FAILED: Expected breeding info for Mewtwo');

  console.log('  Mewtwo Egg Groups:', mewtwoInfo.eggGroups);
  console.log('  Mewtwo Can Breed?:', mewtwoInfo.canBreed);
  console.log('  Mewtwo Reason:', mewtwoInfo.reason);
  console.log('  Mewtwo Compatible partners count:', mewtwoInfo.compatiblePokemon.length);

  if (mewtwoInfo.canBreed) {
    throw new Error('FAILED: Mewtwo (Undiscovered egg group) should NOT be able to breed');
  }
  if (mewtwoInfo.compatiblePokemon.length !== 0) {
    throw new Error('FAILED: Mewtwo compatible list should be empty');
  }
  console.log('  ✅ Undiscovered / Legendary Pokémon test passed!\n');

  // Test 4: Ditto Breeding Profile - Ditto (#132)
  console.log('5️⃣ Testing Ditto (#132) Breeding Profile...');
  const dittoInfo = await getBreedingInfo(db, 132);
  if (!dittoInfo) throw new Error('FAILED: Expected breeding info for Ditto');

  console.log('  Ditto Compatible partners:', dittoInfo.compatiblePokemon.map((p) => p.name));
  if (!dittoInfo.compatiblePokemon.some((p) => p.name === 'bulbasaur') || !dittoInfo.compatiblePokemon.some((p) => p.name === 'magnemite')) {
    throw new Error('FAILED: Ditto should breed with Bulbasaur and Magnemite');
  }
  if (dittoInfo.compatiblePokemon.some((p) => p.name === 'mewtwo') || dittoInfo.compatiblePokemon.some((p) => p.name === 'ditto')) {
    throw new Error('FAILED: Ditto cannot breed with Mewtwo or another Ditto');
  }
  console.log('  ✅ Ditto breeding test passed!\n');

  console.log('🎉 ALL BREEDING INFORMATION AND COMPATIBILITY TESTS PASSED!');
}

runBreedingTests().catch((err) => {
  console.error('❌ Breeding test failed:', err);
  process.exit(1);
});
