import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Modal,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme, AnimatedThemeView } from '../../../src/theme';
import { useAppDb } from '../../_layout';
import {
  getPokemonById,
  getCompetitiveBuildsForPokemon,
  saveCompetitiveBuild,
  deleteCompetitiveBuild,
} from '../../../src/db/queries';
import { Pokemon, CompetitiveBuild, EVs, IVs, PokemonStat } from '../../../src/types';
import { NATURES, Nature, getNatureByName, StatKey } from '../../../src/data/natures';
import { calculateAllStats } from '../../../src/utils/statCalculator';
import { StatBar, TypeChip } from '../../../src/components';
import { hapticMedium, hapticSuccess, hapticLight } from '../../../src/utils/haptics';
import { useQueryClient } from '@tanstack/react-query';

const DEFAULT_EVS: EVs = {
  hp: 0,
  attack: 0,
  defense: 0,
  specialAttack: 0,
  specialDefense: 0,
  speed: 0,
};

const DEFAULT_IVS: IVs = {
  hp: 31,
  attack: 31,
  defense: 31,
  specialAttack: 31,
  specialDefense: 31,
  speed: 31,
};

export default function PokemonBuildsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const db = useAppDb();
  const queryClient = useQueryClient();
  const { colorScheme } = useAppTheme();

  const [pokemon, setPokemon] = useState<Pokemon | null>(null);
  const [builds, setBuilds] = useState<CompetitiveBuild[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Form Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingBuildId, setEditingBuildId] = useState<number | null>(null);

  // Form Field States
  const [buildName, setBuildName] = useState<string>('Standard Build');
  const [natureName, setNatureName] = useState<string>('Adamant');
  const [evs, setEvs] = useState<EVs>(DEFAULT_EVS);
  const [ivs, setIvs] = useState<IVs>(DEFAULT_IVS);
  const [move1, setMove1] = useState<string>('');
  const [move2, setMove2] = useState<string>('');
  const [move3, setMove3] = useState<string>('');
  const [move4, setMove4] = useState<string>('');
  const [heldItem, setHeldItem] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Dropdown States for Moves & Nature
  const [activeMovePickerSlot, setActiveMovePickerSlot] = useState<number | null>(null);
  const [moveSearchQuery, setMoveSearchQuery] = useState<string>('');
  const [isNaturePickerOpen, setIsNaturePickerOpen] = useState<boolean>(false);

  // Load Pokemon & Builds Data
  const loadData = useCallback(async () => {
    if (!id || !db) return;
    setLoading(true);
    try {
      const numId = parseInt(id, 10);
      const [pData, bData] = await Promise.all([
        getPokemonById(db, numId),
        getCompetitiveBuildsForPokemon(db, numId),
      ]);
      setPokemon(pData);
      setBuilds(bData);
    } catch (err) {
      console.error('Failed to load builds:', err);
    } finally {
      setLoading(false);
    }
  }, [db, id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const invalidateGlobalQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['pokemonList'] });
    queryClient.invalidateQueries({ queryKey: ['pokemon'] });
  };

  // EV Total Calculation
  const totalEvs = useMemo(() => {
    return evs.hp + evs.attack + evs.defense + evs.specialAttack + evs.specialDefense + evs.speed;
  }, [evs]);

  const remainingEvs = Math.max(0, 510 - totalEvs);

  // Live Calculated Stats (Level 100)
  const calculatedStats = useMemo<PokemonStat | null>(() => {
    if (!pokemon?.stats) return null;
    return calculateAllStats(pokemon.stats, evs, ivs, natureName, 100);
  }, [pokemon?.stats, evs, ivs, natureName]);

  const calculatedTotal = useMemo(() => {
    if (!calculatedStats) return 0;
    return (
      calculatedStats.hp +
      calculatedStats.attack +
      calculatedStats.defense +
      calculatedStats.specialAttack +
      calculatedStats.specialDefense +
      calculatedStats.speed
    );
  }, [calculatedStats]);

  // Learnable Moves List for this Pokemon
  const learnableMoves = useMemo(() => {
    if (!pokemon?.moves) return [];
    return pokemon.moves.map((m) => m.name);
  }, [pokemon?.moves]);

  // Filtered Move Picker Options
  const filteredPickerMoves = useMemo(() => {
    if (!moveSearchQuery.trim()) return learnableMoves;
    return learnableMoves.filter((m) =>
      m.toLowerCase().includes(moveSearchQuery.trim().toLowerCase())
    );
  }, [learnableMoves, moveSearchQuery]);

  // Open Modal for New Build
  const handleOpenNewBuild = () => {
    hapticMedium();
    setEditingBuildId(null);
    setBuildName(`Build ${builds.length + 1}`);
    setNatureName('Adamant');
    setEvs({ ...DEFAULT_EVS, attack: 252, speed: 252, hp: 4 });
    setIvs({ ...DEFAULT_IVS });

    const moves = learnableMoves;
    setMove1(moves[0] || '');
    setMove2(moves[1] || '');
    setMove3(moves[2] || '');
    setMove4(moves[3] || '');
    setHeldItem('');
    setNotes('');
    setIsModalOpen(true);
  };

  // Open Modal to Edit Existing Build
  const handleOpenEditBuild = (build: CompetitiveBuild) => {
    hapticMedium();
    setEditingBuildId(build.id || null);
    setBuildName(build.buildName);
    setNatureName(build.nature);
    setEvs({ ...build.evs });
    setIvs({ ...build.ivs });
    setMove1(build.move1 || '');
    setMove2(build.move2 || '');
    setMove3(build.move3 || '');
    setMove4(build.move4 || '');
    setHeldItem(build.heldItem || '');
    setNotes(build.notes || '');
    setIsModalOpen(true);
  };

  // Handle EV Change with 510 cap enforcement
  const updateEv = (key: keyof EVs, val: number) => {
    const clampedVal = Math.max(0, Math.min(252, val));
    const currentEvForKey = evs[key];
    const otherEvsTotal = totalEvs - currentEvForKey;
    const allowedForThisKey = Math.min(clampedVal, 510 - otherEvsTotal);

    setEvs((prev) => ({
      ...prev,
      [key]: allowedForThisKey,
    }));
  };

  // Handle IV Change (0-31)
  const updateIv = (key: keyof IVs, val: number) => {
    const clampedVal = Math.max(0, Math.min(31, val));
    setIvs((prev) => ({
      ...prev,
      [key]: clampedVal,
    }));
  };

  // Save Build
  const handleSave = async () => {
    if (!pokemon || !db) return;
    if (!buildName.trim()) {
      Alert.alert('Validation', 'Please enter a build name.');
      return;
    }
    if (totalEvs > 510) {
      Alert.alert('Validation Error', 'Total EVs cannot exceed 510.');
      return;
    }

    try {
      hapticSuccess();
      await saveCompetitiveBuild(db, {
        id: editingBuildId || undefined,
        pokemonId: pokemon.id,
        buildName: buildName.trim(),
        nature: natureName,
        evs,
        ivs,
        move1: move1 || null,
        move2: move2 || null,
        move3: move3 || null,
        move4: move4 || null,
        heldItem: heldItem.trim() || null,
        notes: notes.trim() || null,
      });

      invalidateGlobalQueries();
      await loadData();
      setIsModalOpen(false);
    } catch (e) {
      console.error('Failed to save build:', e);
      Alert.alert('Error', 'Failed to save build.');
    }
  };

  // Delete Build
  const handleDelete = (buildId: number) => {
    Alert.alert('Delete Build', 'Are you sure you want to delete this build?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (!db || !pokemon) return;
          hapticLight();
          await deleteCompetitiveBuild(db, buildId, pokemon.id);
          invalidateGlobalQueries();
          await loadData();
        },
      },
    ]);
  };

  if (loading || !pokemon) {
    return (
      <AnimatedThemeView style={styles.container}>
        <SafeAreaView style={styles.centered}>
          <ActivityIndicator size="large" color={colorScheme.primary} />
        </SafeAreaView>
      </AnimatedThemeView>
    );
  }

  const selectedNatureObj = getNatureByName(natureName);

  return (
    <AnimatedThemeView style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        {/* Top Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={[styles.backText, { color: colorScheme.primary }]}>← Back</Text>
          </TouchableOpacity>

          <View style={styles.headerTitleContainer}>
            <Image
              source={{ uri: pokemon.officialArtworkUrl || pokemon.spriteUrl }}
              style={styles.headerIcon}
              contentFit="contain"
            />
            <Text style={[styles.headerTitle, { color: colorScheme.onBackground }]} numberOfLines={1}>
              {pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1)} Builds
            </Text>
          </View>

          <TouchableOpacity onPress={handleOpenNewBuild} style={styles.addButton}>
            <Ionicons name="add" size={20} color={colorScheme.primary} />
            <Text style={[styles.addButtonText, { color: colorScheme.primary }]}>Add</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Subtitle / Intro */}
          <View style={styles.introCard}>
            <Text style={[styles.introTitle, { color: colorScheme.onSurface }]}>
              Competitive Sets ({builds.length})
            </Text>
            <Text style={[styles.introSubtitle, { color: colorScheme.onSurfaceVariant }]}>
              Create and store custom Nature, EV spread, IV, and Moveset configurations for battle.
            </Text>
          </View>

          {/* Builds List */}
          {builds.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: colorScheme.surface, borderColor: colorScheme.outline }]}>
              <Ionicons name="ribbon-outline" size={42} color={colorScheme.onSurfaceVariant} />
              <Text style={[styles.emptyTitle, { color: colorScheme.onSurface }]}>No Builds Saved</Text>
              <Text style={[styles.emptyText, { color: colorScheme.onSurfaceVariant }]}>
                Tap "+ Add" above to build a custom competitive set for {pokemon.name}.
              </Text>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleOpenNewBuild}
                style={[styles.createFirstButton, { backgroundColor: colorScheme.primary }]}
              >
                <Text style={[styles.createFirstText, { color: colorScheme.onPrimary }]}>
                  + Create First Build
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            builds.map((b) => {
              const bStats = pokemon.stats
                ? calculateAllStats(pokemon.stats, b.evs, b.ivs, b.nature, 100)
                : null;
              const natureObj = getNatureByName(b.nature);

              return (
                <View
                  key={b.id}
                  style={[
                    styles.buildCard,
                    { backgroundColor: colorScheme.surface, borderColor: colorScheme.outline },
                  ]}
                >
                  {/* Build Header */}
                  <View style={styles.buildCardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.buildName, { color: colorScheme.onSurface }]}>
                        {b.buildName}
                      </Text>
                      <View style={styles.buildTagsRow}>
                        <View style={[styles.natureTag, { backgroundColor: colorScheme.primaryContainer }]}>
                          <Text style={[styles.natureTagText, { color: colorScheme.onPrimaryContainer }]}>
                            {b.nature}
                            {natureObj.increasedStat ? ` (+${natureObj.increasedStat.slice(0, 3)})` : ''}
                          </Text>
                        </View>
                        {b.heldItem ? (
                          <View style={[styles.itemTag, { backgroundColor: colorScheme.surfaceVariant }]}>
                            <Ionicons name="shield-outline" size={11} color={colorScheme.onSurfaceVariant} />
                            <Text style={[styles.itemTagText, { color: colorScheme.onSurfaceVariant }]}>
                              {b.heldItem}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    </View>

                    <View style={styles.buildCardActions}>
                      <TouchableOpacity onPress={() => handleOpenEditBuild(b)} style={styles.actionIconButton}>
                        <Ionicons name="pencil" size={16} color={colorScheme.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => b.id && handleDelete(b.id)} style={styles.actionIconButton}>
                        <Ionicons name="trash-outline" size={16} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Moveset Grid */}
                  <View style={styles.movesetPreviewGrid}>
                    {[b.move1, b.move2, b.move3, b.move4].map((m, idx) => (
                      <View
                        key={idx}
                        style={[
                          styles.movePreviewChip,
                          {
                            backgroundColor: m ? colorScheme.surfaceVariant : colorScheme.surfaceVariant + '40',
                            borderColor: colorScheme.outline + '30',
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.movePreviewText,
                            { color: m ? colorScheme.onSurfaceVariant : colorScheme.onSurfaceVariant + '60' },
                          ]}
                          numberOfLines={1}
                        >
                          {m || `Move ${idx + 1}`}
                        </Text>
                      </View>
                    ))}
                  </View>

                  {/* EV Summary Line */}
                  <Text style={[styles.evSummaryText, { color: colorScheme.secondary }]}>
                    EVs: {formatEvSummary(b.evs)}
                  </Text>

                  {/* Calculated Stats Summary Row */}
                  {bStats ? (
                    <View style={styles.statsSummaryRow}>
                      <View style={styles.statMiniBadge}>
                        <Text style={styles.statMiniLabel}>HP</Text>
                        <Text style={styles.statMiniVal}>{bStats.hp}</Text>
                      </View>
                      <View style={styles.statMiniBadge}>
                        <Text style={styles.statMiniLabel}>Atk</Text>
                        <Text style={styles.statMiniVal}>{bStats.attack}</Text>
                      </View>
                      <View style={styles.statMiniBadge}>
                        <Text style={styles.statMiniLabel}>Def</Text>
                        <Text style={styles.statMiniVal}>{bStats.defense}</Text>
                      </View>
                      <View style={styles.statMiniBadge}>
                        <Text style={styles.statMiniLabel}>SpA</Text>
                        <Text style={styles.statMiniVal}>{bStats.specialAttack}</Text>
                      </View>
                      <View style={styles.statMiniBadge}>
                        <Text style={styles.statMiniLabel}>SpD</Text>
                        <Text style={styles.statMiniVal}>{bStats.specialDefense}</Text>
                      </View>
                      <View style={styles.statMiniBadge}>
                        <Text style={styles.statMiniLabel}>Spe</Text>
                        <Text style={styles.statMiniVal}>{bStats.speed}</Text>
                      </View>
                    </View>
                  ) : null}
                </View>
              );
            })
          )}
        </ScrollView>

        {/* Build Form Editor Modal */}
        <Modal visible={isModalOpen} animationType="slide" transparent={false} onRequestClose={() => setIsModalOpen(false)}>
          <AnimatedThemeView style={styles.container}>
            <SafeAreaView style={{ flex: 1 }}>
              {/* Modal Header */}
              <View style={styles.header}>
                <TouchableOpacity onPress={() => setIsModalOpen(false)}>
                  <Text style={[styles.backText, { color: colorScheme.primary }]}>Cancel</Text>
                </TouchableOpacity>

                <Text style={[styles.modalTitle, { color: colorScheme.onBackground }]}>
                  {editingBuildId ? 'Edit Build' : 'New Build'}
                </Text>

                <TouchableOpacity onPress={handleSave} style={[styles.saveButton, { backgroundColor: colorScheme.primary }]}>
                  <Text style={[styles.saveButtonText, { color: colorScheme.onPrimary }]}>Save</Text>
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={styles.formScrollContent} showsVerticalScrollIndicator={false}>
                {/* 1. General Section */}
                <View style={[styles.formCard, { backgroundColor: colorScheme.surface, borderColor: colorScheme.outline }]}>
                  <Text style={[styles.formSectionTitle, { color: colorScheme.onSurface }]}>Build Info</Text>

                  <Text style={[styles.inputLabel, { color: colorScheme.secondary }]}>Build Name</Text>
                  <TextInput
                    value={buildName}
                    onChangeText={setBuildName}
                    placeholder="e.g. Physical Sweeper, Wall..."
                    placeholderTextColor={colorScheme.onSurfaceVariant + '70'}
                    style={[
                      styles.textInput,
                      { backgroundColor: colorScheme.surfaceVariant, color: colorScheme.onSurfaceVariant, borderColor: colorScheme.outline + '30' },
                    ]}
                  />

                  {/* Nature Selector Button */}
                  <Text style={[styles.inputLabel, { color: colorScheme.secondary, marginTop: 12 }]}>Nature</Text>
                  <TouchableOpacity
                    onPress={() => setIsNaturePickerOpen(true)}
                    style={[
                      styles.pickerButton,
                      { backgroundColor: colorScheme.surfaceVariant, borderColor: colorScheme.outline + '30' },
                    ]}
                  >
                    <Text style={[styles.pickerButtonText, { color: colorScheme.onSurfaceVariant }]}>
                      {natureName}{' '}
                      {selectedNatureObj.increasedStat
                        ? `(+${selectedNatureObj.increasedStat.slice(0, 3)}, -${selectedNatureObj.decreasedStat?.slice(0, 3)})`
                        : '(Neutral)'}
                    </Text>
                    <Ionicons name="chevron-down" size={16} color={colorScheme.onSurfaceVariant} />
                  </TouchableOpacity>

                  <Text style={[styles.inputLabel, { color: colorScheme.secondary, marginTop: 12 }]}>Held Item</Text>
                  <TextInput
                    value={heldItem}
                    onChangeText={setHeldItem}
                    placeholder="e.g. Life Orb, Choice Scarf, Leftovers..."
                    placeholderTextColor={colorScheme.onSurfaceVariant + '70'}
                    style={[
                      styles.textInput,
                      { backgroundColor: colorScheme.surfaceVariant, color: colorScheme.onSurfaceVariant, borderColor: colorScheme.outline + '30' },
                    ]}
                  />

                  <Text style={[styles.inputLabel, { color: colorScheme.secondary, marginTop: 12 }]}>Notes</Text>
                  <TextInput
                    value={notes}
                    onChangeText={setNotes}
                    placeholder="Role details, speed tier targets, team synergy..."
                    placeholderTextColor={colorScheme.onSurfaceVariant + '70'}
                    multiline
                    numberOfLines={3}
                    style={[
                      styles.textInput,
                      styles.notesInput,
                      { backgroundColor: colorScheme.surfaceVariant, color: colorScheme.onSurfaceVariant, borderColor: colorScheme.outline + '30' },
                    ]}
                  />
                </View>

                {/* 2. Calculated Stats Card */}
                {calculatedStats ? (
                  <View style={[styles.formCard, styles.calculatedStatsCard, { backgroundColor: colorScheme.surface, borderColor: colorScheme.primary }]}>
                    <View style={styles.cardHeaderRow}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Ionicons name="calculator-outline" size={18} color={colorScheme.primary} />
                        <Text style={[styles.formSectionTitle, { color: colorScheme.onSurface, marginBottom: 0 }]}>
                          Calculated Stats (Lvl 100)
                        </Text>
                      </View>
                      <Text style={[styles.totalStatsBadge, { color: colorScheme.primary }]}>
                        Total: {calculatedTotal}
                      </Text>
                    </View>

                    <StatBar label="HP" value={calculatedStats.hp} index={0} />
                    <StatBar label="Attack" value={calculatedStats.attack} index={1} />
                    <StatBar label="Defense" value={calculatedStats.defense} index={2} />
                    <StatBar label="Sp. Atk" value={calculatedStats.specialAttack} index={3} />
                    <StatBar label="Sp. Def" value={calculatedStats.specialDefense} index={4} />
                    <StatBar label="Speed" value={calculatedStats.speed} index={5} />
                  </View>
                ) : null}

                {/* 3. EVs Section */}
                <View style={[styles.formCard, { backgroundColor: colorScheme.surface, borderColor: colorScheme.outline }]}>
                  <View style={styles.cardHeaderRow}>
                    <Text style={[styles.formSectionTitle, { color: colorScheme.onSurface, marginBottom: 0 }]}>
                      Effort Values (EVs)
                    </Text>
                    <View
                      style={[
                        styles.evCounterBadge,
                        {
                          backgroundColor: totalEvs > 510 ? '#FEE2E2' : totalEvs === 510 ? '#FEF3C7' : colorScheme.primaryContainer,
                          borderColor: totalEvs > 510 ? '#EF4444' : colorScheme.primary,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.evCounterText,
                          { color: totalEvs > 510 ? '#DC2626' : totalEvs === 510 ? '#D97706' : colorScheme.onPrimaryContainer },
                        ]}
                      >
                        EVs: {totalEvs} / 510 ({remainingEvs} left)
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.hintText, { color: colorScheme.onSurfaceVariant }]}>
                    Max 252 per stat, 510 total across all stats. EVs are effective in multiples of 4.
                  </Text>

                  {/* EV Inputs for each stat */}
                  {(['hp', 'attack', 'defense', 'specialAttack', 'specialDefense', 'speed'] as Array<keyof EVs>).map((key) => {
                    const labelMap: Record<keyof EVs, string> = {
                      hp: 'HP',
                      attack: 'Attack',
                      defense: 'Defense',
                      specialAttack: 'Sp. Atk',
                      specialDefense: 'Sp. Def',
                      speed: 'Speed',
                    };
                    const val = evs[key];

                    return (
                      <View key={key} style={styles.statControlRow}>
                        <Text style={[styles.statControlLabel, { color: colorScheme.onSurface }]}>
                          {labelMap[key]}
                        </Text>
                        <TextInput
                          value={String(val)}
                          onChangeText={(t) => updateEv(key, parseInt(t, 10) || 0)}
                          keyboardType="number-pad"
                          style={[
                            styles.evNumberInput,
                            { backgroundColor: colorScheme.surfaceVariant, color: colorScheme.onSurfaceVariant, borderColor: colorScheme.outline + '30' },
                          ]}
                        />
                        <View style={styles.evPresetRow}>
                          <TouchableOpacity onPress={() => updateEv(key, Math.max(0, val - 4))} style={styles.stepBtn}>
                            <Text style={styles.stepBtnText}>-4</Text>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => updateEv(key, val + 4)} style={styles.stepBtn}>
                            <Text style={styles.stepBtnText}>+4</Text>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => updateEv(key, 252)} style={styles.presetBtn}>
                            <Text style={styles.presetBtnText}>252</Text>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => updateEv(key, 0)} style={styles.presetBtn}>
                            <Text style={styles.presetBtnText}>0</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
                </View>

                {/* 4. IVs Section */}
                <View style={[styles.formCard, { backgroundColor: colorScheme.surface, borderColor: colorScheme.outline }]}>
                  <View style={styles.cardHeaderRow}>
                    <Text style={[styles.formSectionTitle, { color: colorScheme.onSurface, marginBottom: 0 }]}>
                      Individual Values (IVs)
                    </Text>
                    <TouchableOpacity
                      onPress={() =>
                        setIvs({
                          hp: 31,
                          attack: 31,
                          defense: 31,
                          specialAttack: 31,
                          specialDefense: 31,
                          speed: 31,
                        })
                      }
                    >
                      <Text style={{ fontSize: 12, fontWeight: '600', color: colorScheme.primary }}>
                        All 31 (Max)
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={[styles.hintText, { color: colorScheme.onSurfaceVariant }]}>
                    Range 0-31 per stat (default 31 for competitive play).
                  </Text>

                  {(['hp', 'attack', 'defense', 'specialAttack', 'specialDefense', 'speed'] as Array<keyof IVs>).map((key) => {
                    const labelMap: Record<keyof IVs, string> = {
                      hp: 'HP',
                      attack: 'Attack',
                      defense: 'Defense',
                      specialAttack: 'Sp. Atk',
                      specialDefense: 'Sp. Def',
                      speed: 'Speed',
                    };
                    const val = ivs[key];

                    return (
                      <View key={key} style={styles.statControlRow}>
                        <Text style={[styles.statControlLabel, { color: colorScheme.onSurface }]}>
                          {labelMap[key]}
                        </Text>
                        <TextInput
                          value={String(val)}
                          onChangeText={(t) => updateIv(key, parseInt(t, 10) || 0)}
                          keyboardType="number-pad"
                          style={[
                            styles.evNumberInput,
                            { backgroundColor: colorScheme.surfaceVariant, color: colorScheme.onSurfaceVariant, borderColor: colorScheme.outline + '30' },
                          ]}
                        />
                        <View style={styles.evPresetRow}>
                          <TouchableOpacity onPress={() => updateIv(key, 31)} style={styles.presetBtn}>
                            <Text style={styles.presetBtnText}>31</Text>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => updateIv(key, 0)} style={styles.presetBtn}>
                            <Text style={styles.presetBtnText}>0</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
                </View>

                {/* 5. Moveset Section */}
                <View style={[styles.formCard, { backgroundColor: colorScheme.surface, borderColor: colorScheme.outline }]}>
                  <Text style={[styles.formSectionTitle, { color: colorScheme.onSurface }]}>Moveset (4 Slots)</Text>
                  <Text style={[styles.hintText, { color: colorScheme.onSurfaceVariant }]}>
                    Select moves from {pokemon.name}'s learnable moveset.
                  </Text>

                  {[
                    { slot: 1, val: move1, setFn: setMove1 },
                    { slot: 2, val: move2, setFn: setMove2 },
                    { slot: 3, val: move3, setFn: setMove3 },
                    { slot: 4, val: move4, setFn: setMove4 },
                  ].map(({ slot, val, setFn }) => (
                    <View key={slot} style={{ marginTop: 8 }}>
                      <Text style={[styles.inputLabel, { color: colorScheme.secondary }]}>Move Slot {slot}</Text>
                      <TouchableOpacity
                        onPress={() => {
                          setActiveMovePickerSlot(slot);
                          setMoveSearchQuery('');
                        }}
                        style={[
                          styles.pickerButton,
                          { backgroundColor: colorScheme.surfaceVariant, borderColor: colorScheme.outline + '30' },
                        ]}
                      >
                        <Text style={[styles.pickerButtonText, { color: val ? colorScheme.onSurfaceVariant : colorScheme.onSurfaceVariant + '70' }]}>
                          {val || `-- Select Move ${slot} --`}
                        </Text>
                        <Ionicons name="chevron-down" size={16} color={colorScheme.onSurfaceVariant} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </ScrollView>
            </SafeAreaView>
          </AnimatedThemeView>
        </Modal>

        {/* Nature Picker Modal */}
        <Modal visible={isNaturePickerOpen} animationType="slide" transparent={true} onRequestClose={() => setIsNaturePickerOpen(false)}>
          <TouchableOpacity activeOpacity={1} onPress={() => setIsNaturePickerOpen(false)} style={styles.modalOverlay}>
            <View style={[styles.modalSheet, { backgroundColor: colorScheme.surface }]}>
              <View style={styles.modalSheetHeader}>
                <Text style={[styles.modalSheetTitle, { color: colorScheme.onSurface }]}>Select Nature</Text>
                <TouchableOpacity onPress={() => setIsNaturePickerOpen(false)}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: colorScheme.primary }}>Done</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={{ maxHeight: 400 }}>
                {NATURES.map((nat) => {
                  const isSelected = natureName.toLowerCase() === nat.name.toLowerCase();
                  return (
                    <TouchableOpacity
                      key={nat.name}
                      onPress={() => {
                        hapticSelection();
                        setNatureName(nat.name);
                        setIsNaturePickerOpen(false);
                      }}
                      style={[
                        styles.natureItem,
                        {
                          backgroundColor: isSelected ? colorScheme.primaryContainer : 'transparent',
                          borderBottomColor: colorScheme.outline + '20',
                        },
                      ]}
                    >
                      <Text style={[styles.natureItemName, { color: isSelected ? colorScheme.onPrimaryContainer : colorScheme.onSurface }]}>
                        {nat.name}
                      </Text>
                      <Text style={[styles.natureItemEffect, { color: isSelected ? colorScheme.onPrimaryContainer : colorScheme.onSurfaceVariant }]}>
                        {nat.increasedStat
                          ? `+10% ${nat.increasedStat}, -10% ${nat.decreasedStat}`
                          : 'Neutral (No Stat Modification)'}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Move Picker Modal */}
        <Modal visible={activeMovePickerSlot !== null} animationType="slide" transparent={true} onRequestClose={() => setActiveMovePickerSlot(null)}>
          <TouchableOpacity activeOpacity={1} onPress={() => setActiveMovePickerSlot(null)} style={styles.modalOverlay}>
            <View style={[styles.modalSheet, { backgroundColor: colorScheme.surface }]}>
              <View style={styles.modalSheetHeader}>
                <Text style={[styles.modalSheetTitle, { color: colorScheme.onSurface }]}>
                  Select Move Slot {activeMovePickerSlot}
                </Text>
                <TouchableOpacity onPress={() => setActiveMovePickerSlot(null)}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: colorScheme.primary }}>Close</Text>
                </TouchableOpacity>
              </View>

              <TextInput
                value={moveSearchQuery}
                onChangeText={setMoveSearchQuery}
                placeholder="Search move name..."
                placeholderTextColor={colorScheme.onSurfaceVariant + '70'}
                style={[
                  styles.moveSearchInput,
                  { backgroundColor: colorScheme.surfaceVariant, color: colorScheme.onSurfaceVariant, borderColor: colorScheme.outline + '30' },
                ]}
              />

              <ScrollView style={{ maxHeight: 350 }}>
                <TouchableOpacity
                  onPress={() => {
                    if (activeMovePickerSlot === 1) setMove1('');
                    if (activeMovePickerSlot === 2) setMove2('');
                    if (activeMovePickerSlot === 3) setMove3('');
                    if (activeMovePickerSlot === 4) setMove4('');
                    setActiveMovePickerSlot(null);
                  }}
                  style={styles.moveItem}
                >
                  <Text style={{ color: '#EF4444', fontWeight: '600' }}>-- None --</Text>
                </TouchableOpacity>

                {filteredPickerMoves.map((m) => (
                  <TouchableOpacity
                    key={m}
                    onPress={() => {
                      hapticSelection();
                      if (activeMovePickerSlot === 1) setMove1(m);
                      if (activeMovePickerSlot === 2) setMove2(m);
                      if (activeMovePickerSlot === 3) setMove3(m);
                      if (activeMovePickerSlot === 4) setMove4(m);
                      setActiveMovePickerSlot(null);
                    }}
                    style={[styles.moveItem, { borderBottomColor: colorScheme.outline + '20' }]}
                  >
                    <Text style={[styles.moveItemText, { color: colorScheme.onSurface }]}>{m}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>
      </SafeAreaView>
    </AnimatedThemeView>
  );
}

function formatEvSummary(evs: EVs): string {
  const parts: string[] = [];
  if (evs.hp > 0) parts.push(`${evs.hp} HP`);
  if (evs.attack > 0) parts.push(`${evs.attack} Atk`);
  if (evs.defense > 0) parts.push(`${evs.defense} Def`);
  if (evs.specialAttack > 0) parts.push(`${evs.specialAttack} SpA`);
  if (evs.specialDefense > 0) parts.push(`${evs.specialDefense} SpD`);
  if (evs.speed > 0) parts.push(`${evs.speed} Spe`);
  return parts.length > 0 ? parts.join(' / ') : '0 EVs';
}

function hapticSelection() {
  hapticLight();
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(142, 142, 147, 0.15)',
  },
  backButton: {
    paddingVertical: 4,
    paddingRight: 8,
  },
  backText: {
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    justifyContent: 'center',
  },
  headerIcon: {
    width: 28,
    height: 28,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 4,
    paddingLeft: 8,
  },
  addButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  introCard: {
    marginBottom: 4,
  },
  introTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  introSubtitle: {
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 18,
  },
  emptyCard: {
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 16,
  },
  createFirstButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  createFirstText: {
    fontSize: 14,
    fontWeight: '600',
  },
  buildCard: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  buildCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  buildName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  buildTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  natureTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  natureTagText: {
    fontSize: 11,
    fontWeight: '700',
  },
  itemTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  itemTagText: {
    fontSize: 11,
    fontWeight: '600',
  },
  buildCardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionIconButton: {
    padding: 6,
  },
  movesetPreviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  movePreviewChip: {
    width: '48%',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  movePreviewText: {
    fontSize: 12,
    fontWeight: '600',
  },
  evSummaryText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
  },
  statsSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 4,
  },
  statMiniBadge: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(142,142,147,0.1)',
  },
  statMiniLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#8E8E93',
  },
  statMiniVal: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  saveButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  formScrollContent: {
    padding: 16,
    gap: 16,
  },
  formCard: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  calculatedStatsCard: {
    borderWidth: 2,
  },
  formSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  textInput: {
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14,
    fontWeight: '500',
  },
  notesInput: {
    height: 70,
    paddingTop: 8,
    textAlignVertical: 'top',
  },
  pickerButton: {
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  totalStatsBadge: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
  },
  evCounterBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  evCounterText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
  },
  hintText: {
    fontSize: 11,
    fontWeight: '400',
    marginBottom: 12,
    lineHeight: 16,
  },
  statControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 4,
    gap: 8,
  },
  statControlLabel: {
    fontSize: 13,
    fontWeight: '600',
    width: 60,
  },
  evNumberInput: {
    width: 52,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
  },
  evPresetRow: {
    flexDirection: 'row',
    gap: 4,
  },
  stepBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(142,142,147,0.15)',
  },
  stepBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  presetBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(142,142,147,0.25)',
  },
  presetBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
  },
  modalSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(142,142,147,0.2)',
  },
  modalSheetTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  natureItem: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
  },
  natureItemName: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  natureItemEffect: {
    fontSize: 12,
    fontWeight: '500',
  },
  moveSearchInput: {
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 13,
    marginVertical: 10,
  },
  moveItem: {
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
  },
  moveItemText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
