import { useMutation, useQueryClient } from '@tanstack/react-query';
import { SQLiteDatabase } from 'expo-sqlite';
import {
  toggleFavorite,
  toggleShinyOwned,
  toggleAlpha,
  toggleCompetitiveBuild,
  toggleAshOwned,
} from '../db/queries';

import { useAchievement } from '../context/AchievementContext';

export function useCollectionStatus(db: SQLiteDatabase | null) {
  const queryClient = useQueryClient();
  const { checkAndNotifyAchievements } = useAchievement();

  const invalidateAll = async () => {
    queryClient.invalidateQueries({ queryKey: ['pokemonList'] });
    queryClient.invalidateQueries({ queryKey: ['pokemon'] });
    queryClient.invalidateQueries({ queryKey: ['favorites'] });
    queryClient.invalidateQueries({ queryKey: ['achievementsSummary'] });
    await checkAndNotifyAchievements();
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

  const toggleAshOwnedMutation = useMutation({
    mutationFn: async (pokemonId: number) => {
      if (!db) throw new Error('Database not initialized');
      return await toggleAshOwned(db, pokemonId);
    },
    onSuccess: invalidateAll,
  });

  return {
    toggleFavorite: toggleFavoriteMutation.mutateAsync,
    toggleShinyOwned: toggleShinyOwnedMutation.mutateAsync,
    toggleAlpha: toggleAlphaMutation.mutateAsync,
    toggleCompetitiveBuild: toggleCompetitiveBuildMutation.mutateAsync,
    toggleAshOwned: toggleAshOwnedMutation.mutateAsync,
  };
}
