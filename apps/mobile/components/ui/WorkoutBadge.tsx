/**
 * WorkoutBadge Component - Mobile
 * Matches web app's WorkoutBadge component for colored workout names
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getWorkoutColor, getWorkoutIcon } from '../../lib/workout-colors';
import { Colors, BorderRadius, Spacing } from '../../constants/Theme';
import { TextStyles } from '../../constants/Typography';

interface WorkoutBadgeProps {
  workoutName: string;
  size?: 'sm' | 'md' | 'lg';
  style?: any;
}

export function WorkoutBadge({ workoutName, size = 'md', style }: WorkoutBadgeProps) {
  const colors = getWorkoutColor(workoutName);
  const IconComponent = getWorkoutIcon(workoutName);

  const sizeStyles = {
    sm: { paddingHorizontal: Spacing.xs, paddingVertical: 2, iconSize: 12, fontSize: 10 },
    md: { paddingHorizontal: Spacing.sm, paddingVertical: 4, iconSize: 14, fontSize: 12 },
    lg: { paddingHorizontal: Spacing.md, paddingVertical: 6, iconSize: 16, fontSize: 14 },
  };

  const currentSize = sizeStyles[size];

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: colors.main,
          paddingHorizontal: currentSize.paddingHorizontal,
          paddingVertical: currentSize.paddingVertical,
        },
        style,
      ]}
    >
      {IconComponent && (
        <Ionicons
          name={IconComponent as any}
          size={currentSize.iconSize}
          color="white"
          style={styles.icon}
        />
      )}
      <Text
        style={[
          styles.text,
          { fontSize: currentSize.fontSize },
        ]}
        numberOfLines={1}
      >
        {workoutName}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.sm,
    alignSelf: 'flex-start',
  },
  icon: {
    marginRight: Spacing.xs,
  },
  text: {
    color: 'white',
    fontWeight: '600',
    fontFamily: 'Poppins_600SemiBold',
  },
});