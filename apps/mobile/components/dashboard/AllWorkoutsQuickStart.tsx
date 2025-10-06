/**
 * AllWorkoutsQuickStart Component
 * Shows all workouts in the current program as colored pills with play buttons
 * Reference: MOBILE_SPEC_02_DASHBOARD.md Section 7
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../ui/Card';
import { Colors, Spacing, BorderRadius } from '../../constants/Theme';
import { TextStyles } from '../../constants/Typography';
import { getWorkoutColor } from '../../lib/workout-colors';

interface Workout {
  id: string;
  template_name: string;
  last_completed_at?: string | null;
}

interface AllWorkoutsQuickStartProps {
  programName?: string;
  workouts: Workout[];
  loading?: boolean;
  error?: string;
}

export function AllWorkoutsQuickStart({
  programName,
  workouts,
  loading,
  error,
}: AllWorkoutsQuickStartProps) {
  const router = useRouter();

  const getWorkoutIcon = (workoutName: string): keyof typeof Ionicons.glyphMap => {
    const name = workoutName.toLowerCase();
    if (name.includes('upper')) return 'arrow-up';
    if (name.includes('lower')) return 'arrow-down';
    if (name.includes('push')) return 'arrow-up-outline';
    if (name.includes('pull')) return 'arrow-down-outline';
    if (name.includes('leg')) return 'footsteps';
    return 'barbell';
  };

  const formatLastCompleted = (dateString?: string | null): string => {
    if (!dateString) return 'Never';

    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const handlePlayWorkout = (workoutId: string) => {
    router.push(`/workout?workoutId=${workoutId}`);
  };

  return (
    <Card style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="barbell" size={20} color={Colors.foreground} />
        <Text style={styles.title}>All Workouts</Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={Colors.actionPrimary} />
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : workouts.length > 0 ? (
        <>
          {programName && (
            <Text style={styles.programName}>{programName}</Text>
          )}
          <View style={styles.workoutsGrid}>
            {workouts.map((workout) => {
              const colors = getWorkoutColor(workout.template_name);
              const icon = getWorkoutIcon(workout.template_name);
              const lastCompleted = formatLastCompleted(workout.last_completed_at);

              return (
                <View key={workout.id} style={styles.workoutRow}>
                  <View
                    style={[
                      styles.workoutPill,
                      { borderColor: colors.main },
                    ]}
                  >
                    <Ionicons
                      name={icon}
                      size={24}
                      color={colors.main}
                    />
                    <View style={styles.workoutTextContainer}>
                      <Text
                        style={[styles.workoutName, { color: colors.main }]}
                        numberOfLines={1}
                      >
                        {workout.template_name}
                      </Text>
                      <Text
                        style={[styles.lastCompleted, { color: colors.main }]}
                        numberOfLines={1}
                      >
                        {lastCompleted}
                      </Text>
                    </View>
                  </View>

                  <Pressable
                    style={styles.playButton}
                    onPress={() => handlePlayWorkout(workout.id)}
                  >
                    <Ionicons name="play" size={16} color="#FFFFFF" />
                  </Pressable>
                </View>
              );
            })}
          </View>
        </>
      ) : (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>No workouts found</Text>
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.lg,
    minHeight: 120,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.foreground,
  },
  programName: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.foreground,
    marginBottom: Spacing.md,
  },
  workoutsGrid: {
    gap: Spacing.md,
  },
  workoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  workoutPill: {
    flex: 1,
    height: 56,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 2,
    backgroundColor: Colors.muted,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    transform: [{ scale: 0.95 }],
  },
  workoutTextContainer: {
    flex: 1,
    gap: 2,
  },
  workoutName: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 16,
  },
  lastCompleted: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 14,
    opacity: 0.8,
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.actionPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  loadingContainer: {
    minHeight: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContainer: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 14,
    color: Colors.mutedForeground,
    textAlign: 'center',
  },
});
