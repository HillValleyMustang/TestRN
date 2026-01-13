import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from './_contexts/auth-context';
import { useGym } from './_contexts/gym-context';
import { useData } from './_contexts/data-context';
import Toast from 'react-native-toast-message';
import { Colors, Spacing, BorderRadius } from '../constants/Theme';
import { TPath, DashboardProfile, Gym, WorkoutWithLastCompleted } from '@data/storage/models'; // Assuming these types are available

// Import actual components
import { SetupGymPlanPrompt } from '../components/manage-t-paths/SetupGymPlanPrompt';
import { ActiveTPathWorkoutsList } from '../components/manage-t-paths/ActiveTPathWorkoutsList';
import { EditWorkoutExercisesModal } from '../components/manage-t-paths/EditWorkoutExercisesModal';

interface GroupedTPath {
  mainTPath: TPath;
  childWorkouts: WorkoutWithLastCompleted[];
}

export default function ManageTPathsScreen() {
  const { userId } = useAuth();
  const router = useRouter();
  const { userGyms, activeGym, switchActiveGym, loadingGyms, profile } = useGym();
  const { getTPathsByParent, getTPath, supabase } = useData(); // Destructure supabase from useData

  const [groupedTPaths, setGroupedTPaths] = useState<GroupedTPath[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [isEditWorkoutDialogOpen, setIsEditWorkoutDialogOpen] = useState(false);
  const [selectedWorkoutToEdit, setSelectedWorkoutToEdit] = useState<{ id: string; name: string } | null>(null);

  const refreshAllData = useCallback(async () => {
    if (!userId || !activeGym) {
      setGroupedTPaths([]);
      setLoadingData(false);
      return;
    }

    setLoadingData(true);
    try {
      // Get the active T-Path ID from the user's profile
      const activeTPathId = profile?.active_t_path_id;

      if (!activeTPathId) {
        console.log('[ManageTPaths] No active T-Path ID found in profile');
        setGroupedTPaths([]);
        setLoadingData(false);
        return;
      }

      // Fetch the main TPath using the active T-Path ID
      const mainTPaths = await getTPath(activeTPathId);

      // Fetch child workouts for the main TPath
      const childWorkoutsData = mainTPaths ? await getTPathsByParent(mainTPaths.id) : [];

      // Fetch last completed dates for each child workout
      const workoutIds = childWorkoutsData.map(workout => workout.id);
      const { data: lastCompletedSessions, error: sessionsError } = await supabase
        .from('workout_sessions')
        .select('t_path_id, completed_at')
        .in('t_path_id', workoutIds)
        .eq('user_id', userId)
        .order('completed_at', { ascending: false });

      if (sessionsError) {
        console.error('Error fetching last completed sessions:', sessionsError);
        Toast.show({
          type: 'error',
          text1: 'Failed to load workout completion data.',
        });
      }

      const lastCompletedMap = new Map<string, string>();
      if (lastCompletedSessions) {
        // Since it's ordered by completed_at descending, the first one for each t_path_id is the latest
        for (const session of lastCompletedSessions) {
          if (session.t_path_id && session.completed_at && !lastCompletedMap.has(session.t_path_id)) {
            lastCompletedMap.set(session.t_path_id, session.completed_at);
          }
        }
      }

      const workoutsWithLastCompleted: WorkoutWithLastCompleted[] = childWorkoutsData.map(workout => ({
        ...workout,
        last_completed_at: lastCompletedMap.get(workout.id) || null,
        template_name: workout.template_name || 'Unnamed Workout',
      }));

      if (mainTPaths) {
        setGroupedTPaths([{ mainTPath: { ...mainTPaths, gym_id: activeGym.id }, childWorkouts: workoutsWithLastCompleted }]);
      } else {
        setGroupedTPaths([]);
      }
    } catch (error) {
      console.error('Error loading T-Path data:', error);
      Toast.show({
        type: 'error',
        text1: 'Failed to load workout plans.',
      });
    } finally {
      setLoadingData(false);
    }
  }, [userId, activeGym, profile, getTPathsByParent, getTPath, supabase]); // Add profile to dependencies

  useEffect(() => {
    refreshAllData();
  }, [activeGym, profile, refreshAllData]); // Refresh when activeGym or profile changes

  const activeTPathGroup = useMemo(() => {
    if (!activeGym || groupedTPaths.length === 0) return null;
    return groupedTPaths.find(group => group.mainTPath.gym_id === activeGym.id) || null;
  }, [activeGym, groupedTPaths]);

  const isGymConfigured = !!activeTPathGroup;

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

  const handleGymSelectChange = async (gymId: string) => {
    if (gymId !== activeGym?.id) {
      await switchActiveGym(gymId);
    }
  };

  if (loadingData || loadingGyms) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Loading...</Text>
        {/* Add a skeleton loader here later if needed */}
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Manage Your T-Path</Text>
        {activeGym ? (
          <Text style={styles.subtitle}>
            Configure the workouts for your active gym: <Text style={styles.activeGymName}>{activeGym.name}</Text>
          </Text>
        ) : (
          <Text style={styles.subtitle}>No active gym selected.</Text>
        )}

        {userGyms.length > 1 && (
          <View style={styles.pickerContainer}>
            {/* Placeholder for Gym Selector - can be replaced with a proper Picker or Modal */}
            <Text style={styles.pickerLabel}>Select Gym:</Text>
            <View style={styles.picker}>
              <TouchableOpacity onPress={() => console.log('Open gym selector')}>
                <Text style={styles.pickerText}>{activeGym?.name || 'Select a gym'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {!activeGym ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>No Active Gym</Text>
          <Text style={styles.textMuted}>Please add a gym in your profile settings to begin.</Text>
          <TouchableOpacity onPress={() => router.push('/profile')} style={styles.button}>
            <Text style={styles.buttonText}>Go to Profile Settings</Text>
          </TouchableOpacity>
        </View>
      ) : !isGymConfigured ? (
        <SetupGymPlanPrompt gym={activeGym} onSetupSuccess={refreshAllData} profile={profile} setTempStatusMessage={(message: any) => Toast.show({ type: 'info', text1: message.message })} />
      ) : (
        <ActiveTPathWorkoutsList
          activeTPathName={activeTPathGroup.mainTPath.template_name}
          childWorkouts={activeTPathGroup.childWorkouts}
          loading={loadingData}
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
          setTempStatusMessage={(message: any) => Toast.show({ type: 'info', text1: message.message })} // Placeholder for temp status messages
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: Spacing.md,
  },
  header: {
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.foreground,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textMuted,
  },
  activeGymName: {
    fontWeight: '600',
    color: Colors.primary,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.foreground,
    marginBottom: Spacing.sm,
  },
  textMuted: {
    color: Colors.textMuted,
    fontSize: 14,
    marginBottom: Spacing.md,
  },
  button: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  buttonText: {
    color: Colors.primaryForeground,
    fontSize: 16,
    fontWeight: '600',
  },
  buttonSecondary: {
    backgroundColor: Colors.secondary,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  buttonSecondaryText: {
    color: Colors.secondaryForeground,
    fontSize: 16,
    fontWeight: '600',
  },
  pickerContainer: {
    marginTop: Spacing.md,
  },
  pickerLabel: {
    fontSize: 14,
    color: Colors.textMuted,
    marginBottom: Spacing.xs,
  },
  picker: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
  },
  pickerText: {
    color: Colors.foreground,
    fontSize: 16,
  },
  workoutItem: {
    backgroundColor: Colors.cardBackground,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  workoutName: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.foreground,
  },
  editButton: {
    backgroundColor: Colors.actionPrimary,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.sm,
    alignSelf: 'flex-end',
    marginTop: Spacing.xs,
  },
  editButtonText: {
    color: Colors.actionPrimaryForeground,
    fontSize: 12,
  },
});
