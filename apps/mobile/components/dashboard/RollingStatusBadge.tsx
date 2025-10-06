/**
 * RollingStatusBadge Component
 * Displays user's workout consistency status
 * Reference: apps/web/src/components/layout/rolling-status-badge.tsx
 * 
 * Status States:
 * - Getting into it: 0-7 days consecutive
 * - Building Momentum: 1-3 weeks (8-21 days)
 * - In the Zone: 4-7 weeks (22-49 days)
 * - On Fire: 8+ weeks (50+ days)
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../ui/Card';
import { Colors, Spacing, BorderRadius } from '../../constants/Theme';
import { TextStyles } from '../../constants/Typography';
import { useRollingStatus } from '../../hooks/useRollingStatus';

interface RollingStatusBadgeProps {
  onPress?: () => void;
}

export function RollingStatusBadge({ onPress }: RollingStatusBadgeProps) {
  const { status, loading, config } = useRollingStatus();

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      showStatusInfo();
    }
  };

  const showStatusInfo = () => {
    const statusTexts = [
      '🏋️ Getting into it\nYou\'re just getting started or have had a break of more than a week. Keep it up!',
      '\n✓ Building Momentum\nYou\'ve been working out consistently for 1-3 weeks.',
      '\n🔥 In the Zone\nYou\'ve maintained your workout habit for 4-7 consecutive weeks.',
      '\n🔥 On Fire\nIncredible consistency! You\'ve been working out for 8+ weeks straight.',
      '\n📡 Offline\nYou are currently offline. Your progress is being saved locally and will sync when you reconnect.',
    ].join('\n\n');

    Alert.alert('Workout Status Explained', statusTexts);
  };

  if (loading) {
    return (
      <Card style={styles.container}>
        <View style={styles.badge}>
          <Ionicons name="ellipsis-horizontal" size={16} color={Colors.mutedForeground} />
          <Text style={styles.statusText}>Loading...</Text>
        </View>
      </Card>
    );
  }

  return (
    <Pressable onPress={handlePress}>
      <Card style={styles.container}>
        <View style={[styles.badge, { backgroundColor: config.backgroundColor }]}>
          <Ionicons name={config.icon} size={16} color={config.color} />
          <Text style={[styles.statusText, { color: config.color }]}>{status}</Text>
        </View>
        <Text style={styles.description} numberOfLines={2}>
          {config.description}
        </Text>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.lg,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.sm,
  },
  statusText: {
    ...TextStyles.caption,
    fontWeight: '600',
  },
  description: {
    ...TextStyles.caption,
    color: Colors.mutedForeground,
  },
});
