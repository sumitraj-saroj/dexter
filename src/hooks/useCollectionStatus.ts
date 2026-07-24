import { useMutation, useQueryClient } from '@tanstack/react-query';
import { SQLiteDatabase } from 'expo-sqlite';
import {
  toggleFavorite,
  toggleShinyOwned,
  toggleAlpha,
  toggleCompetitiveBuild,
} from '../db/queries';

export function useCollectionStatus(db: SQLiteDatabase | null) {
  const queryClient = useQueryClient();

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['pokemonList'] });
    queryClient.invalidateQueries({ queryKey: ['pokemon'] });
    queryClient.invalidateQueries({ queryKey: ['favorites'] });
  };

  const toggleFavoriteMutation = useMutation({
    mutationFn: async (pokemonId: number) => {
      if (!db) throw new Error('Database not initialized');
      return await toggleFavorite(db, pokemonId);
    },
    onSuccess: invalidateAll,
  });

  const toggleShinyOwnedMutation = useMutation({
    mutationFn: async (pokemonId: number) => {
      if (!db) throw new Error('Database not initialized');
      return await toggleShinyOwned(db, pokemonId);
    },
    onSuccess: invalidateAll,
  });

  const toggleAlphaMutation = useMutation({
    mutationFn: async (pokemonId: number) => {
      if (!db) throw new Error('Database not initialized');
      return await toggleAlpha(db, pokemonId);
    },
    onSuccess: invalidateAll,
  });

  const toggleCompetitiveBuildMutation = useMutation({
    mutationFn: async (pokemonId: number) => {
      if (!db) throw new Error('Database not initialized');
      return await toggleCompetitiveBuild(db, pokemonId);
    },
    onSuccess: invalidateAll,
  });

  return {
    toggleFavorite: toggleFavoriteMutation.mutateAsync,
    toggleShinyOwned: toggleShinyOwnedMutation.mutateAsync,
    toggleAlpha: toggleAlphaMutation.mutateAsync,
    toggleCompetitiveBuild: toggleCompetitiveBuildMutation.mutateAsync,
  };
}
