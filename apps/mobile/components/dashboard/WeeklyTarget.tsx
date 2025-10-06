/**
 * WeeklyTarget Component
 * Shows weekly workout targets with visual progress
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Colors, Spacing } from '../../constants/Theme';
import { TextStyles } from '../../constants/Typography';

interface WeeklyTargetProps {
  completedCount: number;
  goalCount: number;
  programType?: 'ppl' | 'ulul';
  completedWorkouts?: { id: string; name: string }[];
  onViewCalendar?: () => void;
}

export function WeeklyTarget({
  completedCount,
  goalCount,
  programType = 'ppl',
  completedWorkouts = [],
  onViewCalendar,
}: WeeklyTargetProps) {
  const goalWorkouts = programType === 'ulul'
    ? ['Upper A', 'Lower A', 'Upper B', 'Lower B']
    : ['Push', 'Pull', 'Legs'];

  const displayCount = Math.max(goalCount, completedCount);

  return (
    <Card style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Ionicons name="barbell" size={20} color={Colors.actionPrimary} />
          <Text style={styles.title}>Weekly Target</Text>
        </View>
        {onViewCalendar && (
          <Pressable onPress={onViewCalendar}>
            <Ionicons name="calendar" size={20} color={Colors.mutedForeground} />
          </Pressable>
        )}
      </View>

      <View style={styles.workoutList}>
        {Array.from({ length: displayCount }).map((_, i) => {
          const isCompleted = i < completedCount;
          const workoutName = isCompleted 
            ? completedWorkouts[i]?.name || goalWorkouts[i] 
            : goalWorkouts[i];
          
          return (
            <View key={i} style={styles.workoutItem}>
              <View style={[
                styles.checkIcon,
                isCompleted && styles.checkIconCompleted,
              ]}>
                {isCompleted && (
                  <Ionicons name="checkmark" size={16} color={Colors.card} />
                )}
              </View>
              <Text style={[
                styles.workoutName,
                isCompleted && styles.workoutNameCompleted,
              ]}>
                {workoutName}
              </Text>
            </View>
          );
        })}
      </View>

      <View style={styles.footer}>
        <Text style={styles.progress}>
          {completedCount}/{goalCount} completed
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  title: {
    ...TextStyles.h3,
    color: Colors.foreground,
  },
  workoutList: {
    gap: Spacing.sm,
  },
  workoutItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  checkIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkIconCompleted: {
    backgroundColor: Colors.success,
    borderColor: Colors.success,
  },
  workoutName: {
    ...TextStyles.body,
    color: Colors.mutedForeground,
    flex: 1,
  },
  workoutNameCompleted: {
    color: Colors.foreground,
    fontWeight: '500',
  },
  footer: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  progress: {
    ...TextStyles.caption,
    color: Colors.mutedForeground,
    textAlign: 'center',
  },
});
