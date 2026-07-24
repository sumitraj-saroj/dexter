import React, { memo, useEffect } from 'react';
import { StyleSheet, Text, View, Pressable, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Pokemon } from '../types';
import { useAppTheme } from '../theme';
import { TypeChip } from './TypeChip';

import { hapticLight } from '../utils/haptics';

interface PokemonCardProps {
  pokemon: Pokemon;
  index?: number;
  onPress: (pokemon: Pokemon) => void;
}

const AnimatedImage = Animated.createAnimatedComponent(Image);

function PokemonCardComponent({ pokemon, index = 0, onPress }: PokemonCardProps) {
  const { colorScheme } = useAppTheme();

  const formattedName =
    pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1);

  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.96);
  const pressScale = useSharedValue(1);

  useEffect(() => {
    const staggerDelay = Math.min(150, (index % 10) * 25);
    opacity.value = withDelay(
      staggerDelay,
      withTiming(1, { duration: 220, easing: Easing.out(Easing.quad) })
    );
    scale.value = withDelay(
      staggerDelay,
      withTiming(1, { duration: 220, easing: Easing.out(Easing.quad) })
    );
  }, [index]);

  const handlePressIn = () => {
    pressScale.value = withTiming(0.97, { duration: 100, easing: Easing.out(Easing.quad) });
  };

  const handlePressOut = () => {
    pressScale.value = withTiming(1, { duration: 150, easing: Easing.out(Easing.quad) });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value * pressScale.value }],
  }));

  // Priority status indicators (capped at 3 max)
  const statusBadges = [];
  if (pokemon.isCaught) {
    statusBadges.push({ key: 'caught', icon: 'disc', color: '#EF4444' });
  }
  if (pokemon.isFavorite) {
    statusBadges.push({ key: 'favorite', icon: 'heart', color: '#F43F5E' });
  }
  if (pokemon.shinyOwned) {
    statusBadges.push({ key: 'shiny', icon: 'star', color: '#F59E0B' });
  }
  if (pokemon.isAlpha) {
    statusBadges.push({ key: 'alpha', icon: 'flag', color: '#8B5CF6' });
  }
  if (pokemon.hasCompetitiveBuild) {
    statusBadges.push({ key: 'comp', icon: 'ribbon', color: '#06B6D4' });
  }
  const visibleBadges = statusBadges.slice(0, 3);

  return (
    <Animated.View style={[{ flex: 1, margin: 6 }, animatedStyle]}>
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={() => {
          hapticLight();
          onPress(pokemon);
        }}
        style={[
          styles.cardContainer,
          {
            backgroundColor: colorScheme.surface,
            borderColor: colorScheme.outline,
          },
        ]}
      >
        {/* Top Header: ID Badge & Status Indicators */}
        <View style={styles.cardHeader}>
          <Text style={[styles.numberText, { color: colorScheme.secondary }]}>
            #{pokemon.number}
          </Text>
          <View style={styles.headerRightBadges}>
            {visibleBadges.map((b) => (
              <Ionicons key={b.key} name={b.icon as any} size={12} color={b.color} />
            ))}
            {pokemon.isLegendary || pokemon.isMythical ? (
              <View style={[styles.starBadge, { backgroundColor: colorScheme.primary }]}>
                <Text style={[styles.starText, { color: colorScheme.onPrimary }]}>★</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Sprite Image */}
        <View style={styles.imageContainer}>
          <AnimatedImage
            sharedTransitionTag={`pokemon-image-${pokemon.id}`}
            source={{ uri: pokemon.officialArtworkUrl || pokemon.spriteUrl }}
            style={styles.sprite}
            contentFit="contain"
            transition={200}
            placeholder={require('../../assets/icon.png')}
          />
        </View>

        {/* Title */}
        <Text
          numberOfLines={1}
          style={[styles.nameText, { color: colorScheme.onSurface }]}
        >
          {formattedName}
        </Text>

        {/* Type Chips Row */}
        <View style={styles.typesRow}>
          <TypeChip type={pokemon.primaryType} size="small" />
          {pokemon.secondaryType ? (
            <TypeChip type={pokemon.secondaryType} size="small" />
          ) : null}
        </View>
      </Pressable>
    </Animated.View>
  );
}

export const PokemonCard = memo(PokemonCardComponent);

const styles = StyleSheet.create({
  cardContainer: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 180,
  },
  cardHeader: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerRightBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  caughtBadge: {
    marginRight: 2,
  },
  numberText: {
    fontSize: 12,
    fontWeight: '400',
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
    fontVariant: ['tabular-nums'],
  },
  starBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  starText: {
    fontSize: 9,
    fontWeight: '700',
  },
  imageContainer: {
    width: 86,
    height: 86,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  sprite: {
    width: 80,
    height: 80,
  },
  nameText: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
    textAlign: 'center',
    marginBottom: 6,
  },
  typesRow: {
    flexDirection: 'row',
    gap: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
