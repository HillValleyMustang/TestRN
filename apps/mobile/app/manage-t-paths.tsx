import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from './_contexts/auth-context';
import { useGym } from './_contexts/gym-context';
import { useData } from './_contexts/data-context';
import { useTPathCompletionStats } from '../hooks/data';
import Toast from 'react-native-toast-message';
import { Colors, Spacing, BorderRadius } from '../constants/Theme';
import { FontFamily, TextStyles } from '../constants/Typography';
import type { TPath, Gym } from '@data/storage/models';
import type { WorkoutWithStats } from '../types/workout';

// Import actual components
import { SetupGymPlanPrompt } from '../components/manage-t-paths/SetupGymPlanPrompt';
import { ActiveTPathWorkoutsList } from '../components/manage-t-paths/ActiveTPathWorkoutsList';
import { EditWorkoutExercisesModal } from '../components/manage-t-paths/EditWorkoutExercisesModal';
import { GymToggle } from '../components/dashboard/GymToggle';

export default function ManageTPathsScreen() {
  const { userId } = useAuth();
  const router = useRouter();
  const { userGyms, activeGym, switchActiveGym, loadingGyms, profile } = useGym();
  const { getTPathsByParent, getTPath, supabase } = useData();

  const [mainTPath, setMainTPath] = useState<TPath | null>(null);
  const [childWorkouts, setChildWorkouts] = useState<TPath[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [isEditWorkoutDialogOpen, setIsEditWorkoutDialogOpen] = useState(false);
  const [selectedWorkoutToEdit, setSelectedWorkoutToEdit] = useState<{ id: string; name: string } | null>(null);

  // Derive IDs and template name map from childWorkouts for the stats hook
  const workoutIds = useMemo(() => childWorkouts.map(w => w.id), [childWorkouts]);
  const templateNameMap = useMemo(() => {
    const map = new Map<string, string>();
    childWorkouts.forEach(w => map.set(w.id, w.template_name));
    return map;
  }, [childWorkouts]);

  // Fetch completion stats for all child workouts (with template_name fallback)
  const { stats: completionStats, loading: loadingStats } = useTPathCompletionStats(
    userId,
    workoutIds,
    { enabled: workoutIds.length > 0 },
    templateNameMap
  );

  // Merge stats at render time — never stored in state, so gym switches can't wipe them
  const childWorkoutsWithStats: WorkoutWithStats[] = useMemo(() => {
    return childWorkouts.map(workout => {
      const stats = completionStats.get(workout.id);
      return {
        ...workout,
        last_completed_at: stats?.lastCompletedAt || null,
        completion_count: stats?.completionCount || 0,
      };
    });
  }, [childWorkouts, completionStats]);

  const refreshAllData = useCallback(async () => {
    if (!userId || !activeGym) {
      setMainTPath(null);
      setChildWorkouts([]);
      setLoadingData(false);
      return;
    }

    setLoadingData(true);
    try {
      const activeTPathId = profile?.active_t_path_id;

      if (!activeTPathId) {
        console.log('[ManageTPaths] No active T-Path ID found in profile');
        setMainTPath(null);
        setChildWorkouts([]);
        setLoadingData(false);
        return;
      }

      const fetchedMainTPath = await getTPath(activeTPathId);
      const allChildWorkouts = fetchedMainTPath ? await getTPathsByParent(fetchedMainTPath.id) : [];

      // Filter to only workouts for the active gym (matching workout page behavior)
      const gymFilteredWorkouts = activeGym
        ? allChildWorkouts.filter(w => (w as any).gym_id === activeGym.id)
        : allChildWorkouts;

      // Deduplicate by template_name to only show unique workout templates
      const uniqueWorkoutsMap = new Map<string, TPath>();
      gymFilteredWorkouts.forEach(workout => {
        const normalizedName = workout.template_name.trim().toLowerCase();
        if (!uniqueWorkoutsMap.has(normalizedName)) {
          uniqueWorkoutsMap.set(normalizedName, workout);
        }
      });

      setMainTPath(fetchedMainTPath);
      setChildWorkouts(Array.from(uniqueWorkoutsMap.values()));
    } catch (error) {
      console.error('Error loading T-Path data:', error);
      Toast.show({
        type: 'error',
        text1: 'Failed to load workout plans.',
      });
    } finally {
      setLoadingData(false);
    }
  }, [userId, activeGym, profile, getTPathsByParent, getTPath, supabase]);

  useEffect(() => {
    refreshAllData();
  }, [activeGym, profile, refreshAllData]);

  const isGymConfigured = !!mainTPath && childWorkouts.length > 0;

  const handleEditWorkout = (workoutId: string, workoutName: string) => {
    setSelectedWorkoutToEdit({ id: workoutId, name: workoutName });
    setIsEditWorkoutDialogOpen(true);
  };

  const handleSaveSuccess = () => {
    refreshAllData();
    setIsEditWorkoutDialogOpen(false);
    Toast.show({
      type: 'success',
      text1: 'Workout saved successfully!',
    });
  };

  const handleGymChange = async (gymId: string, newActiveGym: Gym | null) => {
    if (gymId !== activeGym?.id) {
      await switchActiveGym(gymId);
    }
  };

  if (loadingData || loadingGyms) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={Colors.actionPrimary} />
        <Text style={styles.loadingText}>Loading your T-Path...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <Text style={styles.title}>Manage Your T-Path</Text>
        {activeGym ? (
          <Text style={styles.subtitle}>
            Configure the workouts for your active gym:{' '}
            <Text style={styles.activeGymName}>{activeGym.name}</Text>
          </Text>
        ) : (
          <Text style={styles.subtitle}>No active gym selected.</Text>
        )}

        {userGyms.length > 1 && (
          <View style={styles.gymToggleContainer}>
            <GymToggle
              gyms={userGyms}
              activeGym={activeGym}
              onGymChange={handleGymChange}
            />
          </View>
        )}
      </View>

      {!activeGym ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>No Active Gym</Text>
          <Text style={styles.cardDescription}>Please add a gym in your profile settings to begin.</Text>
          <TouchableOpacity onPress={() => router.push('/profile')} style={styles.button}>
            <Text style={styles.buttonText}>Go to Profile Settings</Text>
          </TouchableOpacity>
        </View>
      ) : !isGymConfigured ? (
        <SetupGymPlanPrompt gym={activeGym} onSetupSuccess={refreshAllData} profile={profile} setTempStatusMessage={(message: any) => Toast.show({ type: 'info', text1: message.message })} />
      ) : (
        <ActiveTPathWorkoutsList
          activeTPathName={mainTPath.template_name}
          childWorkouts={childWorkoutsWithStats}
          loading={loadingData || loadingStats}
          onEditWorkout={handleEditWorkout}
        />
      )}

      {selectedWorkoutToEdit && (
        <EditWorkoutExercisesModal
          open={isEditWorkoutDialogOpen}
          onOpenChange={setIsEditWorkoutDialogOpen}
          workoutId={selectedWorkoutToEdit.id}
          workoutName={selectedWorkoutToEdit.name}
          onSaveSuccess={handleSaveSuccess}
          setTempStatusMessage={(message: any) => Toast.show({ type: 'info', text1: message.message })}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
  },
  scrollContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  loadingText: {
    ...TextStyles.bodySmall,
    color: Colors.mutedForeground,
  },
  header: {
    marginBottom: Spacing.xl,
  },
  title: {
    ...TextStyles.h2,
    color: Colors.foreground,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    ...TextStyles.body,
    color: Colors.mutedForeground,
  },
  activeGymName: {
    fontFamily: FontFamily.semibold,
    fontWeight: '600',
    color: Colors.actionPrimary,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardTitle: {
    ...TextStyles.h4,
    color: Colors.foreground,
    marginBottom: Spacing.sm,
  },
  cardDescription: {
    ...TextStyles.body,
    color: Colors.mutedForeground,
    marginBottom: Spacing.lg,
  },
  button: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.sm + 4,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  buttonText: {
    ...TextStyles.button,
    color: Colors.primaryForeground,
  },
  gymToggleContainer: {
    marginTop: Spacing.lg,
    alignItems: 'center',
  },
});
