import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

/**
 * Defensive haptics utility wrapper.
 * Ensures consistent physical haptic feedback across iOS and Android.
 * Note: On Android, expo-haptics selectionAsync and notificationAsync often no-op
 * depending on OS settings, so we fall back to impactAsync for reliable physical feedback.
 */

export async function hapticSuccess(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    if (Platform.OS === 'android') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  } catch (err) {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {
      // Graceful fallback
    }
  }
}

export async function hapticLight(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch (err) {
    // Graceful no-op
  }
}

export async function hapticMedium(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  } catch (err) {
    // Graceful no-op
  }
}

export async function hapticSelection(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    if (Platform.OS === 'android') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      await Haptics.selectionAsync();
    }
  } catch (err) {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {
      // Graceful fallback
    }
  }
}

export async function hapticError(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    if (Platform.OS === 'android') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } else {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  } catch (err) {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch (e) {
      // Graceful fallback
    }
  }
}

