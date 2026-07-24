import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  TextInput,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../src/theme';
import { useAppDb } from './_layout';
import { useTrainerProfile } from '../src/hooks/useTrainerProfile';
import { AVATAR_OPTIONS, getAvatarById, AvatarOption } from '../src/utils/avatars';
import { TypeChip } from '../src/components';
import { hapticLight, hapticSuccess } from '../src/utils/haptics';

export default function ProfileScreen() {
  const db = useAppDb();
  const router = useRouter();
  const { colorScheme, isDark } = useAppTheme();

  const {
    profile,
    isLoading,
    completionStats,
    favoriteType,
    updateProfile,
  } = useTrainerProfile(db);

  // Edit Name Modal state
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');

  // Avatar Picker Modal state
  const [isPickerVisible, setIsPickerVisible] = useState(false);

  const currentAvatar = getAvatarById(profile?.avatarId || 'pikachu');

  const handleOpenEditName = () => {
    hapticLight();
    setNameInput(profile?.name || 'Trainer');
    setIsEditingName(true);
  };

  const handleSaveName = async () => {
    hapticSuccess();
    const cleanName = nameInput.trim() || 'Trainer';
    await updateProfile({ name: cleanName });
    setIsEditingName(false);
  };

  const handleSelectAvatar = async (avatar: AvatarOption) => {
    hapticSuccess();
    await updateProfile({ avatarId: avatar.id });
    setIsPickerVisible(false);
  };

  if (isLoading || !profile) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colorScheme.background }]}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colorScheme.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const level = profile.level;
  const xpProgress = profile.xpProgress;
  const xpPercent = Math.min(100, Math.max(0, (xpProgress / 500) * 100));

  const totalDex = completionStats?.totalCount || 1025;
  const seenCount = completionStats?.seenCount || 0;
  const caughtCount = completionStats?.caughtCount || 0;

  const seenPercent = Math.min(100, (seenCount / totalDex) * 100);
  const caughtPercent = Math.min(100, (caughtCount / totalDex) * 100);

  const winRatePercent =
    profile.totalAnswered > 0
      ? Math.round((profile.totalCorrect / profile.totalAnswered) * 100)
      : null;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colorScheme.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header Bar */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => {
            hapticLight();
            router.back();
          }}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={24} color={colorScheme.onBackground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colorScheme.onBackground }]}>
          Trainer Profile
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Main Trainer Card */}
        <View
          style={[
            styles.card,
            { backgroundColor: colorScheme.surface, borderColor: colorScheme.outline },
          ]}
        >
          <View style={styles.avatarSection}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                hapticLight();
                setIsPickerVisible(true);
              }}
              style={[styles.avatarCircle, { borderColor: colorScheme.primary }]}
            >
              <Image source={{ uri: currentAvatar.artworkUrl }} style={styles.avatarImage} contentFit="contain" />
              <View style={[styles.avatarBadge, { backgroundColor: colorScheme.primary }]}>
                <Ionicons name="camera-outline" size={12} color={colorScheme.onPrimary} />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleOpenEditName}
              style={styles.nameContainer}
            >
              <Text style={[styles.trainerName, { color: colorScheme.onSurface }]}>
                {profile.name}
              </Text>
              <Ionicons name="pencil" size={14} color={colorScheme.secondary} style={{ marginLeft: 6 }} />
            </TouchableOpacity>

            <View style={[styles.levelBadge, { backgroundColor: colorScheme.primaryContainer }]}>
              <Text style={[styles.levelText, { color: colorScheme.onPrimaryContainer }]}>
                LEVEL {level}
              </Text>
            </View>
          </View>

          {/* XP Progress Bar */}
          <View style={styles.xpContainer}>
            <View style={styles.xpTextRow}>
              <Text style={[styles.xpLabel, { color: colorScheme.secondary }]}>XP Progress</Text>
              <Text style={[styles.xpValue, { color: colorScheme.onSurface }]}>
                {xpProgress} / 500 XP ({profile.xp} Total)
              </Text>
            </View>
            <View style={[styles.progressBarTrack, { backgroundColor: colorScheme.surfaceVariant }]}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${xpPercent}%`, backgroundColor: colorScheme.primary },
                ]}
              />
            </View>
          </View>
        </View>

        {/* Pokédex Completion Card */}
        <View
          style={[
            styles.card,
            { backgroundColor: colorScheme.surface, borderColor: colorScheme.outline },
          ]}
        >
          <View style={styles.cardHeaderRow}>
            <Ionicons name="journal-outline" size={20} color={colorScheme.primary} />
            <Text style={[styles.cardTitle, { color: colorScheme.onSurface }]}>
              Pokédex Completion
            </Text>
          </View>

          {/* Seen Stat */}
          <View style={styles.statRow}>
            <View style={styles.statLabelRow}>
              <Text style={[styles.statName, { color: colorScheme.onSurface }]}>Seen</Text>
              <Text style={[styles.statValue, { color: colorScheme.secondary }]}>
                {seenCount} / {totalDex}
              </Text>
            </View>
            <View style={[styles.progressBarTrack, { backgroundColor: colorScheme.surfaceVariant }]}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${seenPercent}%`, backgroundColor: '#3B82F6' },
                ]}
              />
            </View>
          </View>

          {/* Caught Stat */}
          <View style={[styles.statRow, { marginTop: 12 }]}>
            <View style={styles.statLabelRow}>
              <Text style={[styles.statName, { color: colorScheme.onSurface }]}>Caught</Text>
              <Text style={[styles.statValue, { color: colorScheme.secondary }]}>
                {caughtCount} / {totalDex}
              </Text>
            </View>
            <View style={[styles.progressBarTrack, { backgroundColor: colorScheme.surfaceVariant }]}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${caughtPercent}%`, backgroundColor: '#10B981' },
                ]}
              />
            </View>
          </View>
        </View>

        {/* Grid 2x2 for Stats: Favorite Type, Quiz Win Rate, Current Streak */}
        <View style={styles.gridContainer}>
          {/* Favorite Type Card */}
          <View
            style={[
              styles.cardHalf,
              { backgroundColor: colorScheme.surface, borderColor: colorScheme.outline },
            ]}
          >
            <Ionicons name="heart-outline" size={20} color={colorScheme.primary} style={{ marginBottom: 6 }} />
            <Text style={[styles.cardTitleSmall, { color: colorScheme.secondary }]}>
              Favorite Type
            </Text>
            {favoriteType ? (
              <View style={{ marginTop: 8 }}>
                <TypeChip type={favoriteType} size="medium" />
              </View>
            ) : (
              <Text style={[styles.emptyStateText, { color: colorScheme.secondary }]}>
                Catch your first Pokémon to reveal
              </Text>
            )}
          </View>

          {/* Daily Streak Card */}
          <View
            style={[
              styles.cardHalf,
              { backgroundColor: colorScheme.surface, borderColor: colorScheme.outline },
            ]}
          >
            <Ionicons name="flame" size={22} color="#F59E0B" style={{ marginBottom: 6 }} />
            <Text style={[styles.cardTitleSmall, { color: colorScheme.secondary }]}>
              Daily Streak
            </Text>
            <Text style={[styles.bigStatValue, { color: colorScheme.onSurface }]}>
              {profile.currentStreak} {profile.currentStreak === 1 ? 'Day' : 'Days'}
            </Text>
          </View>
        </View>

        {/* Quiz Win Rate Card */}
        <View
          style={[
            styles.card,
            { backgroundColor: colorScheme.surface, borderColor: colorScheme.outline },
          ]}
        >
          <View style={styles.cardHeaderRow}>
            <Ionicons name="trophy-outline" size={20} color={colorScheme.primary} />
            <Text style={[styles.cardTitle, { color: colorScheme.onSurface }]}>
              Quiz Performance
            </Text>
          </View>

          {winRatePercent !== null ? (
            <View style={styles.quizStatsRow}>
              <View style={styles.quizStatColumn}>
                <Text style={[styles.bigStatValue, { color: colorScheme.primary }]}>
                  {winRatePercent}%
                </Text>
                <Text style={[styles.statSubText, { color: colorScheme.secondary }]}>
                  Accuracy Rate
                </Text>
              </View>
              <View style={styles.quizStatColumn}>
                <Text style={[styles.mediumStatValue, { color: colorScheme.onSurface }]}>
                  {profile.totalCorrect} / {profile.totalAnswered}
                </Text>
                <Text style={[styles.statSubText, { color: colorScheme.secondary }]}>
                  Correct Answers
                </Text>
              </View>
            </View>
          ) : (
            <Text style={[styles.emptyStateText, { color: colorScheme.secondary, marginTop: 4 }]}>
              No quiz attempts yet. Test your knowledge in Quiz Mode!
            </Text>
          )}
        </View>
      </ScrollView>

      {/* Edit Trainer Name Modal */}
      <Modal visible={isEditingName} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: colorScheme.surface, borderColor: colorScheme.outline },
            ]}
          >
            <Text style={[styles.modalTitle, { color: colorScheme.onSurface }]}>
              Edit Trainer Name
            </Text>
            <TextInput
              style={[
                styles.textInput,
                {
                  color: colorScheme.onSurface,
                  borderColor: colorScheme.outline,
                  backgroundColor: colorScheme.surfaceVariant,
                },
              ]}
              value={nameInput}
              onChangeText={setNameInput}
              placeholder="Enter trainer name..."
              placeholderTextColor={colorScheme.secondary}
              autoFocus
              maxLength={20}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => setIsEditingName(false)}
                style={[styles.modalButton, { borderColor: colorScheme.outline, borderWidth: 1 }]}
              >
                <Text style={[styles.modalButtonText, { color: colorScheme.onSurface }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveName}
                style={[styles.modalButton, { backgroundColor: colorScheme.primary }]}
              >
                <Text style={[styles.modalButtonText, { color: colorScheme.onPrimary }]}>
                  Save
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Avatar Selection Modal */}
      <Modal visible={isPickerVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: colorScheme.surface, borderColor: colorScheme.outline },
            ]}
          >
            <Text style={[styles.modalTitle, { color: colorScheme.onSurface }]}>
              Choose Your Starter Avatar
            </Text>
            <View style={styles.avatarGrid}>
              {AVATAR_OPTIONS.map((avatar) => {
                const isSelected = avatar.id === profile.avatarId;
                return (
                  <TouchableOpacity
                    key={avatar.id}
                    activeOpacity={0.7}
                    onPress={() => handleSelectAvatar(avatar)}
                    style={[
                      styles.avatarOptionItem,
                      isSelected && {
                        borderColor: colorScheme.primary,
                        backgroundColor: colorScheme.primaryContainer,
                      },
                    ]}
                  >
                    <Image
                      source={{ uri: avatar.artworkUrl }}
                      style={styles.avatarOptionImage}
                      contentFit="contain"
                    />
                    <Text
                      style={[
                        styles.avatarOptionName,
                        {
                          color: isSelected
                            ? colorScheme.onPrimaryContainer
                            : colorScheme.onSurface,
                        },
                      ]}
                    >
                      {avatar.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TouchableOpacity
              onPress={() => setIsPickerVisible(false)}
              style={[styles.closePickerButton, { borderColor: colorScheme.outline }]}
            >
              <Text style={[styles.closePickerText, { color: colorScheme.onSurface }]}>Close</Text>
            </TouchableOpacity>
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
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  avatarSection: {
    alignItems: 'center',
  },
  avatarCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  avatarImage: {
    width: 72,
    height: 72,
  },
  avatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  trainerName: {
    fontSize: 22,
    fontWeight: '700',
  },
  levelBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 6,
  },
  levelText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  xpContainer: {
    marginTop: 16,
  },
  xpTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  xpLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  xpValue: {
    fontSize: 12,
    fontWeight: '600',
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
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  statRow: {
    width: '100%',
  },
  statLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  statName: {
    fontSize: 14,
    fontWeight: '600',
  },
  statValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  gridContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  cardHalf: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  cardTitleSmall: {
    fontSize: 13,
    fontWeight: '600',
  },
  bigStatValue: {
    fontSize: 22,
    fontWeight: '700',
    marginTop: 4,
  },
  emptyStateText: {
    fontSize: 12,
    marginTop: 6,
  },
  quizStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  quizStatColumn: {
    alignItems: 'center',
  },
  mediumStatValue: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 4,
  },
  statSubText: {
    fontSize: 12,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  textInput: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 16,
  },
  avatarOptionItem: {
    width: 80,
    height: 96,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
  },
  avatarOptionImage: {
    width: 56,
    height: 56,
  },
  avatarOptionName: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  closePickerButton: {
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  closePickerText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
