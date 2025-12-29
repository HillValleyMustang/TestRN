/**
 * NextWorkoutCard Component
 * Shows the user's next scheduled workout with dynamic color button
 * Reference: MOBILE_SPEC_02_DASHBOARD.md Section 6
 */

import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../ui/Card';
import { Colors, Spacing, BorderRadius } from '../../constants/Theme';
import { TextStyles } from '../../constants/Typography';
import { getWorkoutColor } from '../../lib/workout-colors';
import { NextWorkoutInfoModal } from './NextWorkoutInfoModal';
import { HapticPressable } from '../HapticPressable';

interface NextWorkoutCardProps {
  workoutId?: string | undefined;
  workoutName?: string | undefined;
  estimatedDuration?: string;
  lastWorkoutName?: string;
  loading?: boolean;
  error?: string;
  noActiveGym?: boolean;
  noActiveTPath?: boolean;
}

export function NextWorkoutCard({
  workoutId,
  workoutName,
  estimatedDuration,
  lastWorkoutName,
  loading,
  error,
  noActiveGym,
  noActiveTPath,
}: NextWorkoutCardProps) {
  const router = useRouter();
  const [showInfoModal, setShowInfoModal] = useState(false);

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
            <Text style={styles.workoutName} numberOfLines={2}>
              {workoutName}
            </Text>
            {estimatedDuration && (
              <View style={styles.durationRow}>
                <Ionicons name="time-outline" size={16} color={Colors.mutedForeground} />
                <Text style={styles.duration}>Estimated {estimatedDuration}</Text>
              </View>
            )}
            {lastWorkoutName && (
              <Text style={styles.lastWorkout} numberOfLines={1}>
                Last workout: {lastWorkoutName}
              </Text>
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
  workoutName: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 18,
    fontWeight: '600',
    color: Colors.foreground,
    minHeight: 28,
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
  lastWorkout: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: Colors.mutedForeground,
    minHeight: 16,
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
