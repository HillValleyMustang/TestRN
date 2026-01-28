/**
 * NextWorkoutCard Component
 * Shows the user's next scheduled workout with dynamic color button
 * Reference: MOBILE_SPEC_02_DASHBOARD.md Section 6
 * 
 * Uses reactive hooks to fetch data automatically.
 */

import React, { useState, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../ui/Card';
import { Colors, Spacing, BorderRadius } from '../../constants/Theme';
import { getWorkoutColor } from '../../lib/workout-colors';
import { NextWorkoutInfoModal } from './NextWorkoutInfoModal';
import { HapticPressable } from '../HapticPressable';
import { useNextWorkout, useUserProfile, useGyms } from '../../hooks/data';
import { useAuth } from '../../app/_contexts/auth-context';
import { createTaggedLogger } from '../../lib/logger';

const log = createTaggedLogger('NextWorkoutCard');

export function NextWorkoutCard() {
  const router = useRouter();
  const [showInfoModal, setShowInfoModal] = useState(false);
  
  // Get userId for reactive hooks
  const { userId } = useAuth();
  
  // Reactive data hooks
  const { data: profileData, loading: profileLoading, error: profileError } = useUserProfile(userId);
  
  const { activeGym, loading: gymsLoading, error: gymsError } = useGyms(userId);
  
  const activeTPathId = profileData?.active_t_path_id || null;
  const programmeType = profileData?.programme_type || 'ppl';
  
  const { data: nextWorkoutData, loading: nextWorkoutLoading, error: nextWorkoutError } = useNextWorkout(
    userId,
    activeTPathId,
    programmeType,
    { enabled: !!activeTPathId }
  );
  
  const workoutId = nextWorkoutData?.id;
  const workoutName = nextWorkoutData?.template_name;
  const estimatedDuration = profileData?.preferred_session_length || '45 minutes';
  const recommendationReason = nextWorkoutData?.recommendationReason;
  
  const loading = profileLoading || gymsLoading || nextWorkoutLoading;
  const error = profileError?.message || gymsError?.message || nextWorkoutError?.message;
  
  const noActiveGym = !activeGym && !gymsLoading;
  const noActiveTPath = !activeTPathId && !profileLoading;

  const handleStartWorkout = () => {
    if (workoutId) {
      router.push(`/workout?workoutId=${workoutId}`);
    }
  };

  const renderError = () => {
    if (noActiveGym) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            No active gym selected. Please set one in your profile.
          </Text>
          <Pressable
            style={styles.errorButton}
            onPress={() => router.push('/profile')}
          >
            <Text style={styles.errorButtonText}>Go to Profile Settings</Text>
          </Pressable>
        </View>
      );
    }

    if (noActiveTPath) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            No active Transformation Path found or no workouts defined for your current session length. 
            Complete onboarding or set one in your profile to get started.
          </Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: Colors.destructive }]}>
            Error loading next workout: {error}
          </Text>
        </View>
      );
    }

    return null;
  };

  const colors = workoutName ? getWorkoutColor(workoutName) : { main: Colors.actionPrimary, light: Colors.actionPrimary };

  return (
    <Card style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="barbell" size={20} color={Colors.foreground} />
        <Text style={styles.title}>Your Next Workout</Text>
        <HapticPressable
          onPress={() => setShowInfoModal(true)}
          style={styles.infoButton}
          hitSlop={10}
        >
          <Ionicons name="information-circle-outline" size={20} color={Colors.mutedForeground} />
        </HapticPressable>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={Colors.actionPrimary} />
        </View>
      ) : error || noActiveGym || noActiveTPath ? (
        renderError()
      ) : workoutName ? (
        <View style={styles.content}>
          <View style={styles.leftSection}>
            <View style={styles.workoutNameContainer}>
              <View
                style={[styles.workoutNameBadge, { backgroundColor: colors.main }]}
                accessible={true}
                accessibilityLabel={`Next workout: ${workoutName}`}
              >
                <Text style={styles.workoutNameBadgeText} numberOfLines={2}>
                  {workoutName}
                </Text>
              </View>
              {/* {recommendationReason === 'weekly_completion' && (
                <View style={styles.weeklyCompletionBadge}>
                  <Ionicons name="checkmark-circle" size={12} color={Colors.success} />
                  <Text style={styles.weeklyCompletionText}>Complete week</Text>
                </View>
              )} */}
            </View>
            {estimatedDuration && (
              <View style={styles.durationRow}>
                <Ionicons name="time-outline" size={16} color={Colors.mutedForeground} />
                <Text style={styles.duration}>Estimated {estimatedDuration}</Text>
              </View>
            )}
          </View>

          <Pressable
            style={[styles.startButton, { backgroundColor: colors.main }]}
            onPress={handleStartWorkout}
          >
            <Text style={styles.startButtonText}>Start Workout</Text>
          </Pressable>
        </View>
      ) : null}

      <NextWorkoutInfoModal
        visible={showInfoModal}
        onClose={() => setShowInfoModal(false)}
      />
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
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  infoButton: {
    padding: Spacing.xs,
  },
  title: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 20,
    fontWeight: '600',
    color: Colors.foreground,
  },
  content: {
    flexDirection: 'column',
    gap: Spacing.md,
  },
  leftSection: {
    gap: Spacing.xs,
  },
  workoutNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    minHeight: 28,
  },
  workoutNameBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    alignSelf: 'flex-start',
  },
  workoutNameBadgeText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  weeklyCompletionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(142, 195, 125, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(142, 195, 125, 0.3)',
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    gap: 2,
  },
  weeklyCompletionText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 10,
    color: Colors.success,
    fontWeight: '500',
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    minHeight: 20,
  },
  duration: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    color: Colors.mutedForeground,
  },
  startButton: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startButtonText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  loadingContainer: {
    minHeight: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContainer: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.md,
  },
  errorText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    color: Colors.mutedForeground,
    textAlign: 'center',
    lineHeight: 20,
  },
  errorButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.actionPrimary,
    borderRadius: BorderRadius.md,
  },
  errorButtonText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
