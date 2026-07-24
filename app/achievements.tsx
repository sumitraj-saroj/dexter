import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../src/theme';
import { useAppDb } from './_layout';
import { getAchievementsSummary, runExecuteQuery, recordQuizAnswer } from '../src/db/queries';
import { AchievementWithStatus, AchievementCategory } from '../src/types';
import { hapticLight, hapticSuccess } from '../src/utils/haptics';
import { useAchievement } from '../src/context/AchievementContext';

type FilterCategory = 'All' | AchievementCategory;

export default function AchievementsScreen() {
  const db = useAppDb();
  const router = useRouter();
  const { colorScheme, isDark } = useAppTheme();
  const { checkAndNotifyAchievements } = useAchievement();

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeCategory, setActiveCategory] = useState<FilterCategory>('All');
  const [summaryData, setSummaryData] = useState<{
    unlockedCount: number;
    totalCount: number;
    unlockedPercentage: number;
    achievements: AchievementWithStatus[];
  } | null>(null);

  const [isDevMode, setIsDevMode] = useState<boolean>(false);

  const loadData = useCallback(async () => {
    if (!db) return;
    try {
      const summary = await getAchievementsSummary(db);
      setSummaryData(summary);
    } catch (err) {
      console.error('Failed loading achievements summary:', err);
    } finally {
      setIsLoading(false);
    }
  }, [db]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleFilterPress = (cat: FilterCategory) => {
    hapticLight();
    setActiveCategory(cat);
  };

  const handleDevQuickTest = async () => {
    if (!db) return;
    hapticSuccess();
    try {
      // Temporarily simulate quiz answers & catch stats for fast testing
      await recordQuizAnswer(db, true);
      await recordQuizAnswer(db, true);
      await recordQuizAnswer(db, true);
      await recordQuizAnswer(db, true);
      await recordQuizAnswer(db, true);
      await recordQuizAnswer(db, true);
      await recordQuizAnswer(db, true);
      await recordQuizAnswer(db, true);
      await recordQuizAnswer(db, true);
      await recordQuizAnswer(db, true);

      const newlyUnlocked = await checkAndNotifyAchievements({ streak: 20 });
      await loadData();

      if (newlyUnlocked.length === 0) {
        Alert.alert('Dev Test', 'Checked achievements. No new achievements unlocked with current data state.');
      }
    } catch (err) {
      console.error('Dev test failed:', err);
    }
  };

  const handleDevResetAchievements = async () => {
    if (!db) return;
    hapticLight();
    Alert.alert(
      'Reset Unlocked Achievements',
      'Are you sure you want to clear the achievements table for testing?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await runExecuteQuery(db, `DELETE FROM achievements;`);
            await loadData();
            hapticSuccess();
          },
        },
      ]
    );
  };

  if (isLoading || !summaryData) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colorScheme.background }]}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colorScheme.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const filteredAchievements = summaryData.achievements.filter((ach) => {
    if (activeCategory === 'All') return true;
    return ach.category === activeCategory;
  });

  const categories: AchievementCategory[] = ['Catching', 'Quiz', 'Engagement'];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colorScheme.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header Bar */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => {
            hapticLight();
            if (router.canGoBack()) {
              router.back();
            } else {
              router.push('/profile');
            }
          }}
          style={[
            styles.backButton,
            { backgroundColor: colorScheme.surface, borderColor: colorScheme.outline },
          ]}
        >
          <Ionicons name="arrow-back" size={20} color={colorScheme.onSurface} />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: colorScheme.onBackground }]}>
          Achievements
        </Text>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => {
            hapticLight();
            setIsDevMode(!isDevMode);
          }}
          style={[
            styles.devButton,
            { backgroundColor: isDevMode ? colorScheme.primaryContainer : colorScheme.surface, borderColor: colorScheme.outline },
          ]}
        >
          <Ionicons name="bug-outline" size={18} color={isDevMode ? colorScheme.primary : colorScheme.secondary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Progress Card */}
        <View
          style={[
            styles.progressCard,
            { backgroundColor: colorScheme.surface, borderColor: colorScheme.outline },
          ]}
        >
          <View style={styles.progressCardHeader}>
            <View>
              <Text style={[styles.progressCardTitle, { color: colorScheme.onSurface }]}>
                Trainer Badges
              </Text>
              <Text style={[styles.progressCardSubtitle, { color: colorScheme.secondary }]}>
                {summaryData.unlockedCount} of {summaryData.totalCount} Unlocked
              </Text>
            </View>
            <View style={[styles.percentageBadge, { backgroundColor: colorScheme.primaryContainer }]}>
              <Text style={[styles.percentageBadgeText, { color: colorScheme.primary }]}>
                {summaryData.unlockedPercentage}%
              </Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={[styles.progressBarTrack, { backgroundColor: colorScheme.surfaceVariant }]}>
            <View
              style={[
                styles.progressBarFill,
                { backgroundColor: colorScheme.primary, width: `${summaryData.unlockedPercentage}%` },
              ]}
            />
          </View>
        </View>

        {/* Dev Mode Actions Bar */}
        {isDevMode && (
          <View style={[styles.devCard, { backgroundColor: colorScheme.secondaryContainer }]}>
            <Text style={[styles.devTitle, { color: colorScheme.onSecondaryContainer }]}>
              🧪 Developer Testing Helpers
            </Text>
            <View style={styles.devActionsRow}>
              <TouchableOpacity
                onPress={handleDevQuickTest}
                style={[styles.devActionButton, { backgroundColor: colorScheme.primary }]}
              >
                <Text style={[styles.devActionText, { color: colorScheme.onPrimary }]}>
                  ⚡ Simulate Unlock Triggers
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleDevResetAchievements}
                style={[styles.devActionButton, { backgroundColor: '#EF4444' }]}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>
                  🗑️ Reset Unlocks
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Category Filter Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterPillsContainer}
        >
          {(['All', 'Catching', 'Quiz', 'Engagement'] as FilterCategory[]).map((cat) => {
            const isSelected = activeCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                activeOpacity={0.7}
                onPress={() => handleFilterPress(cat)}
                style={[
                  styles.filterPill,
                  {
                    backgroundColor: isSelected ? colorScheme.primary : colorScheme.surface,
                    borderColor: isSelected ? colorScheme.primary : colorScheme.outline,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    { color: isSelected ? colorScheme.onPrimary : colorScheme.onSurface },
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Achievement List grouped by category if 'All' is selected */}
        {activeCategory === 'All' ? (
          categories.map((cat) => {
            const categoryItems = summaryData.achievements.filter((a) => a.category === cat);
            if (categoryItems.length === 0) return null;
            return (
              <View key={cat} style={styles.categorySection}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={[styles.sectionTitle, { color: colorScheme.onBackground }]}>
                    {cat} Badges
                  </Text>
                  <Text style={[styles.sectionCount, { color: colorScheme.secondary }]}>
                    {categoryItems.filter((i) => i.isUnlocked).length} / {categoryItems.length}
                  </Text>
                </View>
                {categoryItems.map((item) => (
                  <AchievementCard key={item.key} item={item} colorScheme={colorScheme} isDark={isDark} />
                ))}
              </View>
            );
          })
        ) : (
          <View style={styles.categorySection}>
            {filteredAchievements.map((item) => (
              <AchievementCard key={item.key} item={item} colorScheme={colorScheme} isDark={isDark} />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function AchievementCard({
  item,
  colorScheme,
  isDark,
}: {
  item: AchievementWithStatus;
  colorScheme: any;
  isDark: boolean;
}) {
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colorScheme.surface,
          borderColor: item.isUnlocked
            ? colorScheme.primary
            : colorScheme.outline,
          opacity: item.isUnlocked ? 1 : 0.75,
        },
      ]}
    >
      <View
        style={[
          styles.badgeIconBox,
          {
            backgroundColor: item.isUnlocked
              ? colorScheme.primaryContainer
              : colorScheme.surfaceVariant,
          },
        ]}
      >
        <Ionicons
          name={(item.icon as any) || 'trophy'}
          size={24}
          color={item.isUnlocked ? colorScheme.primary : colorScheme.secondary}
        />
      </View>

      <View style={styles.cardContent}>
        <View style={styles.cardHeaderRow}>
          <Text
            style={[
              styles.cardTitle,
              {
                color: item.isUnlocked
                  ? colorScheme.onSurface
                  : colorScheme.secondary,
              },
            ]}
          >
            {item.title}
          </Text>

          {item.isUnlocked ? (
            <View style={[styles.statusBadge, { backgroundColor: '#10B98120' }]}>
              <Ionicons name="checkmark-circle" size={14} color="#10B981" />
              <Text style={[styles.statusBadgeText, { color: '#10B981' }]}>Unlocked</Text>
            </View>
          ) : (
            <View style={[styles.statusBadge, { backgroundColor: colorScheme.surfaceVariant }]}>
              <Ionicons name="lock-closed" size={12} color={colorScheme.secondary} />
              <Text style={[styles.statusBadgeText, { color: colorScheme.secondary }]}>Locked</Text>
            </View>
          )}
        </View>

        <Text style={[styles.cardDescription, { color: colorScheme.secondary }]}>
          {item.description}
        </Text>

        {item.isUnlocked && item.unlockedDate && (
          <Text style={[styles.unlockedDateText, { color: colorScheme.primary }]}>
            Unlocked on {item.unlockedDate.split(' ')[0]}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  devButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  progressCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  progressCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  progressCardTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  progressCardSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  percentageBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  percentageBadgeText: {
    fontSize: 14,
    fontWeight: '800',
  },
  progressBarTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  devCard: {
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
  },
  devTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  devActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  devActionButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  devActionText: {
    fontSize: 12,
    fontWeight: '700',
  },
  filterPillsContainer: {
    gap: 8,
    paddingBottom: 16,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterPillText: {
    fontSize: 13,
    fontWeight: '600',
  },
  categorySection: {
    marginBottom: 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  sectionCount: {
    fontSize: 13,
    fontWeight: '600',
  },
  card: {
    flexDirection: 'row',
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
    alignItems: 'center',
    gap: 12,
  },
  badgeIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: {
    flex: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  cardDescription: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  unlockedDateText: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 6,
  },
});
