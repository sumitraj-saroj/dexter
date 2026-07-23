import React, { useState, useCallback, useMemo } from 'react';
import { StyleSheet, Text, View, StatusBar, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../src/theme';
import { isDatabaseSynced, syncKantoPokemon } from '../../src/db';
import { SyncLoadingScreen, PokemonCard, SearchBar, FilterBottomSheet, PokemonOfTheDayCard } from '../../src/components';
import { useAppDb } from '../_layout';
import { useDebounce } from '../../src/hooks/useDebounce';
import { usePokemonQuery } from '../../src/hooks/usePokemonQuery';
import { usePokemonOfTheDay } from '../../src/hooks/usePokemonOfTheDay';

import { FilterOptions, Pokemon } from '../../src/types';
import { hapticLight } from '../../src/utils/haptics';

export default function HomeScreen() {
  const db = useAppDb();
  const router = useRouter();
  const { colorScheme, isDark, resetToNeutralTheme } = useAppTheme();

  // Always enforce neutral theme on home screen
  useFocusEffect(
    useCallback(() => {
      resetToNeutralTheme();
    }, [resetToNeutralTheme])
  );

  // Sync state
  const [isCheckingSync, setIsCheckingSync] = useState(true);
  const [isSynced, setIsSynced] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 1025 });
  const [syncError, setSyncError] = useState<string | null>(null);

  // Search & Filter state
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput, 300);

  const [filters, setFilters] = useState<FilterOptions>({
    types: [],
    generations: [],
    legendaryOnly: false,
    ability: '',
  });

  const [filterModalVisible, setFilterModalVisible] = useState(false);

  // Combined filter options for query
  const queryFilters = useMemo<FilterOptions>(() => {
    return {
      ...filters,
      searchQuery: debouncedSearch,
    };
  }, [filters, debouncedSearch]);

  // React Query for local SQLite database filtering
  const { data: pokemonList = [], isLoading, isError, refetch } = usePokemonQuery(
    db,
    queryFilters
  );

  // Fetch Pokemon of the Day
  const { data: pokemonOfTheDay } = usePokemonOfTheDay(db);
  const [shuffledPokemon, setShuffledPokemon] = useState<Pokemon | null>(null);

  const currentSpotlight = shuffledPokemon || pokemonOfTheDay || null;

  const handleShuffleSpotlight = useCallback(() => {
    if (pokemonList && pokemonList.length > 0) {
      const randomIndex = Math.floor(Math.random() * pokemonList.length);
      setShuffledPokemon(pokemonList[randomIndex]);
    }
  }, [pokemonList]);

  // Initial Sync check
  const startSync = useCallback(async () => {
    setSyncError(null);
    try {
      await syncKantoPokemon(db, (current, total) => {
        setProgress({ current, total });
      });
      setIsSynced(true);
    } catch (err: any) {
      console.error('Initial sync failed:', err);
      setSyncError(
        err?.message || 'Failed to download Pokédex data. Please check your internet connection.'
      );
    }
  }, [db]);

  React.useEffect(() => {
    let isMounted = true;
    async function checkSyncState() {
      try {
        const synced = await isDatabaseSynced(db);
        if (isMounted) {
          setIsSynced(synced);
          setIsCheckingSync(false);
          if (!synced) {
            startSync();
          }
        }
      } catch (err) {
        if (isMounted) {
          setIsCheckingSync(false);
          startSync();
        }
      }
    }
    checkSyncState();
    return () => {
      isMounted = false;
    };
  }, [db, startSync]);

  // Card Tap Handler -> Navigate to /pokemon/[id]
  const handleCardPress = useCallback(
    (pokemon: Pokemon) => {
      router.push(`/pokemon/${pokemon.id}`);
    },
    [router]
  );

  // Calculate active filter count (excluding search bar text)
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.types && filters.types.length > 0) count += filters.types.length;
    if (filters.generations && filters.generations.length > 0) count += filters.generations.length;
    if (filters.legendaryOnly) count += 1;
    if (filters.ability && filters.ability.trim().length > 0) count += 1;
    return count;
  }, [filters]);

  const isSearchingOrFiltering = Boolean(
    searchInput.trim().length > 0 || activeFilterCount > 0
  );

  const handleResetFilters = useCallback(() => {
    setFilters({
      types: [],
      generations: [],
      legendaryOnly: false,
      ability: '',
    });
  }, []);

  const renderListHeader = useCallback(() => {
    const showSpotlight = !isSearchingOrFiltering && currentSpotlight;
    const showFilterChips = activeFilterCount > 0;

    if (!showSpotlight && !showFilterChips) return null;

    return (
      <View>
        {showSpotlight ? (
          <PokemonOfTheDayCard
            pokemon={currentSpotlight}
            onPress={handleCardPress}
            onShuffle={handleShuffleSpotlight}
          />
        ) : null}

        {showFilterChips ? (
          <View style={styles.activeFiltersBar}>
            <Text style={[styles.activeFilterLabel, { color: colorScheme.secondary }]}>
              Active Filters ({pokemonList.length} matches):
            </Text>
            <TouchableOpacity onPress={handleResetFilters}>
              <Text style={[styles.clearFilterText, { color: colorScheme.primary }]}>
                Clear All
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    );
  }, [
    isSearchingOrFiltering,
    currentSpotlight,
    activeFilterCount,
    pokemonList.length,
    handleCardPress,
    handleShuffleSpotlight,
    handleResetFilters,
    colorScheme,
  ]);

  const renderItem = useCallback(
    ({ item, index }: { item: Pokemon; index: number }) => (
      <PokemonCard pokemon={item} index={index} onPress={handleCardPress} />
    ),
    [handleCardPress]
  );

  if (isCheckingSync) {
    return (
      <View style={[styles.centered, { backgroundColor: colorScheme.background }]}>
        <ActivityIndicator size="large" color={colorScheme.primary} />
      </View>
    );
  }

  if (!isSynced) {
    return (
      <SyncLoadingScreen
        current={progress.current}
        total={progress.total}
        error={syncError}
        onRetry={startSync}
      />
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colorScheme.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Simplified Home Header */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <Text style={[styles.title, { color: colorScheme.onBackground }]}>Dexter</Text>
          <TouchableOpacity
            activeOpacity={0.6}
            onPress={() => {
              hapticLight();
              router.push('/settings');
            }}
            style={styles.settingsButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="settings-outline" size={22} color={colorScheme.onBackground} />
          </TouchableOpacity>
        </View>
        <Text style={[styles.subtitle, { color: colorScheme.secondary }]}>
          NATIONAL POKÉDEX • ALL GENERATIONS
        </Text>
      </View>

      {/* Search & Filter Trigger Bar */}
      <SearchBar
        value={searchInput}
        onChangeText={setSearchInput}
        onOpenFilter={() => {
          hapticLight();
          setFilterModalVisible(true);
        }}
        activeFilterCount={activeFilterCount}
      />

      {/* Main Grid Content */}
      <View style={styles.listContainer}>
        {isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colorScheme.primary} />
          </View>
        ) : isError ? (
          <View style={styles.centered}>
            <Text style={[styles.emptyText, { color: colorScheme.onBackground }]}>
              Failed to load Pokédex entries.
            </Text>
            <TouchableOpacity
              onPress={() => refetch()}
              style={[styles.retryButton, { backgroundColor: colorScheme.primary }]}
            >
              <Text style={{ color: colorScheme.onPrimary, fontWeight: '600' }}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : pokemonList.length === 0 ? (
          <View style={styles.centered}>
            <Text style={styles.emptyIcon}>🔍</Text>
            <Text style={[styles.emptyTitle, { color: colorScheme.onBackground }]}>
              No Pokémon Found
            </Text>
            <Text style={[styles.emptyText, { color: colorScheme.secondary }]}>
              Try adjusting your search terms or active filters.
            </Text>
          </View>
        ) : (
          <FlashList
            data={pokemonList}
            renderItem={renderItem}
            keyExtractor={(item) => item.id.toString()}
            getItemType={(item) => item.primaryType}
            numColumns={2}
            ListHeaderComponent={renderListHeader}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      {/* Filter Bottom Sheet Modal */}
      <FilterBottomSheet
        visible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        filters={filters}
        onApplyFilters={setFilters}
        onResetFilters={handleResetFilters}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  settingsButton: {
    padding: 4,
  },
  subtitle: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.66,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  activeFiltersBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  activeFilterLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  clearFilterText: {
    fontSize: 12,
    fontWeight: '600',
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: 10,
  },
  listContent: {
    paddingBottom: 24,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 14,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
});
