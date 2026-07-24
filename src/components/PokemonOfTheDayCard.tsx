import React, { memo } from 'react';
import { StyleSheet, Text, View, Pressable, TouchableOpacity, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import { Image } from 'expo-image';
import { Pokemon, PokemonType } from '../types';
import { TYPE_SEED_COLORS } from '../theme/colors';
import { hapticLight } from '../utils/haptics';

interface PokemonOfTheDayCardProps {
  pokemon: Pokemon;
  onPress: (pokemon: Pokemon) => void;
  onShuffle?: () => void;
}

const AnimatedImage = Animated.createAnimatedComponent(Image);

const LIGHT_TYPES: Set<PokemonType> = new Set(['electric', 'ice', 'fairy', 'bug']);

function getLuminance(hex: string): number {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;
  const a = [r, g, b].map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

const SPOTLIGHT_CHIP_TEXT_COLORS: Partial<Record<PokemonType, string>> = {
  electric: '#9A7D0A',
  ice: '#00838F',
  fairy: '#AD1457',
  bug: '#558B2F',
  normal: '#616161',
  grass: '#2E7D32',
  fire: '#D84315',
  water: '#1565C0',
  fighting: '#C62828',
  flying: '#4A148C',
  poison: '#6A1B9A',
  ground: '#4E342E',
  rock: '#4E342E',
  ghost: '#311B92',
  dragon: '#4527A0',
  steel: '#37474F',
  dark: '#212121',
  psychic: '#C2185B',
};

function SpotlightTypeChip({ type }: { type: PokemonType }) {
  const chipTextColor = SPOTLIGHT_CHIP_TEXT_COLORS[type] || TYPE_SEED_COLORS[type] || '#333333';
  return (
    <View style={styles.spotlightChip}>
      <Text style={[styles.spotlightChipText, { color: chipTextColor }]}>
        {type.toUpperCase()}
      </Text>
    </View>
  );
}

function PokemonOfTheDayCardComponent({
  pokemon,
  onPress,
  onShuffle,
}: PokemonOfTheDayCardProps) {
  const pressScale = useSharedValue(1);
  const entryOpacity = useSharedValue(0);
  const entryScale = useSharedValue(0.95);
  const floatY = useSharedValue(0);

  React.useEffect(() => {
    entryOpacity.value = withTiming(1, { duration: 450, easing: Easing.out(Easing.quad) });
    entryScale.value = withTiming(1, { duration: 450, easing: Easing.out(Easing.quad) });

    floatY.value = withRepeat(
      withSequence(
        withTiming(-5, { duration: 1250, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 1250, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );

    return () => {
      cancelAnimation(floatY);
    };
  }, []);

  const formattedName =
    pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1);
  const primaryColor = TYPE_SEED_COLORS[pokemon.primaryType] || '#3F51B5';

  const lum = getLuminance(primaryColor);
  const isLightFill = lum > 0.42 || LIGHT_TYPES.has(pokemon.primaryType);

  // Contrast text color definitions
  const textColor = isLightFill ? '#121212' : '#FFFFFF';
  const eyebrowColor = isLightFill ? 'rgba(0, 0, 0, 0.60)' : 'rgba(255, 255, 255, 0.72)';
  const numberColor = isLightFill ? 'rgba(0, 0, 0, 0.48)' : 'rgba(255, 255, 255, 0.60)';
  const flavorTextColor = isLightFill ? 'rgba(18, 18, 18, 0.85)' : 'rgba(255, 255, 255, 0.88)';
  const frameBg = isLightFill ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.16)';
  const shuffleBtnBg = isLightFill ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.20)';
  const shuffleIconColor = isLightFill ? '#121212' : '#FFFFFF';

  const handlePressIn = () => {
    pressScale.value = withTiming(0.98, { duration: 100, easing: Easing.out(Easing.quad) });
  };

  const handlePressOut = () => {
    pressScale.value = withTiming(1, { duration: 150, easing: Easing.out(Easing.quad) });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: entryOpacity.value,
    transform: [{ scale: entryScale.value * pressScale.value }],
  }));

  const artworkFloatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatY.value }],
  }));

  // Clean up raw flavor text whitespace/newlines
  const cleanedFlavorText = pokemon.flavorText
    ? pokemon.flavorText.replace(/[\f\n\r\t]/g, ' ').replace(/\s+/g, ' ').trim()
    : 'A mystery species discovered in the world of Pokémon.';

  return (
    <Animated.View style={[styles.outerContainer, animatedStyle]}>
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={() => {
          hapticLight();
          onPress(pokemon);
        }}
        style={[
          styles.card,
          {
            backgroundColor: primaryColor,
          },
        ]}
      >
        {/* Eyebrow + Pokedex Number + Shuffle Icon */}
        <View style={styles.topRow}>
          <View style={styles.eyebrowContainer}>
            <Text style={[styles.eyebrowText, { color: eyebrowColor }]}>
              SPOTLIGHT
            </Text>
            <Text style={[styles.numberText, { color: numberColor }]}>
              #{pokemon.number}
            </Text>
          </View>

          {onShuffle ? (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={(e) => {
                e.stopPropagation();
                hapticLight();
                onShuffle();
              }}
              style={[styles.shuffleButton, { backgroundColor: shuffleBtnBg }]}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={[styles.shuffleIconText, { color: shuffleIconColor }]}>🔀</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Main Section */}
        <View style={styles.mainSection}>
          {/* Left Column */}
          <View style={styles.leftColumn}>
            <Text numberOfLines={1} style={[styles.nameText, { color: textColor }]}>
              {formattedName}
            </Text>

            {/* Quiet Type Chips */}
            <View style={styles.typesRow}>
              <SpotlightTypeChip type={pokemon.primaryType} />
              {pokemon.secondaryType ? (
                <SpotlightTypeChip type={pokemon.secondaryType} />
              ) : null}
            </View>

            {/* Flavor Text */}
            <Text numberOfLines={3} style={[styles.flavorText, { color: flavorTextColor }]}>
              "{cleanedFlavorText}"
            </Text>
          </View>

          {/* Right Column: Inset Artwork Frame */}
          <View style={[styles.artworkFrame, { backgroundColor: frameBg }]}>
            <AnimatedImage
              sharedTransitionTag={`pokemon-image-${pokemon.id}`}
              source={{ uri: pokemon.officialArtworkUrl || pokemon.spriteUrl }}
              style={[styles.artwork, artworkFloatStyle]}
              contentFit="contain"
              transition={200}
              placeholder={require('../../assets/icon.png')}
            />
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

export const PokemonOfTheDayCard = memo(PokemonOfTheDayCardComponent);

const styles = StyleSheet.create({
  outerContainer: {
    marginHorizontal: 6,
    marginTop: 4,
    marginBottom: 14,
  },
  card: {
    borderRadius: 26,
    padding: 18,
    overflow: 'hidden',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  eyebrowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eyebrowText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  numberText: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
    fontVariant: ['tabular-nums'],
  },
  shuffleButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shuffleIconText: {
    fontSize: 14,
  },
  mainSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  leftColumn: {
    flex: 1,
    justifyContent: 'center',
  },
  nameText: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  typesRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    marginBottom: 10,
  },
  spotlightChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 100,
  },
  spotlightChipText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  flavorText: {
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 18,
  },
  artworkFrame: {
    width: 104,
    height: 104,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
  },
  artwork: {
    width: 90,
    height: 90,
  },
});
