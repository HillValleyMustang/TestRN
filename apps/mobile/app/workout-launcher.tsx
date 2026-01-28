/**
 * Workout Launcher Screen
 * Allows users to select from T-Path workouts or start an ad-hoc workout
 * Reference: apps/web/src/app/(app)/workout/page.tsx
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from './_contexts/auth-context';
import { useData } from './_contexts/data-context';
import { ScreenHeader } from '../components/layout/ScreenHeader';
import { ScreenContainer } from '../components/layout/ScreenContainer';
import { ColoredWorkoutButton } from '../components/workout-launcher';
import { Card } from '../components/ui/Card';
import { Colors, Spacing, BorderRadius } from '../constants/Theme';
import { TextStyles } from '../constants/Typography';
import { AdHocGeneratorDialog } from '../components/workout-flow/AdHocGeneratorDialog';

export default function WorkoutLauncherScreen() {
  const router = useRouter();
  const { userId } = useAuth();
  const { getTPaths, getTPath, getTPathsByParent } = useData();

  const [activeTPath, setActiveTPath] = useState<any | null>(null);
  const [childWorkouts, setChildWorkouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdHocGeneratorOpen, setIsAdHocGeneratorOpen] = useState(false);

  useEffect(() => {
    loadActiveTPath();
  }, [userId]);

  const loadActiveTPath = async () => {
    if (!userId) return;

    try {
      setLoading(true);

      const tPaths = await getTPaths(userId, true);
      if (tPaths && tPaths.length > 0) {
        const fullTPath = await getTPath(tPaths[0].id);
        if (fullTPath) {
          setActiveTPath(fullTPath);
          
          // Load actual child workouts from database
          const childWorkoutsData = await getTPathsByParent(fullTPath.id);
          console.log('[WorkoutLauncher] Loaded child workouts:', childWorkoutsData);
          setChildWorkouts(childWorkoutsData);
        }
      }
    } catch (error) {
      console.error('Error loading T-Path:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleWorkoutPress = (childWorkoutId: string) => {
    router.push({
      pathname: '/(tabs)/workout',
      params: { tPathId: childWorkoutId },
    });
  };

  const handleStartEmpty = () => {
    router.push('/(tabs)/workout');
  };

  const handleGenerate = () => {
    setIsAdHocGeneratorOpen(true);
  };

  const handleWorkoutGenerated = (exercises: any[]) => {
    // Navigate to workout screen with generated exercises
    router.push({
      pathname: '/(tabs)/workout',
      params: { 
        tPathId: 'ad-hoc',
        generatedExercises: JSON.stringify(exercises)
      },
    });
  };

  const getWorkoutsList = () => {
    if (!activeTPath || childWorkouts.length === 0) return [];

    // Return actual child workouts from database instead of fake hardcoded ones
    return childWorkouts.map(workout => ({
      name: workout.template_name,
      id: workout.id,
      last_completed_at: null, // TODO: Could be enhanced to show actual completion history
    }));
  };

  const workouts = getWorkoutsList();

  return (
    <>
      <ScreenHeader
        title="Workout Session"
        subtitle="Select a workout or start an ad-hoc session."
      />
      <ScreenContainer>
        {activeTPath && (
          <View style={styles.tPathSection}>
            <View style={styles.tPathHeader}>
              <Ionicons name="barbell" size={20} color={Colors.foreground} />
              <Text style={styles.tPathTitle}>{activeTPath.template_name}</Text>
            </View>

            <View style={styles.workoutsList}>
              {workouts.map(workout => (
                <ColoredWorkoutButton
                  key={workout.name}
                  workoutName={workout.name}
                  lastCompleted={null}
                  onPress={() => handleWorkoutPress(workout.id)}
                />
              ))}
            </View>
          </View>
        )}

        <Card style={styles.adHocCard}>
          <View style={styles.adHocHeader}>
            <View style={styles.adHocTitleContainer}>
              <Ionicons
                name="add-circle-outline"
                size={24}
                color={Colors.foreground}
              />
              <Text style={styles.adHocTitle}>Start Ad-Hoc Workout</Text>
            </View>
            <Text style={styles.adHocSubtitle}>
              Start a workout without a T-Path. Add exercises as you go.
            </Text>
          </View>

          <View style={styles.adHocButtons}>
            <Pressable style={styles.emptyButton} onPress={handleStartEmpty}>
              <Text style={styles.emptyButtonText}>Start Empty</Text>
            </Pressable>

            <Pressable style={styles.generateButton} onPress={handleGenerate}>
              <Ionicons name="sparkles" size={20} color="white" />
              <Text style={styles.generateButtonText}>Generate</Text>
            </Pressable>
          </View>
        </Card>
      </ScreenContainer>

      <AdHocGeneratorDialog
        visible={isAdHocGeneratorOpen}
        onClose={() => setIsAdHocGeneratorOpen(false)}
        onWorkoutGenerated={handleWorkoutGenerated}
        activeGymName={activeTPath?.gym_name || null}
      />
    </>
  );
}

const styles = StyleSheet.create({
  tPathSection: {
    marginBottom: Spacing['2xl'],
  },
  tPathHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  tPathTitle: {
    ...TextStyles.h3,
    color: Colors.foreground,
  },
  workoutsList: {
    gap: Spacing.md,
  },
  adHocCard: {
    padding: Spacing.lg,
  },
  adHocHeader: {
    marginBottom: Spacing.lg,
  },
  adHocTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  adHocTitle: {
    ...TextStyles.h4,
    color: Colors.foreground,
  },
  adHocSubtitle: {
    ...TextStyles.body,
    color: Colors.mutedForeground,
    marginLeft: 32,
  },
  adHocButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  emptyButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyButtonText: {
    ...TextStyles.body,
    color: Colors.foreground,
    fontWeight: '500',
  },
  generateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary,
  },
  generateButtonText: {
    ...TextStyles.body,
    color: Colors.primaryForeground,
    fontWeight: '600',
  },
});
