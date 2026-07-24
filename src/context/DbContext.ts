import { createContext, useContext } from 'react';
import type { SQLiteDatabase } from 'expo-sqlite';

export const DbContext = createContext<SQLiteDatabase | null>(null);

export function useAppDb(): SQLiteDatabase {
  const ctx = useContext(DbContext);
  if (!ctx) throw new Error('useAppDb must be used within DbContext');
  return ctx;
}
