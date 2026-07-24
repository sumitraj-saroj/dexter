import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { StyleSheet, Text, View, Animated, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '../theme';
import { useAppDb } from './DbContext';
import { checkAchievements } from '../db/queries';
import { AchievementDefinition } from '../types';
import { hapticSuccess } from '../utils/haptics';

interface AchievementContextType {
  checkAndNotifyAchievements: (sessionQuizStats?: { streak?: number }) => Promise<AchievementDefinition[]>;
  triggerToastForAchievement: (achievement: AchievementDefinition) => void;
}

const AchievementContext = createContext<AchievementContextType | null>(null);

export function useAchievement() {
  const ctx = useContext(AchievementContext);
  if (!ctx) {
    throw new Error('useAchievement must be used within an AchievementProvider');
  }
  return ctx;
}

export const AchievementProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const db = useAppDb();
  const { colorScheme, isDark } = useAppTheme();

  const [queue, setQueue] = useState<AchievementDefinition[]>([]);
  const [currentToast, setCurrentToast] = useState<AchievementDefinition | null>(null);

  const translateY = useRef(new Animated.Value(-150)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const isAnimatingRef = useRef(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const dismissToast = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -150,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setCurrentToast(null);
      isAnimatingRef.current = false;
      // Process next item in queue if available
      setQueue((prevQueue) => {
        const [next, ...remaining] = prevQueue;
        if (next) {
          setTimeout(() => showToast(next), 100);
        }
        return remaining;
      });
    });
  }, [translateY, opacity]);

  const showToast = useCallback(
    (ach: AchievementDefinition) => {
      isAnimatingRef.current = true;
      setCurrentToast(ach);
      hapticSuccess().catch(() => {});

      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 80,
          friction: 10,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();

      timerRef.current = setTimeout(() => {
        dismissToast();
      }, 3800);
    },
    [translateY, opacity, dismissToast]
  );

  const triggerToastForAchievement = useCallback(
    (ach: AchievementDefinition) => {
      if (!isAnimatingRef.current && !currentToast) {
        showToast(ach);
      } else {
        setQueue((prev) => [...prev, ach]);
      }
    },
    [currentToast, showToast]
  );

  const checkAndNotifyAchievements = useCallback(
    async (sessionQuizStats?: { streak?: number }): Promise<AchievementDefinition[]> => {
      if (!db) return [];
      const newUnlocks = await checkAchievements(db, sessionQuizStats);
      if (newUnlocks.length > 0) {
        newUnlocks.forEach((ach) => triggerToastForAchievement(ach));
      }
      return newUnlocks;
    },
    [db, triggerToastForAchievement]
  );

  return (
    <AchievementContext.Provider value={{ checkAndNotifyAchievements, triggerToastForAchievement }}>
      {children}
      {currentToast && (
        <SafeAreaView pointerEvents="box-none" style={styles.toastSafeArea}>
          <Animated.View
            style={[
              styles.toastContainer,
              {
                backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                borderColor: isDark ? '#334155' : '#E2E8F0',
                shadowColor: '#000',
                transform: [{ translateY }],
                opacity,
              },
            ]}
          >
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={dismissToast}
              style={styles.toastTouchable}
            >
              <View style={[styles.iconBadge, { backgroundColor: colorScheme.primaryContainer }]}>
                <Ionicons
                  name={(currentToast.icon as any) || 'trophy'}
                  size={24}
                  color={colorScheme.primary}
                />
              </View>

              <View style={styles.textContainer}>
                <View style={styles.labelRow}>
                  <Text style={[styles.unlockLabel, { color: colorScheme.primary }]}>
                    🎉 ACHIEVEMENT UNLOCKED!
                  </Text>
                </View>
                <Text style={[styles.titleText, { color: colorScheme.onSurface }]}>
                  {currentToast.title}
                </Text>
                <Text
                  numberOfLines={1}
                  style={[styles.descriptionText, { color: colorScheme.secondary }]}
                >
                  {currentToast.description}
                </Text>
              </View>

              <Ionicons name="close-circle-outline" size={20} color={colorScheme.secondary} />
            </TouchableOpacity>
          </Animated.View>
        </SafeAreaView>
      )}
    </AchievementContext.Provider>
  );
};

const styles = StyleSheet.create({
  toastSafeArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    alignItems: 'center',
  },
  toastContainer: {
    width: '92%',
    maxWidth: 420,
    marginTop: 8,
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    elevation: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  toastTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  unlockLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  titleText: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  descriptionText: {
    fontSize: 12,
    fontWeight: '400',
    marginTop: 1,
  },
});
