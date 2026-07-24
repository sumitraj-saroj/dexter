import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { useColorScheme, ViewProps, View } from 'react-native';
import Animated, {
  useSharedValue,
  withTiming,
  useAnimatedStyle,
  SharedValue,
} from 'react-native-reanimated';
import { M3ColorScheme, PokemonType, Pokemon } from '../types';
import {
  TYPE_SEED_COLORS,
  NEUTRAL_SEED_COLOR,
  generateTonalPalette,
  getTonalPaletteForPokemon,
} from './dynamicTheme';

interface AnimatedThemeTokens {
  background: SharedValue<string>;
  surface: SharedValue<string>;
  surfaceVariant: SharedValue<string>;
  primary: SharedValue<string>;
  secondary: SharedValue<string>;
  onPrimary: SharedValue<string>;
  onBackground: SharedValue<string>;
  onSurface: SharedValue<string>;
  outline: SharedValue<string>;
}

interface ThemeContextType {
  colorScheme: M3ColorScheme;
  animatedTokens: AnimatedThemeTokens;
  isDark: boolean;
  activePrimarySeed: string;
  activeSecondarySeed: string | null;
  setThemeForPokemon: (pokemon: { primaryType: PokemonType; secondaryType?: PokemonType | null }) => void;
  setThemeByTypes: (primaryType: PokemonType, secondaryType?: PokemonType | null) => void;
  resetToNeutralTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const isDark = systemColorScheme === 'dark';

  const [activePrimarySeed, setActivePrimarySeed] = useState<string>(NEUTRAL_SEED_COLOR);
  const [activeSecondarySeed, setActiveSecondarySeed] = useState<string | null>(null);

  // Compute static color scheme for non-animated props
  const colorScheme = useMemo(() => {
    return generateTonalPalette(activePrimarySeed, activeSecondarySeed, isDark ? 'dark' : 'light');
  }, [activePrimarySeed, activeSecondarySeed, isDark]);

  // Reanimated Shared Values for 500ms smooth transitions
  const backgroundVal = useSharedValue(colorScheme.background);
  const surfaceVal = useSharedValue(colorScheme.surface);
  const surfaceVariantVal = useSharedValue(colorScheme.surfaceVariant);
  const primaryVal = useSharedValue(colorScheme.primary);
  const secondaryVal = useSharedValue(colorScheme.secondary);
  const onPrimaryVal = useSharedValue(colorScheme.onPrimary);
  const onBackgroundVal = useSharedValue(colorScheme.onBackground);
  const onSurfaceVal = useSharedValue(colorScheme.onSurface);
  const outlineVal = useSharedValue(colorScheme.outline);

  // Animate values when colorScheme changes
  useEffect(() => {
    const timingConfig = { duration: 500 };
    backgroundVal.value = withTiming(colorScheme.background, timingConfig);
    surfaceVal.value = withTiming(colorScheme.surface, timingConfig);
    surfaceVariantVal.value = withTiming(colorScheme.surfaceVariant, timingConfig);
    primaryVal.value = withTiming(colorScheme.primary, timingConfig);
    secondaryVal.value = withTiming(colorScheme.secondary, timingConfig);
    onPrimaryVal.value = withTiming(colorScheme.onPrimary, timingConfig);
    onBackgroundVal.value = withTiming(colorScheme.onBackground, timingConfig);
    onSurfaceVal.value = withTiming(colorScheme.onSurface, timingConfig);
    outlineVal.value = withTiming(colorScheme.outline, timingConfig);
  }, [colorScheme]);

  const setThemeByTypes = useCallback((primaryType: PokemonType, secondaryType?: PokemonType | null) => {
    const primaryHex = TYPE_SEED_COLORS[primaryType] || NEUTRAL_SEED_COLOR;
    const secondaryHex = secondaryType ? TYPE_SEED_COLORS[secondaryType] || null : null;
    setActivePrimarySeed(primaryHex);
    setActiveSecondarySeed(secondaryHex);
  }, []);

  const setThemeForPokemon = useCallback((pokemon: { primaryType: PokemonType; secondaryType?: PokemonType | null }) => {
    setThemeByTypes(pokemon.primaryType, pokemon.secondaryType);
  }, [setThemeByTypes]);

  const resetToNeutralTheme = useCallback(() => {
    setActivePrimarySeed(NEUTRAL_SEED_COLOR);
    setActiveSecondarySeed(null);
  }, []);

  const animatedTokens = useMemo<AnimatedThemeTokens>(
    () => ({
      background: backgroundVal,
      surface: surfaceVal,
      surfaceVariant: surfaceVariantVal,
      primary: primaryVal,
      secondary: secondaryVal,
      onPrimary: onPrimaryVal,
      onBackground: onBackgroundVal,
      onSurface: onSurfaceVal,
      outline: outlineVal,
    }),
    [
      backgroundVal,
      surfaceVal,
      surfaceVariantVal,
      primaryVal,
      secondaryVal,
      onPrimaryVal,
      onBackgroundVal,
      onSurfaceVal,
      outlineVal,
    ]
  );

  return (
    <ThemeContext.Provider
      value={{
        colorScheme,
        animatedTokens,
        isDark,
        activePrimarySeed,
        activeSecondarySeed,
        setThemeForPokemon,
        setThemeByTypes,
        resetToNeutralTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useAppTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useAppTheme must be used within a ThemeProvider');
  }
  return context;
};

// Reanimated Animated Background Container Component
export const AnimatedThemeView = React.forwardRef<View, ViewProps & { surface?: boolean }>(({
  style,
  surface = false,
  children,
  ...props
}, ref) => {
  const { animatedTokens } = useAppTheme();

  const animatedStyle = useAnimatedStyle(() => {
    return {
      backgroundColor: surface ? animatedTokens.surface.value : animatedTokens.background.value,
    };
  });

  return (
    <Animated.View ref={ref} style={[animatedStyle, style]} {...props}>
      {children}
    </Animated.View>
  );
});


export * from './dynamicTheme';
