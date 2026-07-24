/**
 * Canonical list of National Pokedex IDs of Pokémon owned by Ash Ketchum
 * across his journey (Kanto, Orange Islands, Johto, Hoenn, Battle Frontier,
 * Sinnoh, Unova, Kalos, Alola, and Journeys).
 */
export const ASH_POKEMON_IDS: number[] = [
  // Gen 1 / Kanto & Orange Islands
  1, 4, 5, 6, 7, 10, 11, 12, 15, 17, 18, 20, 25, 57, 89, 94, 98, 99, 122, 128, 131, 143, 149,
  // Gen 2 / Johto
  152, 153, 155, 156, 158, 164, 207, 214, 231, 232, 246,
  // Gen 3 / Hoenn & Battle Frontier
  252, 253, 254, 276, 277, 324, 341, 361, 362,
  // Gen 4 / Sinnoh
  387, 388, 389, 390, 391, 392, 396, 397, 398, 418, 424, 443, 448, 472,
  // Gen 5 / Unova
  495, 498, 499, 501, 519, 520, 521, 524, 525, 536, 540, 541, 542, 552, 553, 559,
  // Gen 6 / Kalos
  656, 657, 658, 661, 662, 663, 701, 704, 705, 706, 714, 715,
  // Gen 7 / Alola
  722, 725, 726, 727, 744, 745, 791, 803, 804, 808, 809,
  // Gen 8 / Journeys
  865, 882,
];

export const ASH_POKEMON_ID_SET = new Set<number>(ASH_POKEMON_IDS);
