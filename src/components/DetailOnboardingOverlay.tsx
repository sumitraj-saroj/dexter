import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  Dimensions,
  TouchableWithoutFeedback,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { M3ColorScheme } from '../types';

export interface TargetLayout {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type StepKey = 'fav' | 'caught' | 'shiny' | 'alpha' | 'build' | 'specialForm';

export interface TourStep {
  key: StepKey;
  iconName: keyof typeof Ionicons.glyphMap;
  title: string;
  line1: string;
  line2: string;
}

const ALL_STEPS: TourStep[] = [
  {
    key: 'fav',
    iconName: 'heart',
    title: 'Favorite',
    line1: 'Favorite — bookmark',
    line2: 'Pokemon you love',
  },
  {
    key: 'caught',
    iconName: 'disc',
    title: 'Caught',
    line1: "Caught — mark Pokemon you've",
    line2: 'actually caught in-game',
  },
  {
    key: 'shiny',
    iconName: 'star',
    title: 'Shiny',
    line1: 'Shiny — toggle shiny preview,',
    line2: 'tap again to mark one you own',
  },
  {
    key: 'alpha',
    iconName: 'flag',
    title: 'Alpha',
    line1: 'Alpha — mark powerful Alpha-sized',
    line2: 'Pokemon (Legends: Arceus style)',
  },
  {
    key: 'build',
    iconName: 'ribbon',
    title: 'Competitive Build',
    line1: 'Competitive Build — save a real',
    line2: 'moveset with EVs, IVs, and nature',
  },
  {
    key: 'specialForm',
    iconName: 'flash',
    title: 'Special Forms',
    line1: 'Some Pokemon have Mega Evolutions',
    line2: 'or Gigantamax forms — tap to switch',
  },
];

interface DetailOnboardingOverlayProps {
  visible: boolean;
  stepIndex: number;
  hasSpecialForms: boolean;
  targetLayouts: Partial<Record<StepKey, TargetLayout>>;
  onNext: () => void;
  onSkip: () => void;
  colorScheme: M3ColorScheme;
  isDark: boolean;
}

export const DetailOnboardingOverlay: React.FC<DetailOnboardingOverlayProps> = ({
  visible,
  stepIndex,
  hasSpecialForms,
  targetLayouts,
  onNext,
  onSkip,
  colorScheme,
  isDark,
}) => {
  if (!visible) return null;

  const activeSteps = hasSpecialForms
    ? ALL_STEPS
    : ALL_STEPS.filter((s) => s.key !== 'specialForm');

  const safeStepIndex = Math.min(stepIndex, activeSteps.length - 1);
  const currentStep = activeSteps[safeStepIndex];
  if (!currentStep) return null;

  const isLastStep = safeStepIndex === activeSteps.length - 1;
  const layout = targetLayouts[currentStep.key];

  const screenWidth = Dimensions.get('window').width;
  const screenHeight = Dimensions.get('window').height;

  // Fallback centered position if target element isn't measured yet
  const targetX = layout ? layout.x : screenWidth / 2 - 40;
  const targetY = layout ? layout.y : screenHeight / 2 - 20;
  const targetWidth = layout ? layout.width : 80;
  const targetHeight = layout ? layout.height : 40;

  // Position callout bubble above or below target rect
  const isBelowHalf = targetY > screenHeight * 0.45;
  const bubbleWidth = Math.min(screenWidth - 32, 320);

  // Center bubble relative to target element X
  let bubbleLeft = targetX + targetWidth / 2 - bubbleWidth / 2;
  bubbleLeft = Math.max(16, Math.min(screenWidth - bubbleWidth - 16, bubbleLeft));

  return (
    <View style={styles.overlayRoot} pointerEvents="box-none">
      <View style={styles.container}>
        {/* Dark Dim Backdrop */}
        <TouchableWithoutFeedback onPress={onNext}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>

        {/* Spotlight Ring around target element */}
        <View
          style={[
            styles.spotlightRing,
            {
              left: Math.max(6, targetX - 6),
              top: targetY - 6,
              width: targetWidth + 12,
              height: targetHeight + 12,
              borderColor: colorScheme.primary,
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.25)',
            },
          ]}
          pointerEvents="none"
        />

        {/* Callout Bubble */}
        <View
          style={[
            styles.calloutBubble,
            {
              left: bubbleLeft,
              width: bubbleWidth,
              backgroundColor: colorScheme.surface,
              borderColor: colorScheme.outline + '40',
              shadowColor: '#000',
            },
            isBelowHalf
              ? { top: Math.max(40, targetY - 145) }
              : { top: targetY + targetHeight + 14 },
          ]}
        >
          {/* Header */}
          <View style={styles.bubbleHeader}>
            <View style={styles.titleRow}>
              <View
                style={[
                  styles.iconBadge,
                  { backgroundColor: colorScheme.primary + '1F' },
                ]}
              >
                <Ionicons
                  name={currentStep.iconName}
                  size={16}
                  color={colorScheme.primary}
                />
              </View>
              <Text style={[styles.bubbleTitle, { color: colorScheme.onSurface }]}>
                {currentStep.title}
              </Text>
            </View>

            <Text style={[styles.stepCounter, { color: colorScheme.onSurfaceVariant }]}>
              {safeStepIndex + 1}/{activeSteps.length}
            </Text>
          </View>

          {/* Description Lines */}
          <View style={styles.bubbleBody}>
            <Text style={[styles.bubbleText, { color: colorScheme.onSurfaceVariant }]}>
              {currentStep.line1}
            </Text>
            {currentStep.line2 ? (
              <Text style={[styles.bubbleText, { color: colorScheme.onSurfaceVariant }]}>
                {currentStep.line2}
              </Text>
            ) : null}
          </View>

          {/* Footer Actions */}
          <View style={styles.bubbleFooter}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={onSkip}
              style={styles.skipButton}
              hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
            >
              <Text style={[styles.skipText, { color: colorScheme.onSurfaceVariant }]}>
                Skip
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={onNext}
              style={[styles.nextButton, { backgroundColor: colorScheme.primary }]}
            >
              <Text style={[styles.nextText, { color: colorScheme.onPrimary }]}>
                {isLastStep ? 'Got it!' : 'Next →'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
};

// Long Press Tooltip Overlay Component
interface StatusTooltipProps {
  visible: boolean;
  tooltipKey: StepKey | null;
  targetLayout: TargetLayout | null;
  onDismiss: () => void;
  colorScheme: M3ColorScheme;
  isDark: boolean;
}

const TOOLTIP_TEXTS: Record<StepKey, string> = {
  fav: 'Favorite — bookmark Pokemon you love',
  caught: "Caught — mark Pokemon you've actually caught in-game",
  shiny: 'Shiny — toggle shiny preview, tap again to mark one you own',
  alpha: 'Alpha — mark powerful Alpha-sized Pokemon (Legends: Arceus style)',
  build: 'Competitive Build — save a real competitive moveset with EVs, IVs, and nature',
  specialForm: 'Special Forms — tap to switch Mega or Gigantamax forms',
};

export const StatusTooltipOverlay: React.FC<StatusTooltipProps> = ({
  visible,
  tooltipKey,
  targetLayout,
  onDismiss,
  colorScheme,
  isDark,
}) => {
  if (!visible || !tooltipKey || !targetLayout) return null;

  const screenWidth = Dimensions.get('window').width;
  const text = TOOLTIP_TEXTS[tooltipKey] || '';

  const tooltipWidth = Math.min(screenWidth - 32, 260);
  let tooltipLeft = targetLayout.x + targetLayout.width / 2 - tooltipWidth / 2;
  tooltipLeft = Math.max(16, Math.min(screenWidth - tooltipWidth - 16, tooltipLeft));

  const tooltipTop = Math.max(40, targetLayout.y - 48);

  return (
    <View style={styles.overlayRoot} pointerEvents="box-none">
      <TouchableWithoutFeedback onPress={onDismiss}>
        <View style={styles.tooltipContainer}>
          <View
            style={[
              styles.tooltipBubble,
              {
                left: tooltipLeft,
                top: tooltipTop,
                width: tooltipWidth,
                backgroundColor: isDark ? '#1E293B' : '#0F172A',
                borderColor: isDark ? '#334155' : '#334155',
              },
            ]}
          >
            <Text style={styles.tooltipText}>{text}</Text>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </View>
  );
};


const styles = StyleSheet.create({
  overlayRoot: {
    ...StyleSheet.absoluteFill,
    zIndex: 9999,
    elevation: 9999,
  },
  container: {
    flex: 1,
    position: 'relative',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
  },
  spotlightRing: {
    position: 'absolute',
    borderRadius: 10,
    borderWidth: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
  calloutBubble: {
    position: 'absolute',
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 10,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 10,
  },
  bubbleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bubbleTitle: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  stepCounter: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
  },
  bubbleBody: {
    gap: 2,
  },
  bubbleText: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
  },
  bubbleFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  skipButton: {
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  skipText: {
    fontSize: 12,
    fontWeight: '500',
  },
  nextButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  nextText: {
    fontSize: 12,
    fontWeight: '700',
  },
  tooltipContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  tooltipBubble: {
    position: 'absolute',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 12,
  },
  tooltipText: {
    color: '#F8FAFC',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 15,
  },
});
