/**
 * Button Component - Mobile
 * Matches web app's Shadcn/Radix UI Button component
 * Multiple variants with press animations
 */

import React from 'react';
import {
  Pressable,
  Text,
  ViewStyle,
  TextStyle,
  StyleSheet,
  ActivityIndicator,
  View,
} from 'react-native';
import { Colors, BorderRadius, Spacing, Shadows } from '../../constants/Theme';
import { TextStyles } from '../../constants/Typography';

type ButtonVariant = 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link' | 'action';
type ButtonSize = 'default' | 'sm' | 'lg' | 'icon';

interface ButtonProps {
  children: React.ReactNode;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

export function Button({
  children,
  onPress,
  variant = 'default',
  size = 'default',
  disabled = false,
  loading = false,
  style,
  textStyle,
  icon,
  iconPosition = 'left',
}: ButtonProps) {
  const buttonStyles = [
    styles.base,
    styles[variant],
    styles[`size_${size}`],
    disabled && styles.disabled,
    style,
  ];

  const textStyles = [
    styles.text,
    styles[`${variant}Text` as keyof typeof styles],
    styles[`size_${size}Text` as keyof typeof styles],
    textStyle,
  ];

  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        ...buttonStyles,
        pressed && !isDisabled && styles.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'outline' || variant === 'ghost' ? Colors.actionPrimary : Colors.card}
          size="small"
        />
      ) : (
        <View style={styles.content}>
          {icon && iconPosition === 'left' && <View style={styles.iconLeft}>{icon}</View>}
          <Text style={textStyles}>{children}</Text>
          {icon && iconPosition === 'right' && <View style={styles.iconRight}>{icon}</View>}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconLeft: {
    marginRight: Spacing.sm,
  },
  iconRight: {
    marginLeft: Spacing.sm,
  },
  
  // Variants
  default: {
    backgroundColor: Colors.primary,
    ...Shadows.sm,
  },
  destructive: {
    backgroundColor: Colors.destructive,
    ...Shadows.sm,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  secondary: {
    backgroundColor: Colors.secondary,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  link: {
    backgroundColor: 'transparent',
  },
  action: {
    backgroundColor: Colors.actionPrimary,
    ...Shadows.md,
  },
  
  // Sizes
  size_default: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    minHeight: 44, // iOS minimum touch target
  },
  size_sm: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    minHeight: 36,
  },
  size_lg: {
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    minHeight: 52,
  },
  size_icon: {
    width: 44,
    height: 44,
    padding: 0,
  },
  
  // Text styles for variants
  text: {
    ...TextStyles.button,
  },
  defaultText: {
    color: Colors.primaryForeground,
  },
  destructiveText: {
    color: Colors.destructiveForeground,
  },
  outlineText: {
    color: Colors.foreground,
  },
  secondaryText: {
    color: Colors.secondaryForeground,
  },
  ghostText: {
    color: Colors.foreground,
  },
  linkText: {
    color: Colors.actionPrimary,
    textDecorationLine: 'underline',
  },
  actionText: {
    color: Colors.actionPrimaryForeground,
  },
  
  // Text sizes
  size_defaultText: {
    fontSize: 16,
  },
  size_smText: {
    fontSize: 14,
  },
  size_lgText: {
    fontSize: 18,
  },
  size_iconText: {
    fontSize: 16,
  },
  
  // States
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  disabled: {
    opacity: 0.5,
  },
});
