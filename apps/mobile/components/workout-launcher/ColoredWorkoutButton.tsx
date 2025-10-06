/**
 * ColoredWorkoutButton Component
 * Displays a workout button with color-coded background
 * Used in workout launcher screen for PPL/ULUL workouts
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getWorkoutColor, getWorkoutIcon } from '../../lib/workout-colors';
import { TextStyles } from '../../constants/Typography';
import { Spacing, BorderRadius } from '../../constants/Theme';

interface ColoredWorkoutButtonProps {
  workoutName: string;
  lastCompleted?: string | null;
  onPress: () => void;
}

export function ColoredWorkoutButton({ 
  workoutName, 
  lastCompleted, 
  onPress 
}: ColoredWorkoutButtonProps) {
  const colors = getWorkoutColor(workoutName);
  const iconName = getWorkoutIcon(workoutName);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        pressed && styles.pressed,
      ]}
    >
      <LinearGradient
        colors={[colors.main, colors.light]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.content}>
          <View style={styles.leftSection}>
            <Ionicons 
              name={iconName as any} 
              size={24} 
              color="white" 
            />
            <Text style={styles.workoutName}>{workoutName}</Text>
          </View>
          
          <View style={styles.rightSection}>
            <Text style={styles.lastCompleted}>
              {lastCompleted || 'Never'}
            </Text>
          </View>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  gradient: {
    borderRadius: BorderRadius.lg,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  workoutName: {
    ...TextStyles.h4,
    color: 'white',
    fontWeight: '600',
  },
  rightSection: {
    alignItems: 'flex-end',
  },
  lastCompleted: {
    ...TextStyles.caption,
    color: 'rgba(255, 255, 255, 0.8)',
  },
});
