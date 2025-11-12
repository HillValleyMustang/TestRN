/**
 * OnboardingProgressIndicator Component - Visual progress indicator for onboarding steps
 * Shows current step and total steps with animated dots
 */

import React from 'react';
import {
  View,
  StyleSheet,
  Animated,
} from 'react-native';
import { Colors, Spacing, BorderRadius } from '../../constants/Theme';

interface OnboardingProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
}

export const OnboardingProgressIndicator: React.FC<OnboardingProgressIndicatorProps> = ({
  currentStep,
  totalSteps,
}) => {
  return (
    <View style={styles.container}>
      {Array.from({ length: totalSteps }, (_, index) => {
        const stepNumber = index + 1;
        const isCompleted = stepNumber < currentStep;
        const isCurrent = stepNumber === currentStep;

        return (
          <View
            key={stepNumber}
            style={[
              styles.dot,
              isCompleted && styles.dotCompleted,
              isCurrent && styles.dotCurrent,
            ]}
          />
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    gap: Spacing.md,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.muted,
  },
  dotCompleted: {
    backgroundColor: Colors.success,
    width: 12,
    height: 12,
    borderRadius: BorderRadius.full,
  },
  dotCurrent: {
    backgroundColor: Colors.success,
    width: 12,
    height: 12,
    borderRadius: BorderRadius.full,
  },
});