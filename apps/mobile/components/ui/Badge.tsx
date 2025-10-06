/**
 * Badge Component - Mobile
 * Matches web app's Shadcn/Radix UI Badge component
 * For status indicators and workout type pills
 */

import React from 'react';
import { View, Text, ViewStyle, TextStyle, StyleSheet, StyleProp } from 'react-native';
import { Colors, BorderRadius, Spacing } from '../../constants/Theme';
import { TextStyles } from '../../constants/Typography';

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'workout';
type BadgeSize = 'sm' | 'md' | 'lg';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  color?: string; // For custom workout colors
}

export function Badge({
  children,
  variant = 'default',
  size = 'md',
  style,
  textStyle,
  color,
}: BadgeProps) {
  const badgeStyles = [
    styles.base,
    styles[variant],
    styles[`size_${size}`],
    color && { backgroundColor: color },
    style,
  ];

  const badgeTextStyles = [
    styles.text,
    styles[`${variant}Text`],
    styles[`size_${size}Text`],
    color && { color: Colors.card }, // White text for custom colors
    textStyle,
  ];

  return (
    <View style={badgeStyles}>
      <Text style={badgeTextStyles}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  // Variants
  default: {
    backgroundColor: Colors.primary,
  },
  success: {
    backgroundColor: Colors.success,
  },
  warning: {
    backgroundColor: Colors.workoutBonus,
  },
  error: {
    backgroundColor: Colors.destructive,
  },
  info: {
    backgroundColor: Colors.actionPrimary,
  },
  workout: {
    // Will be overridden by custom color
    backgroundColor: Colors.actionPrimary,
  },
  
  // Sizes
  size_sm: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  size_md: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  size_lg: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  
  // Text styles
  text: {
    ...TextStyles.small,
    fontWeight: '600',
  },
  defaultText: {
    color: Colors.primaryForeground,
  },
  successText: {
    color: Colors.successForeground,
  },
  warningText: {
    color: Colors.card,
  },
  errorText: {
    color: Colors.destructiveForeground,
  },
  infoText: {
    color: Colors.actionPrimaryForeground,
  },
  workoutText: {
    color: Colors.card,
  },
  
  // Text sizes
  size_smText: {
    fontSize: 10,
  },
  size_mdText: {
    fontSize: 12,
  },
  size_lgText: {
    fontSize: 14,
  },
});
