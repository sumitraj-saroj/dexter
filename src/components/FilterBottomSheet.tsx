import React, { useState, useEffect, useCallback, memo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  ScrollView,
  Switch,
  TextInput,
  TouchableWithoutFeedback,
} from 'react-native';
import { FilterOptions, PokemonType, CollectionFilterStatus } from '../types';
import { useAppTheme } from '../theme';
import { TypeChip } from './TypeChip';
import { hapticSelection } from '../utils/haptics';
import { Ionicons } from '@expo/vector-icons';

interface FilterBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  filters: FilterOptions;
  onApplyFilters: (newFilters: FilterOptions) => void;
  onResetFilters: () => void;
}

const COLLECTION_OPTIONS: Array<{ key: CollectionFilterStatus; label: string; icon: string }> = [
  { key: 'caught', label: 'Caught only', icon: 'disc' },
  { key: 'uncaught', label: 'Not yet caught', icon: 'ellipse-outline' },
  { key: 'favorite', label: 'Favorites only', icon: 'heart' },
  { key: 'shiny_owned', label: 'Shiny owned only', icon: 'star' },
  { key: 'alpha', label: 'Alpha only', icon: 'flag' },
  { key: 'competitive_build', label: 'Has competitive build', icon: 'ribbon' },
];

const ALL_TYPES: PokemonType[] = [
  'normal',
  'fire',
  'water',
  'electric',
  'grass',
  'ice',
  'fighting',
  'poison',
  'ground',
  'flying',
  'psychic',
  'bug',
  'rock',
  'ghost',
  'dragon',
  'steel',
  'fairy',
  'dark',
];

const ALL_GENERATIONS = [
  { id: 1, name: 'Gen 1', region: 'Kanto' },
  { id: 2, name: 'Gen 2', region: 'Johto' },
  { id: 3, name: 'Gen 3', region: 'Hoenn' },
  { id: 4, name: 'Gen 4', region: 'Sinnoh' },
  { id: 5, name: 'Gen 5', region: 'Unova' },
  { id: 6, name: 'Gen 6', region: 'Kalos' },
  { id: 7, name: 'Gen 7', region: 'Alola' },
  { id: 8, name: 'Gen 8', region: 'Galar' },
  { id: 9, name: 'Gen 9', region: 'Paldea' },
];

const FilterBottomSheetComponent: React.FC<FilterBottomSheetProps> = ({
  visible,
  onClose,
  filters,
  onApplyFilters,
  onResetFilters,
}) => {
  const { colorScheme } = useAppTheme();

  const [selectedTypes, setSelectedTypes] = useState<PokemonType[]>(filters.types || []);
  const [selectedGenerations, setSelectedGenerations] = useState<number[]>(filters.generations || []);
  const [legendaryOnly, setLegendaryOnly] = useState<boolean>(filters.legendaryOnly || false);
  const [ability, setAbility] = useState<string>(filters.ability || '');
  const [selectedCollectionFilters, setSelectedCollectionFilters] = useState<CollectionFilterStatus[]>(
    filters.collectionFilters || []
  );
  const [isAshOwnedSelected, setIsAshOwnedSelected] = useState<boolean>(
    Boolean(filters.ashOwnedOnly || filters.collectionFilters?.includes('ash_owned'))
  );

  // Sync state when sheet becomes visible
  useEffect(() => {
    if (visible) {
      setSelectedTypes(filters.types || []);
      setSelectedGenerations(filters.generations || []);
      setLegendaryOnly(filters.legendaryOnly || false);
      setAbility(filters.ability || '');
      setSelectedCollectionFilters(filters.collectionFilters?.filter((f) => f !== 'ash_owned') || []);
      setIsAshOwnedSelected(Boolean(filters.ashOwnedOnly || filters.collectionFilters?.includes('ash_owned')));
    }
  }, [visible, filters]);

  const toggleType = useCallback((type: PokemonType) => {
    hapticSelection();
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  }, []);

  const toggleGeneration = useCallback((genId: number) => {
    hapticSelection();
    setSelectedGenerations((prev) =>
      prev.includes(genId) ? prev.filter((g) => g !== genId) : [...prev, genId]
    );
  }, []);

  const toggleAshOwnedFilter = useCallback(() => {
    hapticSelection();
    setIsAshOwnedSelected((prev) => !prev);
  }, []);

  const toggleCollectionFilter = useCallback((key: CollectionFilterStatus) => {
    hapticSelection();
    setSelectedCollectionFilters((prev) => {
      if (prev.includes(key)) {
        return prev.filter((k) => k !== key);
      }
      let next = [...prev];
      if (key === 'caught') next = next.filter((k) => k !== 'uncaught');
      if (key === 'uncaught') next = next.filter((k) => k !== 'caught');
      next.push(key);
      return next;
    });
  }, []);

  const handleApply = useCallback(() => {
    const cleanCollection = selectedCollectionFilters.filter((f) => f !== 'ash_owned');
    const finalCollection = isAshOwnedSelected
      ? ([...cleanCollection, 'ash_owned'] as CollectionFilterStatus[])
      : cleanCollection;

    onApplyFilters({
      ...filters,
      types: selectedTypes,
      generations: selectedGenerations,
      legendaryOnly,
      ability: ability.trim(),
      collectionFilters: finalCollection,
      caughtOnly: finalCollection.includes('caught'),
      notCaughtOnly: finalCollection.includes('uncaught'),
      favoritesOnly: finalCollection.includes('favorite'),
      shinyOwnedOnly: finalCollection.includes('shiny_owned'),
      alphaOnly: finalCollection.includes('alpha'),
      hasCompetitiveBuildOnly: finalCollection.includes('competitive_build'),
      ashOwnedOnly: isAshOwnedSelected,
    });
    onClose();
  }, [
    selectedCollectionFilters,
    isAshOwnedSelected,
    onApplyFilters,
    filters,
    selectedTypes,
    selectedGenerations,
    legendaryOnly,
    ability,
    onClose,
  ]);

  const handleReset = useCallback(() => {
    setSelectedTypes([]);
    setSelectedGenerations([]);
    setLegendaryOnly(false);
    setAbility('');
    setSelectedCollectionFilters([]);
    setIsAshOwnedSelected(false);
    onResetFilters();
    onClose();
  }, [onResetFilters, onClose]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <View
              style={[
                styles.sheetContainer,
                { backgroundColor: colorScheme.surface },
              ]}
            >
              {/* Top Handle bar */}
              <View style={styles.handleBar} />

              {/* Sheet Header */}
              <View style={styles.header}>
                <Text style={[styles.title, { color: colorScheme.onSurface }]}>
                  Filter Pokédex
                </Text>
                <TouchableOpacity onPress={handleReset}>
                  <Text style={[styles.resetText, { color: colorScheme.primary }]}>
                    Reset All
                  </Text>
                </TouchableOpacity>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
              >
                {/* Collection Status Filter */}
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: colorScheme.onSurface }]}>
                    Collection Status
                  </Text>
                  <View style={styles.collectionGrid}>
                    {COLLECTION_OPTIONS.map((opt) => {
                      const isSelected = selectedCollectionFilters.includes(opt.key);
                      return (
                        <TouchableOpacity
                          key={opt.key}
                          activeOpacity={0.7}
                          onPress={() => toggleCollectionFilter(opt.key)}
                          style={[
                            styles.collectionChip,
                            {
                              backgroundColor: isSelected
                                ? colorScheme.primaryContainer
                                : colorScheme.surfaceVariant,
                              borderColor: isSelected
                                ? colorScheme.primary
                                : colorScheme.outline + '40',
                            },
                          ]}
                        >
                          <Ionicons
                            name={opt.icon as any}
                            size={14}
                            color={
                              isSelected
                                ? colorScheme.onPrimaryContainer
                                : colorScheme.onSurfaceVariant
                            }
                          />
                          <Text
                            style={[
                              styles.collectionChipText,
                              {
                                color: isSelected
                                  ? colorScheme.onPrimaryContainer
                                  : colorScheme.onSurfaceVariant,
                              },
                            ]}
                          >
                            {opt.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Legendary / Mythical Toggle */}
                <View style={styles.section}>
                  <View style={styles.toggleRow}>
                    <View style={styles.toggleLabelGroup}>
                      <Text style={[styles.sectionTitle, { color: colorScheme.onSurface }]}>
                        Legendary / Mythical Only
                      </Text>
                      <Text style={[styles.sectionSubtitle, { color: colorScheme.onSurfaceVariant }]}>
                        Filter for rare and mythic Pokémon
                      </Text>
                    </View>
                    <Switch
                      value={legendaryOnly}
                      onValueChange={(val) => {
                        hapticSelection();
                        setLegendaryOnly(val);
                      }}
                      trackColor={{ false: colorScheme.outline + '40', true: colorScheme.primary }}
                      thumbColor={legendaryOnly ? colorScheme.onPrimary : colorScheme.surfaceVariant}
                    />
                  </View>
                </View>

                {/* Generation / Region Filter */}
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: colorScheme.onSurface }]}>
                    Generations & Regions (OR logic)
                  </Text>
                  <View style={styles.genGrid}>
                    {ALL_GENERATIONS.map((gen) => {
                      const isSelected = selectedGenerations.includes(gen.id);
                      return (
                        <TouchableOpacity
                          key={gen.id}
                          activeOpacity={0.7}
                          onPress={() => toggleGeneration(gen.id)}
                          style={[
                            styles.genChip,
                            {
                              backgroundColor: isSelected
                                ? colorScheme.primaryContainer
                                : colorScheme.surfaceVariant,
                              borderColor: isSelected
                                ? colorScheme.primary
                                : colorScheme.outline + '40',
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.genChipTitle,
                              {
                                color: isSelected
                                  ? colorScheme.onPrimaryContainer
                                  : colorScheme.onSurfaceVariant,
                              },
                            ]}
                          >
                            {gen.name}
                          </Text>
                          <Text
                            style={[
                              styles.genChipRegion,
                              {
                                color: isSelected
                                  ? colorScheme.onPrimaryContainer + 'B0'
                                  : colorScheme.onSurfaceVariant + '90',
                              },
                            ]}
                          >
                            {gen.region}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}

                    <TouchableOpacity
                      key="ash-roster"
                      activeOpacity={0.7}
                      onPress={toggleAshOwnedFilter}
                      style={[
                        styles.genChip,
                        {
                          backgroundColor: isAshOwnedSelected
                            ? colorScheme.primaryContainer
                            : colorScheme.surfaceVariant,
                          borderColor: isAshOwnedSelected
                            ? colorScheme.primary
                            : colorScheme.outline + '40',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.genChipTitle,
                          {
                            color: isAshOwnedSelected
                              ? colorScheme.onPrimaryContainer
                              : colorScheme.onSurfaceVariant,
                          },
                        ]}
                      >
                        Ash's Anime Roster
                      </Text>
                      <Text
                        style={[
                          styles.genChipRegion,
                          {
                            color: isAshOwnedSelected
                              ? colorScheme.onPrimaryContainer + 'B0'
                              : colorScheme.onSurfaceVariant + '90',
                          },
                        ]}
                      >
                        Anime
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Ability Text Filter */}
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: colorScheme.onSurface }]}>
                    Search Ability
                  </Text>
                  <TextInput
                    value={ability}
                    onChangeText={setAbility}
                    placeholder="e.g. Levitate, Overgrow, Static..."
                    placeholderTextColor={colorScheme.onSurfaceVariant + '70'}
                    style={[
                      styles.abilityInput,
                      {
                        backgroundColor: colorScheme.surfaceVariant,
                        color: colorScheme.onSurfaceVariant,
                        borderColor: colorScheme.outline + '30',
                      },
                    ]}
                  />
                </View>

                {/* Type Multi-select Chips */}
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: colorScheme.onSurface }]}>
                    Pokémon Types (OR logic)
                  </Text>
                  <View style={styles.chipGrid}>
                    {ALL_TYPES.map((type) => (
                      <TypeChip
                        key={type}
                        type={type}
                        selected={selectedTypes.includes(type)}
                        size="medium"
                        onPress={() => toggleType(type)}
                      />
                    ))}
                  </View>
                </View>
              </ScrollView>

              {/* Bottom Action Footer */}
              <View style={styles.footer}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={handleApply}
                  style={[styles.applyButton, { backgroundColor: colorScheme.primary }]}
                >
                  <Text style={[styles.applyText, { color: colorScheme.onPrimary }]}>
                    Apply Filters
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    paddingBottom: 24,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#8E8E93',
    opacity: 0.5,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 6,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#8E8E9320',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  resetText: {
    fontSize: 14,
    fontWeight: '600',
  },
  scrollContent: {
    padding: 20,
    gap: 20,
  },
  section: {},
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 12,
    fontWeight: '400',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleLabelGroup: {
    flex: 1,
    paddingRight: 12,
  },
  collectionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  collectionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  collectionChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  genGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  genChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    minWidth: 70,
  },
  genChipTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  genChipRegion: {
    fontSize: 10,
    fontWeight: '500',
  },
  abilityInput: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 14,
    fontWeight: '500',
    marginTop: 4,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  applyButton: {
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  applyText: {
    fontSize: 15,
    fontWeight: '600',
  },
});

export const FilterBottomSheet = memo(FilterBottomSheetComponent);
