import { AchievementDefinition, AchievementDataStats } from '../types';

/**
 * Helper to easily create type-based collection achievements.
 */
export function createTypeAchievement(
  typeName: string,
  title: string,
  requiredCount: number,
  icon: string = 'shield-checkmark'
): AchievementDefinition {
  const formattedType = typeName.charAt(0).toUpperCase() + typeName.slice(1);
  return {
    key: `${typeName.toLowerCase()}_collector`,
    title,
    description: `Caught ${requiredCount}+ ${formattedType}-type Pokémon`,
    icon,
    category: 'Catching',
    condition: (stats: AchievementDataStats) =>
      (stats.typeCounts[typeName.toLowerCase()] || 0) >= requiredCount,
  };
}

export const ACHIEVEMENTS: AchievementDefinition[] = [
  // --- Catching & Collection ---
  {
    key: 'kanto_explorer',
    title: 'Kanto Explorer',
    description: 'Caught all 151 Gen 1 Pokémon',
    icon: 'compass',
    category: 'Catching',
    condition: (stats: AchievementDataStats) => {
      const g1 = stats.genStats[1];
      return Boolean(g1 && g1.total > 0 && g1.caught >= g1.total);
    },
  },
  {
    key: 'complete_gen_1',
    title: 'Complete Gen I',
    description: 'Caught all Pokémon in Generation I',
    icon: 'ribbon',
    category: 'Catching',
    condition: (stats: AchievementDataStats) => {
      const g = stats.genStats[1];
      return Boolean(g && g.total > 0 && g.caught >= g.total);
    },
  },
  {
    key: 'complete_gen_2',
    title: 'Complete Gen II',
    description: 'Caught all Pokémon in Generation II',
    icon: 'ribbon',
    category: 'Catching',
    condition: (stats: AchievementDataStats) => {
      const g = stats.genStats[2];
      return Boolean(g && g.total > 0 && g.caught >= g.total);
    },
  },
  {
    key: 'complete_gen_3',
    title: 'Complete Gen III',
    description: 'Caught all Pokémon in Generation III',
    icon: 'ribbon',
    category: 'Catching',
    condition: (stats: AchievementDataStats) => {
      const g = stats.genStats[3];
      return Boolean(g && g.total > 0 && g.caught >= g.total);
    },
  },
  {
    key: 'complete_gen_4',
    title: 'Complete Gen IV',
    description: 'Caught all Pokémon in Generation IV',
    icon: 'ribbon',
    category: 'Catching',
    condition: (stats: AchievementDataStats) => {
      const g = stats.genStats[4];
      return Boolean(g && g.total > 0 && g.caught >= g.total);
    },
  },
  {
    key: 'complete_gen_5',
    title: 'Complete Gen V',
    description: 'Caught all Pokémon in Generation V',
    icon: 'ribbon',
    category: 'Catching',
    condition: (stats: AchievementDataStats) => {
      const g = stats.genStats[5];
      return Boolean(g && g.total > 0 && g.caught >= g.total);
    },
  },
  {
    key: 'complete_gen_6',
    title: 'Complete Gen VI',
    description: 'Caught all Pokémon in Generation VI',
    icon: 'ribbon',
    category: 'Catching',
    condition: (stats: AchievementDataStats) => {
      const g = stats.genStats[6];
      return Boolean(g && g.total > 0 && g.caught >= g.total);
    },
  },
  {
    key: 'complete_gen_7',
    title: 'Complete Gen VII',
    description: 'Caught all Pokémon in Generation VII',
    icon: 'ribbon',
    category: 'Catching',
    condition: (stats: AchievementDataStats) => {
      const g = stats.genStats[7];
      return Boolean(g && g.total > 0 && g.caught >= g.total);
    },
  },
  {
    key: 'complete_gen_8',
    title: 'Complete Gen VIII',
    description: 'Caught all Pokémon in Generation VIII',
    icon: 'ribbon',
    category: 'Catching',
    condition: (stats: AchievementDataStats) => {
      const g = stats.genStats[8];
      return Boolean(g && g.total > 0 && g.caught >= g.total);
    },
  },
  {
    key: 'complete_gen_9',
    title: 'Complete Gen IX',
    description: 'Caught all Pokémon in Generation IX',
    icon: 'ribbon',
    category: 'Catching',
    condition: (stats: AchievementDataStats) => {
      const g = stats.genStats[9];
      return Boolean(g && g.total > 0 && g.caught >= g.total);
    },
  },

  // Popular Type Collectors
  createTypeAchievement('fire', 'Fire Collector', 15, 'flame'),
  createTypeAchievement('water', 'Water Collector', 15, 'water'),
  createTypeAchievement('grass', 'Grass Collector', 15, 'leaf'),
  createTypeAchievement('electric', 'Electric Collector', 15, 'flash'),
  createTypeAchievement('dragon', 'Dragon Master', 10, 'logo-octocat'),

  {
    key: 'legendary_hunter',
    title: 'Legendary Hunter',
    description: 'Caught 5+ Legendary or Mythical Pokémon',
    icon: 'star',
    category: 'Catching',
    condition: (stats: AchievementDataStats) => stats.legendaryMythicalCount >= 5,
  },
  {
    key: 'shiny_collector',
    title: 'Shiny Collector',
    description: 'Own 10+ Shiny Pokémon',
    icon: 'sparkles',
    category: 'Catching',
    condition: (stats: AchievementDataStats) => stats.shinyOwnedCount >= 10,
  },
  {
    key: 'alpha_trainer',
    title: 'Alpha Trainer',
    description: 'Own 5+ Alpha Pokémon',
    icon: 'fitness',
    category: 'Catching',
    condition: (stats: AchievementDataStats) => stats.alphaOwnedCount >= 5,
  },
  {
    key: 'national_dex_complete',
    title: 'National Dex Complete',
    description: 'Caught every Pokémon in the full Pokédex dataset',
    icon: 'trophy',
    category: 'Catching',
    condition: (stats: AchievementDataStats) =>
      stats.totalDexCount > 0 && stats.totalCaughtCount >= stats.totalDexCount,
  },

  // --- Quiz ---
  {
    key: 'quiz_rookie',
    title: 'Quiz Rookie',
    description: 'Reached 10 total correct quiz answers',
    icon: 'school',
    category: 'Quiz',
    condition: (stats: AchievementDataStats) => stats.quizTotalCorrect >= 10,
  },
  {
    key: '100_quiz_wins',
    title: '100 Quiz Wins',
    description: 'Reached 100 total correct quiz answers',
    icon: 'medal',
    category: 'Quiz',
    condition: (stats: AchievementDataStats) => stats.quizTotalCorrect >= 100,
  },
  {
    key: 'perfect_streak',
    title: 'Perfect Streak',
    description: 'Achieved a streak of 20+ correct quiz answers',
    icon: 'flame-outline',
    category: 'Quiz',
    condition: (stats: AchievementDataStats) => stats.quizBestStreak >= 20,
  },
  {
    key: 'quiz_master',
    title: 'Quiz Master',
    description: 'Maintained 90%+ win rate with 50+ total questions answered',
    icon: 'academic',
    category: 'Quiz',
    condition: (stats: AchievementDataStats) => {
      if (stats.quizTotalAnswered < 50) return false;
      const winRate = stats.quizTotalCorrect / stats.quizTotalAnswered;
      return winRate >= 0.9;
    },
  },

  // --- Engagement ---
  {
    key: 'dedicated_trainer',
    title: 'Dedicated Trainer',
    description: 'Maintained a 7-day daily open streak',
    icon: 'calendar',
    category: 'Engagement',
    condition: (stats: AchievementDataStats) => stats.openStreakDays >= 7,
  },
  {
    key: 'loyal_trainer',
    title: 'Loyal Trainer',
    description: 'Maintained a 30-day daily open streak',
    icon: 'heart',
    category: 'Engagement',
    condition: (stats: AchievementDataStats) => stats.openStreakDays >= 30,
  },
  {
    key: 'build_crafter',
    title: 'Build Crafter',
    description: 'Created 5+ competitive Pokémon builds',
    icon: 'construct',
    category: 'Engagement',
    condition: (stats: AchievementDataStats) => stats.competitiveBuildsCount >= 5,
  },
];
