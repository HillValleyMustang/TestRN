/**
 * OnboardingRadioGroup Component - Reusable radio button group for onboarding
 * Provides consistent styling for single selection options
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Colors, Spacing, BorderRadius } from '../../constants/Theme';
import { TextStyles } from '../../constants/Typography';

interface RadioOption {
  id: string;
  label: string;
  description?: string;
}

interface OnboardingRadioGroupProps {
  options: RadioOption[];
  selectedValue: string | null;
  onValueChange: (value: string) => void;
  label?: string;
}

export const OnboardingRadioGroup: React.FC<OnboardingRadioGroupProps> = ({
  options,
  selectedValue,
  onValueChange,
  label,
}) => {
  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.optionsContainer}>
        {options.map(option => (
          <TouchableOpacity
            key={option.id}
            style={[
              styles.option,
              selectedValue === option.id && styles.optionSelected,
            ]}
            onPress={() => onValueChange(option.id)}
          >
            <View style={styles.optionHeader}>
              <Text
                style={[
                  styles.optionLabel,
                  selectedValue === option.id && styles.optionLabelSelected,
                ]}
              >
                {option.label}
              </Text>
              {selectedValue === option.id && (
                <View style={styles.radioSelected} />
              )}
            </View>
            {option.description && (
              <Text
                style={[
                  styles.optionDescription,
                  selectedValue === option.id && styles.optionDescriptionSelected,
                ]}
              >
                {option.description}
              </Text>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.xl,
  },
  label: {
    ...TextStyles.h4,
    color: Colors.foreground,
    marginBottom: Spacing.lg,
  },
  optionsContainer: {
    gap: Spacing.md,
  },
  option: {
    backgroundColor: Colors.secondary,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  optionSelected: {
    borderColor: Colors.success,
    borderWidth: 2,
    backgroundColor: Colors.secondary,
  },
  optionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  optionLabel: {
    ...TextStyles.bodyLarge,
    color: Colors.foreground,
  },
  optionLabelSelected: {
    color: Colors.success,
  },
  optionDescription: {
    ...TextStyles.bodySmall,
    color: Colors.mutedForeground,
    marginTop: Spacing.xs,
  },
  optionDescriptionSelected: {
    color: Colors.success,
  },
  radioSelected: {
    width: 20,
    height: 20,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.success,
  },
});