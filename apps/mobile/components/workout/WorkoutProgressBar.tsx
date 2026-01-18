/**
 * WorkoutProgressBar Component
 * Shows workout progress at the bottom of the screen
 * Reference: apps/web/src/components/workout-flow/workout-progress-bar.tsx
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Dumbbell } from 'lucide-react-native';
import { Colors, Spacing } from '../../constants/Theme';
import { TextStyles } from '../../constants/Typography';
import { getWorkoutColor } from '../../lib/workout-colors';

interface WorkoutProgressBarProps {
  exercisesForSession: any[];
  completedExercises: Set<string>;
  isWorkoutSessionStarted: boolean;
  activeWorkout: any;
}

export const WorkoutProgressBar: React.FC<WorkoutProgressBarProps> = ({
  exercisesForSession,
  completedExercises,
  isWorkoutSessionStarted,
  activeWorkout,
}) => {
  const totalExercises = exercisesForSession.length;
  const completedCount = completedExercises.size;

  const progressPercentage = useMemo(() => {
    if (totalExercises === 0) return 0;
    return (completedCount / totalExercises) * 100;
  }, [completedCount, totalExercises]);

  if (!isWorkoutSessionStarted || totalExercises === 0) {
    return null; // Don't render if workout session hasn't started or no exercises
  }

  const workoutName = activeWorkout?.template_name || 'Ad Hoc Workout';

  // Get workout color using the centralized color system
  const workoutColors = getWorkoutColor(workoutName);
  const progressColor = workoutColors.main;

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Dumbbell size={20} color={Colors.primary} />
        <View style={styles.progressSection}>
          <View style={styles.progressTextRow}>
            <Text style={styles.progressText}>
              Exercise {completedCount} of {totalExercises}
            </Text>
            <Text style={styles.percentageText}>
              {Math.round(progressPercentage)}% Complete
            </Text>
          </View>
          <View style={styles.progressBarContainer}>
            <View
              style={[
                styles.progressBar,
                {
                  width: `${progressPercentage}%`,
                  backgroundColor: progressColor,
                },
              ]}
            />
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  progressSection: {
    flex: 1,
  },
  progressTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  progressText: {
    ...TextStyles.caption,
    color: Colors.mutedForeground,
  },
  percentageText: {
    ...TextStyles.caption,
    color: Colors.primary,
    fontWeight: '600',
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: Colors.muted,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  // Removed safeArea style - using bottom positioning instead
});