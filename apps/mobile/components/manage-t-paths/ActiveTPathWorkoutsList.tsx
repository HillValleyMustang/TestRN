import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, Shadows } from '../../constants/Theme';
import { FontFamily, TextStyles } from '../../constants/Typography';
import { getWorkoutColor } from '../../lib/workout-colors';
import type { WorkoutWithStats } from '../../types/workout';

interface ActiveTPathWorkoutsListProps {
  activeTPathName: string;
  childWorkouts: WorkoutWithStats[];
  loading: boolean;
  onEditWorkout: (workoutId: string, workoutName: string) => void;
}

const formatLastCompleted = (date: Date | null): string => {
  if (!date) return 'Never';

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const completedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const diffTime = today.getTime() - completedDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return `${Math.floor(diffDays / 30)} months ago`;
};

export const ActiveTPathWorkoutsList = ({
  activeTPathName,
  childWorkouts,
  loading,
  onEditWorkout,
}: ActiveTPathWorkoutsListProps) => {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>Workouts in "{activeTPathName}"</Text>
        <Text style={styles.cardSubtitle}>
          {childWorkouts.length} workout{childWorkouts.length !== 1 ? 's' : ''}
        </Text>
      </View>
      <View style={styles.cardContent}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={Colors.actionPrimary} />
            <Text style={styles.loadingText}>Loading workouts...</Text>
          </View>
        ) : childWorkouts.length === 0 ? (
          <Text style={styles.emptyText}>No workouts found for this Transformation Path.</Text>
        ) : (
          <View style={styles.workoutList}>
            {childWorkouts.map(workout => {
              const workoutColor = getWorkoutColor(workout.template_name);
              return (
                <View key={workout.id} style={styles.workoutItem}>
                  <View style={styles.workoutInfo}>
                    <View style={[styles.workoutLabel, { backgroundColor: workoutColor.main }]}>
                      <Text style={styles.workoutLabelText}>{workout.template_name}</Text>
                    </View>
                    <View style={styles.statsRow}>
                      <View style={styles.statItem}>
                        <Ionicons name="time-outline" size={14} color={Colors.mutedForeground} />
                        <Text style={styles.statText}>
                          {formatLastCompleted(workout.last_completed_at ? new Date(workout.last_completed_at) : null)}
                        </Text>
                      </View>
                      <View style={[styles.statBadge, { backgroundColor: workoutColor.main + '18' }]}>
                        <Ionicons name="checkmark-circle" size={14} color={workoutColor.main} />
                        <Text style={[styles.statBadgeText, { color: workoutColor.main }]}>
                          {workout.completion_count} {workout.completion_count === 1 ? 'time' : 'times'}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => onEditWorkout(workout.id, workout.template_name)}
                    style={styles.editButton}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="create-outline" size={22} color={Colors.actionPrimary} />
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.sm,
  },
  cardHeader: {
    marginBottom: Spacing.lg,
  },
  cardTitle: {
    ...TextStyles.h4,
    color: Colors.foreground,
  },
  cardSubtitle: {
    ...TextStyles.caption,
    color: Colors.mutedForeground,
    marginTop: Spacing.xs,
  },
  cardContent: {},
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
    gap: Spacing.sm,
  },
  loadingText: {
    ...TextStyles.bodySmall,
    color: Colors.mutedForeground,
  },
  emptyText: {
    ...TextStyles.body,
    color: Colors.mutedForeground,
    textAlign: 'center',
    paddingVertical: Spacing.lg,
  },
  workoutList: {
    gap: Spacing.sm,
  },
  workoutItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm + 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  workoutInfo: {
    flex: 1,
    gap: Spacing.xs + 2,
  },
  workoutLabel: {
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    alignSelf: 'flex-start',
  },
  workoutLabelText: {
    fontFamily: FontFamily.semibold,
    fontSize: 13,
    fontWeight: '600',
    color: Colors.white,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  statText: {
    ...TextStyles.small,
    color: Colors.mutedForeground,
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  statBadgeText: {
    fontFamily: FontFamily.semibold,
    fontSize: 12,
    fontWeight: '600',
  },
  editButton: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginLeft: Spacing.sm,
  },
});
