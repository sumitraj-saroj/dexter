import React, { useState, useEffect, createContext, useContext } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { openDatabaseAsync, SQLiteDatabase } from 'expo-sqlite';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '../src/theme';
import { migrateDbIfNeeded } from '../src/db';

export const DbContext = createContext<SQLiteDatabase | null>(null);

export function useAppDb() {
  const ctx = useContext(DbContext);
  if (!ctx) throw new Error('useAppDb must be used within DbContext');
  return ctx;
}

export default function RootLayout() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 60 * 24, // 24 hours
            gcTime: 1000 * 60 * 60 * 24 * 7, // 7 days
          },
        },
      })
  );

  const [db, setDb] = useState<SQLiteDatabase | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function initDb() {
      try {
        const database = await openDatabaseAsync('pokedex.db');
        await migrateDbIfNeeded(database);
        if (isMounted) setDb(database);
      } catch (e) {
        console.error('Failed to initialize database', e);
      }
    }
    initDb();
    return () => {
      isMounted = false;
    };
  }, []);

  if (!db) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <DbContext.Provider value={db}>
          <ThemeProvider>
            <Stack
              screenOptions={{
                headerShown: false,
                animation: 'slide_from_right',
              }}
            >
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="settings" options={{ headerShown: false }} />
              <Stack.Screen name="pokemon/[id]" options={{ headerShown: false }} />
            </Stack>
          </ThemeProvider>
        </DbContext.Provider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
