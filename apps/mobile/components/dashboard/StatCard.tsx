/**
 * StatCard Component
 * Displays a single stat with icon, value, and label
 */

import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../ui/Card';
import { Colors, Spacing } from '../../constants/Theme';
import { TextStyles } from '../../constants/Typography';

interface StatCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string | number;
  iconColor?: string;
  style?: StyleProp<ViewStyle>;
}

export function StatCard({ icon, label, value, iconColor = Colors.actionPrimary, style }: StatCardProps) {
  return (
    <Card style={[styles.container, style]}>
      <View style={styles.iconContainer}>
        <Ionicons name={icon} size={24} color={iconColor} />
      </View>
      <View style={styles.content}>
        <Text style={styles.value}>{value}</Text>
        <Text style={styles.label}>{label}</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  value: {
    ...TextStyles.h2,
    color: Colors.foreground,
    marginBottom: Spacing.xs / 2,
  },
  label: {
    ...TextStyles.caption,
    color: Colors.mutedForeground,
  },
});
