import { useQuery } from '@tanstack/react-query';
import { SQLiteDatabase } from 'expo-sqlite';
import { filterPokemon } from '../db/queries';
import { FilterOptions, Pokemon } from '../types';

export function usePokemonQuery(db: SQLiteDatabase, filters: FilterOptions) {
  const typesKey = filters.types?.length ? filters.types.join(',') : '';
  const gensKey = filters.generations?.length ? filters.generations.join(',') : '';
  const colKey = filters.collectionFilters?.length ? filters.collectionFilters.join(',') : '';

  return useQuery<Pokemon[]>({
    queryKey: [
      'pokemonList',
      {
        searchQuery: filters.searchQuery || '',
        types: typesKey,
        generations: gensKey,
        legendaryOnly: Boolean(filters.legendaryOnly),
        ability: filters.ability || '',
        collectionFilters: colKey,
        caughtOnly: Boolean(filters.caughtOnly),
        notCaughtOnly: Boolean(filters.notCaughtOnly),
        favoritesOnly: Boolean(filters.favoritesOnly),
        shinyOwnedOnly: Boolean(filters.shinyOwnedOnly),
        alphaOnly: Boolean(filters.alphaOnly),
        hasCompetitiveBuildOnly: Boolean(filters.hasCompetitiveBuildOnly),
      },
    ],
    queryFn: async () => {
      return await filterPokemon(db, filters);
    },
    enabled: Boolean(db),
    staleTime: 5 * 60 * 1000, // 5 minutes fresh in cache
    gcTime: 15 * 60 * 1000,    // Keep unused query data for 15 minutes
  });
}
