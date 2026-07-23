import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  TextInput,
  FlatList,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { useAppTheme, getTonalPaletteForPokemon } from '../../src/theme';
import { useAppDb } from '../_layout';
import { getPokemonById, getAllPokemon } from '../../src/db/queries';
import { Pokemon, PokemonStat } from '../../src/types';
import { TypeChip } from '../../src/components';
import { getPokemonHeadToHeadMatchup } from '../../src/utils/typeEffectiveness';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';

interface StatConfig {
  key: keyof PokemonStat | 'total';
  label: string;
  maxVal: number;
}

const STAT_CONFIGS: StatConfig[] = [
  { key: 'hp', label: 'HP', maxVal: 255 },
  { key: 'attack', label: 'ATTACK', maxVal: 190 },
  { key: 'defense', label: 'DEFENSE', maxVal: 230 },
  { key: 'specialAttack', label: 'SP. ATK', maxVal: 194 },
  { key: 'specialDefense', label: 'SP. DEF', maxVal: 230 },
  { key: 'speed', label: 'SPEED', maxVal: 180 },
  { key: 'total', label: 'TOTAL', maxVal: 720 },
];

function CompareStatRow({
  config,
  valA,
  valB,
  themeA,
  themeB,
  colorScheme,
  index,
}: {
  config: StatConfig;
  valA: number;
  valB: number;
  themeA: any;
  themeB: any;
  colorScheme: any;
  index: number;
}) {
  const diff = valA - valB;
  const isAWinner = diff > 0;
  const isBWinner = diff < 0;

  const percentA = Math.min(100, Math.max(10, (valA / config.maxVal) * 100));
  const percentB = Math.min(100, Math.max(10, (valB / config.maxVal) * 100));

  const progressA = useSharedValue(0);
  const progressB = useSharedValue(0);

  useEffect(() => {
    progressA.value = 0;
    progressB.value = 0;
    progressA.value = withDelay(
      index * 70,
      withTiming(percentA, { duration: 350, easing: Easing.out(Easing.quad) })
    );
    progressB.value = withDelay(
      index * 70,
      withTiming(percentB, { duration: 350, easing: Easing.out(Easing.quad) })
    );
  }, [valA, valB, percentA, percentB, index]);

  const styleA = useAnimatedStyle(() => ({
    width: `${progressA.value}%`,
  }));

  const styleB = useAnimatedStyle(() => ({
    width: `${progressB.value}%`,
  }));

  return (
    <View style={styles.statRow}>
      {/* Left Bar (A) */}
      <View style={styles.statBarHalfLeft}>
        {isAWinner ? (
          <View style={[styles.winnerBadge, { backgroundColor: themeA.primary }]}>
            <Text style={[styles.winnerBadgeText, { color: themeA.onPrimary }]}>
              +{diff}
            </Text>
          </View>
        ) : null}

        <Text
          style={[
            styles.statValText,
            {
              color: isAWinner ? themeA.primary : colorScheme.secondary,
              fontWeight: isAWinner ? '700' : '500',
            },
          ]}
        >
          {valA}
        </Text>

        <View style={[styles.barTrackLeft, { backgroundColor: colorScheme.outline }]}>
          <Animated.View
            style={[
              styles.barFillLeft,
              {
                backgroundColor: themeA.primary,
              },
              styleA,
            ]}
          />
        </View>
      </View>

      {/* Stat Label */}
      <View style={styles.statLabelBox}>
        <Text style={[styles.statLabelText, { color: colorScheme.secondary }]}>
          {config.label}
        </Text>
      </View>

      {/* Right Bar (B) */}
      <View style={styles.statBarHalfRight}>
        <View style={[styles.barTrackRight, { backgroundColor: colorScheme.outline }]}>
          <Animated.View
            style={[
              styles.barFillRight,
              {
                backgroundColor: themeB.primary,
              },
              styleB,
            ]}
          />
        </View>

        <Text
          style={[
            styles.statValText,
            {
              color: isBWinner ? themeB.primary : colorScheme.secondary,
              fontWeight: isBWinner ? '700' : '500',
            },
          ]}
        >
          {valB}
        </Text>

        {isBWinner ? (
          <View style={[styles.winnerBadge, { backgroundColor: themeB.primary }]}>
            <Text style={[styles.winnerBadgeText, { color: themeB.onPrimary }]}>
              +{Math.abs(diff)}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

export default function CompareScreen() {
  const router = useRouter();
  const db = useAppDb();
  const { colorScheme, isDark, resetToNeutralTheme } = useAppTheme();
  const params = useLocalSearchParams<{ pokemonA?: string; pokemonB?: string }>();

  // Always keep compare screen neutral container
  useEffect(() => {
    resetToNeutralTheme();
  }, [resetToNeutralTheme]);

  // Selected Pokemon IDs
  const [idA, setIdA] = useState<number>(() => (params.pokemonA ? parseInt(params.pokemonA, 10) : 1));
  const [idB, setIdB] = useState<number>(() => (params.pokemonB ? parseInt(params.pokemonB, 10) : 4));

  const [pokemonA, setPokemonA] = useState<Pokemon | null>(null);
  const [pokemonB, setPokemonB] = useState<Pokemon | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // All 151 Pokemon list for picker modal
  const [allPokemon, setAllPokemon] = useState<Pokemon[]>([]);
  const [pickerTarget, setPickerTarget] = useState<'A' | 'B' | null>(null);
  const [pickerSearch, setPickerSearch] = useState<string>('');

  // Fetch Pokemon A & B details
  useEffect(() => {
    let isMounted = true;
    async function loadCompareData() {
      setLoading(true);
      try {
        const [pA, pB] = await Promise.all([
          getPokemonById(db, idA),
          getPokemonById(db, idB),
        ]);
        if (isMounted) {
          setPokemonA(pA);
          setPokemonB(pB);
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to load compare pokemon data:', err);
        if (isMounted) setLoading(false);
      }
    }
    loadCompareData();
    return () => {
      isMounted = false;
    };
  }, [db, idA, idB]);

  // Load all 151 Pokemon for picker modal once
  useEffect(() => {
    let isMounted = true;
    async function loadAll() {
      try {
        const list = await getAllPokemon(db);
        if (isMounted) setAllPokemon(list);
      } catch (err) {
        console.error('Failed to load pokemon list for picker:', err);
      }
    }
    loadAll();
    return () => {
      isMounted = false;
    };
  }, [db]);

  // Compute dual dynamic theme palettes for stat bars
  const themeA = useMemo(() => {
    if (!pokemonA) return null;
    return getTonalPaletteForPokemon(pokemonA, isDark ? 'dark' : 'light');
  }, [pokemonA, isDark]);

  const themeB = useMemo(() => {
    if (!pokemonB) return null;
    return getTonalPaletteForPokemon(pokemonB, isDark ? 'dark' : 'light');
  }, [pokemonB, isDark]);

  // Swap Pokemon A & B
  const handleSwap = useCallback(() => {
    setIdA(idB);
    setIdB(idA);
  }, [idA, idB]);

  // Filtered Pokemon list for picker modal
  const filteredPickerList = useMemo(() => {
    if (!pickerSearch.trim()) return allPokemon;
    const q = pickerSearch.trim().toLowerCase();
    return allPokemon.filter(
      (p) => p.name.toLowerCase().includes(q) || p.number.includes(q) || p.id.toString() === q
    );
  }, [allPokemon, pickerSearch]);

  const handleSelectPokemon = useCallback(
    (p: Pokemon) => {
      if (pickerTarget === 'A') {
        if (p.id === idB) {
          setIdB(idA);
        }
        setIdA(p.id);
      } else if (pickerTarget === 'B') {
        if (p.id === idA) {
          setIdA(idB);
        }
        setIdB(p.id);
      }
      setPickerTarget(null);
      setPickerSearch('');
    },
    [pickerTarget, idA, idB]
  );

  // Type Matchup Calculations
  const headToHead = useMemo(() => {
    if (!pokemonA || !pokemonB) return null;
    return getPokemonHeadToHeadMatchup(pokemonA, pokemonB);
  }, [pokemonA, pokemonB]);

  // Stat Helper to get value
  const getStatValue = (pokemon: Pokemon | null, key: keyof PokemonStat | 'total'): number => {
    if (!pokemon || !pokemon.stats) return 0;
    if (key === 'total') {
      const s = pokemon.stats;
      return s.hp + s.attack + s.defense + s.specialAttack + s.specialDefense + s.speed;
    }
    return pokemon.stats[key] ?? 0;
  };

  if (loading || !pokemonA || !pokemonB || !themeA || !themeB) {
    return (
      <SafeAreaView style={[styles.centered, { backgroundColor: colorScheme.background }]}>
        <ActivityIndicator size="large" color={colorScheme.primary} />
      </SafeAreaView>
    );
  }

  const nameAFormatted = pokemonA.name.charAt(0).toUpperCase() + pokemonA.name.slice(1);
  const nameBFormatted = pokemonB.name.charAt(0).toUpperCase() + pokemonB.name.slice(1);

  return (
    <View style={[styles.container, { backgroundColor: colorScheme.background }]}>
      <SafeAreaView style={{ flex: 1 }}>
        {/* Navigation Header */}
        <View style={styles.header}>
          {router.canGoBack() ? (
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Text style={[styles.backText, { color: colorScheme.primary }]}>← Back</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ width: 60 }} />
          )}

          <Text style={[styles.headerTitle, { color: colorScheme.onBackground }]}>
            VS Compare
          </Text>

          <TouchableOpacity
            onPress={handleSwap}
            style={[styles.swapHeaderBtn, { backgroundColor: colorScheme.surface, borderColor: colorScheme.outline }]}
          >
            <Text style={[styles.swapHeaderText, { color: colorScheme.onSurface }]}>🔁 Swap</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Top Row: Dual Pokemon Pickers Side-by-Side */}
          <View style={styles.dualPickersRow}>
            {/* Left Pokemon (A) */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setPickerTarget('A')}
              style={[
                styles.pokemonPickerCard,
                {
                  backgroundColor: colorScheme.surface,
                  borderColor: colorScheme.outline,
                },
              ]}
            >
              <View style={[styles.pickerBadge, { backgroundColor: themeA.primary }]}>
                <Text style={[styles.pickerBadgeText, { color: themeA.onPrimary }]}>
                  Pokémon A
                </Text>
              </View>

              <Image
                source={{
                  uri: pokemonA.officialArtworkUrl || pokemonA.spriteUrl,
                }}
                style={styles.pokemonSprite}
                contentFit="contain"
              />

              <Text numberOfLines={1} style={[styles.pokemonName, { color: colorScheme.onSurface }]}>
                {nameAFormatted}
              </Text>

              <Text style={[styles.pokemonNumber, { color: colorScheme.secondary }]}>
                #{pokemonA.number}
              </Text>

              <View style={styles.typeChipsRow}>
                <TypeChip type={pokemonA.primaryType} size="small" />
                {pokemonA.secondaryType ? (
                  <TypeChip type={pokemonA.secondaryType} size="small" />
                ) : null}
              </View>

              <Text style={[styles.tapToChangeText, { color: colorScheme.primary }]}>
                Tap to change ✎
              </Text>
            </TouchableOpacity>

            {/* VS Divider Badge */}
            <View style={[styles.vsBadge, { backgroundColor: colorScheme.surface, borderColor: colorScheme.outline }]}>
              <Text style={[styles.vsBadgeText, { color: colorScheme.onSurface }]}>VS</Text>
            </View>

            {/* Right Pokemon (B) */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setPickerTarget('B')}
              style={[
                styles.pokemonPickerCard,
                {
                  backgroundColor: colorScheme.surface,
                  borderColor: colorScheme.outline,
                },
              ]}
            >
              <View style={[styles.pickerBadge, { backgroundColor: themeB.primary }]}>
                <Text style={[styles.pickerBadgeText, { color: themeB.onPrimary }]}>
                  Pokémon B
                </Text>
              </View>

              <Image
                source={{
                  uri: pokemonB.officialArtworkUrl || pokemonB.spriteUrl,
                }}
                style={styles.pokemonSprite}
                contentFit="contain"
              />

              <Text numberOfLines={1} style={[styles.pokemonName, { color: colorScheme.onSurface }]}>
                {nameBFormatted}
              </Text>

              <Text style={[styles.pokemonNumber, { color: colorScheme.secondary }]}>
                #{pokemonB.number}
              </Text>

              <View style={styles.typeChipsRow}>
                <TypeChip type={pokemonB.primaryType} size="small" />
                {pokemonB.secondaryType ? (
                  <TypeChip type={pokemonB.secondaryType} size="small" />
                ) : null}
              </View>

              <Text style={[styles.tapToChangeText, { color: colorScheme.primary }]}>
                Tap to change ✎
              </Text>
            </TouchableOpacity>
          </View>

          {/* Section 1: Side-by-Side Stat Comparison (Paired Bars) */}
          <View
            style={[
              styles.sectionCard,
              {
                backgroundColor: colorScheme.surface,
                borderColor: colorScheme.outline,
              },
            ]}
          >
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { color: themeA.primary }]}>{nameAFormatted}</Text>
              <Text style={[styles.sectionMainTitle, { color: colorScheme.onSurface }]}>
                Stat Comparison
              </Text>
              <Text style={[styles.sectionTitle, { color: themeB.primary }]}>{nameBFormatted}</Text>
            </View>

            <View style={styles.statsContainer}>
              {STAT_CONFIGS.map((config, index) => {
                const valA = getStatValue(pokemonA, config.key);
                const valB = getStatValue(pokemonB, config.key);

                return (
                  <CompareStatRow
                    key={config.key}
                    config={config}
                    valA={valA}
                    valB={valB}
                    themeA={themeA}
                    themeB={themeB}
                    colorScheme={colorScheme}
                    index={index}
                  />
                );
              })}
            </View>
          </View>

          {/* Section 2: Head-to-Head Type Effectiveness Notes */}
          {headToHead ? (
            <View
              style={[
                styles.sectionCard,
                {
                  backgroundColor: colorScheme.surface,
                  borderColor: colorScheme.outline,
                },
              ]}
            >
              <Text style={[styles.sectionMainTitle, { color: colorScheme.onSurface, textAlign: 'center', marginBottom: 14 }]}>
                ⚡ Type Matchup Analysis
              </Text>

              <View style={styles.matchupRow}>
                {/* Pokemon A Attack Advantages against B */}
                <View style={[styles.matchupColumn, { backgroundColor: colorScheme.background }]}>
                  <Text style={[styles.matchupColTitle, { color: themeA.primary }]}>
                    {nameAFormatted}'s Attacks
                  </Text>
                  {headToHead.notesForA.length === 0 ? (
                    <Text style={[styles.neutralMatchupText, { color: colorScheme.secondary }]}>
                      Neutral damage against {nameBFormatted}
                    </Text>
                  ) : (
                    headToHead.notesForA.map((note, idx) => (
                      <View
                        key={`note-a-${idx}`}
                        style={[
                          styles.matchupChip,
                          {
                            backgroundColor: note.isAdvantage
                              ? themeA.primaryContainer
                              : colorScheme.surface,
                            borderColor: colorScheme.outline,
                            borderWidth: 1,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.matchupChipText,
                            {
                              color: note.isAdvantage
                                ? themeA.onPrimaryContainer
                                : colorScheme.onSurface,
                            },
                          ]}
                        >
                          {note.label} ({note.attackerType.toUpperCase()})
                        </Text>
                      </View>
                    ))
                  )}
                </View>

                {/* Pokemon B Attack Advantages against A */}
                <View style={[styles.matchupColumn, { backgroundColor: colorScheme.background }]}>
                  <Text style={[styles.matchupColTitle, { color: themeB.primary }]}>
                    {nameBFormatted}'s Attacks
                  </Text>
                  {headToHead.notesForB.length === 0 ? (
                    <Text style={[styles.neutralMatchupText, { color: colorScheme.secondary }]}>
                      Neutral damage against {nameAFormatted}
                    </Text>
                  ) : (
                    headToHead.notesForB.map((note, idx) => (
                      <View
                        key={`note-b-${idx}`}
                        style={[
                          styles.matchupChip,
                          {
                            backgroundColor: note.isAdvantage
                              ? themeB.primaryContainer
                              : colorScheme.surface,
                            borderColor: colorScheme.outline,
                            borderWidth: 1,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.matchupChipText,
                            {
                              color: note.isAdvantage
                                ? themeB.onPrimaryContainer
                                : colorScheme.onSurface,
                            },
                          ]}
                        >
                          {note.label} ({note.attackerType.toUpperCase()})
                        </Text>
                      </View>
                    ))
                  )}
                </View>
              </View>
            </View>
          ) : null}
        </ScrollView>
      </SafeAreaView>

      {/* Modal Pokemon Picker */}
      <Modal
        visible={pickerTarget !== null}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setPickerTarget(null)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colorScheme.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colorScheme.onBackground }]}>
              Select Pokémon {pickerTarget}
            </Text>
            <TouchableOpacity
              onPress={() => {
                setPickerTarget(null);
                setPickerSearch('');
              }}
              style={styles.closeModalBtn}
            >
              <Text style={[styles.closeModalText, { color: colorScheme.primary }]}>✕ Close</Text>
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View style={styles.pickerSearchContainer}>
            <TextInput
              value={pickerSearch}
              onChangeText={setPickerSearch}
              placeholder="Search name or number (#001)..."
              placeholderTextColor={colorScheme.secondary}
              style={[
                styles.pickerSearchInput,
                {
                  backgroundColor: colorScheme.surface,
                  color: colorScheme.onSurface,
                  borderColor: colorScheme.outline,
                },
              ]}
              autoFocus
            />
          </View>

          {/* List of 151 Pokemon */}
          <FlatList
            data={filteredPickerList}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.pickerListContent}
            renderItem={({ item }) => {
              const formattedItemName = item.name.charAt(0).toUpperCase() + item.name.slice(1);
              const isCurrentlySelected =
                (pickerTarget === 'A' && item.id === idA) || (pickerTarget === 'B' && item.id === idB);

              return (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => handleSelectPokemon(item)}
                  style={[
                    styles.pickerItemRow,
                    {
                      backgroundColor: isCurrentlySelected
                        ? colorScheme.primaryContainer
                        : colorScheme.surface,
                      borderColor: isCurrentlySelected ? colorScheme.primary : colorScheme.outline,
                    },
                  ]}
                >
                  <Image
                    source={{ uri: item.spriteUrl || item.officialArtworkUrl }}
                    style={styles.pickerItemSprite}
                    contentFit="contain"
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.pickerItemName, { color: colorScheme.onSurface }]}>
                      {formattedItemName}
                    </Text>
                    <Text style={[styles.pickerItemNumber, { color: colorScheme.secondary }]}>
                      #{item.number}
                    </Text>
                  </View>
                  <TypeChip type={item.primaryType} size="small" />
                </TouchableOpacity>
              );
            }}
          />
        </SafeAreaView>
      </Modal>
    </View>
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
  },
  splitBackgroundContainer: {
    ...StyleSheet.absoluteFill,
    flexDirection: 'row',
  },
  splitLeft: {
    flex: 1,
  },
  splitRight: {
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
    paddingVertical: 8,
    paddingRight: 12,
  },
  backText: {
    fontSize: 15,
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  swapHeaderBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  swapHeaderText: {
    fontSize: 12,
    fontWeight: '600',
  },
  scrollContent: {
    paddingHorizontal: 14,
    paddingBottom: 40,
    gap: 16,
  },
  dualPickersRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
    alignItems: 'stretch',
    position: 'relative',
  },
  pokemonPickerCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    alignItems: 'center',
  },
  pickerBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 6,
  },
  pickerBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  pokemonSprite: {
    width: 80,
    height: 80,
    marginVertical: 4,
  },
  pokemonName: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: 4,
  },
  pokemonNumber: {
    fontSize: 12,
    fontWeight: '400',
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
    fontVariant: ['tabular-nums'],
    marginBottom: 6,
  },
  typeChipsRow: {
    flexDirection: 'row',
    gap: 4,
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 8,
  },
  tapToChangeText: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 'auto',
  },
  vsBadge: {
    position: 'absolute',
    left: '50%',
    top: '40%',
    marginLeft: -16,
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  vsBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  sectionCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionMainTitle: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.66,
    textTransform: 'uppercase',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.66,
    textTransform: 'uppercase',
  },
  statsContainer: {
    gap: 12,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 24,
  },
  statBarHalfLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
  },
  statBarHalfRight: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 6,
  },
  statLabelBox: {
    width: 64,
    alignItems: 'center',
  },
  statLabelText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  statValText: {
    fontSize: 12,
    width: 30,
    textAlign: 'center',
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
    fontVariant: ['tabular-nums'],
  },
  barTrackLeft: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    flexDirection: 'row-reverse',
  },
  barTrackRight: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  barFillLeft: {
    height: '100%',
    borderRadius: 3,
  },
  barFillRight: {
    height: '100%',
    borderRadius: 3,
  },
  winnerBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 100,
  },
  winnerBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
    fontVariant: ['tabular-nums'],
  },
  matchupRow: {
    flexDirection: 'row',
    gap: 10,
  },
  matchupColumn: {
    flex: 1,
    borderRadius: 12,
    padding: 10,
    gap: 8,
  },
  matchupColTitle: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
    textAlign: 'center',
  },
  neutralMatchupText: {
    fontSize: 11,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  matchupChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 100,
    alignItems: 'center',
  },
  matchupChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  closeModalBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  closeModalText: {
    fontSize: 14,
    fontWeight: '600',
  },
  pickerSearchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  pickerSearchInput: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 14,
  },
  pickerListContent: {
    paddingHorizontal: 16,
    paddingBottom: 30,
    gap: 8,
  },
  pickerItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  pickerItemSprite: {
    width: 44,
    height: 44,
  },
  pickerItemName: {
    fontSize: 14,
    fontWeight: '600',
  },
  pickerItemNumber: {
    fontSize: 11,
    fontWeight: '500',
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
    fontVariant: ['tabular-nums'],
  },
});
