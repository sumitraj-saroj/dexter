import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Switch,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAppTheme, AnimatedThemeView } from '../src/theme';
import { useAppDb } from './_layout';
import { getUserSetting, setUserSetting } from '../src/db/queries';
import { syncKantoPokemon } from '../src/db/sync';
import { useQueryClient } from '@tanstack/react-query';

export default function SettingsScreen() {
  const router = useRouter();
  const db = useAppDb();
  const queryClient = useQueryClient();
  const { colorScheme, isDark, resetToNeutralTheme } = useAppTheme();

  // Always keep settings screen on neutral Apple theme
  useEffect(() => {
    resetToNeutralTheme();
  }, [resetToNeutralTheme]);

  // Settings state
  const [shinyByDefault, setShinyByDefault] = useState<boolean>(false);
  const [loadingSettings, setLoadingSettings] = useState<boolean>(true);

  // Sync state
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncProgress, setSyncProgress] = useState<{ current: number; total: number }>({
    current: 0,
    total: 151,
  });
  const [syncError, setSyncError] = useState<string | null>(null);

  // Load initial user settings from SQLite
  useEffect(() => {
    let isMounted = true;
    async function loadSettings() {
      try {
        const shinyVal = await getUserSetting(db, 'shiny_by_default', 'false');
        if (isMounted) {
          setShinyByDefault(shinyVal === 'true');
          setLoadingSettings(false);
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
        if (isMounted) setLoadingSettings(false);
      }
    }
    loadSettings();
    return () => {
      isMounted = false;
    };
  }, [db]);

  // Toggle shiny preference
  const handleToggleShiny = useCallback(
    async (value: boolean) => {
      setShinyByDefault(value);
      try {
        await setUserSetting(db, 'shiny_by_default', value ? 'true' : 'false');
      } catch (err) {
        console.error('Failed to save shiny setting:', err);
      }
    },
    [db]
  );

  // Re-sync database trigger
  const handleResyncDatabase = useCallback(async () => {
    setIsSyncing(true);
    setSyncError(null);
    setSyncProgress({ current: 0, total: 151 });

    try {
      await syncKantoPokemon(
        db,
        (current, total) => {
          setSyncProgress({ current, total });
        },
        true // force resync
      );

      // Invalidate React Query cache to reflect freshly synced data
      queryClient.invalidateQueries();
      setIsSyncing(false);
    } catch (err: any) {
      console.error('Re-sync failed:', err);
      setSyncError(err?.message || 'Failed to re-sync Pokédex data. Please check connection.');
      setIsSyncing(false);
    }
  }, [db, queryClient]);

  return (
    <AnimatedThemeView style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={[styles.backText, { color: colorScheme.primary }]}>← Back</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colorScheme.onBackground }]}>Settings</Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Section 1: Display Preferences */}
          <Text style={[styles.sectionHeading, { color: colorScheme.secondary }]}>
            PREFERENCES
          </Text>
          <View
            style={[
              styles.card,
              {
                backgroundColor: colorScheme.surface,
                borderColor: colorScheme.outline,
              },
            ]}
          >
            <View style={styles.settingRow}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={[styles.settingTitle, { color: colorScheme.onSurface }]}>
                  Default to Shiny Sprites
                </Text>
                <Text style={[styles.settingSub, { color: colorScheme.secondary }]}>
                  Automatically show shiny variants when opening Pokémon detail screens.
                </Text>
              </View>
              {loadingSettings ? (
                <ActivityIndicator size="small" color={colorScheme.primary} />
              ) : (
                <Switch
                  value={shinyByDefault}
                  onValueChange={handleToggleShiny}
                  trackColor={{ false: colorScheme.outline, true: colorScheme.primary }}
                  thumbColor={shinyByDefault ? colorScheme.onPrimary : '#F4F3F4'}
                />
              )}
            </View>
          </View>

          {/* Section 2: Data & Sync */}
          <Text style={[styles.sectionHeading, { color: colorScheme.secondary }]}>
            DATA & OFFLINE CACHE
          </Text>
          <View
            style={[
              styles.card,
              {
                backgroundColor: colorScheme.surface,
                borderColor: colorScheme.outline,
              },
            ]}
          >
            <View style={styles.settingRowVertical}>
              <Text style={[styles.settingTitle, { color: colorScheme.onSurface }]}>
                Re-sync Pokédex Cache
              </Text>
              <Text style={[styles.settingSub, { color: colorScheme.secondary }]}>
                Clears and re-downloads all 151 Kanto Pokémon entries into your local SQLite database.
              </Text>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleResyncDatabase}
                style={[styles.actionBtn, { backgroundColor: colorScheme.primary }]}
              >
                <Text style={[styles.actionBtnText, { color: colorScheme.onPrimary }]}>
                  🔄 Re-sync 151 Pokémon
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Section 3: PokeAPI Credits & Attribution */}
          <Text style={[styles.sectionHeading, { color: colorScheme.secondary }]}>
            ABOUT & CREDITS
          </Text>
          <View
            style={[
              styles.card,
              {
                backgroundColor: colorScheme.surface,
                borderColor: colorScheme.outline,
              },
            ]}
          >
            <View style={styles.aboutContainer}>
              <Text style={[styles.aboutTitle, { color: colorScheme.onSurface }]}>
                Pokédex — Kanto #001 - #151
              </Text>
              <Text style={[styles.aboutText, { color: colorScheme.secondary }]}>
                A clean, native Apple-inspired flat minimal Pokédex app with offline SQLite sync and dynamic detail transitions.
              </Text>

              <View style={[styles.divider, { backgroundColor: colorScheme.outline }]} />

              <Text style={[styles.creditHeader, { color: colorScheme.onSurface }]}>
                Data Source & Artwork
              </Text>
              <Text style={[styles.creditText, { color: colorScheme.secondary }]}>
                All Pokémon data, sprites, and official artwork are powered by PokeAPI (https://pokeapi.co). Pokémon is © Nintendo, Game Freak, and The Pokémon Company.
              </Text>

              <View style={styles.techBadgesRow}>
                <View style={[styles.badge, { backgroundColor: colorScheme.secondaryContainer }]}>
                  <Text style={[styles.badgeText, { color: colorScheme.onSecondaryContainer }]}>
                    Expo v57
                  </Text>
                </View>
                <View style={[styles.badge, { backgroundColor: colorScheme.secondaryContainer }]}>
                  <Text style={[styles.badgeText, { color: colorScheme.onSecondaryContainer }]}>
                    SQLite Offline
                  </Text>
                </View>
                <View style={[styles.badge, { backgroundColor: colorScheme.secondaryContainer }]}>
                  <Text style={[styles.badgeText, { color: colorScheme.onSecondaryContainer }]}>
                    React Native
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* Syncing Progress Modal */}
      <Modal visible={isSyncing} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.syncModalCard,
              {
                backgroundColor: colorScheme.surface,
                borderColor: colorScheme.outline,
              },
            ]}
          >
            <ActivityIndicator size="large" color={colorScheme.primary} style={{ marginBottom: 16 }} />
            <Text style={[styles.syncModalTitle, { color: colorScheme.onSurface }]}>
              Syncing Pokédex Data...
            </Text>
            <Text style={[styles.syncModalProgress, { color: colorScheme.primary }]}>
              {syncProgress.current} / {syncProgress.total} Pokémon
            </Text>

            {syncError ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{syncError}</Text>
                <TouchableOpacity
                  onPress={() => setIsSyncing(false)}
                  style={[styles.closeErrorBtn, { backgroundColor: colorScheme.primary }]}
                >
                  <Text style={{ color: colorScheme.onPrimary, fontWeight: '700' }}>Close</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        </View>
      </Modal>
    </AnimatedThemeView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  backButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingRight: 12,
  },
  backText: {
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 12,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.66,
    textTransform: 'uppercase',
    marginTop: 10,
    marginBottom: 2,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingRowVertical: {
    gap: 10,
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  settingSub: {
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 18,
    marginTop: 2,
  },
  actionBtn: {
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  aboutContainer: {
    gap: 8,
  },
  aboutTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  aboutText: {
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 18,
  },
  divider: {
    height: 1,
    marginVertical: 4,
  },
  creditHeader: {
    fontSize: 13,
    fontWeight: '600',
  },
  creditText: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 17,
  },
  techBadgesRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
    marginTop: 6,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  syncModalCard: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
  },
  syncModalTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 4,
  },
  syncModalProgress: {
    fontSize: 15,
    fontWeight: '600',
  },
  errorBox: {
    marginTop: 14,
    alignItems: 'center',
    gap: 10,
  },
  errorText: {
    fontSize: 13,
    color: '#FF3B30',
    textAlign: 'center',
  },
  closeErrorBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 16,
  },
});
