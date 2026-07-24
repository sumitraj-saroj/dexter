import React, { useState, useEffect, createContext, useContext } from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { openDatabaseAsync, SQLiteDatabase } from 'expo-sqlite';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { ThemeProvider } from '../src/theme';
import { migrateDbIfNeeded, checkAndUpdateDailyStreak } from '../src/db';
import { AchievementProvider } from '../src/context/AchievementContext';
import { checkAchievements } from '../src/db/queries';
import { DbContext, useAppDb } from '../src/context/DbContext';

export { DbContext, useAppDb };

// Prevent splash screen from auto-hiding before initialization
SplashScreen.preventAutoHideAsync().catch(() => {});

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
        await checkAndUpdateDailyStreak(database);
        await checkAchievements(database);
        if (isMounted) setDb(database);
      } catch (e) {
        console.error('Failed to initialize database', e);
        SplashScreen.hideAsync().catch(() => {});
      }
    }
    initDb();
    return () => {
      isMounted = false;
    };
  }, []);

  if (!db) {
    return <View style={{ flex: 1, backgroundColor: '#FAFAFA' }} />;
  }

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <DbContext.Provider value={db}>
          <ThemeProvider>
            <AchievementProvider>
              <Stack
                screenOptions={{
                  headerShown: false,
                  animation: 'slide_from_right',
                }}
              >
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="settings" options={{ headerShown: false }} />
                <Stack.Screen name="profile" options={{ headerShown: false }} />
                <Stack.Screen name="achievements" options={{ headerShown: false }} />
                <Stack.Screen name="pokemon/[id]" options={{ headerShown: false }} />
              </Stack>
            </AchievementProvider>
          </ThemeProvider>
        </DbContext.Provider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
