import { PokemonStat } from '../types';
import { getNatureByName, StatKey } from '../data/natures';

export interface EVs {
  hp: number;
  attack: number;
  defense: number;
  specialAttack: number;
  specialDefense: number;
  speed: number;
}

export interface IVs {
  hp: number;
  attack: number;
  defense: number;
  specialAttack: number;
  specialDefense: number;
  speed: number;
}

export function calculateHpStat(baseHp: number, iv: number, ev: number, level: number = 100): number {
  if (baseHp === 1) return 1; // Shedinja special case
  return Math.floor(((2 * baseHp + iv + Math.floor(ev / 4)) * level) / 100) + level + 10;
}

export function calculateOtherStat(
  base: number,
  iv: number,
  ev: number,
  statKey: StatKey,
  natureName: string,
  level: number = 100
): number {
  const nature = getNatureByName(natureName);
  let multiplier = 1.0;
  if (nature.increasedStat === statKey) multiplier = 1.1;
  else if (nature.decreasedStat === statKey) multiplier = 0.9;

  const raw = Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100) + 5;
  return Math.floor(raw * multiplier);
}

export function calculateAllStats(
  baseStats: PokemonStat,
  evs: EVs,
  ivs: IVs,
  natureName: string,
  level: number = 100
): PokemonStat {
  return {
    hp: calculateHpStat(baseStats.hp, ivs.hp, evs.hp, level),
    attack: calculateOtherStat(baseStats.attack, ivs.attack, evs.attack, 'attack', natureName, level),
    defense: calculateOtherStat(baseStats.defense, ivs.defense, evs.defense, 'defense', natureName, level),
    specialAttack: calculateOtherStat(
      baseStats.specialAttack,
      ivs.specialAttack,
      evs.specialAttack,
      'specialAttack',
      natureName,
      level
    ),
    specialDefense: calculateOtherStat(
      baseStats.specialDefense,
      ivs.specialDefense,
      evs.specialDefense,
      'specialDefense',
      natureName,
      level
    ),
    speed: calculateOtherStat(baseStats.speed, ivs.speed, evs.speed, 'speed', natureName, level),
  };
}
