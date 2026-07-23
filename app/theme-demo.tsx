import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { useAppTheme, AnimatedThemeView } from '../src/theme';
import { TypeChip } from '../src/components';
import { PokemonType } from '../src/types';

export default function ThemeDemoScreen() {
  const router = useRouter();
  const { colorScheme, animatedTokens, setThemeByTypes, resetToNeutralTheme } = useAppTheme();

  // Animated style for Primary Button
  const primaryButtonStyle = useAnimatedStyle(() => ({
    backgroundColor: animatedTokens.primary.value,
  }));

  // Animated style for Primary Text
  const primaryTextStyle = useAnimatedStyle(() => ({
    color: animatedTokens.onPrimary.value,
  }));

  // Animated style for Surface Card
  const surfaceCardStyle = useAnimatedStyle(() => ({
    backgroundColor: animatedTokens.surfaceVariant.value,
    borderColor: animatedTokens.outline.value,
  }));

  // Animated style for On-Background Title Text
  const titleTextStyle = useAnimatedStyle(() => ({
    color: animatedTokens.onBackground.value,
  }));

  const sampleTypes: Array<{ label: string; primary: PokemonType; secondary?: PokemonType }> = [
    { label: '⚡ Pikachu (Electric)', primary: 'electric' },
    { label: '🔥 Charizard (Fire / Flying)', primary: 'fire', secondary: 'flying' },
    { label: '💧 Blastoise (Water)', primary: 'water' },
    { label: '🔮 Gengar (Ghost / Poison)', primary: 'ghost', secondary: 'poison' },
    { label: '🌿 Venusaur (Grass / Poison)', primary: 'grass', secondary: 'poison' },
    { label: '🐉 Dragonite (Dragon / Flying)', primary: 'dragon', secondary: 'flying' },
    { label: '❄️ Lapras (Water / Ice)', primary: 'water', secondary: 'ice' },
  ];

  return (
    <AnimatedThemeView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={[styles.backText, { color: colorScheme.primary }]}>← Back</Text>
          </TouchableOpacity>
          <Animated.Text style={[styles.headerTitle, titleTextStyle]}>
            Dynamic Theme Demo 🎨
          </Animated.Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <Animated.Text style={[styles.subtitle, titleTextStyle]}>
            Tap a Pokémon type below to trigger a smooth ~500ms Material 3 color palette transition!
          </Animated.Text>

          {/* Interactive Preset Buttons */}
          <View style={styles.buttonsContainer}>
            {sampleTypes.map((sample) => (
              <TouchableOpacity
                key={sample.label}
                activeOpacity={0.8}
                onPress={() => setThemeByTypes(sample.primary, sample.secondary)}
                style={[
                  styles.presetCard,
                  { backgroundColor: colorScheme.surfaceVariant, borderColor: colorScheme.outline + '40' },
                ]}
              >
                <Text style={[styles.presetText, { color: colorScheme.onSurfaceVariant }]}>
                  {sample.label}
                </Text>
                <View style={styles.chipRow}>
                  <TypeChip type={sample.primary} size="small" />
                  {sample.secondary ? <TypeChip type={sample.secondary} size="small" /> : null}
                </View>
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={resetToNeutralTheme}
              style={[
                styles.presetCard,
                { backgroundColor: colorScheme.surfaceVariant, borderColor: colorScheme.outline + '40' },
              ]}
            >
              <Text style={[styles.presetText, { color: colorScheme.onSurfaceVariant }]}>
                🏛️ Neutral Default Pokédex Theme
              </Text>
            </TouchableOpacity>
          </View>

          {/* Live Token Inspection Card */}
          <Animated.View style={[styles.tokenCard, surfaceCardStyle]}>
            <Animated.Text style={[styles.tokenCardTitle, titleTextStyle]}>
              Live Material 3 Tokens
            </Animated.Text>

            <View style={styles.tokenRow}>
              <View style={[styles.swatch, { backgroundColor: colorScheme.primary }]} />
              <Text style={[styles.tokenName, { color: colorScheme.onSurfaceVariant }]}>
                Primary: {colorScheme.primary}
              </Text>
            </View>

            <View style={styles.tokenRow}>
              <View style={[styles.swatch, { backgroundColor: colorScheme.secondary }]} />
              <Text style={[styles.tokenName, { color: colorScheme.onSurfaceVariant }]}>
                Secondary: {colorScheme.secondary}
              </Text>
            </View>

            <View style={styles.tokenRow}>
              <View style={[styles.swatch, { backgroundColor: colorScheme.surfaceVariant }]} />
              <Text style={[styles.tokenName, { color: colorScheme.onSurfaceVariant }]}>
                Surface Variant: {colorScheme.surfaceVariant}
              </Text>
            </View>

            <View style={styles.tokenRow}>
              <View style={[styles.swatch, { backgroundColor: colorScheme.background }]} />
              <Text style={[styles.tokenName, { color: colorScheme.onSurfaceVariant }]}>
                Background: {colorScheme.background}
              </Text>
            </View>

            {/* Reanimated Animated Action Button */}
            <Animated.View style={[styles.demoActionBtn, primaryButtonStyle]}>
              <Animated.Text style={[styles.demoActionBtnText, primaryTextStyle]}>
                Smooth Animated Reanimated Button
              </Animated.Text>
            </Animated.View>
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
  safeArea: {
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
    fontSize: 16,
    fontWeight: '700',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  content: {
    padding: 20,
    gap: 16,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
    marginBottom: 4,
  },
  buttonsContainer: {
    gap: 10,
  },
  presetCard: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  presetText: {
    fontSize: 14,
    fontWeight: '700',
  },
  chipRow: {
    flexDirection: 'row',
    gap: 4,
  },
  tokenCard: {
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 10,
    gap: 12,
  },
  tokenCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  tokenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  swatch: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#00000020',
  },
  tokenName: {
    fontSize: 13,
    fontWeight: '600',
  },
  demoActionBtn: {
    marginTop: 8,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
  },
  demoActionBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
