import React, { useState, useEffect } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
} from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus, setAudioModeAsync } from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import { useAppTheme } from '../theme';
import { hapticLight } from '../utils/haptics';

interface PokemonCryButtonProps {
  pokemonId: number;
  pokemonName: string;
}

const CRIES_DIR = FileSystem.cacheDirectory ? `${FileSystem.cacheDirectory}cries/` : '';

// Global Audio Mode configuration for silent mode playback
let audioModeConfigured = false;
async function configureAudioMode() {
  if (audioModeConfigured) return;
  try {
    await setAudioModeAsync({
      playsInSilentMode: true,
    });
    audioModeConfigured = true;
  } catch (err) {
    console.warn('Failed to set audio mode:', err);
  }
}

async function getCachedCryUri(pokemonId: number, cryType: 'latest' | 'legacy'): Promise<string> {
  const remoteUrl = `https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/${cryType}/${pokemonId}.ogg`;

  if (!CRIES_DIR) {
    return remoteUrl;
  }

  const fileUri = `${CRIES_DIR}${pokemonId}_${cryType}.ogg`;

  try {
    const dirInfo = await FileSystem.getInfoAsync(CRIES_DIR);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(CRIES_DIR, { intermediates: true });
    }

    const fileInfo = await FileSystem.getInfoAsync(fileUri);
    if (fileInfo.exists) {
      return fileUri;
    }

    // Download file locally for offline access
    const downloadResult = await FileSystem.downloadAsync(remoteUrl, fileUri);
    if (downloadResult.status === 200) {
      return downloadResult.uri;
    } else {
      return remoteUrl;
    }
  } catch (err) {
    console.warn(`Cache download failed for ${cryType} cry of #${pokemonId}:`, err);
    return remoteUrl;
  }
}

export function PokemonCryButton({ pokemonId, pokemonName }: PokemonCryButtonProps) {
  const { colorScheme } = useAppTheme();
  const [activeType, setActiveType] = useState<'latest' | 'legacy'>('latest');
  const [soundUri, setSoundUri] = useState<string>(
    `https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest/${pokemonId}.ogg`
  );
  const [isLoading, setIsLoading] = useState(false);

  // Initialize expo-audio player hook with the source URI
  const player = useAudioPlayer(soundUri);
  const status = useAudioPlayerStatus(player);

  const scaleAnim = useSharedValue(1);

  // Configure audio mode on component mount
  useEffect(() => {
    configureAudioMode();
  }, []);

  // Update cached URI when pokemonId or activeType changes
  useEffect(() => {
    let isMounted = true;
    async function loadUri() {
      setIsLoading(true);
      const uri = await getCachedCryUri(pokemonId, activeType);
      if (isMounted) {
        setSoundUri(uri);
        setIsLoading(false);
      }
    }
    loadUri();
    return () => {
      isMounted = false;
    };
  }, [pokemonId, activeType]);

  const isPlaying = status.playing;

  // Pulse animation during audio playback
  useEffect(() => {
    if (isPlaying) {
      scaleAnim.value = withRepeat(
        withSequence(
          withTiming(1.22, { duration: 250, easing: Easing.inOut(Easing.ease) }),
          withTiming(1.0, { duration: 250, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    } else {
      cancelAnimation(scaleAnim);
      scaleAnim.value = withTiming(1, { duration: 150 });
    }
  }, [isPlaying, scaleAnim]);

  const handlePlay = async (targetType: 'latest' | 'legacy') => {
    if (isLoading) return;
    hapticLight();
    try {
      if (targetType !== activeType) {
        setActiveType(targetType);
        const uri = await getCachedCryUri(pokemonId, targetType);
        setSoundUri(uri);
        player.replace(uri);
      } else {
        // If replaying or rapid tapping, seek to start before playing
        await player.seekTo(0);
      }
      player.play();
    } catch (err) {
      console.error(`Failed to play ${targetType} cry for #${pokemonId}:`, err);
    }
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleAnim.value }],
  }));

  const hasLegacy = pokemonId <= 649;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        activeOpacity={0.7}
        disabled={isLoading}
        onPress={() => handlePlay('latest')}
        onLongPress={() => {
          if (hasLegacy) {
            handlePlay('legacy');
          } else {
            handlePlay('latest');
          }
        }}
        delayLongPress={400}
        accessibilityLabel={`Play ${pokemonName}'s cry`}
        accessibilityHint={hasLegacy ? "Tap for modern cry, hold for classic cry" : "Tap to play cry"}
        style={[
          styles.button,
          {
            backgroundColor: isPlaying
              ? colorScheme.primaryContainer
              : colorScheme.surfaceVariant,
            borderColor: isPlaying ? colorScheme.primary : colorScheme.outline,
          },
        ]}
      >
        <Animated.View style={[styles.iconContainer, animatedStyle]}>
          {isLoading ? (
            <ActivityIndicator size="small" color={colorScheme.primary} />
          ) : (
            <Text style={[styles.speakerIcon, { color: isPlaying ? colorScheme.primary : colorScheme.onSurface }]}>
              {isPlaying ? '🔊' : '🔈'}
            </Text>
          )}
        </Animated.View>
      </TouchableOpacity>

      {isPlaying && activeType === 'legacy' && (
        <View style={[styles.badge, { backgroundColor: colorScheme.secondaryContainer }]}>
          <Text style={[styles.badgeText, { color: colorScheme.onSecondaryContainer }]}>
            Classic
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  button: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
    elevation: 2,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  speakerIcon: {
    fontSize: 16,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
});
