/**
 * AllWorkoutsQuickStart Component
 * Shows all workouts in the current program as colored pills with play buttons
 * Reference: MOBILE_SPEC_02_DASHBOARD.md Section 7
 * 
 * Uses reactive hooks to fetch data automatically.
 */

import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../ui/Card';
import { Colors, Spacing } from '../../constants/Theme';
import { getWorkoutColor } from '../../lib/workout-colors';
import { useTPaths, useUserProfile, useRecentWorkouts } from '../../hooks/data';
import { useAuth } from '../../app/_contexts/auth-context';
import { createTaggedLogger } from '../../lib/logger';

const log = createTaggedLogger('AllWorkoutsQuickStart');

interface Workout {
  id: string;
  template_name: string;
  last_completed_at?: string | null;
}

export function AllWorkoutsQuickStart() {
  const router = useRouter();
  
  // Get userId for reactive hooks
  const { userId } = useAuth();
  
  // Reactive data hooks
  const { data: profileData, loading: profileLoading, error: profileError } = useUserProfile(userId);
  
  const activeTPathId = profileData?.active_t_path_id || null;
  
  const { 
    activeTPath, 
    tPathWorkouts: hookTPathWorkouts, 
    loading: tPathsLoading, 
    error: tPathsError 
  } = useTPaths(userId, activeTPathId, { enabled: !!activeTPathId });

  // Fetch recent workouts to find last completion dates
  const { data: recentWorkouts, loading: recentLoading } = useRecentWorkouts(userId, 50);
  
  // Transform hook data to Workout format
  const workouts = useMemo((): Workout[] => {
    if (!hookTPathWorkouts) return [];
    
    // Deduplicate by template_name to show only unique workout templates
    const uniqueWorkouts = new Map<string, Workout>();
    hookTPathWorkouts.forEach(workout => {
      const normalizedName = workout.template_name.trim().toLowerCase();
      if (!uniqueWorkouts.has(normalizedName)) {
        // Find last completion date for this template from recent workouts
        const lastSession = recentWorkouts?.find(r => 
          r.template_name?.trim().toLowerCase() === normalizedName
        );
        
        uniqueWorkouts.set(normalizedName, {
          id: workout.id,
          template_name: workout.template_name,
          last_completed_at: lastSession?.completed_at || null,
        });
      }
    });
    
    return Array.from(uniqueWorkouts.values());
  }, [hookTPathWorkouts, recentWorkouts]);
  
  const programName = activeTPath?.template_name;
  const loading = profileLoading || tPathsLoading || recentLoading;
  const error = profileError?.message || tPathsError?.message;
  
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

  if (error) {
    return (
      <Card style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </Card>
    );
  }

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
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  title: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 20,
    fontWeight: '600',
    color: Colors.foreground,
  },
  programName: {
    fontFamily: 'Poppins_600SemiBold',
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
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 16,
  },
  lastCompleted: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 14,
    opacity: 0.8,
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#000000',
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
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    color: Colors.mutedForeground,
    textAlign: 'center',
  },
});
