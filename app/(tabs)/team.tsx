import React, { useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { useAppTheme, AnimatedThemeView } from '../../src/theme';
import { useAppDb } from '../_layout';
import { useFullTeam6SlotsQuery, useRemoveFromSlotMutation } from '../../src/hooks/useTeamQuery';
import { TypeChip } from '../../src/components';
import { hapticLight } from '../../src/utils/haptics';

import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';

export default function TeamScreen() {
  const router = useRouter();
  const db = useAppDb();
  const { colorScheme, resetToNeutralTheme } = useAppTheme();

  const { data: teamSlots = [], isLoading } = useFullTeam6SlotsQuery(db);
  const removeMutation = useRemoveFromSlotMutation(db);

  // Active filled count
  const filledMembers = teamSlots.filter((s) => s.pokemon !== null);

  // Always keep team screen on neutral Apple theme
  useEffect(() => {
    resetToNeutralTheme();
  }, [resetToNeutralTheme]);

  return (
    <AnimatedThemeView style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          {router.canGoBack() ? (
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Text style={[styles.backText, { color: colorScheme.primary }]}>← Back</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ width: 60 }} />
          )}
          <Text style={[styles.headerTitle, { color: colorScheme.onBackground }]}>
            My Squad ({filledMembers.length}/6)
          </Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <Text style={[styles.subtitle, { color: colorScheme.secondary }]}>
            Build your Gen 1 dream team of up to 6 Pokémon.
          </Text>

          {isLoading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={colorScheme.primary} />
            </View>
          ) : (
            <View style={styles.slotsGrid}>
              {teamSlots.map((item) => {
                const { slot, pokemon } = item;

                if (!pokemon) {
                  // Empty Placeholder Slot
                  return (
                    <Animated.View
                      key={`empty-slot-${slot}`}
                      entering={FadeIn.duration(200)}
                      exiting={FadeOut.duration(200)}
                      layout={LinearTransition.duration(250)}
                    >
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => router.push('/')}
                        style={[
                          styles.emptySlotCard,
                          {
                            backgroundColor: colorScheme.surface,
                            borderColor: colorScheme.outline,
                          },
                        ]}
                      >
                        <View
                          style={[
                            styles.slotBadge,
                            { backgroundColor: colorScheme.secondaryContainer },
                          ]}
                        >
                          <Text style={[styles.slotBadgeText, { color: colorScheme.onSecondaryContainer }]}>
                            Slot {slot}
                          </Text>
                        </View>

                        <Text style={[styles.addIcon, { color: colorScheme.primary }]}>
                          ➕
                        </Text>
                        <Text style={[styles.emptySlotTitle, { color: colorScheme.onBackground }]}>
                          Empty Slot
                        </Text>
                        <Text
                          style={[
                            styles.emptySlotSub,
                            { color: colorScheme.secondary },
                          ]}
                        >
                          Tap to browse Pokédex
                        </Text>
                      </TouchableOpacity>
                    </Animated.View>
                  );
                }

                // Filled Member Card
                const formattedName =
                  pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1);

                return (
                  <Animated.View
                    key={`filled-slot-${slot}`}
                    entering={FadeIn.duration(200)}
                    exiting={FadeOut.duration(200)}
                    layout={LinearTransition.duration(250)}
                  >
                    <View
                      style={[
                        styles.filledSlotCard,
                        {
                          backgroundColor: colorScheme.surface,
                          borderColor: colorScheme.outline,
                        },
                      ]}
                    >
                      <View style={styles.cardTopHeader}>
                        <View
                          style={[
                            styles.slotBadge,
                            { backgroundColor: colorScheme.primary },
                          ]}
                        >
                          <Text style={[styles.slotBadgeText, { color: colorScheme.onPrimary }]}>
                            Slot {slot}
                          </Text>
                        </View>
                        <Text
                          style={[
                            styles.pokemonNumber,
                            { color: colorScheme.secondary },
                          ]}
                        >
                          #{pokemon.number}
                        </Text>
                      </View>

                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => router.push(`/pokemon/${pokemon.id}`)}
                        style={styles.cardBody}
                      >
                        <Image
                          source={{
                            uri: pokemon.officialArtworkUrl || pokemon.spriteUrl,
                          }}
                          style={styles.pokemonSprite}
                          contentFit="contain"
                        />

                        <Text
                          numberOfLines={1}
                          style={[
                            styles.pokemonTitle,
                            { color: colorScheme.onSurface },
                          ]}
                        >
                          {formattedName}
                        </Text>

                        <View style={styles.typeRow}>
                          <TypeChip type={pokemon.primaryType} size="small" />
                          {pokemon.secondaryType ? (
                            <TypeChip type={pokemon.secondaryType} size="small" />
                          ) : null}
                        </View>
                      </TouchableOpacity>

                      {/* Remove Action Button */}
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => {
                          hapticLight();
                          removeMutation.mutate(slot);
                        }}
                        style={[
                          styles.removeBtn,
                          { backgroundColor: colorScheme.secondaryContainer },
                        ]}
                      >
                        <Text style={[styles.removeBtnText, { color: colorScheme.onSecondaryContainer }]}>
                          ✕ Remove
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </Animated.View>
                );
              })}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
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
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  subtitle: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.66,
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  centered: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  slotsGrid: {
    gap: 12,
  },
  emptySlotCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 130,
  },
  slotBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    position: 'absolute',
    top: 12,
    left: 14,
  },
  slotBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  addIcon: {
    fontSize: 22,
    marginBottom: 4,
    marginTop: 10,
  },
  emptySlotTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  emptySlotSub: {
    fontSize: 12,
    fontWeight: '400',
  },
  filledSlotCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  cardTopHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  pokemonNumber: {
    fontSize: 12,
    fontWeight: '400',
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
    fontVariant: ['tabular-nums'],
  },
  cardBody: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  pokemonSprite: {
    width: 80,
    height: 80,
    marginVertical: 4,
  },
  pokemonTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 6,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
  },
  removeBtn: {
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  removeBtnText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
