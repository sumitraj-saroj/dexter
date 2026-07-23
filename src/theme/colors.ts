import { argbFromHex, themeFromSourceColor, Hct } from '@material/material-color-utilities';
import { M3ColorScheme, PokemonType } from '../types';

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

export function generateM3Scheme(hexColor: string, isDark: boolean = false): M3ColorScheme {
  const argb = argbFromHex(hexColor);
  const theme = themeFromSourceColor(argb);
  const palette = isDark ? theme.schemes.dark : theme.schemes.light;

  const hexFromArgb = (argbVal: number) => {
    const hex = (argbVal & 0xffffff).toString(16).padStart(6, '0');
    return `#${hex}`;
  };

  return {
    primary: hexFromArgb(palette.primary),
    onPrimary: hexFromArgb(palette.onPrimary),
    primaryContainer: hexFromArgb(palette.primaryContainer),
    onPrimaryContainer: hexFromArgb(palette.onPrimaryContainer),
    secondary: hexFromArgb(palette.secondary),
    onSecondary: hexFromArgb(palette.onSecondary),
    secondaryContainer: hexFromArgb(palette.secondaryContainer),
    onSecondaryContainer: hexFromArgb(palette.onSecondaryContainer),
    surface: hexFromArgb(palette.surface),
    onSurface: hexFromArgb(palette.onSurface),
    surfaceVariant: hexFromArgb(palette.surfaceVariant),
    onSurfaceVariant: hexFromArgb(palette.onSurfaceVariant),
    background: hexFromArgb(palette.background),
    onBackground: hexFromArgb(palette.onBackground),
    outline: hexFromArgb(palette.outline),
  };
}
