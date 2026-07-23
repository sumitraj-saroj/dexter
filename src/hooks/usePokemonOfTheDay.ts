import { useQuery } from '@tanstack/react-query';
import { getPokemonOfTheDay } from '../db/queries';
import { Pokemon } from '../types';

export function usePokemonOfTheDay(db: any, overrideDate?: string) {
  return useQuery<Pokemon | null>({
    queryKey: ['pokemonOfTheDay', overrideDate || 'today'],
    queryFn: async () => {
      if (!db) return null;
      return await getPokemonOfTheDay(db, overrideDate);
    },
    enabled: Boolean(db),
  });
}
