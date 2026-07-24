import { useQuery } from '@tanstack/react-query';
import { getPokemonOfTheDay, recordPokemonSeen } from '../db/queries';
import { Pokemon } from '../types';

export function usePokemonOfTheDay(db: any, overrideDate?: string) {
  return useQuery<Pokemon | null>({
    queryKey: ['pokemonOfTheDay', overrideDate || 'today'],
    queryFn: async () => {
      if (!db) return null;
      const pokemon = await getPokemonOfTheDay(db, overrideDate);
      if (pokemon) {
        recordPokemonSeen(db, pokemon.id).catch(() => {});
      }
      return pokemon;
    },
    enabled: Boolean(db),
  });
}

