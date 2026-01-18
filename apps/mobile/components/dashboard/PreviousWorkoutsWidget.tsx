/**
 * PreviousWorkoutsWidget Component
 * Shows last 3 completed workouts with colored borders
 * Reference: MOBILE_SPEC_02_DASHBOARD.md Section 9
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../ui/Card';
import { Colors, Spacing, BorderRadius } from '../../constants/Theme';
import { TextStyles } from '../../constants/Typography';
import { getWorkoutColor } from '../../lib/workout-colors';

interface WorkoutSession {
  id: string;
  sessionId?: string;
  template_name: string;
  completed_at?: string | null;
  exercise_count?: number;
  duration_string?: string | undefined;
  sync_status?: 'local_only' | 'syncing' | 'synced' | 'sync_failed';
  gym_name?: string | null;
}

interface PreviousWorkoutsWidgetProps {
  workouts: WorkoutSession[];
  onViewSummary?: (sessionId: string) => void;
  onDelete?: (sessionId: string, templateName: string) => void;
  onViewAll?: () => void;
  loading?: boolean;
  error?: string;
}

export function PreviousWorkoutsWidget({
  workouts,
  onViewSummary,
  onDelete,
  onViewAll,
  loading,
  error,
}: PreviousWorkoutsWidgetProps) {
  const router = useRouter();

  const formatTimeAgo = (dateString?: string | null): string => {
    if (!dateString) return 'N/A';

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

  const getSyncStatusDisplay = (syncStatus?: string) => {
    switch (syncStatus) {
      case 'syncing':
        return { text: 'Syncing', color: Colors.actionPrimary, icon: 'sync' as const };
      case 'sync_failed':
        return { text: 'Sync Failed', color: Colors.destructive, icon: 'close-circle' as const };
      case 'local_only':
        return { text: 'Local Only', color: Colors.mutedForeground, icon: 'cloud-offline' as const };
      default:
        return null; // Synced - no badge needed
    }
  };

  const handleViewAll = () => {
    if (onViewAll) {
      onViewAll();
    } else {
      router.push('/workout-history');
    }
  };

  const handleDelete = (sessionId: string, templateName: string) => {
    // Delegate confirmation dialog to parent component (dashboard)
    if (onDelete) {
      onDelete(sessionId, templateName);
    }
  };

  if (error) {
    return (
      <Card style={styles.container}>
        <View style={styles.header}>
          <Ionicons name="time" size={20} color={Colors.foreground} />
          <Text style={styles.title}>Previous Workouts</Text>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Error: {error}</Text>
        </View>
      </Card>
    );
  }

  if (workouts.length === 0) {
    return (
      <Card style={styles.container}>
        <View style={styles.header}>
          <Ionicons name="time" size={20} color={Colors.foreground} />
          <Text style={styles.title}>Previous Workouts</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            No previous workouts found. Complete a workout to see it here!
          </Text>
        </View>
      </Card>
    );
  }

  const displayWorkouts = workouts.slice(0, 3);

  return (
    <Card style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="time" size={20} color={Colors.foreground} />
        <Text style={styles.title}>Previous Workouts</Text>
      </View>

      <View style={styles.workoutsList}>
        {displayWorkouts.map((workout) => {
          const colors = getWorkoutColor(workout.template_name);
          const timeAgo = formatTimeAgo(workout.completed_at);
          const syncStatus = getSyncStatusDisplay(workout.sync_status);

          return (
            <View
              key={workout.id}
              style={[
                styles.workoutCard,
                { borderColor: colors.main }
              ]}
            >
              <View style={styles.workoutTop}>
                <View style={styles.workoutLeft}>
                  <View style={styles.workoutHeader}>
                    <Text
                      style={[styles.workoutName, { color: colors.main }]}
                      numberOfLines={1}
                    >
                      {workout.template_name}
                    </Text>
                    {syncStatus && (
                      <View style={[styles.syncBadge, { backgroundColor: syncStatus.color }]}>
                        <Ionicons name={syncStatus.icon} size={10} color={Colors.white} />
                        <Text style={styles.syncBadgeText}>{syncStatus.text}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.timeAgo}>{timeAgo}</Text>
                </View>

                <View style={styles.workoutRight}>
                  {onViewSummary && (
                    <Pressable
                      style={styles.viewButton}
                      onPress={() => onViewSummary(workout.sessionId || workout.id)}
                    >
                      <Ionicons name="eye-outline" size={16} color={Colors.foreground} />
                    </Pressable>
                  )}
                  {onDelete && (
                    <Pressable
                      style={styles.deleteButton}
                      onPress={() => handleDelete(workout.sessionId || workout.id, workout.template_name)}
                    >
                      <Ionicons name="trash-outline" size={16} color={Colors.mutedForeground} />
                    </Pressable>
                  )}
                </View>
              </View>

              <View style={styles.workoutBottom}>
                {workout.exercise_count !== undefined && (
                  <View style={styles.stat}>
                    <Ionicons name="barbell" size={12} color={Colors.mutedForeground} />
                    <Text style={styles.statText}>{workout.exercise_count} Exercises</Text>
                  </View>
                )}
                {workout.duration_string && (
                  <View style={styles.stat}>
                    <Ionicons name="timer-outline" size={12} color={Colors.mutedForeground} />
                    <Text style={styles.statText}>{workout.duration_string}</Text>
                  </View>
                )}
                {workout.gym_name && (
                  <View style={styles.stat}>
                    <Ionicons name="location" size={12} color={Colors.mutedForeground} />
                    <Text style={styles.statText}>{workout.gym_name}</Text>
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </View>

      <Pressable style={styles.viewAllButton} onPress={handleViewAll}>
        <Text style={styles.viewAllText}>View All History</Text>
        <Ionicons name="arrow-forward" size={16} color={Colors.actionPrimary} />
      </Pressable>
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
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  title: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 20,
    fontWeight: '600',
    color: Colors.foreground,
  },
  workoutsList: {
    gap: Spacing.md,
  },
  workoutCard: {
    borderWidth: 2,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.card,
  },
  workoutTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
  },
  workoutLeft: {
    flex: 1,
    gap: 2,
  },
  workoutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  syncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  syncBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.white,
  },
  workoutRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  workoutName: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 20,
  },
  timeAgo: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: Colors.mutedForeground,
    lineHeight: 16,
  },
  viewButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  workoutBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  statText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    color: Colors.mutedForeground,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    marginTop: Spacing.sm,
  },
  viewAllText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    fontWeight: '600',
    color: Colors.actionPrimary,
  },
  errorContainer: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
  errorText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    color: Colors.destructive,
    textAlign: 'center',
  },
  emptyContainer: {
    paddingVertical: Spacing.lg,
  },
  emptyText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    color: Colors.mutedForeground,
    textAlign: 'center',
    lineHeight: 20,
  },
});
