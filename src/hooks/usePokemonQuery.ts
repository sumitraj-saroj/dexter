import { useQuery } from '@tanstack/react-query';
import { SQLiteDatabase } from 'expo-sqlite';
import { filterPokemon } from '../db/queries';
import { FilterOptions, Pokemon } from '../types';

export function usePokemonQuery(db: SQLiteDatabase, filters: FilterOptions) {
  return useQuery<Pokemon[]>({
    queryKey: [
      'pokemonList',
      {
        searchQuery: filters.searchQuery || '',
        types: (filters.types || []).slice().sort(),
        generations: (filters.generations || []).slice().sort(),
        legendaryOnly: Boolean(filters.legendaryOnly),
        ability: filters.ability || '',
      },
    ],
    queryFn: async () => {
      return await filterPokemon(db, filters);
    },
    enabled: Boolean(db),
  });
}
