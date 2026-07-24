import { argbFromHex, themeFromSourceColor } from '@material/material-color-utilities';
import { M3ColorScheme, PokemonType, Pokemon } from '../types';

export const TYPE_SEED_COLORS: Record<PokemonType, string> = {
  fire: '#FF5722',
  water: '#2196F3',
  grass: '#4CAF50',
  electric: '#FFEB3B',
  psychic: '#E91E63',
  ice: '#00BCD4',
  dragon: '#673AB7',
  normal: '#9E9E9E',
  fighting: '#D32F2F',
  flying: '#7E57C2',
  poison: '#9C27B0',
  ground: '#795548',
  rock: '#8D6E63',
  bug: '#8BC34A',
  ghost: '#4A148C',
  steel: '#607D8B',
  fairy: '#F48FB1',
  dark: '#5A5366',
};

export const NEUTRAL_SEED_COLOR = '#3F51B5'; // Default Pokédex Theme

export const APPLE_NEUTRAL_LIGHT = {
  background: '#FAFAFA',
  surface: '#FFFFFF',
  surfaceVariant: '#F7F7F7',
  primary: '#1A1A1A',
  onPrimary: '#FFFFFF',
  primaryContainer: '#F0F0F0',
  onPrimaryContainer: '#1A1A1A',
  secondary: '#8A8A8E',
  onSecondary: '#FFFFFF',
  secondaryContainer: '#F7F7F7',
  onSecondaryContainer: '#1A1A1A',
  onBackground: '#1A1A1A',
  onSurface: '#1A1A1A',
  onSurfaceVariant: '#8A8A8E',
  outline: '#EBEBEB',
  divider: '#F0F0F0',
};

export const APPLE_NEUTRAL_DARK = {
  background: '#0D0D0D',
  surface: '#1C1C1E',
  surfaceVariant: '#252525',
  primary: '#F2F2F2',
  onPrimary: '#0D0D0D',
  primaryContainer: '#252525',
  onPrimaryContainer: '#F2F2F2',
  secondary: '#9A9A9E',
  onSecondary: '#0D0D0D',
  secondaryContainer: '#252525',
  onSecondaryContainer: '#F2F2F2',
  onBackground: '#F2F2F2',
  onSurface: '#F2F2F2',
  onSurfaceVariant: '#9A9A9E',
  outline: '#2C2C2E',
  divider: '#262626',
};

function hexFromArgb(argbVal: number): string {
  const hex = (argbVal & 0xffffff).toString(16).padStart(6, '0');
  return `#${hex}`;
}

export function generateTonalPalette(
  primarySeedHex: string,
  secondarySeedHex?: string | null,
  mode: 'light' | 'dark' = 'light'
): M3ColorScheme {
  const isDark = mode === 'dark';

  if (primarySeedHex === NEUTRAL_SEED_COLOR) {
    return isDark ? APPLE_NEUTRAL_DARK : APPLE_NEUTRAL_LIGHT;
  }

  // Primary Theme from Primary Seed for Pokémon Detail view
  const primaryArgb = argbFromHex(primarySeedHex);
  const primaryTheme = themeFromSourceColor(primaryArgb);
  const primaryPalette = isDark ? primaryTheme.schemes.dark : primaryTheme.schemes.light;

  let secondaryPalette = primaryPalette;
  if (secondarySeedHex && secondarySeedHex !== primarySeedHex) {
    const secondaryArgb = argbFromHex(secondarySeedHex);
    const secondaryTheme = themeFromSourceColor(secondaryArgb);
    secondaryPalette = isDark ? secondaryTheme.schemes.dark : secondaryTheme.schemes.light;
  }

  return {
    primary: hexFromArgb(primaryPalette.primary),
    onPrimary: hexFromArgb(primaryPalette.onPrimary),
    primaryContainer: hexFromArgb(primaryPalette.primaryContainer),
    onPrimaryContainer: hexFromArgb(primaryPalette.onPrimaryContainer),
    secondary: hexFromArgb(secondaryPalette.primary),
    onSecondary: hexFromArgb(secondaryPalette.onPrimary),
    secondaryContainer: hexFromArgb(secondaryPalette.primaryContainer),
    onSecondaryContainer: hexFromArgb(secondaryPalette.onPrimaryContainer),
    surface: isDark ? '#1C1C1E' : '#FFFFFF',
    onSurface: isDark ? '#F2F2F2' : '#1C1C1E',
    surfaceVariant: isDark ? '#252525' : '#F8F9FA',
    onSurfaceVariant: isDark ? '#9A9A9E' : '#8A8A8E',
    background: isDark ? '#0D0D0D' : hexFromArgb(primaryPalette.background),
    onBackground: isDark ? '#F2F2F2' : hexFromArgb(primaryPalette.onBackground),
    outline: isDark ? '#2C2C2E' : '#E5E5E5',
    divider: isDark ? '#262626' : '#F0F0F0',
  };
}

export function getTonalPaletteForPokemon(
  pokemon: { primaryType: PokemonType; secondaryType?: PokemonType | null },
  mode: 'light' | 'dark' = 'light'
): M3ColorScheme {
  const primarySeed = TYPE_SEED_COLORS[pokemon.primaryType] || NEUTRAL_SEED_COLOR;
  const secondarySeed = pokemon.secondaryType
    ? TYPE_SEED_COLORS[pokemon.secondaryType]
    : null;

  return generateTonalPalette(primarySeed, secondarySeed, mode);
}
