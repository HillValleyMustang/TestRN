/**
 * VolumeChangeIndicator Component
 * Reusable percentage badge showing improvement/decline in volume
 * Used for workout comparisons and exercise progression
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../../constants/Theme';

interface VolumeChangeIndicatorProps {
  currentVolume: number;
  previousVolume: number;
  comparisonType?: 'workout' | 'exercise';
}

export function VolumeChangeIndicator({
  currentVolume,
  previousVolume,
  comparisonType = 'workout',
}: VolumeChangeIndicatorProps) {
  // Calculate percentage change
  const percentChange =
    previousVolume > 0
      ? ((currentVolume - previousVolume) / previousVolume) * 100
      : 0;

  // Determine color and icon based on percentage change
  // > 2% = improvement (green), < -2% = decline (red), else stable (gray)
  const isImprovement = percentChange > 2;
  const isDecline = percentChange < -2;
  const isStable = !isImprovement && !isDecline;

  const backgroundColor = isImprovement
    ? Colors.success
    : isDecline
    ? Colors.destructive
    : Colors.muted;

  const textColor = isImprovement || isDecline ? 'white' : Colors.mutedForeground;

  const icon = isImprovement
    ? 'arrow-up'
    : isDecline
    ? 'arrow-down'
    : 'remove';

  // Format percentage to 1 decimal place
  const formattedPercent = Math.abs(percentChange).toFixed(1);

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <Ionicons name={icon} size={14} color={textColor} />
      <Text style={[styles.text, { color: textColor }]}>
        {isImprovement ? '+' : isDecline ? '-' : ''}
        {formattedPercent}%
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Poppins_600SemiBold',
  },
});
