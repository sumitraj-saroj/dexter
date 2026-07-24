import React, { useEffect } from 'react';
import { StyleSheet, Text, View, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  withTiming,
  useAnimatedStyle,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { useAppTheme } from '../theme';

interface StatBarProps {
  label: string;
  value: number;
  maxVal?: number;
  index?: number;
  barColor?: string;
}

export const StatBar: React.FC<StatBarProps> = ({ label, value, maxVal = 255, index = 0, barColor }) => {
  const { colorScheme, animatedTokens } = useAppTheme();
  const progress = useSharedValue(0);

  useEffect(() => {
    const targetPercentage = Math.min(1, Math.max(0, value / maxVal));
    progress.value = withDelay(
      index * 70,
      withTiming(targetPercentage, {
        duration: 350,
        easing: Easing.out(Easing.quad),
      })
    );
  }, [value, maxVal, index]);

  const animatedBarStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
    backgroundColor: barColor || animatedTokens.primary.value,
  }));

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={[styles.labelText, { color: colorScheme.secondary }]}>
          {label}
        </Text>
        <Text style={[styles.valueText, { color: colorScheme.onSurface }]}>
          {value}
        </Text>
      </View>

      <View
        style={[
          styles.track,
          {
            backgroundColor: colorScheme.outline,
          },
        ]}
      >
        <Animated.View style={[styles.fill, animatedBarStyle]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  labelText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  valueText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
    fontVariant: ['tabular-nums'],
  },
  track: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    width: '100%',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
  },
});
