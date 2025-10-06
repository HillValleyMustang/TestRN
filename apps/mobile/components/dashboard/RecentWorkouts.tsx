/**
 * RecentWorkouts Component
 * Shows list of recently completed workouts
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../ui/Card';
import { Colors, Spacing, BorderRadius } from '../../constants/Theme';
import { TextStyles } from '../../constants/Typography';
import { getWorkoutColor } from '../../lib/workout-colors';

interface WorkoutItem {
  id: string;
  name: string;
  completedAt: string;
  workoutType?: string;
}

interface RecentWorkoutsProps {
  workouts: WorkoutItem[];
  onViewAll?: () => void;
}

export function RecentWorkouts({ workouts, onViewAll }: RecentWorkoutsProps) {
  if (workouts.length === 0) {
    return (
      <Card style={styles.container}>
        <Text style={styles.title}>Recent Workouts</Text>
        <View style={styles.emptyState}>
          <Ionicons name="barbell-outline" size={48} color={Colors.mutedForeground} />
          <Text style={styles.emptyText}>No workouts yet</Text>
          <Text style={styles.emptySubtext}>Start your first workout to see it here</Text>
        </View>
      </Card>
    );
  }

  return (
    <Card style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Recent Workouts</Text>
        {onViewAll && (
          <Pressable onPress={onViewAll}>
            <Text style={styles.viewAll}>View All</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.workoutList}>
        {workouts.map((workout, index) => {
          const workoutColor = workout.workoutType ? getWorkoutColor(workout.workoutType).main : null;
          
          return (
            <View 
              key={workout.id} 
              style={[
                styles.workoutItem,
                index < workouts.length - 1 && styles.workoutItemBorder,
                workoutColor && { borderLeftWidth: 3, borderLeftColor: workoutColor, paddingLeft: Spacing.sm },
              ]}
            >
              <View style={styles.workoutIcon}>
                <Ionicons name="checkmark-circle" size={24} color={workoutColor || Colors.success} />
              </View>
              <View style={styles.workoutInfo}>
                <Text style={styles.workoutName}>{workout.name}</Text>
                <Text style={styles.workoutDate}>{workout.completedAt}</Text>
              </View>
            </View>
          );
        })}
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
  title: {
    ...TextStyles.h3,
    color: Colors.foreground,
  },
  viewAll: {
    ...TextStyles.caption,
    color: Colors.actionPrimary,
    fontWeight: '600',
  },
  workoutList: {
    gap: Spacing.sm,
  },
  workoutItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  workoutItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  workoutIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  workoutInfo: {
    flex: 1,
  },
  workoutName: {
    ...TextStyles.body,
    color: Colors.foreground,
    fontWeight: '500',
    marginBottom: Spacing.xs / 2,
  },
  workoutDate: {
    ...TextStyles.caption,
    color: Colors.mutedForeground,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    gap: Spacing.sm,
  },
  emptyText: {
    ...TextStyles.body,
    color: Colors.foreground,
    fontWeight: '500',
  },
  emptySubtext: {
    ...TextStyles.caption,
    color: Colors.mutedForeground,
  },
});
