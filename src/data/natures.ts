export type StatKey = 'hp' | 'attack' | 'defense' | 'specialAttack' | 'specialDefense' | 'speed';

export interface Nature {
  name: string;
  increasedStat: StatKey | null;
  decreasedStat: StatKey | null;
}

export const NATURES: Nature[] = [
  { name: 'Hardy', increasedStat: null, decreasedStat: null },
  { name: 'Lonely', increasedStat: 'attack', decreasedStat: 'defense' },
  { name: 'Brave', increasedStat: 'attack', decreasedStat: 'speed' },
  { name: 'Adamant', increasedStat: 'attack', decreasedStat: 'specialAttack' },
  { name: 'Naughty', increasedStat: 'attack', decreasedStat: 'specialDefense' },
  { name: 'Bold', increasedStat: 'defense', decreasedStat: 'attack' },
  { name: 'Docile', increasedStat: null, decreasedStat: null },
  { name: 'Relaxed', increasedStat: 'defense', decreasedStat: 'speed' },
  { name: 'Impish', increasedStat: 'defense', decreasedStat: 'specialAttack' },
  { name: 'Lax', increasedStat: 'defense', decreasedStat: 'specialDefense' },
  { name: 'Timid', increasedStat: 'speed', decreasedStat: 'attack' },
  { name: 'Hasty', increasedStat: 'speed', decreasedStat: 'defense' },
  { name: 'Serious', increasedStat: null, decreasedStat: null },
  { name: 'Jolly', increasedStat: 'speed', decreasedStat: 'specialAttack' },
  { name: 'Naive', increasedStat: 'speed', decreasedStat: 'specialDefense' },
  { name: 'Modest', increasedStat: 'specialAttack', decreasedStat: 'attack' },
  { name: 'Mild', increasedStat: 'specialAttack', decreasedStat: 'defense' },
  { name: 'Quiet', increasedStat: 'specialAttack', decreasedStat: 'speed' },
  { name: 'Bashful', increasedStat: null, decreasedStat: null },
  { name: 'Rash', increasedStat: 'specialAttack', decreasedStat: 'specialDefense' },
  { name: 'Calm', increasedStat: 'specialDefense', decreasedStat: 'attack' },
  { name: 'Gentle', increasedStat: 'specialDefense', decreasedStat: 'defense' },
  { name: 'Sassy', increasedStat: 'specialDefense', decreasedStat: 'speed' },
  { name: 'Careful', increasedStat: 'specialDefense', decreasedStat: 'specialAttack' },
  { name: 'Quirky', increasedStat: null, decreasedStat: null },
];

export function getNatureByName(name: string): Nature {
  const match = NATURES.find((n) => n.name.toLowerCase() === name.toLowerCase());
  return match || NATURES[0]; // Default to Hardy
}
