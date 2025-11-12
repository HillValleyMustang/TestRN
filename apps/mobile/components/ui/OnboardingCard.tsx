/**
 * OnboardingCard Component - Reusable card component for onboarding
 * Provides consistent styling with shadows and proper theming
 */

import React from 'react';
import {
  View,
  StyleSheet,
  ViewStyle,
  TouchableOpacity,
  TouchableOpacityProps,
} from 'react-native';
import { Colors, Spacing, BorderRadius, Shadows } from '../../constants/Theme';

interface OnboardingCardProps extends TouchableOpacityProps {
  children: React.ReactNode;
  style?: ViewStyle;
  selected?: boolean;
  disabled?: boolean;
}

export const OnboardingCard: React.FC<OnboardingCardProps> = ({
  children,
  style,
  selected = false,
  disabled = false,
  ...props
}) => {
  const cardStyle = [
    styles.card,
    selected && styles.cardSelected,
    disabled && styles.cardDisabled,
    style,
  ];

  if (props.onPress) {
    return (
      <TouchableOpacity
        style={cardStyle}
        disabled={disabled}
        {...props}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View style={cardStyle}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.secondary,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    ...Shadows.sm,
  },
  cardSelected: {
    borderColor: Colors.success,
    borderWidth: 2,
    backgroundColor: Colors.secondary,
  },
  cardDisabled: {
    opacity: 0.6,
  },
});