import Database from 'better-sqlite3';
import { CREATE_TABLES_SQL } from '../src/db/schema';
import { getPokemonOfTheDay, getUserSetting } from '../src/db/queries';

async function runPokemonOfTheDayTests() {
  console.log('🧪 Testing Pokémon of the Day Logic...\n');

  const db = new Database(':memory:');
  db.exec(CREATE_TABLES_SQL);

  // Insert mock Pokémon
  const insertPokemon = db.prepare(
    `INSERT INTO pokemon (id, name, number, primary_type, flavor_text) VALUES (?, ?, ?, ?, ?)`
  );

  insertPokemon.run(1, 'bulbasaur', '0001', 'grass', 'A strange seed was planted on its back at birth.');
  insertPokemon.run(4, 'charmander', '0004', 'fire', 'The flame on its tail indicates Charmander\'s life force.');
  insertPokemon.run(7, 'squirtle', '0007', 'water', 'After birth, its back swells and hardens into a shell.');
  insertPokemon.run(25, 'pikachu', '0025', 'electric', 'When several of these Pokémon gather, their electricity could build.');
  insertPokemon.run(150, 'mewtwo', '0150', 'psychic', 'It was created by a scientist after years of horrific gene splicing.');

  console.log('1️⃣ Testing Deterministic Selection for Day 1 (2026-07-23)...');
  const day1FirstCall = await getPokemonOfTheDay(db, '2026-07-23');
  console.log(`  First call returned: ${day1FirstCall?.name} (#${day1FirstCall?.number})`);

  const day1SecondCall = await getPokemonOfTheDay(db, '2026-07-23');
  console.log(`  Second call returned: ${day1SecondCall?.name} (#${day1SecondCall?.number})`);

  if (!day1FirstCall || !day1SecondCall || day1FirstCall.id !== day1SecondCall.id) {
    throw new Error('FAILED: Expected same Pokémon for the same date!');
  }
  console.log('  ✅ Determinism & persistence on same day passed!\n');

  // Verify stored settings in DB
  console.log('2️⃣ Verifying stored date and ID in user_settings table...');
  const storedDate = await getUserSetting(db, 'pokemon_of_the_day_date');
  const storedId = await getUserSetting(db, 'pokemon_of_the_day_id');
  console.log(`  Stored Date: "${storedDate}", Stored ID: "${storedId}"`);

  if (storedDate !== '2026-07-23' || storedId !== day1FirstCall.id.toString()) {
    throw new Error('FAILED: Stored user_settings mismatch!');
  }
  console.log('  ✅ user_settings table persistence passed!\n');

  // Test Day 2 date change
  console.log('3️⃣ Testing Date Change (2026-07-24)...');
  const day2Call = await getPokemonOfTheDay(db, '2026-07-24');
  console.log(`  Day 2 call returned: ${day2Call?.name} (#${day2Call?.number})`);

  const newStoredDate = await getUserSetting(db, 'pokemon_of_the_day_date');
  const newStoredId = await getUserSetting(db, 'pokemon_of_the_day_id');
  console.log(`  New Stored Date: "${newStoredDate}", New Stored ID: "${newStoredId}"`);

  if (newStoredDate !== '2026-07-24' || newStoredId !== day2Call?.id.toString()) {
    throw new Error('FAILED: Day 2 storage update failed!');
  }
  console.log('  ✅ Date change & new pick generation passed!\n');

  console.log('4️⃣ Verifying trivia fact flavor text presence...');
  console.log(`  Flavor text: "${day2Call?.flavorText}"`);
  if (!day2Call?.flavorText) {
    throw new Error('FAILED: Expected flavor text to be populated!');
  }
  console.log('  ✅ Trivia flavor text verified!\n');

  console.log('🎉 ALL POKÉMON OF THE DAY TESTS PASSED SUCCESSFULLY!');
}

runPokemonOfTheDayTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
