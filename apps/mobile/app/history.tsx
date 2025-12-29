import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useAuth } from './_contexts/auth-context';
import { useData } from './_contexts/data-context';
import { database } from './_lib/database';
import { supabase } from './_lib/supabase';
import { useRouter } from 'expo-router';
import type { WorkoutSession } from '@data/storage/models';
import { formatTimeAgo } from '@data/utils/workout-helpers';
import { getExerciseById } from '@data/exercises';
import { WorkoutSummaryModal } from '../components/workout/WorkoutSummaryModal';

export default function HistoryScreen() {
  const { userId } = useAuth();
  const { getWorkoutSessions, getSetLogs } = useData();
  const router = useRouter();
  const [workouts, setWorkouts] = useState<WorkoutSession[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Workout summary modal state
  const [workoutSummaryModalVisible, setWorkoutSummaryModalVisible] = useState(false);
  const [selectedSessionData, setSelectedSessionData] = useState<{
    exercises: any[];
    workoutName: string;
    startTime: Date;
    rating?: number;
    historicalWorkout?: any;
    weeklyVolumeData?: any;
    nextWorkoutSuggestion?: any;
    isOnTPath?: boolean;
  } | null>(null);

  const loadWorkouts = useCallback(async () => {
    if (!userId) {
      return;
    }
    try {
      const sessions = await getWorkoutSessions(userId);
      setWorkouts(sessions);
    } catch (error) {
      console.error('Failed to load workouts:', error);
    }
  }, [getWorkoutSessions, userId]);

  useEffect(() => {
    loadWorkouts();
  }, [loadWorkouts]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadWorkouts();
    setRefreshing(false);
  };

  const handleViewSummary = useCallback(
    async (sessionId: string) => {
      if (!userId) return;

      try {
        // Load session data
        const allSessions = await getWorkoutSessions(userId);
        const foundSession = allSessions.find(s => s.id === sessionId);

        console.log('[History] All sessions loaded:', allSessions.length);
        console.log('[History] Found session data:', foundSession);
        console.log('[History] Found session rating:', foundSession?.rating);
        console.log('[History] Found session id:', foundSession?.id);
        console.log('[History] Found session template_name:', foundSession?.template_name);

        if (foundSession) {
          // Load set logs
          const setLogs = await getSetLogs(sessionId);

          // Load exercise definitions from Supabase to get proper names
          let exerciseDefinitions: any[] = [];
          try {
            const { data, error } = await supabase
              .from('exercise_definitions')
              .select('id, name, category, icon_url')
              .or(`user_id.eq.${userId},user_id.is.null`); // Get user's exercises + global exercises

            if (error) {
              console.error('[History] Failed to load exercise definitions from Supabase:', error);
            } else {
              exerciseDefinitions = data || [];
              console.log('[History] Loaded exercise definitions from Supabase:', exerciseDefinitions.length);
            }
          } catch (error) {
            console.error('[History] Failed to load exercise definitions:', error);
          }
          const exerciseLookup = new Map();
          exerciseDefinitions.forEach((ex: any) => {
            exerciseLookup.set(ex.id, ex);
          });

          // Helper function to map exercise names to muscle groups
          const getMuscleGroupFromExercise = (ex: any, staticEx: any): string => {
            const name = (ex?.name || staticEx?.name || '').toLowerCase();
            
            // Chest exercises
            if (name.includes('bench') || name.includes('press') || name.includes('fly') ||
                name.includes('push up') || name.includes('dip') || name.includes('pec')) {
              return 'Chest';
            }
            
            // Back exercises
            if (name.includes('row') || name.includes('pull') || name.includes('lat') ||
                name.includes('deadlift') || name.includes('shrug') || name.includes('face pull')) {
              return 'Back';
            }
            
            // Legs exercises
            if (name.includes('squat') || name.includes('lunge') || name.includes('leg') ||
                name.includes('deadlift') || name.includes('hip') || name.includes('calf')) {
              return 'Legs';
            }
            
            // Shoulders exercises
            if (name.includes('shoulder') || name.includes('overhead') || name.includes('raise') ||
                name.includes('arnold') || name.includes('upright')) {
              return 'Shoulders';
            }
            
            // Arms exercises
            if (name.includes('curl') || name.includes('extension') || name.includes('tricep') ||
                name.includes('bicep') || name.includes('hammer')) {
              return 'Arms';
            }
            
            // Core exercises
            if (name.includes('crunch') || name.includes('plank') || name.includes('sit') ||
                name.includes('leg raise') || name.includes('Russian twist')) {
              return 'Core';
            }
            
            // Default to Unknown if we can't determine
            return 'Unknown';
          };

          // Transform data to modal format
          const exerciseMap = new Map();
          setLogs.forEach((set: any) => {
            // Try database exercise first, then fallback to static exercises
            const dbExercise = exerciseLookup.get(set.exercise_id);
            const staticExercise = getExerciseById(set.exercise_id);
            const exercise = dbExercise || staticExercise;
            const exerciseName = exercise?.name || `Exercise ${set.exercise_id?.slice(-4) || `Ex`} `;

            if (!exerciseMap.has(set.exercise_id)) {
              exerciseMap.set(set.exercise_id, {
                exerciseId: set.exercise_id,
                exerciseName,
                muscleGroup: getMuscleGroupFromExercise(exercise, staticExercise),
                iconUrl: exercise?.icon_url,
                sets: [],
              });
            }

            const exerciseData = exerciseMap.get(set.exercise_id);
            exerciseData.sets.push({
              weight: set.weight_kg?.toString() || '0',
              reps: set.reps?.toString() || '0',
              isCompleted: true, // Assume completed since it's saved
              isPR: set.is_pb || false,
            });
          });

          const exercises = Array.from(exerciseMap.values());
          const startTime = new Date(foundSession.session_date);

          // Get previous workout for comparison
          const previousSession = allSessions
            .filter(s => s.id !== sessionId && s.template_name === foundSession.template_name)
            .sort((a, b) => new Date(b.session_date).getTime() - new Date(a.session_date).getTime())[0];

          let historicalWorkout = null;
          if (previousSession) {
            const prevSetLogs = await getSetLogs(previousSession.id);
            const prevExerciseMap = new Map();
            prevSetLogs.forEach((set: any) => {
              const dbExercise = exerciseLookup.get(set.exercise_id);
              const staticExercise = getExerciseById(set.exercise_id);
              const exercise = dbExercise || staticExercise;
              const exerciseName = exercise?.name || `Exercise ${set.exercise_id?.slice(-4) || `Ex`}`;

              if (!prevExerciseMap.has(set.exercise_id)) {
                prevExerciseMap.set(set.exercise_id, {
                  exerciseId: set.exercise_id,
                  exerciseName,
                  muscleGroup: getMuscleGroupFromExercise(exercise, staticExercise),
                  iconUrl: exercise?.icon_url,
                  sets: [],
                });
              }

              const prevExerciseData = prevExerciseMap.get(set.exercise_id);
              prevExerciseData.sets.push({
                weight: set.weight_kg?.toString() || '0',
                reps: set.reps?.toString() || '0',
                isCompleted: true,
                isPR: set.is_pb || false,
              });
            });

            const prevExercises = Array.from(prevExerciseMap.values());
            const prevTotalVolume = prevExercises.flatMap(ex => ex.sets).reduce((total, set) => {
              const weight = parseFloat(set.weight) || 0;
              const reps = parseInt(set.reps, 10) || 0;
              return total + (weight * reps);
            }, 0);

            historicalWorkout = {
              exercises: prevExercises,
              duration: previousSession.duration_string || '45:00',
              totalVolume: prevTotalVolume,
              prCount: prevExercises.flatMap(ex => ex.sets).filter(set => set.isPR).length,
              date: new Date(previousSession.session_date),
            };
          }

          // Helper function to get weekly volume data for historical sessions
          const getWeeklyVolumeDataForSession = async (userId: string, sessionId: string): Promise<any> => {
            try {
              const { data: sessions, error } = await supabase
                .from('workout_sessions')
                .select(`
                  session_date,
                  set_logs (
                    exercise_id,
                    weight_kg,
                    reps
                  )
                `)
                .eq('user_id', userId)
                .gte('session_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
                .order('session_date', { ascending: true });

              if (error) {
                console.error('[History] Error fetching weekly volume data:', error);
                console.error('[History] Query details - userId:', userId);
                console.error('[History] Error details:', {
                  code: error.code,
                  message: error.message,
                  details: error.details,
                  hint: error.hint
                });
                return {};
              }

              // Get exercise definitions to map muscle groups
              const { data: exercises, error: exError } = await supabase
                .from('exercise_definitions')
                .select('id, category')
                .or(`user_id.eq.${userId},user_id.is.null`);

              if (exError) {
                console.error('[History] Error fetching exercise definitions:', exError);
                console.error('[History] Query details - userId:', userId);
                console.error('[History] Error details:', {
                  code: exError.code,
                  message: exError.message,
                  details: exError.details,
                  hint: exError.hint
                });
                return {};
              }

              const exerciseLookup = new Map();
              exercises?.forEach((ex: any) => {
                exerciseLookup.set(ex.id, ex.category);
              });

              // Calculate daily volume by muscle group
              const dailyVolumes: { [date: string]: { [muscle: string]: number } } = {};
              const muscleGroups = ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core'];

              sessions?.forEach((session: any) => {
                const date = new Date(session.session_date).toDateString();
                if (!dailyVolumes[date]) {
                  dailyVolumes[date] = {};
                  muscleGroups.forEach(group => {
                    dailyVolumes[date][group] = 0;
                  });
                }

                session.set_logs?.forEach((set: any) => {
                  const muscleGroup = exerciseLookup.get(set.exercise_id) || 'Other';
                  const volume = (parseFloat(set.weight_kg) || 0) * (parseInt(set.reps) || 0);
                  dailyVolumes[date][muscleGroup] = (dailyVolumes[date][muscleGroup] || 0) + volume;
                });
              });

              // Convert to 7-day array format
              const result: any = {};
              muscleGroups.forEach(group => {
                result[group] = [];
              });

              // Fill in last 7 days
              for (let i = 6; i >= 0; i--) {
                const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toDateString();
                muscleGroups.forEach(group => {
                  result[group].push(dailyVolumes[date]?.[group] || 0);
                });
              }

              return result;
            } catch (error) {
              console.error('Error getting weekly volume data:', error);
              return {};
            }
          };

          // Helper function to get next workout suggestion from T-path
          const getNextWorkoutSuggestionForSession = async (userId: string, currentWorkoutName: string): Promise<any | null> => {
            try {
              // Check if user has active T-path
              const { data: tPaths, error } = await supabase
                .from('t_paths')
                .select('id, template_name')
                .eq('user_id', userId)
                .eq('is_active', true)
                .single();

              if (error || !tPaths) {
                return null;
              }

              // Get T-path child workouts
              const { data: childWorkouts, error: childError } = await supabase
                .from('t_paths')
                .select('id, template_name')
                .eq('parent_t_path_id', tPaths.id)
                .order('created_at', { ascending: true });

              if (childError) {
                console.error('[History] Error fetching T-path workouts:', childError);
                console.error('[History] Query details - parent_t_path_id:', tPaths.id);
                console.error('[History] Error details:', {
                  code: childError.code,
                  message: childError.message,
                  details: childError.details,
                  hint: childError.hint
                });
                return null;
              }

              if (childWorkouts && childWorkouts.length > 0) {
                // Find current workout index
                const currentIndex = childWorkouts.findIndex(w => w.template_name === currentWorkoutName);
                const nextIndex = (currentIndex + 1) % childWorkouts.length;
                
                // Calculate ideal next workout date (2 days from now)
                const idealDate = new Date();
                idealDate.setDate(idealDate.getDate() + 2);

                return {
                  name: childWorkouts[nextIndex].template_name,
                  idealDate,
                };
              }
            } catch (error) {
              console.error('Error getting next workout suggestion:', error);
            }

            return null;
          };

          // Helper function to check if user is on T-path
          const checkIfOnTPath = async (userId: string): Promise<boolean> => {
            try {
              const { data, error } = await supabase
                .from('t_paths')
                .select('id')
                .eq('user_id', userId)
                .eq('is_active', true)
                .limit(1);

              if (error) {
                console.error('Error checking T-path status:', error);
                return false;
              }

              return data && data.length > 0;
            } catch (error) {
              console.error('Error checking T-path status:', error);
              return false;
            }
          };

          // Get real weekly volume data from Supabase
          const weeklyVolumeData = await getWeeklyVolumeDataForSession(userId, foundSession.id);

          // Get real next workout suggestion from T-path
          const nextWorkoutSuggestion = await getNextWorkoutSuggestionForSession(userId, foundSession.template_name || 'Workout');

          // Check if user is on T-path
          const isOnTPath = await checkIfOnTPath(userId);

          console.log('[History] Setting modal data:');
          console.log('[History] exercises:', exercises.length);
          console.log('[History] exercises details:', exercises.map(e => ({ name: e.exerciseName, sets: e.sets.length })));
          console.log('[History] setLogs count:', setLogs.length);
          console.log('[History] historicalWorkout:', historicalWorkout ? 'Present' : 'Missing');
          console.log('[History] weeklyVolumeData:', weeklyVolumeData ? Object.keys(weeklyVolumeData) : 'Missing');
          console.log('[History] nextWorkoutSuggestion:', nextWorkoutSuggestion ? nextWorkoutSuggestion.name : 'Missing');
          console.log('[History] isOnTPath:', isOnTPath);
          console.log('[History] foundSession.rating:', foundSession.rating);

          // Ensure all data is properly set before showing modal
          const modalData: any = {
            exercises,
            workoutName: foundSession.template_name || 'Workout',
            startTime,
            historicalWorkout,
            weeklyVolumeData,
            nextWorkoutSuggestion,
            isOnTPath,
          };

          // Only add rating if it exists
          if (foundSession.rating !== null && foundSession.rating !== undefined) {
            modalData.rating = foundSession.rating;
          }

          console.log('[History] Modal data object:', modalData);

          setSelectedSessionData(modalData);
          setWorkoutSummaryModalVisible(true);
        }
      } catch (error) {
        console.error('Failed to load workout summary:', error);
      }
    },
    [userId, getWorkoutSessions, getSetLogs]
  );

  const renderWorkout = ({ item }: { item: WorkoutSession }) => {
    const date = new Date(item.session_date);
    const timeAgo = formatTimeAgo(date);

    return (
      <TouchableOpacity
        style={styles.workoutCard}
        onPress={() => handleViewSummary(item.id)}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.workoutName}>
            {item.template_name || 'Unnamed Workout'}
          </Text>
          {item.rating && (
            <Text style={styles.rating}>{'⭐'.repeat(item.rating)}</Text>
          )}
        </View>
        <View style={styles.cardDetails}>
          <Text style={styles.detailText}>📅 {date.toLocaleDateString()}</Text>
          <Text style={styles.detailText}>🕐 {timeAgo}</Text>
        </View>
        {item.duration_string && (
          <Text style={styles.duration}>Duration: {item.duration_string}</Text>
        )}
      </TouchableOpacity>
    );
  };

  if (workouts.length === 0 && !refreshing) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No workouts yet</Text>
        <Text style={styles.emptySubtext}>
          Start logging your workouts to see them here!
        </Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/workout')}
        >
          <Text style={styles.addButtonText}>+ Log First Workout</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <View style={styles.container}>
        <FlatList
          data={workouts}
          renderItem={renderWorkout}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#0a0"
            />
          }
        />
      </View>

      {/* Workout Summary Modal */}
      <WorkoutSummaryModal
        visible={workoutSummaryModalVisible}
        onClose={() => setWorkoutSummaryModalVisible(false)}
        exercises={selectedSessionData?.exercises || []}
        workoutName={selectedSessionData?.workoutName || ''}
        startTime={selectedSessionData?.startTime || new Date()}
        {...(selectedSessionData?.rating !== undefined && { historicalRating: selectedSessionData.rating })}
        {...(selectedSessionData?.historicalWorkout && { historicalWorkout: selectedSessionData.historicalWorkout })}
        {...(selectedSessionData?.weeklyVolumeData && { weeklyVolumeData: selectedSessionData.weeklyVolumeData })}
        {...(selectedSessionData?.nextWorkoutSuggestion && { nextWorkoutSuggestion: selectedSessionData.nextWorkoutSuggestion })}
        {...(selectedSessionData?.isOnTPath !== undefined && { isOnTPath: selectedSessionData.isOnTPath })}
        showActions={false}
        onSaveWorkout={async () => {
          // Since this is a view-only modal for past workouts, we don't need to save anything
          setWorkoutSummaryModalVisible(false);
        }}
        onRateWorkout={(rating) => {
          // Could implement rating functionality here if needed
          console.log('Workout rated:', rating);
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  listContent: {
    padding: 16,
  },
  workoutCard: {
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  workoutName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  rating: {
    fontSize: 14,
  },
  cardDetails: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 4,
  },
  detailText: {
    color: '#888',
    fontSize: 14,
  },
  duration: {
    color: '#0a0',
    fontSize: 14,
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    padding: 32,
  },
  emptyText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptySubtext: {
    color: '#888',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
  },
  addButton: {
    backgroundColor: '#0a0',
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
