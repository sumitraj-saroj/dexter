import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Platform } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Pokemon, BreedingInfo, M3ColorScheme } from '../types';

interface BreedingCardProps {
  breedingInfo: BreedingInfo;
  colorScheme: M3ColorScheme;
  onSelectPokemon: (pokemonId: number) => void;
}

export function BreedingCard({ breedingInfo, colorScheme, onSelectPokemon }: BreedingCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const {
    canBreed,
    reason,
    eggGroups,
    hatchSteps,
    isGenderless,
    malePercentage,
    femalePercentage,
    eggMoves,
    compatiblePokemon,
  } = breedingInfo;

  const INITIAL_CAP = 8;
  const displayedPartners = isExpanded
    ? compatiblePokemon
    : compatiblePokemon.slice(0, INITIAL_CAP);
  const hasMore = compatiblePokemon.length > INITIAL_CAP;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colorScheme.surface,
          borderColor: colorScheme.outline,
        },
      ]}
    >
      {/* Header */}
      <View style={styles.cardHeaderRow}>
        <View style={styles.titleWithIcon}>
          <Ionicons name="sparkles" size={18} color={colorScheme.primary} />
          <Text style={[styles.cardTitle, { color: colorScheme.onSurface }]}>
            Breeding Information
          </Text>
        </View>
      </View>

      {/* Grid of Egg Groups & Hatch Steps */}
      <View style={styles.gridContainer}>
        {/* Egg Groups */}
        <View style={styles.infoRow}>
          <Text style={[styles.label, { color: colorScheme.secondary }]}>EGG GROUPS</Text>
          <View style={styles.chipRow}>
            {eggGroups && eggGroups.length > 0 ? (
              eggGroups.map((group) => (
                <View
                  key={group}
                  style={[
                    styles.eggGroupChip,
                    {
                      backgroundColor: colorScheme.surface,
                      borderColor: colorScheme.outline,
                    },
                  ]}
                >
                  <Text style={[styles.eggGroupChipText, { color: colorScheme.onSurface }]}>
                    {group}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={[styles.valueText, { color: colorScheme.onSurface }]}>Unknown</Text>
            )}
          </View>
        </View>

        {/* Hatch Steps */}
        <View style={styles.infoRow}>
          <Text style={[styles.label, { color: colorScheme.secondary }]}>HATCH STEPS</Text>
          <Text style={[styles.valueText, { color: colorScheme.onSurface }]}>
            {hatchSteps !== null ? `~${hatchSteps.toLocaleString()} steps` : 'Unknown'}
          </Text>
        </View>

        {/* Gender Ratio */}
        <View style={styles.infoRow}>
          <Text style={[styles.label, { color: colorScheme.secondary }]}>GENDER RATIO</Text>
          {isGenderless ? (
            <View style={styles.genderlessBadge}>
              <Ionicons name="transgender-outline" size={14} color={colorScheme.secondary} />
              <Text style={[styles.genderlessText, { color: colorScheme.secondary }]}>
                Genderless
              </Text>
            </View>
          ) : malePercentage !== null && femalePercentage !== null ? (
            <View style={styles.genderContainer}>
              {/* Visual Split Bar */}
              <View style={styles.genderBarTrack}>
                <View style={[styles.maleBarSegment, { width: `${malePercentage}%` }]} />
                <View style={[styles.femaleBarSegment, { width: `${femalePercentage}%` }]} />
              </View>
              {/* Labels */}
              <View style={styles.genderLabelsRow}>
                <Text style={styles.maleLabel}>♂ {malePercentage.toFixed(1)}% Male</Text>
                <Text style={styles.femaleLabel}>♀ {femalePercentage.toFixed(1)}% Female</Text>
              </View>
            </View>
          ) : (
            <Text style={[styles.valueText, { color: colorScheme.onSurface }]}>Unknown</Text>
          )}
        </View>
      </View>

      {/* Egg Moves */}
      <View style={styles.sectionDivider} />
      <View style={styles.sectionHeaderRow}>
        <Text style={[styles.subTitle, { color: colorScheme.onSurface }]}>
          Egg Moves ({eggMoves.length})
        </Text>
      </View>

      {eggMoves.length > 0 ? (
        <View style={styles.eggMovesList}>
          {eggMoves.map((mv, idx) => (
            <View
              key={`${mv.name}-${idx}`}
              style={[styles.moveRow, { borderBottomColor: colorScheme.outline + '40' }]}
            >
              <Text style={[styles.moveName, { color: colorScheme.onSurface }]}>
                {mv.name}
              </Text>
              <View
                style={[
                  styles.eggMoveBadge,
                  { backgroundColor: colorScheme.secondaryContainer },
                ]}
              >
                <Text style={[styles.eggMoveBadgeText, { color: colorScheme.onSecondaryContainer }]}>
                  Egg Move
                </Text>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: colorScheme.secondary }]}>No egg moves</Text>
        </View>
      )}

      {/* Breeding Compatibility */}
      <View style={styles.sectionDivider} />
      <View style={styles.sectionHeaderRow}>
        <Text style={[styles.subTitle, { color: colorScheme.onSurface }]}>
          Breeding Compatibility ({compatiblePokemon.length})
        </Text>
      </View>

      {!canBreed ? (
        <View style={styles.cannotBreedCard}>
          <Ionicons name="close-circle-outline" size={18} color="#EF4444" />
          <Text style={styles.cannotBreedText}>
            {reason || 'Cannot breed (Undiscovered Egg Group)'}
          </Text>
        </View>
      ) : compatiblePokemon.length > 0 ? (
        <View>
          <View style={styles.partnerGrid}>
            {displayedPartners.map((partner) => (
              <TouchableOpacity
                key={partner.id}
                activeOpacity={0.7}
                onPress={() => onSelectPokemon(partner.id)}
                style={[
                  styles.partnerCard,
                  {
                    backgroundColor: colorScheme.surface,
                    borderColor: colorScheme.outline,
                  },
                ]}
              >
                <Image
                  source={{ uri: partner.officialArtworkUrl || partner.spriteUrl }}
                  style={styles.partnerSprite}
                  contentFit="contain"
                />
                <Text
                  numberOfLines={1}
                  style={[styles.partnerName, { color: colorScheme.onSurface }]}
                >
                  {partner.name.charAt(0).toUpperCase() + partner.name.slice(1)}
                </Text>
                <Text style={[styles.partnerNumber, { color: colorScheme.secondary }]}>
                  #{String(partner.id).padStart(3, '0')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {hasMore && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setIsExpanded(!isExpanded)}
              style={[styles.expandButton, { borderColor: colorScheme.outline }]}
            >
              <Text style={[styles.expandButtonText, { color: colorScheme.primary }]}>
                {isExpanded
                  ? 'Show Less'
                  : `View all ${compatiblePokemon.length} compatible species`}
              </Text>
              <Ionicons
                name={isExpanded ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={colorScheme.primary}
              />
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: colorScheme.secondary }]}>
            No compatible Pokémon synced in database
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginVertical: 4,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  gridContainer: {
    gap: 12,
  },
  infoRow: {
    gap: 4,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  valueText: {
    fontSize: 14,
    fontWeight: '600',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  eggGroupChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
    borderWidth: 1,
  },
  eggGroupChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  genderlessBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 2,
  },
  genderlessText: {
    fontSize: 14,
    fontWeight: '600',
  },
  genderContainer: {
    gap: 4,
    marginTop: 2,
  },
  genderBarTrack: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    flexDirection: 'row',
    backgroundColor: '#E5E7EB',
  },
  maleBarSegment: {
    height: '100%',
    backgroundColor: '#3B82F6',
  },
  femaleBarSegment: {
    height: '100%',
    backgroundColor: '#EC4899',
  },
  genderLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  maleLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563EB',
  },
  femaleLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#DB2777',
  },
  sectionDivider: {
    height: 1,
    backgroundColor: 'rgba(150, 150, 150, 0.15)',
    marginVertical: 12,
  },
  sectionHeaderRow: {
    marginBottom: 8,
  },
  subTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  eggMovesList: {
    gap: 4,
  },
  moveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
  },
  moveName: {
    fontSize: 14,
    fontWeight: '500',
  },
  eggMoveBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 100,
  },
  eggMoveBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  emptyContainer: {
    paddingVertical: 8,
  },
  emptyText: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  cannotBreedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  cannotBreedText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#DC2626',
  },
  partnerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  partnerCard: {
    width: '23%',
    alignItems: 'center',
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  partnerSprite: {
    width: 44,
    height: 44,
  },
  partnerName: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
  },
  partnerNumber: {
    fontSize: 10,
    fontWeight: '500',
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    marginTop: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  expandButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
