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
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { useAppTheme, AnimatedThemeView } from '../../src/theme';
import { useAppDb } from '../_layout';
import { getPokemonById, getEvolutionChainForPokemon, getVariantsForPokemon, getSpecialFormsForPokemon, getUserSetting, setUserSetting } from '../../src/db/queries';
import { insertSpecialForm, insertVariant } from '../../src/db/sync';
import { fetchSpecialFormsForSpecies, fetchRegionalVariantsForSpecies } from '../../src/api/pokeapi';
import { Pokemon, PokemonVariant, PokemonSpecialForm } from '../../src/types';
import { TypeChip, StatBar, PokemonCryButton, DetailOnboardingOverlay, StatusTooltipOverlay, StepKey, TargetLayout } from '../../src/components';
import { useToggleSquadMutation } from '../../src/hooks/useTeamQuery';
import { useTrainerProfile } from '../../src/hooks/useTrainerProfile';
import { useCollectionStatus } from '../../src/hooks/useCollectionStatus';
import { getDefensiveMatchups } from '../../src/data/typeChart';
import { hapticMedium, hapticSuccess, hapticLight } from '../../src/utils/haptics';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withRepeat,
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
  const [variants, setVariants] = useState<PokemonVariant[]>([]);
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null);
  const [familyVariantsMap, setFamilyVariantsMap] = useState<Record<number, PokemonVariant[]>>({});

  const [specialForms, setSpecialForms] = useState<PokemonSpecialForm[]>([]);
  const [selectedSpecialFormId, setSelectedSpecialFormId] = useState<number | null>(null);
  const [isSpecialFormActive, setIsSpecialFormActive] = useState<boolean>(false);

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

  const {
    toggleFavorite: toggleFavoriteMut,
    toggleShinyOwned: toggleShinyOwnedMut,
    toggleAlpha: toggleAlphaMut,
    toggleCompetitiveBuild: toggleCompetitiveBuildMut,
  } = useCollectionStatus(db);

  const [isFavorite, setIsFavorite] = useState<boolean>(false);
  const [shinyOwned, setShinyOwned] = useState<boolean>(false);
  const [isAlpha, setIsAlpha] = useState<boolean>(false);
  const [hasCompetitiveBuild, setHasCompetitiveBuild] = useState<boolean>(false);

  const { recordSeen, toggleCaught } = useTrainerProfile(db);
  const [isCaught, setIsCaught] = useState<boolean>(false);
  const catchScale = useSharedValue(1);

  const rootRef = React.useRef<View>(null);

  // Onboarding Tour & Long Press Tooltip state & refs
  const [tourVisible, setTourVisible] = useState<boolean>(false);
  const [tourStepIndex, setTourStepIndex] = useState<number>(0);
  const [targetLayouts, setTargetLayouts] = useState<Partial<Record<StepKey, TargetLayout>>>({});
  const [activeTooltip, setActiveTooltip] = useState<{ key: StepKey; layout: TargetLayout } | null>(null);

  const favRef = React.useRef<View>(null);
  const caughtRef = React.useRef<View>(null);
  const shinyRef = React.useRef<View>(null);
  const alphaRef = React.useRef<View>(null);
  const buildRef = React.useRef<View>(null);
  const specialFormRef = React.useRef<View>(null);

  const measureTarget = useCallback((key: StepKey) => {
    const refMap: Record<StepKey, React.RefObject<View | null>> = {
      fav: favRef,
      caught: caughtRef,
      shiny: shinyRef,
      alpha: alphaRef,
      build: buildRef,
      specialForm: specialFormRef,
    };
    const targetRef = refMap[key];
    if (targetRef?.current && rootRef.current) {
      targetRef.current.measureLayout(
        rootRef.current,
        (left, top, width, height) => {
          if (width > 0 && height > 0) {
            setTargetLayouts((prev) => ({
              ...prev,
              [key]: { x: left, y: top, width, height },
            }));
          }
        },
        () => {}
      );
    }
  }, []);

  const measureAllTargets = useCallback(() => {
    if (!rootRef.current) return;
    const refMap: Record<StepKey, React.RefObject<View | null>> = {
      fav: favRef,
      caught: caughtRef,
      shiny: shinyRef,
      alpha: alphaRef,
      build: buildRef,
      specialForm: specialFormRef,
    };

    const keys: StepKey[] = ['fav', 'caught', 'shiny', 'alpha', 'build', 'specialForm'];
    keys.forEach((key) => {
      const targetRef = refMap[key];
      if (targetRef?.current && rootRef.current) {
        targetRef.current.measureLayout(
          rootRef.current,
          (left, top, width, height) => {
            if (width > 0 && height > 0) {
              setTargetLayouts((prev) => ({
                ...prev,
                [key]: { x: left, y: top, width, height },
              }));
            }
          },
          () => {}
        );
      }
    });
  }, []);

  const handleCompleteOrSkipTour = useCallback(async () => {
    setTourVisible(false);
    await setUserSetting(db, 'has_seen_detail_onboarding', 'true');
  }, [db]);

  const handleNextTourStep = useCallback(() => {
    const maxSteps = specialForms.length > 0 ? 6 : 5;
    if (tourStepIndex < maxSteps - 1) {
      const nextIndex = tourStepIndex + 1;
      setTourStepIndex(nextIndex);
      const stepKeys: StepKey[] = specialForms.length > 0
        ? ['fav', 'caught', 'shiny', 'alpha', 'build', 'specialForm']
        : ['fav', 'caught', 'shiny', 'alpha', 'build'];
      if (stepKeys[nextIndex]) {
        setTimeout(() => measureTarget(stepKeys[nextIndex]), 50);
      }
    } else {
      handleCompleteOrSkipTour();
    }
  }, [tourStepIndex, specialForms.length, handleCompleteOrSkipTour, measureTarget]);

  const handleReplayTour = useCallback(() => {
    hapticMedium();
    measureAllTargets();
    setTourStepIndex(0);
    setTourVisible(true);
    setTimeout(() => measureTarget('fav'), 50);
  }, [measureAllTargets, measureTarget]);

  const handleLongPressIcon = useCallback((key: StepKey, ref: React.RefObject<View | null>) => {
    hapticMedium();
    if (ref.current && rootRef.current) {
      ref.current.measureLayout(
        rootRef.current,
        (left, top, width, height) => {
          if (width > 0 && height > 0) {
            setActiveTooltip({ key, layout: { x: left, y: top, width, height } });
          }
        },
        () => {}
      );
    }
  }, []);


  // Load Pokemon & Evolution Chain & Variants & Special Forms
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      if (!id) return;
      setLoading(true);
      try {
        const numId = parseInt(id, 10);
        let [pData, evoData, vData, sfData, defaultShinyVal, hasSeenOnboardingVal] = await Promise.all([
          getPokemonById(db, numId),
          getEvolutionChainForPokemon(db, numId),
          getVariantsForPokemon(db, numId),
          getSpecialFormsForPokemon(db, numId),
          getUserSetting(db, 'shiny_by_default', 'false'),
          getUserSetting(db, 'has_seen_detail_onboarding', 'false'),
        ]);

        if (isMounted && pData) {
          const shouldDefaultShiny = defaultShinyVal === 'true';
          setPokemon(pData);
          setInTeam(Boolean(pData.isInTeam));
          setIsCaught(Boolean(pData.isCaught));
          setIsFavorite(Boolean(pData.isFavorite));
          setShinyOwned(Boolean(pData.shinyOwned));
          setIsAlpha(Boolean(pData.isAlpha));
          setHasCompetitiveBuild(Boolean(pData.hasCompetitiveBuild));
          recordSeen(pData.id);
          setEvolutionChain(evoData);
          setVariants(vData);
          setSelectedVariantId(null);
          setSpecialForms(sfData);
          setSelectedSpecialFormId(null);
          setIsSpecialFormActive(false);
          setIsShiny(shouldDefaultShiny);

          if (hasSeenOnboardingVal !== 'true') {
            setTimeout(() => {
              measureAllTargets();
              setTourStepIndex(0);
              setTourVisible(true);
            }, 450);
          }

          // Fetch family variants map for dynamic evolution chain mapping
          const fMap: Record<number, PokemonVariant[]> = { [numId]: vData };
          for (const node of evoData) {
            if (node.id !== numId) {
              const nVars = await getVariantsForPokemon(db, node.id);
              if (nVars.length > 0) fMap[node.id] = nVars;
            }
          }
          setFamilyVariantsMap(fMap);

          if (shouldDefaultShiny) {
            setThemeByTypes('electric', 'dragon');
          } else {
            setThemeForPokemon(pData);
          }

          setLoading(false);

          // Background on-demand fetch & cache for Special Forms if not cached yet
          if (sfData.length === 0) {
            fetchSpecialFormsForSpecies(numId, pData.name)
              .then(async (fetchedSF) => {
                if (fetchedSF && fetchedSF.length > 0) {
                  for (const sf of fetchedSF) {
                    await insertSpecialForm(db, sf);
                  }
                  const freshSF = await getSpecialFormsForPokemon(db, numId);
                  if (isMounted && freshSF.length > 0) {
                    setSpecialForms(freshSF);
                  }
                }
              })
              .catch(() => {});
          }

          // Background on-demand fetch & cache for Regional Variants if not cached yet
          if (vData.length === 0) {
            fetchRegionalVariantsForSpecies(numId)
              .then(async (fetchedV) => {
                if (fetchedV && fetchedV.length > 0) {
                  for (const v of fetchedV) {
                    await insertVariant(db, v);
                  }
                  const freshV = await getVariantsForPokemon(db, numId);
                  if (isMounted && freshV.length > 0) {
                    setVariants(freshV);
                  }
                }
              })
              .catch(() => {});
          }
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

  const [isAlphaActive, setIsAlphaActive] = useState<boolean>(false);
  const isHasFormOrVariant = Boolean(selectedVariantId !== null || isSpecialFormActive);

  // Turn off Alpha view mode if user switches to a variant or special form
  useEffect(() => {
    if (isHasFormOrVariant && isAlphaActive) {
      setIsAlphaActive(false);
    }
  }, [isHasFormOrVariant, isAlphaActive]);

  // Reanimated values for Artwork Mount & Shiny Cross-Fade & Alpha Glow
  const shinyOpacity = useSharedValue(0);
  const heroScale = useSharedValue(0.92);
  const heroMountOpacity = useSharedValue(0);
  const alphaScale = useSharedValue(1);
  const alphaGlowPulse = useSharedValue(0);

  useEffect(() => {
    shinyOpacity.value = withTiming(isShiny ? 1 : 0, {
      duration: 200,
      easing: Easing.inOut(Easing.quad),
    });
  }, [isShiny]);

  useEffect(() => {
    if (isAlphaActive && !isHasFormOrVariant) {
      alphaScale.value = withTiming(1.18, { duration: 300, easing: Easing.out(Easing.quad) });
      alphaGlowPulse.value = withRepeat(
        withSequence(
          withTiming(0.85, { duration: 900, easing: Easing.inOut(Easing.quad) }),
          withTiming(0.35, { duration: 900, easing: Easing.inOut(Easing.quad) })
        ),
        -1,
        true
      );
    } else {
      alphaScale.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.quad) });
      alphaGlowPulse.value = withTiming(0, { duration: 300 });
    }
  }, [isAlphaActive, isHasFormOrVariant]);

  useEffect(() => {
    if (pokemon) {
      heroScale.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.quad) });
      heroMountOpacity.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.quad) });
    }
  }, [pokemon]);

  const alphaGlowStyle = useAnimatedStyle(() => ({
    opacity: alphaGlowPulse.value,
  }));

  const normalArtworkStyle = useAnimatedStyle(() => ({
    opacity: (1 - shinyOpacity.value) * heroMountOpacity.value,
    transform: [{ scale: heroScale.value * alphaScale.value }],
  }));

  const shinyArtworkStyle = useAnimatedStyle(() => ({
    opacity: shinyOpacity.value * heroMountOpacity.value,
    transform: [{ scale: heroScale.value * alphaScale.value }],
  }));

  const selectedVariant = useMemo(
    () => (selectedVariantId !== null ? variants.find((v) => v.id === selectedVariantId) || null : null),
    [selectedVariantId, variants]
  );

  const selectedSpecialForm = useMemo(
    () => (isSpecialFormActive && selectedSpecialFormId !== null ? specialForms.find((sf) => sf.id === selectedSpecialFormId) || null : null),
    [isSpecialFormActive, selectedSpecialFormId, specialForms]
  );

  const activePrimaryType = selectedSpecialForm
    ? selectedSpecialForm.primaryType
    : selectedVariant
    ? selectedVariant.primaryType
    : pokemon?.primaryType || 'normal';

  const activeSecondaryType = selectedSpecialForm
    ? selectedSpecialForm.secondaryType
    : selectedVariant
    ? selectedVariant.secondaryType
    : pokemon?.secondaryType;

  const activeNormalArtwork = selectedSpecialForm
    ? selectedSpecialForm.officialArtworkUrl || selectedSpecialForm.spriteUrl
    : selectedVariant
    ? selectedVariant.officialArtworkUrl || selectedVariant.spriteUrl
    : pokemon?.officialArtworkUrl || pokemon?.spriteUrl || '';

  const activeShinyArtwork = selectedSpecialForm
    ? selectedSpecialForm.shinyArtworkUrl || selectedSpecialForm.officialArtworkUrl || selectedSpecialForm.shinySpriteUrl || selectedSpecialForm.spriteUrl
    : selectedVariant
    ? selectedVariant.shinyArtworkUrl || selectedVariant.officialArtworkUrl || selectedVariant.shinySpriteUrl || selectedVariant.spriteUrl
    : pokemon?.shinyArtworkUrl || pokemon?.officialArtworkUrl || pokemon?.shinySpriteUrl || pokemon?.spriteUrl || '';

  const baseStats = selectedSpecialForm ? selectedSpecialForm.stats : selectedVariant ? selectedVariant.stats : pokemon?.stats;
  const activeStats = useMemo(() => {
    if (!baseStats) return undefined;
    if (!isAlphaActive) return baseStats;
    return {
      hp: Math.round(baseStats.hp * 1.5),
      attack: Math.round(baseStats.attack * 1.5),
      defense: Math.round(baseStats.defense * 1.5),
      specialAttack: Math.round(baseStats.specialAttack * 1.5),
      specialDefense: Math.round(baseStats.specialDefense * 1.5),
      speed: Math.round(baseStats.speed * 1.5),
    };
  }, [baseStats, isAlphaActive]);

  const activeAbilities = selectedSpecialForm ? selectedSpecialForm.abilities : selectedVariant ? selectedVariant.abilities : pokemon?.abilities;
  const activeHeight = selectedSpecialForm?.height ?? selectedVariant?.height ?? pokemon?.height ?? 0;
  const activeWeight = selectedSpecialForm?.weight ?? selectedVariant?.weight ?? pokemon?.weight ?? 0;
  const activeFlavorText = selectedSpecialForm?.flavorText || selectedVariant?.flavorText || pokemon?.flavorText || '';

  const handleSelectVariant = useCallback(
    (vId: number | null) => {
      hapticMedium();
      setSelectedVariantId(vId);
      // Reverting special form if active when changing regional variant
      if (isSpecialFormActive) {
        setIsSpecialFormActive(false);
        setSelectedSpecialFormId(null);
      }

      const targetVar = vId !== null ? variants.find((v) => v.id === vId) : null;
      if (targetVar) {
        setThemeByTypes(targetVar.primaryType, targetVar.secondaryType || undefined);
      } else if (pokemon) {
        if (isShiny) {
          setThemeByTypes('electric', 'dragon');
        } else {
          setThemeForPokemon(pokemon);
        }
      }
    },
    [variants, pokemon, isShiny, isSpecialFormActive, setThemeByTypes, setThemeForPokemon]
  );

  const handleActivateSpecialForm = useCallback(
    (formId: number) => {
      hapticMedium();
      setIsSpecialFormActive(true);
      setSelectedSpecialFormId(formId);

      const targetForm = specialForms.find((sf) => sf.id === formId);
      if (targetForm) {
        setThemeByTypes(targetForm.primaryType, targetForm.secondaryType || undefined);
      }
    },
    [specialForms, setThemeByTypes]
  );

  const handleSelectSpecialForm = useCallback(
    (formId: number) => {
      hapticMedium();
      setSelectedSpecialFormId(formId);

      const targetForm = specialForms.find((sf) => sf.id === formId);
      if (targetForm) {
        setThemeByTypes(targetForm.primaryType, targetForm.secondaryType || undefined);
      }
    },
    [specialForms, setThemeByTypes]
  );

  const handleRevertSpecialForm = useCallback(() => {
    hapticMedium();
    setIsSpecialFormActive(false);
    setSelectedSpecialFormId(null);

    if (selectedVariant) {
      setThemeByTypes(selectedVariant.primaryType, selectedVariant.secondaryType || undefined);
    } else if (pokemon) {
      if (isShiny) {
        setThemeByTypes('electric', 'dragon');
      } else {
        setThemeForPokemon(pokemon);
      }
    }
  }, [selectedVariant, pokemon, isShiny, setThemeByTypes, setThemeForPokemon]);

  // Handle Shiny Toggle
  const toggleShiny = useCallback(() => {
    if (!pokemon) return;
    hapticMedium();
    const nextShiny = !isShiny;
    setIsShiny(nextShiny);

    if (nextShiny) {
      setThemeByTypes('electric', 'dragon');
    } else {
      if (selectedSpecialForm) {
        setThemeByTypes(selectedSpecialForm.primaryType, selectedSpecialForm.secondaryType || undefined);
      } else if (selectedVariant) {
        setThemeByTypes(selectedVariant.primaryType, selectedVariant.secondaryType || undefined);
      } else {
        setThemeForPokemon(pokemon);
      }
    }
  }, [isShiny, pokemon, selectedSpecialForm, selectedVariant, setThemeByTypes, setThemeForPokemon]);

  // Handle Catch Toggle
  const handleToggleCatch = useCallback(async () => {
    if (!pokemon) return;
    hapticSuccess();
    catchScale.value = withSequence(
      withTiming(1.25, { duration: 120, easing: Easing.out(Easing.quad) }),
      withTiming(1, { duration: 120, easing: Easing.out(Easing.quad) })
    );
    const res = await toggleCaught(pokemon.id);
    setIsCaught(res.isCaught);
  }, [pokemon, toggleCaught, catchScale]);

  const catchAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: catchScale.value }],
  }));

  // Filter Moves
  const filteredMoves = useMemo(() => {
    if (!pokemon?.moves) return [];
    const query = moveSearch.trim().toLowerCase();
    if (!query) return pokemon.moves;
    return pokemon.moves.filter((m) => m.name.toLowerCase().includes(query));
  }, [pokemon?.moves, moveSearch]);

  // Height & Weight formatting
  const formattedHeight = `${(activeHeight / 10).toFixed(1)} m`;
  const formattedWeight = `${(activeWeight / 10).toFixed(1)} kg`;

  const formattedName = useMemo(() => {
    if (!pokemon) return '';
    if (selectedSpecialForm) {
      return selectedSpecialForm.formLabel;
    }
    if (selectedVariant) {
      return `${selectedVariant.regionLabel} ${pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1)}`;
    }
    return pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1);
  }, [pokemon, selectedVariant, selectedSpecialForm]);

  // Stats Total calculation
  const totalStats = useMemo(() => {
    if (!activeStats) return 0;
    const s = activeStats;
    return s.hp + s.attack + s.defense + s.specialAttack + s.specialDefense + s.speed;
  }, [activeStats]);

  // Defensive Type Matchups calculation
  const defensiveMatchups = useMemo(() => {
    if (!activePrimaryType) return [];
    return getDefensiveMatchups(activePrimaryType, activeSecondaryType);
  }, [activePrimaryType, activeSecondaryType]);

  const displayEvolutionChain = useMemo(() => {
    if (!selectedVariant) return evolutionChain;
    return evolutionChain.map((item) => {
      if (item.id === pokemon?.id) {
        return {
          ...item,
          name: `${selectedVariant.regionLabel} ${pokemon.name}`,
          spriteUrl: selectedVariant.officialArtworkUrl || selectedVariant.spriteUrl,
        };
      }
      const matchVar = familyVariantsMap[item.id]?.find(
        (v) => v.regionLabel.toLowerCase() === selectedVariant.regionLabel.toLowerCase()
      );
      if (matchVar) {
        return {
          ...item,
          name: `${matchVar.regionLabel} ${item.name}`,
          spriteUrl: matchVar.officialArtworkUrl || matchVar.spriteUrl,
        };
      }
      return item;
    });
  }, [evolutionChain, selectedVariant, familyVariantsMap, pokemon?.id, pokemon?.name]);

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
    <AnimatedThemeView ref={rootRef} style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        {/* Top Nav Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={20} color={colorScheme.primary} />
            <Text style={[styles.backText, { color: colorScheme.primary }]}>Back</Text>
          </TouchableOpacity>

          <Text style={[styles.headerNumber, { color: colorScheme.onBackground }]}>
            {pokemon.number.startsWith('#') ? pokemon.number : `#${pokemon.number}`}
          </Text>

          {/* Shiny Preview Toggle */}
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
            {isAlphaActive ? (
              <Animated.View style={[styles.alphaGlowCircle, alphaGlowStyle]} />
            ) : null}
            <Animated.View style={[styles.heroArtworkWrapper, normalArtworkStyle]}>
              <AnimatedImage
                sharedTransitionTag={`pokemon-image-${pokemon.id}`}
                source={{
                  uri: activeNormalArtwork,
                }}
                style={styles.heroArtwork}
                contentFit="contain"
              />
            </Animated.View>
            <Animated.View style={[styles.heroArtworkWrapper, shinyArtworkStyle]}>
              <Image
                source={{
                  uri: activeShinyArtwork,
                }}
                style={styles.heroArtwork}
                contentFit="contain"
              />
            </Animated.View>
          </View>

          {/* Staggered Body Content */}
          <Animated.View entering={FadeIn.delay(250).duration(200)} style={{ gap: 16 }}>
            {/* Name & Type Chips Header & Status Row */}
            <View style={styles.nameHeader}>
              <View style={styles.titleRow}>
                <Text
                  style={[
                    styles.pokemonTitle,
                    {
                      color: colorScheme.onBackground,
                      fontSize: formattedName.length > 18 ? 20 : formattedName.length > 14 ? 24 : 28,
                    },
                  ]}
                  numberOfLines={2}
                >
                  {formattedName}
                </Text>
                {isAlphaActive ? (
                  <View style={styles.alphaTag}>
                    <Ionicons name="flag" size={10} color="#FFFFFF" />
                    <Text style={styles.alphaTagText}>ALPHA</Text>
                  </View>
                ) : null}
                <PokemonCryButton pokemonId={pokemon.id} pokemonName={pokemon.name} />
              </View>
              <View style={styles.typesRow}>
                <TypeChip type={activePrimaryType} size="medium" />
                {activeSecondaryType ? (
                  <TypeChip type={activeSecondaryType} size="medium" />
                ) : null}
              </View>

              {/* Collection Status Section Header */}
              <View style={styles.statusSectionHeader}>
                <Text style={[styles.statusSectionLabel, { color: colorScheme.secondary }]}>
                  COLLECTION STATUS
                </Text>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={handleReplayTour}
                  style={styles.statusHelpButton}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name="help-circle-outline"
                    size={16}
                    color={colorScheme.onSurfaceVariant}
                  />
                </TouchableOpacity>
              </View>

              {/* Status Row */}
              <View
                style={[
                  styles.statusRowContainer,
                  {
                    backgroundColor: colorScheme.surfaceVariant + '40',
                    borderColor: colorScheme.outline + '30',
                  },
                ]}
              >


                {/* Favorite Toggle */}
                <TouchableOpacity
                  ref={favRef}
                  activeOpacity={0.7}
                  delayLongPress={300}
                  onLongPress={() => handleLongPressIcon('fav', favRef)}
                  onPress={async () => {
                    if (!pokemon) return;
                    hapticMedium();
                    const res = await toggleFavoriteMut(pokemon.id);
                    setIsFavorite(res);
                  }}
                  style={styles.statusRowButton}
                >
                  <Ionicons
                    name={isFavorite ? 'heart' : 'heart-outline'}
                    size={16}
                    color={isFavorite ? '#F43F5E' : colorScheme.onSurfaceVariant}
                  />
                  <Text
                    style={[
                      styles.statusRowText,
                      { color: isFavorite ? '#F43F5E' : colorScheme.onSurfaceVariant },
                    ]}
                  >
                    Fav
                  </Text>
                </TouchableOpacity>

                {/* Caught Toggle */}
                <TouchableOpacity
                  ref={caughtRef}
                  activeOpacity={0.7}
                  delayLongPress={300}
                  onLongPress={() => handleLongPressIcon('caught', caughtRef)}
                  onPress={handleToggleCatch}
                  style={styles.statusRowButton}
                >
                  <Animated.View style={catchAnimStyle}>
                    <Ionicons
                      name={isCaught ? 'disc' : 'disc-outline'}
                      size={16}
                      color={isCaught ? '#EF4444' : colorScheme.onSurfaceVariant}
                    />
                  </Animated.View>
                  <Text
                    style={[
                      styles.statusRowText,
                      { color: isCaught ? '#EF4444' : colorScheme.onSurfaceVariant },
                    ]}
                  >
                    Caught
                  </Text>
                </TouchableOpacity>

                {/* Shiny Owned Toggle */}
                <TouchableOpacity
                  ref={shinyRef}
                  activeOpacity={0.7}
                  delayLongPress={300}
                  onLongPress={() => handleLongPressIcon('shiny', shinyRef)}
                  onPress={async () => {
                    if (!pokemon) return;
                    hapticMedium();
                    const res = await toggleShinyOwnedMut(pokemon.id);
                    setShinyOwned(res);
                  }}
                  style={styles.statusRowButton}
                >
                  <Ionicons
                    name={shinyOwned ? 'star' : 'star-outline'}
                    size={16}
                    color={shinyOwned ? '#F59E0B' : colorScheme.onSurfaceVariant}
                  />
                  <Text
                    style={[
                      styles.statusRowText,
                      { color: shinyOwned ? '#F59E0B' : colorScheme.onSurfaceVariant },
                    ]}
                  >
                    Shiny
                  </Text>
                </TouchableOpacity>

                {/* Alpha Toggle (Hidden when variant or special form is active) */}
                {!isHasFormOrVariant ? (
                  <TouchableOpacity
                    ref={alphaRef}
                    activeOpacity={0.7}
                    delayLongPress={300}
                    onLongPress={() => handleLongPressIcon('alpha', alphaRef)}
                    onPress={async () => {
                      if (!pokemon) return;
                      hapticMedium();
                      const nextAlphaState = !isAlphaActive;
                      setIsAlphaActive(nextAlphaState);
                      const res = await toggleAlphaMut(pokemon.id);
                      setIsAlpha(res);
                    }}
                    style={[
                      styles.statusRowButton,
                      isAlphaActive && {
                        backgroundColor: '#FEE2E2',
                        borderRadius: 6,
                      },
                    ]}
                  >
                    <Ionicons
                      name={isAlphaActive || isAlpha ? 'flag' : 'flag-outline'}
                      size={16}
                      color={isAlphaActive || isAlpha ? '#DC2626' : colorScheme.onSurfaceVariant}
                    />
                    <Text
                      style={[
                        styles.statusRowText,
                        { color: isAlphaActive || isAlpha ? '#DC2626' : colorScheme.onSurfaceVariant },
                      ]}
                    >
                      {isAlphaActive ? 'Alpha ON' : 'Alpha'}
                    </Text>
                  </TouchableOpacity>
                ) : null}

                {/* Competitive Build Button */}
                <TouchableOpacity
                  ref={buildRef}
                  activeOpacity={0.7}
                  delayLongPress={300}
                  onLongPress={() => handleLongPressIcon('build', buildRef)}
                  onPress={() => {
                    if (!pokemon) return;
                    hapticMedium();
                    router.push(`/pokemon/${pokemon.id}/builds`);
                  }}
                  style={styles.statusRowButton}
                >
                  <Ionicons
                    name={hasCompetitiveBuild ? 'ribbon' : 'ribbon-outline'}
                    size={16}
                    color={hasCompetitiveBuild ? '#06B6D4' : colorScheme.onSurfaceVariant}
                  />
                  <Text
                    style={[
                      styles.statusRowText,
                      { color: hasCompetitiveBuild ? '#06B6D4' : colorScheme.onSurfaceVariant },
                    ]}
                  >
                    Build
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Special Battle & Alternate Forms Segmented Pills */}
            {specialForms.length > 0 ? (
              <View ref={specialFormRef} style={styles.variantSelectorContainer}>

                <Text style={[styles.variantSelectorLabel, { color: colorScheme.secondary }]}>
                  SPECIAL FORM
                </Text>
                <View style={styles.variantPillRow}>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={handleRevertSpecialForm}
                    style={[
                      styles.variantPill,
                      !isSpecialFormActive
                        ? { backgroundColor: colorScheme.primary }
                        : { backgroundColor: colorScheme.surface, borderColor: colorScheme.outline, borderWidth: 1 },
                    ]}
                  >
                    <Text
                      style={[
                        styles.variantPillText,
                        !isSpecialFormActive
                          ? { color: colorScheme.onPrimary }
                          : { color: colorScheme.onSurface },
                      ]}
                    >
                      Base
                    </Text>
                  </TouchableOpacity>

                  {specialForms.map((sf) => {
                    const isSelected = isSpecialFormActive && selectedSpecialFormId === sf.id;
                    return (
                      <TouchableOpacity
                        key={sf.id}
                        activeOpacity={0.7}
                        onPress={() => handleActivateSpecialForm(sf.id)}
                        style={[
                          styles.variantPill,
                          isSelected
                            ? { backgroundColor: colorScheme.primary }
                            : { backgroundColor: colorScheme.surface, borderColor: colorScheme.outline, borderWidth: 1 },
                        ]}
                      >
                        <Text
                          style={[
                            styles.variantPillText,
                            isSelected
                              ? { color: colorScheme.onPrimary }
                              : { color: colorScheme.onSurface },
                          ]}
                        >
                          {sf.formLabel}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ) : null}

            {/* Regional Variant Switcher Segmented Pills */}
            {variants.length > 0 ? (
              <View style={styles.variantSelectorContainer}>
                <Text style={[styles.variantSelectorLabel, { color: colorScheme.secondary }]}>
                  FORM / REGION
                </Text>
                <View style={styles.variantPillRow}>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => handleSelectVariant(null)}
                    style={[
                      styles.variantPill,
                      selectedVariantId === null
                        ? { backgroundColor: colorScheme.primary }
                        : { backgroundColor: colorScheme.surface, borderColor: colorScheme.outline, borderWidth: 1 },
                    ]}
                  >
                    <Text
                      style={[
                        styles.variantPillText,
                        selectedVariantId === null
                          ? { color: colorScheme.onPrimary }
                          : { color: colorScheme.onSurface },
                      ]}
                    >
                      Base
                    </Text>
                  </TouchableOpacity>

                  {variants.map((v) => {
                    const isSelected = selectedVariantId === v.id;
                    return (
                      <TouchableOpacity
                        key={v.id}
                        activeOpacity={0.7}
                        onPress={() => handleSelectVariant(v.id)}
                        style={[
                          styles.variantPill,
                          isSelected
                            ? { backgroundColor: colorScheme.primary }
                            : { backgroundColor: colorScheme.surface, borderColor: colorScheme.outline, borderWidth: 1 },
                        ]}
                      >
                        <Text
                          style={[
                            styles.variantPillText,
                            isSelected
                              ? { color: colorScheme.onPrimary }
                              : { color: colorScheme.onSurface },
                          ]}
                        >
                          {v.regionLabel}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ) : null}

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
            {activeFlavorText ? (
              <Text
                style={[
                  styles.flavorText,
                  { color: colorScheme.onSurface },
                ]}
              >
                "{activeFlavorText}"
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
          {activeStats ? (
            <View
              style={[
                styles.card,
                {
                  backgroundColor: colorScheme.surface,
                  borderColor: isAlphaActive ? '#FCA5A5' : colorScheme.outline,
                },
              ]}
            >
              <View style={styles.cardHeaderRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={[styles.cardTitle, { color: colorScheme.onSurface }]}>
                    Base Stats
                  </Text>
                  {isAlphaActive ? (
                    <View style={styles.alphaStatBadgeContainer}>
                      <Text style={styles.alphaStatBadgeText}>ALPHA (+50%)</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={[styles.totalStatsBadge, { color: isAlphaActive ? '#DC2626' : colorScheme.primary }]}>
                  Total: {totalStats}
                </Text>
              </View>

              <StatBar label="HP" value={activeStats.hp} index={0} barColor={isAlphaActive ? '#DC2626' : undefined} />
              <StatBar label="Attack" value={activeStats.attack} index={1} barColor={isAlphaActive ? '#DC2626' : undefined} />
              <StatBar label="Defense" value={activeStats.defense} index={2} barColor={isAlphaActive ? '#DC2626' : undefined} />
              <StatBar label="Sp. Atk" value={activeStats.specialAttack} index={3} barColor={isAlphaActive ? '#DC2626' : undefined} />
              <StatBar label="Sp. Def" value={activeStats.specialDefense} index={4} barColor={isAlphaActive ? '#DC2626' : undefined} />
              <StatBar label="Speed" value={activeStats.speed} index={5} barColor={isAlphaActive ? '#DC2626' : undefined} />
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
          {displayEvolutionChain.length > 0 ? (
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
                Evolution Family ({displayEvolutionChain.length})
              </Text>

              <View
                style={
                  displayEvolutionChain.length <= 3
                    ? styles.evolutionRow
                    : styles.evolutionGrid
                }
              >
                {displayEvolutionChain.map((stage, idx) => (
                  <React.Fragment key={stage.id}>
                    {displayEvolutionChain.length <= 3 && idx > 0 ? (
                      <View style={styles.evoArrowContainer}>
                        <Text style={[styles.evoArrow, { color: colorScheme.primary }]}>→</Text>
                      </View>
                    ) : null}

                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => router.push(`/pokemon/${stage.id}`)}
                      style={[
                        displayEvolutionChain.length <= 3 ? styles.evoStageCard : styles.evoGridCard,
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
          {activeAbilities && activeAbilities.length > 0 ? (
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
                {activeAbilities.map((ab) => (
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

        <DetailOnboardingOverlay
          visible={tourVisible}
          stepIndex={tourStepIndex}
          hasSpecialForms={specialForms.length > 0}
          targetLayouts={targetLayouts}
          onNext={handleNextTourStep}
          onSkip={handleCompleteOrSkipTour}
          colorScheme={colorScheme}
          isDark={colorScheme.background === '#121212' || colorScheme.background.startsWith('#1')}
        />

        <StatusTooltipOverlay
          visible={Boolean(activeTooltip)}
          tooltipKey={activeTooltip?.key || null}
          targetLayout={activeTooltip?.layout || null}
          onDismiss={() => setActiveTooltip(null)}
          colorScheme={colorScheme}
          isDark={colorScheme.background === '#121212' || colorScheme.background.startsWith('#1')}
        />
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingRight: 12,
    gap: 2,
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
  catchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 100,
    borderWidth: 1,
    gap: 4,
  },
  catchText: {
    fontSize: 12,
    fontWeight: '600',
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
  shinyOwnedBadgeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 100,
    borderWidth: 1,
    gap: 4,
  },
  shinyOwnedBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  alphaGlowCircle: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(220, 38, 38, 0.35)',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 8,
  },
  alphaTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#DC2626',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'center',
  },
  alphaTagText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  alphaStatBadgeContainer: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  alphaStatBadgeText: {
    color: '#DC2626',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  statusSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 8,
    paddingHorizontal: 2,
  },
  statusSectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
    letterSpacing: 0.5,
  },
  statusHelpButton: {
    padding: 2,
  },
  statusRowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 4,
  },
  statusRowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  statusRowText: {
    fontSize: 11,
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
    justifyContent: 'center',
    gap: 8,
    width: '100%',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    maxWidth: '100%',
    paddingHorizontal: 8,
  },
  pokemonTitle: {
    fontWeight: '800',
    letterSpacing: -0.5,
    textAlign: 'center',
    flexShrink: 1,
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
  variantSelectorContainer: {
    gap: 6,
    marginTop: 4,
  },
  variantSelectorLabel: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
    letterSpacing: 0.5,
  },
  variantPillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  variantPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  variantPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  specialFormContainer: {
    marginVertical: 4,
    width: '100%',
  },
  specialFormTriggerBtn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  specialFormTriggerText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  specialFormActiveCard: {
    padding: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    gap: 10,
  },
  specialFormHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  specialFormActiveLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  revertPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
  },
  revertPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
