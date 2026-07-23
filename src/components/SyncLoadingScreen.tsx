import React from 'react';
import { StyleSheet, Text, View, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useAppTheme } from '../theme';

interface SyncLoadingScreenProps {
  current: number;
  total: number;
  error?: string | null;
  onRetry?: () => void;
}

export const SyncLoadingScreen: React.FC<SyncLoadingScreenProps> = ({
  current = 0,
  total = 151,
  error,
  onRetry,
}) => {
  const { colorScheme } = useAppTheme();
  const rawPercentage = Math.floor(((current || 0) / (total || 151)) * 100);
  const percentage = Math.min(100, Math.max(0, isNaN(rawPercentage) ? 0 : rawPercentage));

  return (
    <View style={[styles.container, { backgroundColor: colorScheme.background }]}>
      <View
        style={[
          styles.card,
          {
            backgroundColor: colorScheme.surfaceVariant,
            borderColor: colorScheme.outline,
          },
        ]}
      >
        <Text style={styles.icon}>🔴</Text>
        <Text style={[styles.title, { color: colorScheme.onSurfaceVariant }]}>
          Filling the National Pokédex...
        </Text>
        <Text style={[styles.subtitle, { color: colorScheme.onSurfaceVariant }]}>
          Downloading all base Pokémon across all generations.{'\n'}This will take a few minutes the first time.
        </Text>

        {error ? (
          <View style={styles.errorContainer}>
            <Text style={[styles.errorText, { color: '#D32F2F' }]}>{error}</Text>
            {onRetry && (
              <TouchableOpacity
                style={[styles.retryButton, { backgroundColor: colorScheme.primary }]}
                onPress={onRetry}
                activeOpacity={0.8}
              >
                <Text style={[styles.retryText, { color: colorScheme.onPrimary }]}>
                  Retry Sync
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.progressSection}>
            <View
              style={[
                styles.progressBarTrack,
                { backgroundColor: colorScheme.surface },
              ]}
            >
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${percentage}%`,
                    backgroundColor: colorScheme.primary,
                  },
                ]}
              />
            </View>

            <View style={styles.counterRow}>
              <Text style={[styles.counterText, { color: colorScheme.onSurfaceVariant }]}>
                {current} / {total || 151}
              </Text>
              <Text style={[styles.percentageText, { color: colorScheme.primary }]}>
                {percentage}%
              </Text>
            </View>

            <ActivityIndicator
              size="small"
              color={colorScheme.primary}
              style={{ marginTop: 16 }}
            />
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    padding: 28,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  icon: {
    fontSize: 48,
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    opacity: 0.8,
    textAlign: 'center',
    marginBottom: 24,
  },
  progressSection: {
    width: '100%',
    alignItems: 'center',
  },
  progressBarTrack: {
    width: '100%',
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 6,
  },
  counterRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  counterText: {
    fontSize: 13,
    fontWeight: '600',
  },
  percentageText: {
    fontSize: 14,
    fontWeight: '700',
  },
  errorContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: 8,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
