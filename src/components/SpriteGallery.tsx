import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Image } from 'expo-image';
import { useAppTheme } from '../theme';
import { PokemonSprites, PokemonVariant, PokemonSpecialForm } from '../types';
import { hapticLight } from '../utils/haptics';

export interface GalleryItem {
  id: string;
  label: string;
  url: string;
  isPixel?: boolean;
}

interface SpriteGalleryProps {
  sprites: PokemonSprites | null;
  activeVariant?: PokemonVariant | null;
  activeSpecialForm?: PokemonSpecialForm | null;
  isShiny?: boolean;
  selectedItemId?: string | null;
  onSelectItem?: (item: GalleryItem) => void;
}

export function SpriteGallery({
  sprites,
  activeVariant,
  activeSpecialForm,
  isShiny,
  selectedItemId,
  onSelectItem,
}: SpriteGalleryProps) {
  const { colorScheme } = useAppTheme();

  // Build items array conditionally based on available non-null URLs
  const items: GalleryItem[] = [];

  const officialUrl =
    activeSpecialForm?.officialArtworkUrl ||
    activeVariant?.officialArtworkUrl ||
    sprites?.officialArtworkUrl;
  if (officialUrl) {
    items.push({ id: 'official', label: 'Official Art', url: officialUrl });
  }

  const shinyOfficialUrl =
    activeSpecialForm?.shinyArtworkUrl ||
    activeVariant?.shinyArtworkUrl ||
    sprites?.shinyArtworkUrl;
  if (shinyOfficialUrl) {
    items.push({ id: 'shiny_official', label: 'Shiny Art', url: shinyOfficialUrl });
  }

  if (sprites?.homeArtworkUrl) {
    items.push({ id: 'home', label: 'Home', url: sprites.homeArtworkUrl });
  }

  if (sprites?.shinyHomeArtworkUrl) {
    items.push({ id: 'shiny_home', label: 'Shiny Home', url: sprites.shinyHomeArtworkUrl });
  }

  if (sprites?.dreamWorldUrl) {
    items.push({ id: 'dream_world', label: 'Dream World', url: sprites.dreamWorldUrl });
  }

  if (sprites?.pixelGen1Url) {
    items.push({ id: 'pixel_gen1', label: 'Pixel (Gen I)', url: sprites.pixelGen1Url, isPixel: true });
  }

  if (sprites?.pixelGen3Url) {
    items.push({ id: 'pixel_gen3', label: 'Pixel (Gen III)', url: sprites.pixelGen3Url, isPixel: true });
  }

  // Add default pixel sprite if Gen 1 and Gen 3 are missing, or if it's distinct
  if (
    sprites?.pixelDefaultUrl &&
    sprites.pixelDefaultUrl !== sprites?.pixelGen1Url &&
    sprites.pixelDefaultUrl !== sprites?.pixelGen3Url
  ) {
    items.push({ id: 'pixel_default', label: 'Pixel', url: sprites.pixelDefaultUrl, isPixel: true });
  }

  if (sprites?.animatedUrl) {
    items.push({ id: 'animated', label: 'Animated', url: sprites.animatedUrl, isPixel: true });
  }

  if (items.length === 0) {
    return null;
  }

  const handleCardPress = (item: GalleryItem) => {
    hapticLight();
    if (onSelectItem) {
      onSelectItem(item);
    }
  };

  return (
    <View style={styles.container}>
      {/* Section Header */}
      <View style={styles.headerRow}>
        <Text style={[styles.sectionLabel, { color: colorScheme.secondary }]}>
          SPRITE GALLERY
        </Text>
      </View>

      {/* Horizontal Scrollable Row */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {items.map((item) => {
          const isSelected = selectedItemId === item.id;
          const isDefaultSelected =
            !selectedItemId &&
            ((isShiny && item.id === 'shiny_official') || (!isShiny && item.id === 'official'));
          const isActive = isSelected || isDefaultSelected;

          return (
            <TouchableOpacity
              key={item.id}
              activeOpacity={0.75}
              onPress={() => handleCardPress(item)}
              style={[
                styles.card,
                {
                  backgroundColor: isActive
                    ? colorScheme.primaryContainer + '40'
                    : colorScheme.surfaceVariant + '35',
                  borderColor: isActive ? colorScheme.primary : colorScheme.outline + '25',
                  borderWidth: isActive ? 2 : 1,
                },
              ]}
            >
              <View style={styles.imageContainer}>
                <Image
                  source={{ uri: item.url }}
                  style={[
                    styles.cardImage,
                    item.isPixel && styles.pixelatedImage,
                  ]}
                  contentFit="contain"
                  transition={200}
                />
              </View>
              <Text
                style={[
                  styles.cardLabel,
                  {
                    color: isActive ? colorScheme.primary : colorScheme.onSurfaceVariant,
                    fontWeight: isActive ? '700' : '600',
                  },
                ]}
                numberOfLines={1}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
  },
  headerRow: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 10,
  },
  card: {
    width: 104,
    height: 120,
    borderRadius: 14,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  imageContainer: {
    width: '100%',
    height: 76,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardImage: {
    width: 72,
    height: 72,
  },
  pixelatedImage: {
    imageRendering: 'pixelated' as any,
  } as any,
  cardLabel: {
    fontSize: 11,
    textAlign: 'center',
  },
});
