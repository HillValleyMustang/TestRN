/**
 * WeeklyTargetWidget Component
 * Shows weekly workout targets with circular color-coded pills
 * Reference: MOBILE_SPEC_02_DASHBOARD.md Section 3
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../ui/Card';
import { Colors, Spacing } from '../../constants/Theme';
import { TextStyles } from '../../constants/Typography';
import { getWorkoutColor } from '../../lib/workout-colors';

interface CompletedWorkout {
  id: string;
  name: string;
  sessionId?: string;
}

interface WeeklyTargetWidgetProps {
  completedWorkouts: CompletedWorkout[];
  goalTotal: number;
  programmeType: 'ppl' | 'ulul';
  onViewCalendar?: () => void;
  onViewWorkoutSummary?: (sessionId: string) => void;
  activitiesCount?: number;
  onViewActivities?: () => void;
  loading?: boolean;
  error?: string;
}

export function WeeklyTargetWidget({
  completedWorkouts = [],
  goalTotal,
  programmeType,
  onViewCalendar,
  onViewWorkoutSummary,
  activitiesCount = 0,
  onViewActivities,
  loading,
  error,
}: WeeklyTargetWidgetProps) {
  const workoutTypes = programmeType === 'ulul'
    ? ['Upper Body A', 'Lower Body A', 'Upper Body B', 'Lower Body B']
    : ['Push', 'Pull', 'Legs'];

  const getInitial = (workoutName: string): string => {
    const name = workoutName.toLowerCase();
    if (name.includes('upper')) return 'U';
    if (name.includes('lower')) return 'L';
    if (name.includes('push')) return 'P';
    if (name.includes('pull')) return 'P';
    if (name.includes('leg')) return 'L';
    return workoutName.charAt(0).toUpperCase();
  };

  if (error) {
    return (
      <Card style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={20} color={Colors.destructive} />
          <Text style={styles.errorText}>Failed to load weekly target.</Text>
        </View>
      </Card>
    );
  }

  if (!programmeType) {
    return (
      <Card style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            No programme type set. Complete onboarding or set one in your profile.
          </Text>
        </View>
      </Card>
    );
  }

  return (
    <Card style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Ionicons name="barbell" size={20} color={Colors.foreground} />
          <Text style={styles.title}>Weekly Target</Text>
        </View>
        {onViewCalendar && (
          <Pressable onPress={onViewCalendar} hitSlop={10}>
            <Ionicons name="calendar" size={16} color={Colors.mutedForeground} />
          </Pressable>
        )}
      </View>

      <View style={styles.circlesContainer}>
        {workoutTypes.map((workoutType, index) => {
          const isCompleted = index < completedWorkouts.length;
          const workout = completedWorkouts[index];
          const colors = getWorkoutColor(workoutType);

          if (isCompleted && workout) {
            return (
              <Pressable
                key={index}
                style={[
                  styles.circle,
                  styles.completedCircle,
                  { backgroundColor: colors.main }
                ]}
                onPress={() => workout.sessionId && onViewWorkoutSummary?.(workout.sessionId)}
              >
                <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
              </Pressable>
            );
          }

          return (
            <View
              key={index}
              style={[
                styles.circle,
                styles.incompleteCircle,
                { borderColor: colors.main }
              ]}
            >
              <Text style={[styles.circleText, { color: colors.main }]}>
                {getInitial(workoutType)}
              </Text>
            </View>
          );
        })}
      </View>

      <Text style={styles.progressText}>
        {completedWorkouts.length} / {goalTotal} Workouts Completed This Week
      </Text>

      {activitiesCount > 0 && onViewActivities && (
        <Pressable onPress={onViewActivities} style={styles.activitiesLink}>
          <Text style={styles.activitiesText}>
            {activitiesCount} {activitiesCount === 1 ? 'Activity' : 'Activities'} Completed This Week
          </Text>
        </Pressable>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.foreground,
  },
  circlesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  circle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completedCircle: {
    borderWidth: 0,
  },
  incompleteCircle: {
    borderWidth: 2,
    backgroundColor: Colors.card,
  },
  circleText: {
    fontSize: 14,
    fontWeight: '600',
  },
  progressText: {
    fontSize: 14,
    color: Colors.mutedForeground,
    textAlign: 'center',
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  activitiesLink: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  activitiesText: {
    fontSize: 14,
    color: Colors.mutedForeground,
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  errorText: {
    fontSize: 14,
    color: Colors.destructive,
  },
  emptyContainer: {
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.mutedForeground,
    textAlign: 'center',
    lineHeight: 20,
  },
});
