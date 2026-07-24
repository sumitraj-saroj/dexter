import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import { useAppTheme } from '../theme';

export function PokemonCardSkeleton() {
  const { colorScheme } = useAppTheme();
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.7, { duration: 650, easing: Easing.inOut(Easing.quad) }),
        withTiming(0.3, { duration: 650, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );

    return () => {
      cancelAnimation(opacity);
    };
  }, []);

  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const placeholderBg = colorScheme.outline + '40';

  return (
    <Animated.View
      style={[
        styles.cardContainer,
        {
          backgroundColor: colorScheme.surface,
          borderColor: colorScheme.outline + '30',
        },
        shimmerStyle,
      ]}
    >
      {/* Header Badge Placeholder */}
      <View style={styles.header}>
        <View style={[styles.numberSkeleton, { backgroundColor: placeholderBg }]} />
        <View style={[styles.badgeSkeleton, { backgroundColor: placeholderBg }]} />
      </View>

      {/* Image Placeholder */}
      <View style={styles.imageContainer}>
        <View style={[styles.circleSkeleton, { backgroundColor: placeholderBg }]} />
      </View>

      {/* Title Placeholder */}
      <View style={[styles.titleSkeleton, { backgroundColor: placeholderBg }]} />

      {/* Type Chips Row Placeholder */}
      <View style={styles.typesRow}>
        <View style={[styles.chipSkeleton, { backgroundColor: placeholderBg }]} />
        <View style={[styles.chipSkeleton, { backgroundColor: placeholderBg }]} />
      </View>
    </Animated.View>
  );
}

export function PokemonGridSkeleton() {
  return (
    <View style={styles.gridContainer}>
      {Array.from({ length: 8 }).map((_, index) => (
        <View key={index} style={styles.gridCell}>
          <PokemonCardSkeleton />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 4,
    paddingTop: 4,
  },
  gridCell: {
    width: '50%',
  },
  cardContainer: {
    margin: 6,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 180,
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  numberSkeleton: {
    width: 32,
    height: 12,
    borderRadius: 6,
  },
  badgeSkeleton: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  imageContainer: {
    width: 86,
    height: 86,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  circleSkeleton: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  titleSkeleton: {
    width: '60%',
    height: 14,
    borderRadius: 7,
    marginBottom: 6,
  },
  typesRow: {
    flexDirection: 'row',
    gap: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipSkeleton: {
    width: 44,
    height: 18,
    borderRadius: 9,
  },
});
