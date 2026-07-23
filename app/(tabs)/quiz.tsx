import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Animated,
  Modal,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { useAppTheme } from '../../src/theme';
import { useAppDb } from '../_layout';
import { getQuizQuestionPokemon, saveQuizScore, getTopQuizScores } from '../../src/db/queries';
import { Pokemon, QuizScoreRecord } from '../../src/types';
import { hapticSuccess, hapticError, hapticLight } from '../../src/utils/haptics';

export default function QuizScreen() {
  const db = useAppDb();
  const router = useRouter();
  const { colorScheme, isDark } = useAppTheme();

  // Question & state
  const [question, setQuestion] = useState<{ target: Pokemon; options: Pokemon[] } | null>(null);
  const [selectedOptionId, setSelectedOptionId] = useState<number | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Session score & streak
  const [score, setScore] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [bestStreakThisSession, setBestStreakThisSession] = useState(0);

  // Game over & high scores state
  const [isGameOver, setIsGameOver] = useState(false);
  const [isNewHighScore, setIsNewHighScore] = useState(false);
  const [leaderboardVisible, setLeaderboardVisible] = useState(false);
  const [topScores, setTopScores] = useState<QuizScoreRecord[]>([]);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const loadNextQuestion = useCallback(async (initial = false) => {
    if (initial) setIsLoading(true);
    try {
      const data = await getQuizQuestionPokemon(db);
      setQuestion(data);
      setSelectedOptionId(null);
      setIsRevealed(false);
    } catch (err) {
      console.error('Failed to load quiz question:', err);
    } finally {
      setIsLoading(false);
    }
  }, [db]);

  useEffect(() => {
    loadNextQuestion(true);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [loadNextQuestion]);

  const fetchLeaderboard = useCallback(async () => {
    try {
      const scores = await getTopQuizScores(db);
      setTopScores(scores);
    } catch (err) {
      console.error('Failed to load leaderboard scores:', err);
    }
  }, [db]);

  const handleOpenLeaderboard = async () => {
    hapticLight();
    await fetchLeaderboard();
    setLeaderboardVisible(true);
  };

  const handleSelectOption = (option: Pokemon) => {
    if (isRevealed || !question || isGameOver) return;

    hapticLight();
    setSelectedOptionId(option.id);
    setIsRevealed(true);

    const isCorrect = option.id === question.target.id;
    if (isCorrect) {
      hapticSuccess();
      const nextScore = score + 1;
      const nextStreak = currentStreak + 1;
      setScore(nextScore);
      setCurrentStreak(nextStreak);
      setBestStreakThisSession((prev) => Math.max(prev, nextStreak));

      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 1.08, duration: 150, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
      ]).start();

      timeoutRef.current = setTimeout(() => {
        loadNextQuestion(false);
      }, 1300);
    } else {
      hapticError();
      const finalScore = score;
      const finalBestStreak = Math.max(bestStreakThisSession, currentStreak);

      timeoutRef.current = setTimeout(async () => {
        try {
          const res = await saveQuizScore(db, finalScore, finalBestStreak);
          setIsNewHighScore(res.isNewHighScore);
          if (res.isNewHighScore) {
            hapticSuccess();
          }
        } catch (e) {
          console.error('Error saving score:', e);
        }
        setIsGameOver(true);
      }, 1300);
    }
  };

  const handleRestart = () => {
    hapticLight();
    setScore(0);
    setCurrentStreak(0);
    setBestStreakThisSession(0);
    setIsGameOver(false);
    setIsNewHighScore(false);
    loadNextQuestion(true);
  };

  const formattedTargetName = question?.target
    ? question.target.name.charAt(0).toUpperCase() + question.target.name.slice(1)
    : '';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colorScheme.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Top Action Row (Quit & High Scores Buttons) */}
      <View style={styles.topActionsRow}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => {
            hapticLight();
            if (router.canGoBack()) {
              router.back();
            } else {
              router.push('/');
            }
          }}
          style={[
            styles.headerButton,
            { backgroundColor: colorScheme.surface, borderColor: colorScheme.outline },
          ]}
        >
          <Text style={[styles.headerButtonText, { color: colorScheme.onSurface }]}>✕ Quit</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleOpenLeaderboard}
          style={[
            styles.headerButton,
            { backgroundColor: colorScheme.surface, borderColor: colorScheme.outline },
          ]}
        >
          <Text style={[styles.headerButtonText, { color: colorScheme.onSurface }]}>🏆 High Scores</Text>
        </TouchableOpacity>
      </View>

      {/* Main Title Row */}
      <View style={styles.titleContainer}>
        <Text style={[styles.headerTitle, { color: colorScheme.onBackground }]}>
          Who's That Pokémon?
        </Text>
      </View>

      {/* In-Session HUD (Minimal, Unobtrusive) */}
      {!isGameOver && (
        <View
          style={[
            styles.hudContainer,
            { backgroundColor: colorScheme.surface, borderColor: colorScheme.outline },
          ]}
        >
          <View style={styles.hudStat}>
            <Text style={[styles.hudLabel, { color: colorScheme.secondary }]}>Score</Text>
            <Text style={[styles.hudValue, { color: colorScheme.onSurface }]}>{score}</Text>
          </View>
          <View style={[styles.hudDivider, { backgroundColor: colorScheme.outline }]} />
          <View style={styles.hudStat}>
            <Text style={[styles.hudLabel, { color: colorScheme.secondary }]}>Streak</Text>
            <Text style={[styles.hudValue, { color: colorScheme.primary }]}>🔥 {currentStreak}</Text>
          </View>
        </View>
      )}

      {isLoading || !question ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colorScheme.primary} />
          <Text style={[styles.loadingText, { color: colorScheme.secondary }]}>
            Catching a mystery Pokémon...
          </Text>
        </View>
      ) : isGameOver ? (
        /* Game Over / Results Screen */
        <View style={styles.gameOverContainer}>
          <View
            style={[
              styles.gameOverCard,
              { backgroundColor: colorScheme.surface, borderColor: colorScheme.outline },
            ]}
          >
            {isNewHighScore && (
              <View style={[styles.highScoreBadge, { backgroundColor: '#f59e0b' }]}>
                <Text style={styles.highScoreBadgeText}>🎉 NEW HIGH SCORE!</Text>
              </View>
            )}

            <Text style={[styles.gameOverTitle, { color: colorScheme.onSurface }]}>Game Over</Text>

            <View style={styles.missedPokemonRow}>
              <Image
                source={{
                  uri: question.target.officialArtworkUrl || question.target.spriteUrl,
                }}
                style={styles.missedArtwork}
                contentFit="contain"
              />
              <Text style={[styles.missedSubtext, { color: colorScheme.secondary }]}>
                It was <Text style={{ fontWeight: '700', color: colorScheme.onSurface }}>{formattedTargetName}</Text>
              </Text>
            </View>

            <View style={styles.statsRow}>
              <View
                style={[
                  styles.statCard,
                  { backgroundColor: colorScheme.background, borderColor: colorScheme.outline },
                ]}
              >
                <Text style={[styles.statCardLabel, { color: colorScheme.secondary }]}>
                  Final Score
                </Text>
                <Text style={[styles.statCardValue, { color: colorScheme.onBackground }]}>
                  {score}
                </Text>
              </View>

              <View
                style={[
                  styles.statCard,
                  { backgroundColor: colorScheme.background, borderColor: colorScheme.outline },
                ]}
              >
                <Text style={[styles.statCardLabel, { color: colorScheme.secondary }]}>
                  Best Streak
                </Text>
                <Text style={[styles.statCardValue, { color: '#f59e0b' }]}>
                  🔥 {bestStreakThisSession}
                </Text>
              </View>
            </View>

            <View style={styles.gameOverActions}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleRestart}
                style={[styles.primaryButton, { backgroundColor: colorScheme.primary }]}
              >
                <Text style={[styles.primaryButtonText, { color: colorScheme.onPrimary }]}>
                  🔄 Play Again
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleOpenLeaderboard}
                style={[
                  styles.secondaryButton,
                  { backgroundColor: colorScheme.surface, borderColor: colorScheme.outline },
                ]}
              >
                <Text style={[styles.secondaryButtonText, { color: colorScheme.onSurface }]}>
                  🏆 High Scores
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ) : (
        /* Quiz Active Game View */
        <View style={styles.contentContainer}>
          {/* Top Section: Artwork Card & Prompt */}
          <View style={styles.topSection}>
            <Animated.View
              style={[
                styles.artworkCard,
                {
                  backgroundColor: isDark ? '#1a1f2c' : '#f0f4f8',
                  borderColor: colorScheme.outline,
                  transform: [{ scale: scaleAnim }],
                },
              ]}
            >
              <View style={styles.artworkBadge}>
                <Text style={styles.artworkBadgeText}>
                  {isRevealed ? formattedTargetName : '???'}
                </Text>
              </View>
              <View style={styles.imageWrapper}>
                <Image
                  source={{
                    uri: question.target.officialArtworkUrl || question.target.spriteUrl,
                  }}
                  style={styles.artworkImage}
                  contentFit="contain"
                  tintColor={isRevealed ? undefined : '#000000'}
                  transition={100}
                />
              </View>
            </Animated.View>

            {/* Prompt */}
            <Text style={[styles.promptText, { color: colorScheme.secondary }]}>
              {isRevealed
                ? selectedOptionId === question.target.id
                  ? `🎉 Correct! It's ${formattedTargetName}!`
                  : `❌ It's ${formattedTargetName}!`
                : 'Select the matching Pokémon name:'}
            </Text>
          </View>

          {/* 4 Answer Options (Anchored at the bottom) */}
          <View style={styles.optionsGrid}>
            {question.options.map((option) => {
              const isCorrectOption = option.id === question.target.id;
              const isSelectedOption = option.id === selectedOptionId;

              let buttonBg = colorScheme.surface;
              let buttonBorder = colorScheme.outline;
              let textColor = colorScheme.onSurface;
              let prefixIcon = '';

              if (isRevealed) {
                if (isCorrectOption) {
                  buttonBg = isDark ? '#1b4d3e' : '#e6f4ea';
                  buttonBorder = '#34a853';
                  textColor = isDark ? '#81c995' : '#137333';
                  prefixIcon = '✓ ';
                } else if (isSelectedOption) {
                  buttonBg = isDark ? '#5c1d1d' : '#fce8e6';
                  buttonBorder = '#ea4335';
                  textColor = isDark ? '#f28b82' : '#c5221f';
                  prefixIcon = '✕ ';
                } else {
                  buttonBg = colorScheme.surface;
                  textColor = colorScheme.secondary;
                }
              }

              const formattedName =
                option.name.charAt(0).toUpperCase() + option.name.slice(1);

              return (
                <TouchableOpacity
                  key={option.id}
                  activeOpacity={0.7}
                  disabled={isRevealed}
                  onPress={() => handleSelectOption(option)}
                  style={[
                    styles.optionButton,
                    {
                      backgroundColor: buttonBg,
                      borderColor: buttonBorder,
                    },
                  ]}
                >
                  <Text style={[styles.optionText, { color: textColor }]}>
                    {prefixIcon}
                    {formattedName}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {/* Leaderboard Modal Sheet */}
      <Modal
        visible={leaderboardVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setLeaderboardVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalSheet,
              { backgroundColor: colorScheme.surface, borderColor: colorScheme.outline },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colorScheme.onSurface }]}>
                🏆 All-Time High Scores
              </Text>
              <TouchableOpacity
                onPress={() => {
                  hapticLight();
                  setLeaderboardVisible(false);
                }}
                style={styles.modalCloseButton}
              >
                <Text style={{ fontSize: 16, color: colorScheme.secondary }}>✕</Text>
              </TouchableOpacity>
            </View>

            {topScores.length === 0 ? (
              <View style={styles.emptyLeaderboard}>
                <Text style={{ fontSize: 32, marginBottom: 8 }}>🎯</Text>
                <Text style={[styles.emptyLeaderboardText, { color: colorScheme.secondary }]}>
                  No high scores recorded yet. Complete a quiz run to set a new record!
                </Text>
              </View>
            ) : (
              <ScrollView contentContainerStyle={styles.leaderboardList}>
                {topScores.map((item, index) => {
                  const isTopRank = index === 0;
                  return (
                    <View
                      key={item.id}
                      style={[
                        styles.scoreRow,
                        {
                          backgroundColor: isTopRank
                            ? isDark
                              ? '#2a2415'
                              : '#fffbeb'
                            : colorScheme.background,
                          borderColor: isTopRank ? '#f59e0b' : colorScheme.outline,
                        },
                      ]}
                    >
                      <View style={styles.rankBadge}>
                        <Text
                          style={[
                            styles.rankText,
                            { color: isTopRank ? '#f59e0b' : colorScheme.secondary },
                          ]}
                        >
                          {isTopRank ? '🏆 #1' : `#${index + 1}`}
                        </Text>
                      </View>

                      <View style={styles.scoreDetails}>
                        <Text style={[styles.scoreValue, { color: colorScheme.onSurface }]}>
                          {item.score} <Text style={styles.scoreUnit}>pts</Text>
                        </Text>
                        <Text style={[styles.scoreSubtext, { color: colorScheme.secondary }]}>
                          Best Streak: 🔥 {item.bestStreak} • {item.datePlayed}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
  },
  headerButton: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    borderWidth: 1,
  },
  headerButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  titleContainer: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  hudContainer: {
    flexDirection: 'row',
    alignSelf: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 8,
    marginBottom: 8,
    gap: 16,
  },
  hudStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  hudLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  hudValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  hudDivider: {
    width: 1,
    height: 14,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '500',
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'flex-start',
    paddingTop: 24,
    paddingBottom: 20,
    gap: 16,
  },
  topSection: {
    width: '100%',
    alignItems: 'center',
  },
  artworkCard: {
    width: '100%',
    height: 240,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  artworkBadge: {
    position: 'absolute',
    top: 10,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 4,
  },
  artworkBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  imageWrapper: {
    width: '80%',
    height: '75%',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },
  artworkImage: {
    width: '100%',
    height: '100%',
  },
  promptText: {
    fontSize: 14,
    fontWeight: '400',
    textAlign: 'center',
    marginTop: 12,
  },
  optionsGrid: {
    width: '100%',
    gap: 10,
  },
  optionButton: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  gameOverContainer: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gameOverCard: {
    width: '100%',
    padding: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    gap: 16,
  },
  highScoreBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: -4,
  },
  highScoreBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  gameOverTitle: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  missedPokemonRow: {
    alignItems: 'center',
    gap: 8,
  },
  missedArtwork: {
    width: 100,
    height: 100,
  },
  missedSubtext: {
    fontSize: 14,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginTop: 4,
  },
  statCard: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  statCardLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  statCardValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  gameOverActions: {
    width: '100%',
    gap: 10,
    marginTop: 8,
  },
  primaryButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  secondaryButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 34,
    maxHeight: '75%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalCloseButton: {
    padding: 6,
  },
  emptyLeaderboard: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyLeaderboardText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  leaderboardList: {
    gap: 10,
    paddingBottom: 10,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  rankBadge: {
    width: 48,
    alignItems: 'center',
  },
  rankText: {
    fontSize: 14,
    fontWeight: '700',
  },
  scoreDetails: {
    flex: 1,
    marginLeft: 8,
  },
  scoreValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  scoreUnit: {
    fontSize: 12,
    fontWeight: '500',
  },
  scoreSubtext: {
    fontSize: 12,
    marginTop: 2,
  },
});
