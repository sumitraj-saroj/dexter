import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { useAppTheme, AnimatedThemeView } from '../../src/theme';
import { useAppDb } from '../_layout';
import { getPokemonById, getEvolutionChainForPokemon, getUserSetting } from '../../src/db/queries';
import { Pokemon } from '../../src/types';
import { TypeChip, StatBar, PokemonCryButton } from '../../src/components';
import { useToggleSquadMutation } from '../../src/hooks/useTeamQuery';
import { getDefensiveMatchups } from '../../src/data/typeChart';
import { hapticMedium, hapticSuccess, hapticLight } from '../../src/utils/haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  FadeIn,
} from 'react-native-reanimated';

const AnimatedImage = Animated.createAnimatedComponent(Image);

export default function PokemonDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const db = useAppDb();
  const { colorScheme, setThemeForPokemon, setThemeByTypes } = useAppTheme();
  const toggleSquadMutation = useToggleSquadMutation(db);

  const [pokemon, setPokemon] = useState<Pokemon | null>(null);
  const [evolutionChain, setEvolutionChain] = useState<
    Array<{ id: number; name: string; number: string; spriteUrl: string; trigger?: string | null }>
  >([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Shiny Toggle State
  const [isShiny, setIsShiny] = useState<boolean>(false);

  // Moves Filter State
  const [moveSearch, setMoveSearch] = useState<string>('');

  // Team Stub State
  const [inTeam, setInTeam] = useState<boolean>(false);

  // Load Pokemon & Evolution Chain
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      if (!id) return;
      setLoading(true);
      try {
        const numId = parseInt(id, 10);
        const [pData, evoData, defaultShinyVal] = await Promise.all([
          getPokemonById(db, numId),
          getEvolutionChainForPokemon(db, numId),
          getUserSetting(db, 'shiny_by_default', 'false'),
        ]);

        if (isMounted && pData) {
          const shouldDefaultShiny = defaultShinyVal === 'true';
          setPokemon(pData);
          setInTeam(Boolean(pData.isInTeam));
          setEvolutionChain(evoData);
          setIsShiny(shouldDefaultShiny);

          if (shouldDefaultShiny) {
            setThemeByTypes('electric', 'dragon');
          } else {
            setThemeForPokemon(pData); // Triggers 500ms dynamic theme transition!
          }

          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to load pokemon detail:', err);
        if (isMounted) setLoading(false);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, [db, id]);

  // Reanimated values for Artwork Mount & Shiny Cross-Fade
  const shinyOpacity = useSharedValue(0);
  const heroScale = useSharedValue(0.92);
  const heroMountOpacity = useSharedValue(0);

  useEffect(() => {
    shinyOpacity.value = withTiming(isShiny ? 1 : 0, {
      duration: 200,
      easing: Easing.inOut(Easing.quad),
    });
  }, [isShiny]);

  useEffect(() => {
    if (pokemon) {
      heroScale.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.quad) });
      heroMountOpacity.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.quad) });
    }
  }, [pokemon]);

  const normalArtworkStyle = useAnimatedStyle(() => ({
    opacity: (1 - shinyOpacity.value) * heroMountOpacity.value,
    transform: [{ scale: heroScale.value }],
  }));

  const shinyArtworkStyle = useAnimatedStyle(() => ({
    opacity: shinyOpacity.value * heroMountOpacity.value,
    transform: [{ scale: heroScale.value }],
  }));

  // Handle Shiny Toggle
  const toggleShiny = useCallback(() => {
    if (!pokemon) return;
    hapticMedium();
    const nextShiny = !isShiny;
    setIsShiny(nextShiny);

    if (nextShiny) {
      setThemeByTypes('electric', 'dragon');
    } else {
      setThemeForPokemon(pokemon);
    }
  }, [isShiny, pokemon, setThemeByTypes, setThemeForPokemon]);

  // Filter Moves
  const filteredMoves = useMemo(() => {
    if (!pokemon?.moves) return [];
    const query = moveSearch.trim().toLowerCase();
    if (!query) return pokemon.moves;
    return pokemon.moves.filter((m) => m.name.toLowerCase().includes(query));
  }, [pokemon?.moves, moveSearch]);

  // Height & Weight formatting
  const formattedHeight = pokemon ? `${(pokemon.height / 10).toFixed(1)} m` : '';
  const formattedWeight = pokemon ? `${(pokemon.weight / 10).toFixed(1)} kg` : '';

  const formattedName = pokemon
    ? pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1)
    : '';

  // Stats Total calculation
  const totalStats = useMemo(() => {
    if (!pokemon?.stats) return 0;
    const s = pokemon.stats;
    return s.hp + s.attack + s.defense + s.specialAttack + s.specialDefense + s.speed;
  }, [pokemon?.stats]);

  // Defensive Type Matchups calculation
  const defensiveMatchups = useMemo(() => {
    if (!pokemon) return [];
    return getDefensiveMatchups(pokemon.primaryType, pokemon.secondaryType);
  }, [pokemon?.primaryType, pokemon?.secondaryType]);

  if (loading || !pokemon) {
    return (
      <AnimatedThemeView style={styles.container}>
        <SafeAreaView style={styles.centered}>
          <ActivityIndicator size="large" color={colorScheme.primary} />
        </SafeAreaView>
      </AnimatedThemeView>
    );
  }

  const activeArtwork = isShiny
    ? pokemon.shinyArtworkUrl || pokemon.officialArtworkUrl || pokemon.shinySpriteUrl || pokemon.spriteUrl
    : pokemon.officialArtworkUrl || pokemon.spriteUrl;

  return (
    <AnimatedThemeView style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        {/* Top Nav Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={[styles.backText, { color: colorScheme.primary }]}>← Back</Text>
          </TouchableOpacity>

          <Text style={[styles.headerNumber, { color: colorScheme.onBackground }]}>
            #{pokemon.number}
          </Text>

          {/* Shiny Toggle Button */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={toggleShiny}
            style={[
              styles.shinyButton,
              {
                backgroundColor: isShiny ? colorScheme.primary : colorScheme.surface,
                borderColor: colorScheme.outline,
              },
            ]}
          >
            <Text
              style={[
                styles.shinyText,
                { color: isShiny ? colorScheme.onPrimary : colorScheme.onSurface },
              ]}
            >
              {isShiny ? '✨ Shiny ON' : '✨ Shiny'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Main Pokemon Artwork Hero */}
          <View style={styles.heroContainer}>
            <Animated.View style={[styles.heroArtworkWrapper, normalArtworkStyle]}>
              <AnimatedImage
                sharedTransitionTag={`pokemon-image-${pokemon.id}`}
                source={{
                  uri: pokemon.officialArtworkUrl || pokemon.spriteUrl,
                }}
                style={styles.heroArtwork}
                contentFit="contain"
              />
            </Animated.View>
            <Animated.View style={[styles.heroArtworkWrapper, shinyArtworkStyle]}>
              <Image
                source={{
                  uri: pokemon.shinyArtworkUrl || pokemon.officialArtworkUrl || pokemon.shinySpriteUrl || pokemon.spriteUrl,
                }}
                style={styles.heroArtwork}
                contentFit="contain"
              />
            </Animated.View>
          </View>

          {/* Staggered Body Content */}
          <Animated.View entering={FadeIn.delay(250).duration(200)} style={{ gap: 16 }}>
            {/* Name & Type Chips Header */}
            <View style={styles.nameHeader}>
              <View style={styles.titleRow}>
                <Text style={[styles.pokemonTitle, { color: colorScheme.onBackground }]}>
                  {formattedName}
                </Text>
                <PokemonCryButton pokemonId={pokemon.id} pokemonName={pokemon.name} />
              </View>
              <View style={styles.typesRow}>
                <TypeChip type={pokemon.primaryType} size="medium" />
                {pokemon.secondaryType ? (
                  <TypeChip type={pokemon.secondaryType} size="medium" />
                ) : null}
              </View>
            </View>

          {/* Physical Attributes Card (Height / Weight) */}
          <View
            style={[
              styles.card,
              {
                backgroundColor: colorScheme.surface,
                borderColor: colorScheme.outline,
              },
            ]}
          >
            <View style={styles.metricsRow}>
              <View style={styles.metricItem}>
                <Text style={[styles.metricLabel, { color: colorScheme.secondary }]}>
                  HEIGHT
                </Text>
                <Text style={[styles.metricValue, { color: colorScheme.onSurface }]}>
                  {formattedHeight}
                </Text>
              </View>

              <View
                style={[
                  styles.metricDivider,
                  { backgroundColor: colorScheme.outline },
                ]}
              />

              <View style={styles.metricItem}>
                <Text style={[styles.metricLabel, { color: colorScheme.secondary }]}>
                  WEIGHT
                </Text>
                <Text style={[styles.metricValue, { color: colorScheme.onSurface }]}>
                  {formattedWeight}
                </Text>
              </View>
            </View>

            {/* Flavor Text */}
            {pokemon.flavorText ? (
              <Text
                style={[
                  styles.flavorText,
                  { color: colorScheme.onSurface },
                ]}
              >
                "{pokemon.flavorText}"
              </Text>
            ) : null}
          </View>

          {/* Team Action Button */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={async () => {
              if (!pokemon) return;
              try {
                const res = await toggleSquadMutation.mutateAsync(pokemon.id);
                if (res.success) {
                  setInTeam(res.inTeam);
                  if (res.inTeam) {
                    hapticSuccess();
                  } else {
                    hapticLight();
                  }
                } else if (res.message) {
                  alert(res.message);
                }
              } catch (e) {
                console.error(e);
              }
            }}
            style={[
              styles.teamButton,
              {
                backgroundColor: inTeam ? colorScheme.secondaryContainer : colorScheme.primary,
              },
            ]}
          >
            <Text
              style={[
                styles.teamButtonText,
                { color: inTeam ? colorScheme.onSecondaryContainer : colorScheme.onPrimary },
              ]}
            >
              {inTeam ? '✓ In Squad (Tap to Remove)' : '➕ Add to Squad (Team)'}
            </Text>
          </TouchableOpacity>

          {/* Compare Shortcut Button */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              if (pokemon) {
                router.push(`/compare?pokemonA=${pokemon.id}`);
              }
            }}
            style={[
              styles.teamButton,
              {
                backgroundColor: colorScheme.surface,
                borderWidth: 1,
                borderColor: colorScheme.outline,
              },
            ]}
          >
            <Text style={[styles.teamButtonText, { color: colorScheme.onSurface }]}>
              ⚔️ Compare with another Pokémon
            </Text>
          </TouchableOpacity>

          {/* Section 1: Animated Base Stats Bar Chart */}
          {pokemon.stats ? (
            <View
              style={[
                styles.card,
                {
                  backgroundColor: colorScheme.surface,
                  borderColor: colorScheme.outline,
                },
              ]}
            >
              <View style={styles.cardHeaderRow}>
                <Text style={[styles.cardTitle, { color: colorScheme.onSurface }]}>
                  Base Stats
                </Text>
                <Text style={[styles.totalStatsBadge, { color: colorScheme.primary }]}>
                  Total: {totalStats}
                </Text>
              </View>

              <StatBar label="HP" value={pokemon.stats.hp} index={0} />
              <StatBar label="Attack" value={pokemon.stats.attack} index={1} />
              <StatBar label="Defense" value={pokemon.stats.defense} index={2} />
              <StatBar label="Sp. Atk" value={pokemon.stats.specialAttack} index={3} />
              <StatBar label="Sp. Def" value={pokemon.stats.specialDefense} index={4} />
              <StatBar label="Speed" value={pokemon.stats.speed} index={5} />
            </View>
          ) : null}

          {/* Defensive Type Matrix Card */}
          {defensiveMatchups.length > 0 ? (
            <View
              style={[
                styles.card,
                {
                  backgroundColor: colorScheme.surface,
                  borderColor: colorScheme.outline,
                },
              ]}
            >
              <Text style={[styles.cardTitle, { color: colorScheme.onSurface }]}>
                Type Matchups
              </Text>

              <View style={styles.matchupRowsContainer}>
                {defensiveMatchups.map((group) => (
                  <View key={group.label} style={styles.matchupRow}>
                    <Text style={[styles.matchupLabel, { color: colorScheme.secondary }]}>
                      {group.label}
                    </Text>
                    <View style={styles.matchupChips}>
                      {group.types.map((t) => (
                        <TypeChip key={t} type={t} size="small" />
                      ))}
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {/* Section 2: Evolution Chain */}
          {evolutionChain.length > 0 ? (
            <View
              style={[
                styles.card,
                {
                  backgroundColor: colorScheme.surface,
                  borderColor: colorScheme.outline,
                },
              ]}
            >
              <Text style={[styles.cardTitle, { color: colorScheme.onSurface }]}>
                Evolution Family ({evolutionChain.length})
              </Text>

              <View
                style={
                  evolutionChain.length <= 3
                    ? styles.evolutionRow
                    : styles.evolutionGrid
                }
              >
                {evolutionChain.map((stage, idx) => (
                  <React.Fragment key={stage.id}>
                    {evolutionChain.length <= 3 && idx > 0 ? (
                      <View style={styles.evoArrowContainer}>
                        <Text style={[styles.evoArrow, { color: colorScheme.primary }]}>→</Text>
                      </View>
                    ) : null}

                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => router.push(`/pokemon/${stage.id}`)}
                      style={[
                        evolutionChain.length <= 3 ? styles.evoStageCard : styles.evoGridCard,
                        {
                          backgroundColor:
                            stage.id === pokemon.id
                              ? colorScheme.primaryContainer
                              : colorScheme.surface,
                          borderColor:
                            stage.id === pokemon.id
                              ? colorScheme.primary
                              : colorScheme.outline,
                        },
                      ]}
                    >
                      <Image
                        source={{ uri: stage.spriteUrl }}
                        style={styles.evoSprite}
                        contentFit="contain"
                      />
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.evoName,
                          {
                            color:
                              stage.id === pokemon.id
                                ? colorScheme.onPrimaryContainer
                                : colorScheme.onSurface,
                          },
                        ]}
                      >
                        {stage.name.charAt(0).toUpperCase() + stage.name.slice(1)}
                      </Text>
                      <Text
                        style={[
                          styles.evoNumber,
                          { color: colorScheme.secondary },
                        ]}
                      >
                        #{stage.number}
                      </Text>
                    </TouchableOpacity>
                  </React.Fragment>
                ))}
              </View>
            </View>
          ) : null}

          {/* Section 3: Abilities List */}
          {pokemon.abilities && pokemon.abilities.length > 0 ? (
            <View
              style={[
                styles.card,
                {
                  backgroundColor: colorScheme.surface,
                  borderColor: colorScheme.outline,
                },
              ]}
            >
              <Text style={[styles.cardTitle, { color: colorScheme.onSurface }]}>
                Abilities
              </Text>

              <View style={styles.abilitiesList}>
                {pokemon.abilities.map((ab) => (
                  <View
                    key={ab.name}
                    style={[
                      styles.abilityCard,
                      {
                        backgroundColor: colorScheme.surface,
                        borderColor: colorScheme.outline,
                      },
                    ]}
                  >
                    <View style={styles.abilityHeader}>
                      <Text style={[styles.abilityName, { color: colorScheme.onSurface }]}>
                        {ab.name.toUpperCase()}
                      </Text>
                      {ab.isHidden ? (
                        <View
                          style={[
                            styles.hiddenBadge,
                            { backgroundColor: colorScheme.secondary },
                          ]}
                        >
                          <Text style={[styles.hiddenBadgeText, { color: colorScheme.onSecondary }]}>
                            Hidden
                          </Text>
                        </View>
                      ) : null}
                    </View>
                    {ab.effect ? (
                      <Text style={[styles.abilityEffect, { color: colorScheme.secondary }]}>
                        {ab.effect}
                      </Text>
                    ) : null}
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {/* Section 4: Moves List & In-List Search */}
          {pokemon.moves && pokemon.moves.length > 0 ? (
            <View
              style={[
                styles.card,
                {
                  backgroundColor: colorScheme.surface,
                  borderColor: colorScheme.outline,
                },
              ]}
            >
              <View style={styles.cardHeaderRow}>
                <Text style={[styles.cardTitle, { color: colorScheme.onSurface }]}>
                  Moves ({filteredMoves.length})
                </Text>
              </View>

              {/* Moves Search Input */}
              <TextInput
                value={moveSearch}
                onChangeText={setMoveSearch}
                placeholder="Filter moves..."
                placeholderTextColor={colorScheme.secondary}
                style={[
                  styles.moveSearchInput,
                  {
                    backgroundColor: colorScheme.surface,
                    color: colorScheme.onSurface,
                    borderColor: colorScheme.outline,
                  },
                ]}
              />

              <View style={styles.movesList}>
                {filteredMoves.slice(0, 40).map((mv, idx) => (
                  <View
                    key={`${mv.name}-${idx}`}
                    style={[
                      styles.moveRow,
                      { borderBottomColor: colorScheme.outline },
                    ]}
                  >
                    <Text style={[styles.moveName, { color: colorScheme.onSurface }]}>
                      {mv.name}
                    </Text>
                    <View
                      style={[
                        styles.moveLevelBadge,
                        { backgroundColor: colorScheme.secondaryContainer },
                      ]}
                    >
                      <Text style={[styles.moveLevelText, { color: colorScheme.onSecondaryContainer }]}>
                        {mv.levelLearned ? `Lvl ${mv.levelLearned}` : mv.learnMethod}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ) : null}
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </AnimatedThemeView>
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
    fontSize: 16,
    fontWeight: '600',
  },
  headerNumber: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
    fontVariant: ['tabular-nums'],
  },
  shinyButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
    borderWidth: 1,
  },
  shinyText: {
    fontSize: 12,
    fontWeight: '600',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 16,
  },
  heroContainer: {
    width: '100%',
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    position: 'relative',
  },
  heroArtworkWrapper: {
    position: 'absolute',
    width: 210,
    height: 210,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroArtwork: {
    width: 210,
    height: 210,
  },
  nameHeader: {
    alignItems: 'center',
    gap: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  pokemonTitle: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  typesRow: {
    flexDirection: 'row',
    gap: 8,
  },
  card: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  metricItem: {
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.66,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 17,
    fontWeight: '600',
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
    fontVariant: ['tabular-nums'],
  },
  metricDivider: {
    width: 1,
    height: 28,
  },
  flavorText: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 21,
    textAlign: 'center',
    marginTop: 4,
  },
  teamButton: {
    height: 46,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 2,
  },
  teamButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.66,
    textTransform: 'uppercase',
  },
  totalStatsBadge: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
    fontVariant: ['tabular-nums'],
  },
  evolutionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 4,
  },
  evolutionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 8,
    marginTop: 4,
  },
  evoStageCard: {
    flex: 1,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  evoGridCard: {
    width: '31%',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  evoSprite: {
    width: 64,
    height: 64,
    marginBottom: 4,
  },
  evoName: {
    fontSize: 12,
    fontWeight: '600',
  },
  evoNumber: {
    fontSize: 11,
    fontWeight: '500',
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
    fontVariant: ['tabular-nums'],
  },
  evoArrowContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  evoArrow: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  abilitiesList: {
    gap: 10,
    marginTop: 4,
  },
  abilityCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  abilityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  abilityName: {
    fontSize: 13,
    fontWeight: '700',
  },
  hiddenBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  hiddenBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  abilityEffect: {
    fontSize: 13,
    lineHeight: 18,
  },
  moveSearchInput: {
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 13,
    fontWeight: '500',
    marginTop: 4,
  },
  movesList: {
    marginTop: 4,
  },
  moveRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  moveName: {
    fontSize: 14,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  moveLevelBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  moveLevelText: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
    fontVariant: ['tabular-nums'],
  },
  matchupRowsContainer: {
    gap: 12,
    marginTop: 4,
  },
  matchupRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  matchupLabel: {
    width: 96,
    fontSize: 12,
    fontWeight: '700',
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
  },
  matchupChips: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center',
  },
});
