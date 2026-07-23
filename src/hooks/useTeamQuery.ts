import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SQLiteDatabase } from 'expo-sqlite';
import {
  getTeam,
  getFullTeam6Slots,
  toggleSquadMember,
  removeFromTeam,
} from '../db/queries';

export function useTeamQuery(db: SQLiteDatabase) {
  return useQuery({
    queryKey: ['team'],
    queryFn: async () => {
      return await getTeam(db);
    },
    enabled: Boolean(db),
  });
}

export function useFullTeam6SlotsQuery(db: SQLiteDatabase) {
  return useQuery({
    queryKey: ['fullTeam6Slots'],
    queryFn: async () => {
      return await getFullTeam6Slots(db);
    },
    enabled: Boolean(db),
  });
}

export function useToggleSquadMutation(db: SQLiteDatabase) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (pokemonId: number) => {
      return await toggleSquadMember(db, pokemonId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team'] });
      queryClient.invalidateQueries({ queryKey: ['fullTeam6Slots'] });
      queryClient.invalidateQueries({ queryKey: ['pokemonList'] });
    },
  });
}

export function useRemoveFromSlotMutation(db: SQLiteDatabase) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (slot: number) => {
      return await removeFromTeam(db, slot);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team'] });
      queryClient.invalidateQueries({ queryKey: ['fullTeam6Slots'] });
      queryClient.invalidateQueries({ queryKey: ['pokemonList'] });
    },
  });
}
