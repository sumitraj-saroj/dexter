import React, { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SQLiteDatabase } from 'expo-sqlite';
import {
  getTrainerProfile,
  updateTrainerProfile,
  getPokedexCompletionStats,
  getFavoriteType,
  togglePokemonCaught,
  recordPokemonSeen,
} from '../db/queries';
import { TrainerProfile, PokemonType } from '../types';
import { useAchievement } from '../context/AchievementContext';

export function useTrainerProfile(db: SQLiteDatabase | null) {
  const queryClient = useQueryClient();
  const { checkAndNotifyAchievements } = useAchievement();

  const profileQuery = useQuery<TrainerProfile>({
    queryKey: ['trainerProfile'],
    queryFn: async () => {
      if (!db) throw new Error('Database not initialized');
      return await getTrainerProfile(db);
    },
    enabled: Boolean(db),
    staleTime: 5 * 60 * 1000,
  });

  const completionStatsQuery = useQuery<{
    seenCount: number;
    caughtCount: number;
    totalCount: number;
  }>({
    queryKey: ['completionStats'],
    queryFn: async () => {
      if (!db) throw new Error('Database not initialized');
      return await getPokedexCompletionStats(db);
    },
    enabled: Boolean(db),
    staleTime: 5 * 60 * 1000,
  });

  const favoriteTypeQuery = useQuery<PokemonType | null>({
    queryKey: ['favoriteType'],
    queryFn: async () => {
      if (!db) throw new Error('Database not initialized');
      return await getFavoriteType(db);
    },
    enabled: Boolean(db),
    staleTime: 5 * 60 * 1000,
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (updates: { name?: string; avatarId?: string }) => {
      if (!db) throw new Error('Database not initialized');
      return await updateTrainerProfile(db, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainerProfile'] });
    },
  });

  const toggleCaughtMutation = useMutation({
    mutationFn: async (pokemonId: number) => {
      if (!db) throw new Error('Database not initialized');
      return await togglePokemonCaught(db, pokemonId);
    },
    onSuccess: async (res) => {
      queryClient.invalidateQueries({ queryKey: ['trainerProfile'] });
      queryClient.invalidateQueries({ queryKey: ['completionStats'] });
      queryClient.invalidateQueries({ queryKey: ['favoriteType'] });
      queryClient.invalidateQueries({ queryKey: ['pokemonList'] });
      queryClient.invalidateQueries({ queryKey: ['pokemon'] });
      queryClient.invalidateQueries({ queryKey: ['achievementsSummary'] });
      if (res?.isCaught) {
        await checkAndNotifyAchievements();
      }
    },
  });

  const recordSeenMutation = useMutation({
    mutationFn: async (pokemonId: number) => {
      if (!db) throw new Error('Database not initialized');
      return await recordPokemonSeen(db, pokemonId);
    },
    onSuccess: (res) => {
      if (res.newlySeen) {
        queryClient.invalidateQueries({ queryKey: ['trainerProfile'] });
        queryClient.invalidateQueries({ queryKey: ['completionStats'] });
        queryClient.invalidateQueries({ queryKey: ['pokemonList'] });
        queryClient.invalidateQueries({ queryKey: ['pokemon'] });
      }
    },
  });

  return useMemo(
    () => ({
      profile: profileQuery.data,
      isLoading: profileQuery.isLoading,
      isError: profileQuery.isError,
      completionStats: completionStatsQuery.data,
      favoriteType: favoriteTypeQuery.data,
      updateProfile: updateProfileMutation.mutateAsync,
      toggleCaught: toggleCaughtMutation.mutateAsync,
      recordSeen: recordSeenMutation.mutateAsync,
      refetchProfile: profileQuery.refetch,
    }),
    [
      profileQuery.data,
      profileQuery.isLoading,
      profileQuery.isError,
      profileQuery.refetch,
      completionStatsQuery.data,
      favoriteTypeQuery.data,
      updateProfileMutation.mutateAsync,
      toggleCaughtMutation.mutateAsync,
      recordSeenMutation.mutateAsync,
    ]
  );
}
