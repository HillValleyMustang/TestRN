import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../../constants/Theme';
import type { WorkoutWithLastCompleted } from '@data/storage/models'; // Assuming this type is available

interface ActiveTPathWorkoutsListProps {
  activeTPathName: string;
  childWorkouts: WorkoutWithLastCompleted[];
  loading: boolean;
  onEditWorkout: (workoutId: string, workoutName: string) => void;
}

// A simplified WorkoutBadge for mobile
const WorkoutBadge = ({ workoutName, children, style }: any) => (
  <View style={[styles.workoutBadge, style]}>
    <Text style={styles.workoutBadgeText}>{children}</Text>
  </View>
);

// Basic formatTimeAgo implementation (can be replaced with a more robust utility if needed)
const formatTimeAgo = (date: Date | null): string => {
  if (!date) return 'Never';
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  let interval = seconds / 31536000; // years
  if (interval > 1) return Math.floor(interval) + " years ago";
  interval = seconds / 2592000; // months
  if (interval > 1) return Math.floor(interval) + " months ago";
  interval = seconds / 86400; // days
  if (interval > 1) return Math.floor(interval) + " days ago";
  interval = seconds / 3600; // hours
  if (interval > 1) return Math.floor(interval) + " hours ago";
  interval = seconds / 60; // minutes
  if (interval > 1) return Math.floor(interval) + " minutes ago";
  return Math.floor(seconds) + " seconds ago";
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
      </View>
      <View style={styles.cardContent}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={Colors.primary} />
            <Text style={styles.textMuted}>Loading workouts...</Text>
          </View>
        ) : childWorkouts.length === 0 ? (
          <Text style={styles.textMuted}>No workouts found for this Transformation Path.</Text>
        ) : (
          <ScrollView style={styles.scrollArea}>
            {childWorkouts.map(workout => (
              <View key={workout.id} style={styles.workoutItem}>
                <View style={styles.workoutInfo}>
                  <WorkoutBadge workoutName={workout.template_name} style={styles.workoutNameBadge}>
                    {workout.template_name}
                  </WorkoutBadge>
                  <View style={styles.lastCompletedContainer}>
                    <Ionicons name="time-outline" size={14} color={Colors.textMuted} />
                    <Text style={styles.lastCompletedText}>
                      Last completed: {formatTimeAgo(workout.last_completed_at ? new Date(workout.last_completed_at) : null)}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => onEditWorkout(workout.id, workout.template_name)}
                  style={styles.editButton}
                >
                  <Ionicons name="create-outline" size={20} color={Colors.actionPrimary} />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardHeader: {
    marginBottom: Spacing.sm,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.foreground,
  },
  cardContent: {
    // Styles for content area
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    gap: Spacing.xs,
  },
  textMuted: {
    color: Colors.textMuted,
    fontSize: 14,
  },
  scrollArea: {
    maxHeight: 300, // Limit height to make it scrollable
    paddingRight: Spacing.sm, // Add some padding for the scrollbar if needed
  },
  workoutItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  workoutInfo: {
    flexDirection: 'column',
    flex: 1,
  },
  workoutBadge: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xxs,
    alignSelf: 'flex-start',
    marginBottom: Spacing.xxs,
  },
  workoutBadgeText: {
    color: Colors.primaryForeground,
    fontSize: 14,
    fontWeight: '500',
  },
  workoutNameBadge: {
    fontSize: 16, // Adjust font size for the badge
    paddingHorizontal: Spacing.sm, // Larger padding for badge
    paddingVertical: Spacing.xs,
  },
  lastCompletedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xxs,
  },
  lastCompletedText: {
    fontSize: 12,
    color: Colors.textMuted,
    marginLeft: Spacing.xxs,
  },
  editButton: {
    padding: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
});
