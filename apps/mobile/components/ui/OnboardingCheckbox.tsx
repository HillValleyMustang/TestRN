/**
 * OnboardingCheckbox Component - Reusable checkbox component for onboarding
 * Provides consistent styling for boolean selections with haptic feedback
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing, BorderRadius } from '../../constants/Theme';
import { TextStyles } from '../../constants/Typography';

interface OnboardingCheckboxProps {
  checked: boolean;
  onValueChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
}

export const OnboardingCheckbox: React.FC<OnboardingCheckboxProps> = ({
  checked,
  onValueChange,
  label,
  disabled = false,
}) => {
  const handlePress = () => {
    if (disabled) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onValueChange(!checked);
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      disabled={disabled}
    >
      <View
        style={[
          styles.checkbox,
          checked && styles.checkboxChecked,
          disabled && styles.checkboxDisabled,
        ]}
      >
        {checked && <Text style={styles.checkmark}>✓</Text>}
      </View>
      <Text
        style={[
          styles.label,
          disabled && styles.labelDisabled,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.sm,
    borderWidth: 2,
    borderColor: Colors.border,
    marginRight: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.input,
  },
  checkboxChecked: {
    backgroundColor: Colors.success,
    borderColor: Colors.success,
  },
  checkboxDisabled: {
    opacity: 0.5,
  },
  checkmark: {
    color: Colors.white,
    ...TextStyles.bodyMedium,
  },
  label: {
    flex: 1,
    ...TextStyles.bodySmall,
    color: Colors.foreground,
    lineHeight: 20,
  },
  labelDisabled: {
    opacity: 0.5,
  },
});