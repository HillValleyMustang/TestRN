/**
 * Card Component - Mobile
 * Matches web app's Shadcn/Radix UI Card component
 * Border-bottom-4 accent style for workout cards
 */

import React from 'react';
import { View, ViewStyle, StyleSheet } from 'react-native';
import { Colors, BorderRadius, Spacing, Shadows } from '../../constants/Theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'elevated';
  accentColor?: string; // For workout color accent (border-bottom)
  accentWidth?: number; // Width of bottom accent border (default: 4)
}

export function Card({ 
  children, 
  style, 
  variant = 'default',
  accentColor,
  accentWidth = 4
}: CardProps) {
  const cardStyle: ViewStyle[] = [
    styles.card,
    variant === 'elevated' ? Shadows.sm : {},
    accentColor ? {
      borderBottomWidth: accentWidth,
      borderBottomColor: accentColor,
    } : {},
    style || {},
  ].filter(Boolean);

  return <View style={cardStyle}>{children}</View>;
}

interface CardHeaderProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function CardHeader({ children, style }: CardHeaderProps) {
  return (
    <View style={[styles.header, style]}>
      {children}
    </View>
  );
}

interface CardTitleProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function CardTitle({ children, style }: CardTitleProps) {
  return (
    <View style={[styles.title, style]}>
      {children}
    </View>
  );
}

interface CardDescriptionProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function CardDescription({ children, style }: CardDescriptionProps) {
  return (
    <View style={[styles.description, style]}>
      {children}
    </View>
  );
}

interface CardContentProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function CardContent({ children, style }: CardContentProps) {
  return (
    <View style={[styles.content, style]}>
      {children}
    </View>
  );
}

interface CardFooterProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function CardFooter({ children, style }: CardFooterProps) {
  return (
    <View style={[styles.footer, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  title: {
    // Text component will handle typography
  },
  description: {
    marginTop: Spacing.xs,
    // Text component will handle typography
  },
  content: {
    padding: Spacing.lg,
    paddingTop: 0,
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    paddingTop: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
});
