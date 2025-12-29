/**
 * Workout Launcher Screen
 * Interactive workout selector showing expandable workouts with exercises
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Alert, ScrollView, Pressable, KeyboardAvoidingView, Platform, Keyboard, TextInput, Dimensions } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useRouter } from 'expo-router';
import { ChevronDown, ChevronRight, Play, Dumbbell } from 'lucide-react-native';
import { useWorkoutFlow } from '../_contexts/workout-flow-context';
import { useWorkoutLauncherData } from '../../hooks/useWorkoutLauncherData';
import { ScreenContainer, ScreenHeader } from '../../components/layout';
import { GymToggle } from '../../components/dashboard/GymToggle';
import { BackgroundRoot } from '../../components/BackgroundRoot';
import { useData } from '../_contexts/data-context';
import { useAuth } from '../_contexts/auth-context';
import { database, addToSyncQueue } from '../_lib/database';
import { supabase } from '../_lib/supabase';
import { Colors, Spacing } from '../../constants/Theme';
import { TextStyles } from '../../constants/Typography';
import { ExerciseCard } from '../../components/workout/ExerciseCard';
import { ExerciseInfoModal } from '../../components/workout/ExerciseInfoModal';
import { ExerciseSwapModal } from '../../components/workout/ExerciseSwapModal';
import { WorkoutSummaryModal } from '../../components/workout/WorkoutSummaryModal';
import { WorkoutPill } from '../../components/workout-launcher';
import { WorkoutProgressBar } from '../../components/workout/WorkoutProgressBar';

interface WorkoutItemProps {
  workout: any;
  exercises: any[];
  isExpanded: boolean;
  onToggle: () => void;
  onStartWorkout: () => void;
}

const WorkoutItem: React.FC<WorkoutItemProps> = ({
  workout,
  exercises,
  isExpanded,
  onToggle,
  onStartWorkout,
}) => {
  return (
    <View style={styles.workoutItem}>
      {/* Workout Header */}
      <Pressable style={styles.workoutHeader} onPress={onToggle}>
        <View style={styles.workoutHeaderLeft}>
          {isExpanded ? (
            <ChevronDown size={20} color={Colors.foreground} />
          ) : (
            <ChevronRight size={20} color={Colors.foreground} />
          )}
          <Text style={styles.workoutName}>{workout.template_name}</Text>
        </View>
        <Text style={styles.exerciseCount}>
          {exercises.length} exercise{exercises.length !== 1 ? 's' : ''}
        </Text>
      </Pressable>

      {/* Expanded Exercises */}
      {isExpanded && (
        <View style={styles.exercisesContainer}>
          {exercises.map((exercise, index) => (
            <View key={exercise.id || index} style={styles.exercisePreview}>
              <View style={styles.exerciseInfo}>
                <Text style={styles.exerciseName}>{exercise.name}</Text>
                <Text style={styles.exerciseMuscle}>
                  {exercise.main_muscle?.charAt(0).toUpperCase() + exercise.main_muscle?.slice(1)}
                </Text>
              </View>
              <View style={styles.exerciseTarget}>
                <Text style={styles.targetText}>
                  {exercise.target_sets || 3} sets × {exercise.target_reps_min || 8}-{exercise.target_reps_max || 12} reps
                </Text>
              </View>
            </View>
          ))}

          {/* Start Workout Button */}
          <Pressable
            style={({ pressed }) => [
              styles.startWorkoutButton,
              pressed && styles.startWorkoutButtonPressed,
            ]}
            onPress={onStartWorkout}
          >
            <Play size={16} color={Colors.white} />
            <Text style={styles.startWorkoutText}>Start Workout</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
};

export default function WorkoutLauncherScreen() {
  const router = useRouter();
  const {
    selectWorkout,
    selectAndStartWorkout,
    startWorkout,
    activeWorkout,
    exercisesForSession,
    exercisesWithSets,
    sessionStartTime,
    removeExerciseFromSession,
    substituteExercise,
    finishWorkout,
    completedExercises,
    currentSessionId,
    resetWorkoutSession,
    confirmLeave,
  } = useWorkoutFlow();
  const { profile, activeTPath, childWorkouts, adhocWorkouts, workoutExercisesCache, lastCompletedDates, loading, error, refresh } = useWorkoutLauncherData();
  const { getGyms, setActiveGym } = useData();
  const { userId } = useAuth();
  const [userGyms, setUserGyms] = useState<any[]>([]);
  const scrollViewRef = useRef<ScrollView>(null);

  const [expandedWorkouts, setExpandedWorkouts] = useState<Set<string>>(new Set());
  const [selectedWorkout, setSelectedWorkout] = useState<string | null>(null);
  const [isWorkoutActiveInline, setIsWorkoutActiveInline] = useState(false);
  const [loadingExercises, setLoadingExercises] = useState(false);
  const [infoModalVisible, setInfoModalVisible] = useState(false);
  const [swapModalVisible, setSwapModalVisible] = useState(false);
  const [summaryModalVisible, setSummaryModalVisible] = useState(false);
  const [summaryModalData, setSummaryModalData] = useState<{
    exercises: any[];
    workoutName: string;
    startTime: Date;
    duration?: string | undefined;
    historicalWorkout?: any;
    weeklyVolumeData?: any;
    nextWorkoutSuggestion?: any;
    isOnTPath?: boolean;
    historicalRating?: number;
    sessionId?: string;
  } | null>(null);
  const [selectedExercise, setSelectedExercise] = useState<any>(null);
  const [currentExerciseId, setCurrentExerciseId] = useState<string>('');
  const [hasJustReset, setHasJustReset] = useState(false);
  const [userHasSelectedWorkout, setUserHasSelectedWorkout] = useState(false);

  // Auto-select the first Push workout on component mount for better UX
  useEffect(() => {
    if (childWorkouts.length > 0 && !selectedWorkout && profile?.id && !isWorkoutActiveInline && !activeWorkout && !hasJustReset && !userHasSelectedWorkout) {
      console.log('[WorkoutScreen] Auto-selecting workout on mount - conditions met');
      const pushWorkout = childWorkouts.find(workout =>
        workout.template_name.toLowerCase().includes('push')
      );
      if (pushWorkout) {
        console.log('[WorkoutScreen] Auto-selecting Push workout:', pushWorkout.id);
        setSelectedWorkout(pushWorkout.id);
        selectWorkout(pushWorkout.id).then(() => {
          setIsWorkoutActiveInline(true);
          setTimeout(() => {
            scrollViewRef.current?.scrollTo({ y: 0, animated: true });
          }, 100);
        }).catch((error) => {
          console.error('Failed to select workout:', error);
        });
      }
    }
  }, [childWorkouts, selectedWorkout, profile?.id, isWorkoutActiveInline, activeWorkout, hasJustReset, userHasSelectedWorkout, selectWorkout]);

  // Reset workout UI state when context is reset
  useEffect(() => {
    if (!activeWorkout && !currentSessionId) {
      console.log('[WorkoutScreen] Resetting workout UI state');
      setIsWorkoutActiveInline(false);
      setSelectedWorkout(null);
      setHasJustReset(true);
      setUserHasSelectedWorkout(false);
      setTimeout(() => {
        console.log('[WorkoutScreen] Clearing hasJustReset flag');
        setHasJustReset(false);
      }, 100);
    }
  }, [activeWorkout, currentSessionId]);

  // Refresh data when tab is focused
  useFocusEffect(
    useCallback(() => {
      if (!profile) {
        refresh();
      }
    }, [refresh, profile])
  );

  // Handle keyboard show to scroll focused input into view
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', (e) => {
      const focusedInput = TextInput.State.currentlyFocusedInput();
      if (focusedInput && scrollViewRef.current) {
        (scrollViewRef.current as any).measure((scrollX: number, scrollY: number, scrollWidth: number, scrollHeight: number, scrollPageX: number, scrollPageY: number) => {
          focusedInput.measure((x: number, y: number, width: number, height: number, pageX: number, pageY: number) => {
            const keyboardHeight = e.endCoordinates.height;
            const screenHeight = Dimensions.get('window').height;
            const visibleArea = screenHeight - keyboardHeight - 50;
            const contentY = pageY - scrollPageY;
            const inputBottom = contentY + height;

            if (inputBottom > visibleArea) {
              const scrollToY = Math.max(0, contentY - (visibleArea - height - 50));
              scrollViewRef.current?.scrollTo({ y: scrollToY, animated: true });
            }
          });
        });
      }
    });

    return () => {
      keyboardDidShowListener.remove();
    };
  }, []);

  // Load gyms for toggle
  useEffect(() => {
    const loadGyms = async () => {
      if (profile?.id) {
        try {
          const gyms = await getGyms(profile.id);
          setUserGyms(gyms);
        } catch (error) {
          console.error('Error loading gyms:', error);
        }
      }
    };
    loadGyms();
  }, [profile?.id, getGyms]);

  const handleToggleWorkout = (workoutId: string) => {
    setExpandedWorkouts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(workoutId)) {
        newSet.delete(workoutId);
      } else {
        newSet.add(workoutId);
      }
      return newSet;
    });
  };

  const handleSelectWorkout = async (workoutId: string) => {
    console.log('[WorkoutScreen] handleSelectWorkout called with:', workoutId, 'current selected:', selectedWorkout);

    if (selectedWorkout && selectedWorkout !== workoutId) {
      console.log('[WorkoutScreen] Switching workouts, resetting current session first');
      await resetWorkoutSession();
    }

    const newSelectedWorkout = workoutId === selectedWorkout ? null : workoutId;
    setSelectedWorkout(newSelectedWorkout);
    setUserHasSelectedWorkout(true);

    if (newSelectedWorkout && newSelectedWorkout !== selectedWorkout) {
      try {
        console.log('Selecting workout:', newSelectedWorkout);
        setLoadingExercises(true);
        await selectWorkout(newSelectedWorkout);
        console.log('Workout selected successfully');
        setIsWorkoutActiveInline(true);
      } catch (error) {
        console.error('Failed to select workout:', error);
        Alert.alert('Error', 'Failed to load workout. Please try again.');
        setSelectedWorkout(null);
      } finally {
        setLoadingExercises(false);
      }
    } else if (!newSelectedWorkout) {
      setIsWorkoutActiveInline(false);
      setSelectedWorkout(null);
      await resetWorkoutSession();
    }
  };

  const handleStartWorkout = async (workoutId: string | null) => {
    try {
      console.log('Starting workout with ID:', workoutId);
      await selectWorkout(workoutId);
      console.log('Workout selected, starting session...');
      await startWorkout(new Date().toISOString());
      console.log('Workout session started, staying inline...');
      setIsWorkoutActiveInline(true);
    } catch (error) {
      console.error('Failed to start workout:', error);
      Alert.alert('Error', 'Failed to start workout. Please try again.');
    }
  };

  const handleInfoPress = (exerciseId: string) => {
    const exercise = exercisesForSession.find(ex => ex.id === exerciseId);
    if (exercise) {
      setSelectedExercise(exercise);
      setInfoModalVisible(true);
    }
  };

  const handleRemoveExercise = async (exerciseId: string) => {
    await removeExerciseFromSession(exerciseId);
  };

  const handleSubstituteExercise = (exerciseId: string) => {
    setCurrentExerciseId(exerciseId);
    setSwapModalVisible(true);
  };

  // Helper function to get historical workout for comparison
  const getHistoricalWorkout = async (workoutName: string): Promise<any | null> => {
    if (!userId || !workoutName) return null;

    try {
      console.log('[Workout] Fetching historical workout for:', workoutName, 'userId:', userId);
      console.log('[Workout] getHistoricalWorkout function called');
      
      // Check if Supabase client is available
      if (!supabase) {
        console.error('[Workout] Supabase client not available');
        return null;
      }
      
      // Check if user is authenticated
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      if (authError) {
        console.error('[Workout] Auth error:', authError);
        return null;
      }
      if (!session) {
        console.error('[Workout] No active session found');
        return null;
      }
      
      // Get previous workouts of the same type from Supabase
      const { data: sessions, error } = await supabase
        .from('workout_sessions')
        .select(`
          id,
          session_date,
          duration_string,
          rating,
          set_logs (
            exercise_id,
            weight_kg,
            reps,
            is_pb
          )
        `)
        .eq('user_id', userId)
        .eq('template_name', workoutName)
        .order('session_date', { ascending: false })
        .limit(2); // Get current + previous

      if (error) {
        console.error('[Workout] Error fetching historical workouts:', error);
        console.error('[Workout] Query details - userId:', userId, 'workoutName:', workoutName);
        console.error('[Workout] Error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        return null;
      }

      if (!sessions) {
        console.log('[Workout] No sessions found for historical query');
        return null;
      }
      
      // Additional validation
      if (!Array.isArray(sessions)) {
        console.error('[Workout] Invalid sessions data type:', typeof sessions);
        return null;
      }

      console.log('[Workout] Historical sessions fetched:', sessions?.length || 0);

      if (sessions && sessions.length > 1) {
        const previousSession = sessions[1]; // Skip current session
        const previousSets = previousSession.set_logs || [];
        
        console.log('[Workout] Previous session sets:', previousSets.length);
        
        // Group sets by exercise
        const exerciseMap = new Map();
        previousSets.forEach((set: any) => {
          if (!exerciseMap.has(set.exercise_id)) {
            exerciseMap.set(set.exercise_id, {
              exerciseId: set.exercise_id,
              exerciseName: `Exercise ${set.exercise_id?.slice(-4) || 'Ex'}`,
              sets: [],
            });
          }
          
          const exerciseData = exerciseMap.get(set.exercise_id);
          exerciseData.sets.push({
            weight: set.weight_kg?.toString() || '0',
            reps: set.reps?.toString() || '0',
            isCompleted: true,
            isPR: set.is_pb || false,
          });
        });

        const exercises = Array.from(exerciseMap.values());
        const totalVolume = exercises.flatMap(ex => ex.sets).reduce((total, set) => {
          const weight = parseFloat(set.weight) || 0;
          const reps = parseInt(set.reps, 10) || 0;
          return total + (weight * reps);
        }, 0);

        const result = {
          exercises,
          duration: previousSession.duration_string || '45:00',
          totalVolume,
          prCount: exercises.flatMap(ex => ex.sets).filter(set => set.isPR).length,
          date: new Date(previousSession.session_date),
        };
        
        console.log('[Workout] Historical workout result:', result);
        return result;
      } else {
        console.log('[Workout] No historical data found - sessions:', sessions?.length || 0);
      }
    } catch (error) {
      console.error('Error getting historical workout:', error);
    }
    
    return null;
  };

  // Helper function to get weekly volume data
  const getWeeklyVolumeData = async (): Promise<any> => {
    if (!userId) return {};

    try {
      console.log('[Workout] Fetching weekly volume data for userId:', userId);
      console.log('[Workout] getWeeklyVolumeData function called');
      
      // Check if Supabase client is available
      if (!supabase) {
        console.error('[Workout] Supabase client not available');
        return {};
      }
      
      // Check if user is authenticated
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      if (authError) {
        console.error('[Workout] Auth error:', authError);
        return {};
      }
      if (!session) {
        console.error('[Workout] No active session found');
        return {};
      }
      
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
        console.error('[Workout] Error fetching weekly volume data:', error);
        console.error('[Workout] Query details - userId:', userId);
        console.error('[Workout] Error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        return {};
      }

      console.log('[Workout] Weekly sessions fetched:', sessions?.length || 0);

      if (!sessions) {
        console.log('[Workout] No sessions found for weekly volume query');
        return {};
      }
      
      // Additional validation
      if (!Array.isArray(sessions)) {
        console.error('[Workout] Invalid sessions data type:', typeof sessions);
        return {};
      }

      // Get exercise definitions to map muscle groups
      const { data: exercises, error: exError } = await supabase
        .from('exercise_definitions')
        .select('id, category')
        .or(`user_id.eq.${userId},user_id.is.null`);

      if (exError) {
        console.error('[Workout] Error fetching exercise definitions:', exError);
        console.error('[Workout] Query details - userId:', userId);
        return {};
      }

      console.log('[Workout] Exercise definitions fetched:', exercises?.length || 0);

      if (!exercises) {
        console.log('[Workout] No exercise definitions found');
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

      console.log('[Workout] Weekly volume data result:', result);
      return result;
    } catch (error) {
      console.error('Error getting weekly volume data:', error);
      return {};
    }
  };

  // Helper function to get next workout suggestion
  const getNextWorkoutSuggestion = async (currentWorkoutName: string): Promise<any | null> => {
    if (!userId || !activeTPath) return null;

    try {
      console.log('[Workout] Fetching next workout suggestion for:', currentWorkoutName, 'T-path:', activeTPath.id);
      console.log('[Workout] getNextWorkoutSuggestion function called');
      
      // Get T-path child workouts
      const { data: childWorkouts, error } = await supabase
        .from('t_paths')
        .select('id, template_name')
        .eq('parent_t_path_id', activeTPath.id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching T-path workouts:', error);
        console.error('Query details - parent_t_path_id:', activeTPath.id);
        console.error('Error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        return null;
      }

      console.log('[Workout] T-path child workouts fetched:', childWorkouts?.length || 0);

      if (!childWorkouts) {
        console.log('[Workout] No T-path child workouts found');
        return null;
      }
      
      // Additional validation
      if (!Array.isArray(childWorkouts)) {
        console.error('[Workout] Invalid childWorkouts data type:', typeof childWorkouts);
        return null;
      }

      if (childWorkouts && childWorkouts.length > 0) {
        // Find current workout index
        const currentIndex = childWorkouts.findIndex(w => w.template_name === currentWorkoutName);
        const nextIndex = (currentIndex + 1) % childWorkouts.length;
        
        // Calculate ideal next workout date (2 days from now)
        const idealDate = new Date();
        idealDate.setDate(idealDate.getDate() + 2);

        const result = {
          name: childWorkouts[nextIndex].template_name,
          idealDate,
        };
        
        console.log('[Workout] Next workout suggestion result:', result);
        return result;
      } else {
        console.log('[Workout] No T-path child workouts found');
      }
    } catch (error) {
      console.error('Error getting next workout suggestion:', error);
    }

    return null;
  };

  const getModalExercises = () => {
    return exercisesForSession
      .filter(exercise => exercise.id)
      .map(exercise => {
        const sets = exercisesWithSets[exercise.id!] || [];
        const modalSets = sets
          .filter(set => set.isSaved)
          .map(set => ({
            weight: set.weight_kg?.toString() || '0',
            reps: set.reps?.toString() || '0',
            isCompleted: set.isSaved,
            isPR: set.isPR,
          }));

        const result: any = {
          exerciseId: exercise.id!,
          exerciseName: exercise.name,
          sets: modalSets,
          iconUrl: (exercise as any).icon_url,
        };

        // Helper function to map exercise names to muscle groups
        const getMuscleGroupFromExercise = (ex: any): string => {
          const name = (ex?.name || '').toLowerCase();
          
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

        result.muscleGroup = getMuscleGroupFromExercise(exercise);
        return result;
      })
      .filter(exercise => exercise.sets.length > 0);
  };

  const handleSaveWorkout = async (rating?: number) => {
    console.log('[Workout] handleSaveWorkout called with rating:', rating);
    
    // If a rating was provided, save it before navigating away
    if (rating && rating > 0 && summaryModalData?.sessionId) {
      console.log('[Workout] Saving rating via handleSaveWorkout:', rating, 'sessionId:', summaryModalData.sessionId);
      await handleRateWorkout(rating, summaryModalData.sessionId);
    } else {
      console.log('[Workout] Skipping rating save - missing data:', { rating, sessionId: summaryModalData?.sessionId });
    }
    
    router.replace('/(tabs)/dashboard');
  };

  const handleRateWorkout = async (rating: number, sessionId?: string) => {
    const targetSessionId = sessionId || currentSessionId;
    if (!targetSessionId || !userId) {
      console.log('[Workout] handleRateWorkout - missing sessionId or userId:', { targetSessionId, userId });
      return;
    }

    try {
      console.log('[Workout] handleRateWorkout called with rating:', rating, 'sessionId:', targetSessionId);
      
      // Use direct database lookup to ensure we get the session data regardless of cache state
      const existingSession = await database.getWorkoutSessionById(targetSessionId);
      
      console.log('[Workout] Found existing session:', !!existingSession);
      console.log('[Workout] Existing session rating:', existingSession?.rating);
      
      if (existingSession) {
        // Update the session with the rating, preserving the original duration
        const updatedSession = {
          ...existingSession,
          rating,
          // Ensure the session is marked as completed
          completed_at: existingSession.completed_at || new Date().toISOString(),
          // Preserve the original duration string to fix regression
          duration_string: existingSession.duration_string || '00:00'
        };
        console.log('[Workout] Updated session data:', updatedSession);
        await database.addWorkoutSession(updatedSession);
        await addToSyncQueue('update', 'workout_sessions', updatedSession);
        console.log('[Workout] Rating saved successfully for session:', targetSessionId);
      } else {
        // Session doesn't exist yet, create it with the rating
        // Calculate duration from session start time if available
        const now = new Date();
        const startTime = sessionStartTime ? new Date(sessionStartTime) : now;
        const durationMs = now.getTime() - startTime.getTime();
        const durationSeconds = Math.round(durationMs / 1000);
        
        // Format duration as "X seconds" for consistency
        let durationString = '00:00';
        if (durationSeconds < 60) {
          durationString = `${durationSeconds} seconds`;
        } else if (durationSeconds < 3600) {
          const minutes = Math.floor(durationSeconds / 60);
          const seconds = durationSeconds % 60;
          durationString = `${minutes}m ${seconds}s`;
        } else {
          const hours = Math.floor(durationSeconds / 3600);
          const minutes = Math.floor((durationSeconds % 3600) / 60);
          durationString = `${hours}h ${minutes}m`;
        }
        
        const newSession = {
          id: targetSessionId,
          user_id: userId,
          session_date: startTime.toISOString(),
          template_name: activeWorkout?.template_name || 'Workout',
          rating: rating,
          created_at: startTime.toISOString(),
          completed_at: now.toISOString(),
          duration_string: durationString,
          t_path_id: activeTPath?.id || null,
          sync_status: 'local_only'
        };
        console.log('[Workout] Creating new session with rating:', newSession);
        await database.addWorkoutSession(newSession);
        await addToSyncQueue('create', 'workout_sessions', newSession);
        console.log('[Workout] Rating saved successfully for new session:', targetSessionId);
      }
      
      // Verify the rating was saved correctly using direct lookup
      const verifySession = await database.getWorkoutSessionById(targetSessionId);
      console.log('[Workout] Verification - session rating after save:', verifySession?.rating);
      
    } catch (error) {
      console.error('Error saving rating:', error);
      Alert.alert('Error', 'Failed to save rating. Please try again.');
    }
  };

  const handleSummaryModalClose = () => {
    setSummaryModalVisible(false);
  };

  if (loading) {
    return (
      <ScreenContainer>
        <ScreenHeader title="Start Workout" />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading workouts...</Text>
        </View>
      </ScreenContainer>
    );
  }

  if (error) {
    return (
      <ScreenContainer>
        <ScreenHeader title="Start Workout" />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Failed to load workouts</Text>
          <Text style={styles.errorSubtext}>{error}</Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <>
      <View style={styles.container}>
        <BackgroundRoot />
        <View style={styles.innerContainer}>
          <ScrollView
            ref={scrollViewRef}
            style={styles.scrollContent}
            contentContainerStyle={styles.scrollContentContainer}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            <View style={{flex: 1}}>
              <ScreenHeader
                title="Start Workout"
                style={{
                  backgroundColor: 'transparent',
                  borderBottomColor: 'transparent',
                }}
              />

              <View style={styles.descriptionContainer}>
                <Text style={[styles.descriptionText, { textAlign: 'center' }]}>
                  Select a workout or start an ad-hoc session
                </Text>
              </View>

              {/* Gym Toggle */}
              {userGyms.length > 1 && (
                <View style={styles.gymToggleContainer}>
                  <GymToggle
                    gyms={userGyms}
                    activeGym={userGyms.find(g => g.is_active) || null}
                    onGymChange={async (gymId, newActiveGym) => {
                      try {
                        if (profile?.id) {
                          await setActiveGym(profile.id, gymId);
                          setUserGyms(prev => prev.map(g => ({
                            ...g,
                            is_active: g.id === gymId
                          })));
                        }
                      } catch (error) {
                        console.error('Error changing active gym:', error);
                      }
                    }}
                  />
                </View>
              )}

              {activeTPath && (
                <View style={styles.programHeader}>
                  <Dumbbell size={20} color={Colors.foreground} />
                  <Text style={[styles.programTitle, { textAlign: 'center' }]}>{activeTPath.template_name}</Text>
                </View>
              )}

              {/* Program Workouts Section */}
              {childWorkouts.length > 0 && (
                <View style={styles.workoutsScroll}>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={[styles.workoutButtonsContainer, { paddingLeft: -Spacing.lg }]}
                  >
                    {childWorkouts
                      .sort((a, b) => {
                        const aLower = a.template_name.toLowerCase();
                        const bLower = b.template_name.toLowerCase();
                        const isUpperLowerSplit = activeTPath?.template_name?.toLowerCase().includes('upper/lower');

                        if (isUpperLowerSplit) {
                          if (aLower.includes('upper') && bLower.includes('lower')) return -1;
                          if (aLower.includes('lower') && bLower.includes('upper')) return 1;
                        } else {
                          const categoryOrder = { 'push': 1, 'pull': 2, 'legs': 3 };
                          const aCategory = aLower.includes('push') ? 'push' : aLower.includes('pull') ? 'pull' : aLower.includes('legs') ? 'legs' : 'push';
                          const bCategory = bLower.includes('push') ? 'push' : bLower.includes('pull') ? 'pull' : bLower.includes('legs') ? 'legs' : 'push';
                          return categoryOrder[aCategory] - categoryOrder[bCategory];
                        }
                        return 0;
                      })
                      .map((workout) => {
                        const lowerTitle = workout.template_name.toLowerCase();
                        const isUpperLowerSplit = activeTPath?.template_name?.toLowerCase().includes('upper/lower');
                        let category: 'push' | 'pull' | 'legs' | 'upper' | 'lower';

                        if (isUpperLowerSplit) {
                          if (lowerTitle.includes('upper')) category = 'upper';
                          else if (lowerTitle.includes('lower')) category = 'lower';
                          else category = 'upper';
                        } else {
                          if (lowerTitle.includes('push')) category = 'push';
                          else if (lowerTitle.includes('pull')) category = 'pull';
                          else if (lowerTitle.includes('legs')) category = 'legs';
                          else category = 'push';
                        }

                        const isSelected = selectedWorkout === workout.id;
                        const completedAt = lastCompletedDates[workout.id] || null;

                        return (
                          <WorkoutPill
                            key={workout.id}
                            id={workout.id}
                            title={workout.template_name}
                            category={category}
                            completedAt={completedAt}
                            isSelected={isSelected}
                            onClick={handleSelectWorkout}
                          />
                        );
                      })}
                    <WorkoutPill
                      key="ad-hoc"
                      id="ad-hoc"
                      title="Ad-hoc"
                      category="ad-hoc"
                      completedAt={null}
                      isSelected={selectedWorkout === 'ad-hoc'}
                      onClick={() => {
                        handleSelectWorkout('ad-hoc');
                      }}
                    />
                  </ScrollView>
                </View>
              )}

              {/* Workout Controls */}
              {(isWorkoutActiveInline && selectedWorkout) || loadingExercises ? (
                <View style={styles.contentArea}>
                  {loadingExercises ? (
                    <View style={styles.loadingExercisesContainer}>
                      <Text style={styles.loadingExercisesText}>Loading workout...</Text>
                    </View>
                  ) : (
                    <>
                      {selectedWorkout && (
                        <View style={styles.workoutTitleContainer}>
                          <WorkoutPill
                            id={selectedWorkout}
                            title={activeWorkout?.template_name || 'Workout'}
                            category={(() => {
                              const workout = childWorkouts.find(w => w.id === selectedWorkout);
                              if (workout) {
                                const lowerTitle = workout.template_name.toLowerCase();
                                const isUpperLowerSplit = activeTPath?.template_name?.toLowerCase().includes('upper/lower');

                                if (isUpperLowerSplit) {
                                  if (lowerTitle.includes('upper')) return 'upper';
                                  else if (lowerTitle.includes('lower')) return 'lower';
                                } else {
                                  if (lowerTitle.includes('push')) return 'push';
                                  else if (lowerTitle.includes('pull')) return 'pull';
                                  else if (lowerTitle.includes('legs')) return 'legs';
                                }
                              }
                              return 'push';
                            })()}
                            completedAt={null}
                            isSelected={true}
                            onClick={() => {}}
                            hideLastCompleted={true}
                          />
                        </View>
                      )}

                      {exercisesForSession.length > 0 && (
                        <View style={styles.exercisesList}>
                          {exercisesForSession.map((exercise, index) => {
                            const exerciseSets = exercisesWithSets[exercise.id!] || [];
                            return (
                              <ExerciseCard
                                key={exercise.id!}
                                exercise={{
                                  id: exercise.id!,
                                  name: exercise.name || 'Unknown Exercise',
                                  main_muscle: exercise.main_muscle || 'Unknown',
                                  type: exercise.type || 'Unknown',
                                  category: exercise.category,
                                  description: exercise.description,
                                  pro_tip: exercise.pro_tip,
                                  video_url: exercise.video_url,
                                  equipment: exercise.equipment,
                                  user_id: null,
                                  library_id: null,
                                  created_at: exercise.created_at,
                                  is_favorite: null,
                                  icon_url: (exercise as any).icon_url || null,
                                  is_bonus_exercise: exercise.is_bonus_exercise || false,
                                }}
                                sets={exerciseSets}
                                exerciseNumber={index + 1}
                                accentColor={(() => {
                                  const workout = childWorkouts.find(w => w.id === selectedWorkout);
                                  if (workout) {
                                    const lowerTitle = workout.template_name.toLowerCase();
                                    const isUpperLowerSplit = activeTPath?.template_name?.toLowerCase().includes('upper/lower');

                                    if (isUpperLowerSplit) {
                                      if (lowerTitle.includes('upper')) return '#8B5CF6';
                                      else if (lowerTitle.includes('lower')) return '#EF4444';
                                    } else {
                                      if (lowerTitle.includes('push')) return '#3B82F6';
                                      else if (lowerTitle.includes('pull')) return '#10B981';
                                      else if (lowerTitle.includes('legs')) return '#F59E0B';
                                    }
                                  }
                                  return undefined;
                                })()}
                                onInfoPress={() => handleInfoPress(exercise.id!)}
                                onRemoveExercise={() => handleRemoveExercise(exercise.id!)}
                                onSubstituteExercise={() => handleSubstituteExercise(exercise.id!)}
                                onExerciseSaved={(exerciseName, setCount) => {}}
                              />
                            );
                          })}
                        </View>
                      )}

                      <View style={styles.workoutActionButtons}>
                        <Pressable
                          style={({ pressed }) => [
                            styles.cancelWorkoutButton,
                            pressed && styles.cancelWorkoutButtonPressed,
                          ]}
                          onPress={() => {
                            Alert.alert(
                              'Cancel Workout',
                              'Are you sure you want to cancel this workout? All progress will be lost.',
                              [
                                { text: 'Keep Working', style: 'cancel' },
                                {
                                  text: 'Cancel Workout',
                                  style: 'destructive',
                                  onPress: () => {
                                    setIsWorkoutActiveInline(false);
                                    setSelectedWorkout(null);
                                  }
                                },
                              ]
                            );
                          }}
                        >
                          <Text style={styles.cancelWorkoutText}>Cancel Workout</Text>
                        </Pressable>

                        <Pressable
                          style={({ pressed }) => [
                            styles.cancelWorkoutButton,
                            { backgroundColor: Colors.primary },
                            pressed && styles.cancelWorkoutButtonPressed,
                          ]}
                          onPress={async () => {
                            const sessionId = await finishWorkout();
                            if (sessionId && userId) {
                              // Fetch the completed session data to get duration and rating
                              const sessions = await database.getWorkoutSessions(userId);
                              const completedSession = sessions.find(s => s.id === sessionId);

                              const modalExercises = getModalExercises();
                              const workoutName = activeWorkout?.template_name || 'Workout';
                              const startTime = sessionStartTime || new Date();

                              // Fetch the current session's rating for historical display
                              const currentSessionRating = completedSession?.rating || 0;

                              // Fetch all required data for advanced features
                              console.log('[Workout] Fetching advanced modal data...');
                              
                              // First, verify Supabase is working
                              try {
                                const { data: { session }, error: authError } = await supabase.auth.getSession();
                                console.log('[Workout] Supabase auth check:', { hasSession: !!session, authError });
                                
                                if (authError) {
                                  console.error('[Workout] Auth error:', authError);
                                  return;
                                }
                                if (!session) {
                                  console.error('[Workout] No active session found');
                                  return;
                                }
                              } catch (authCheckError) {
                                console.error('[Workout] Auth check failed:', authCheckError);
                                return;
                              }
                              
                              console.log('[Workout] Starting data fetch calls...');
                              
                              // Call each function individually to see which one fails
                              console.log('[Workout] Calling getHistoricalWorkout...');
                              const historicalWorkout = await getHistoricalWorkout(workoutName);
                              console.log('[Workout] getHistoricalWorkout result:', !!historicalWorkout);
                              
                              console.log('[Workout] Calling getWeeklyVolumeData...');
                              const weeklyVolumeData = await getWeeklyVolumeData();
                              console.log('[Workout] getWeeklyVolumeData result:', Object.keys(weeklyVolumeData || {}));
                              
                              console.log('[Workout] Calling getNextWorkoutSuggestion...');
                              const nextWorkoutSuggestion = await getNextWorkoutSuggestion(workoutName);
                              console.log('[Workout] getNextWorkoutSuggestion result:', !!nextWorkoutSuggestion);
                              
                              console.log('[Workout] Data fetch completed, results:', {
                                historicalWorkout: !!historicalWorkout,
                                weeklyVolumeData: Object.keys(weeklyVolumeData || {}),
                                nextWorkoutSuggestion: !!nextWorkoutSuggestion
                              });
                              
                              // Set the modal data
                              setSummaryModalData({
                                exercises: modalExercises,
                                workoutName,
                                startTime,
                                duration: completedSession?.duration_string || undefined,
                                historicalWorkout,
                                weeklyVolumeData,
                                nextWorkoutSuggestion,
                                isOnTPath: !!activeTPath,
                                historicalRating: currentSessionRating,
                                sessionId: sessionId, // Store session ID for rating saves
                              });
                              
                              console.log('[Workout] Modal data set, showing modal...');

                              console.log('[Workout] Historical workout:', historicalWorkout ? 'Found' : 'Not found');
                              console.log('[Workout] Weekly volume data keys:', Object.keys(weeklyVolumeData || {}));
                              console.log('[Workout] Weekly volume data:', weeklyVolumeData);
                              console.log('[Workout] Next workout suggestion:', nextWorkoutSuggestion?.name || 'Not found');
                              console.log('[Workout] Next workout suggestion data:', nextWorkoutSuggestion);
                              console.log('[Workout] isOnTPath:', !!activeTPath);

                              // Debug: Check if any data was actually fetched
                              const hasData = !!historicalWorkout || Object.keys(weeklyVolumeData || {}).length > 0 || !!nextWorkoutSuggestion;
                              console.log('[Workout] Data fetch result - hasData:', hasData);
                              console.log('[Workout] Historical workout details:', historicalWorkout);
                              console.log('[Workout] Weekly volume data details:', weeklyVolumeData);
                              console.log('[Workout] Next workout suggestion details:', nextWorkoutSuggestion);

                              // Debug: Log the data being passed to modal
                              console.log('[Workout] Setting modal data with:', {
                                exercisesCount: modalExercises.length,
                                workoutName,
                                historicalWorkout: !!historicalWorkout,
                                weeklyVolumeData: Object.keys(weeklyVolumeData || {}),
                                nextWorkoutSuggestion: !!nextWorkoutSuggestion,
                                isOnTPath: !!activeTPath,
                              });

                              await resetWorkoutSession();
                              setIsWorkoutActiveInline(false);

                              setTimeout(() => {
                                setSummaryModalVisible(true);
                              }, 100);
                            }
                          }}
                        >
                          <Text style={[styles.cancelWorkoutText, { color: Colors.white }]}>Finish Workout</Text>
                        </Pressable>
                      </View>
                    </>
                  )}
                </View>
              ) : null}

              {/* Ad-hoc Workouts Section */}
              {adhocWorkouts.length > 0 && (
                <>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>My Ad-hoc Workouts</Text>
                  </View>
                  {adhocWorkouts.map((workout) => {
                    const exercises = workoutExercisesCache[workout.id] || [];
                    const isExpanded = expandedWorkouts.has(workout.id);

                    return (
                      <WorkoutItem
                        key={workout.id}
                        workout={workout}
                        exercises={exercises}
                        isExpanded={isExpanded}
                        onToggle={() => handleToggleWorkout(workout.id)}
                        onStartWorkout={() => handleStartWorkout(workout.id)}
                      />
                    );
                  })}
                </>
              )}

              {/* Empty State */}
              {childWorkouts.length === 0 && adhocWorkouts.length === 0 && (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No workouts available</Text>
                  <Text style={styles.emptySubtext}>
                    Create your first workout program to get started
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      </View>

      {/* Modals */}
      <ExerciseInfoModal
        exercise={selectedExercise}
        visible={infoModalVisible}
        onClose={() => {
          setInfoModalVisible(false);
          setSelectedExercise(null);
        }}
      />

      <ExerciseSwapModal
        visible={swapModalVisible}
        onClose={() => {
          setSwapModalVisible(false);
          setCurrentExerciseId('');
        }}
        onSelectExercise={async (newExercise) => {
          if (currentExerciseId) {
            await substituteExercise(currentExerciseId, newExercise);
          }
          setSwapModalVisible(false);
          setCurrentExerciseId('');
        }}
        currentExerciseId={currentExerciseId}
      />

      {completedExercises.size > 0 && (
        <WorkoutProgressBar
          exercisesForSession={exercisesForSession}
          completedExercises={completedExercises}
          isWorkoutSessionStarted={!!currentSessionId}
          activeWorkout={activeWorkout}
        />
      )}

      <WorkoutSummaryModal
        visible={summaryModalVisible}
        onClose={handleSummaryModalClose}
        exercises={summaryModalData?.exercises || []}
        workoutName={summaryModalData?.workoutName || 'Workout'}
        startTime={summaryModalData?.startTime || new Date()}
        {...(summaryModalData?.duration && { duration: summaryModalData.duration })}
        {...(summaryModalData?.historicalWorkout && { historicalWorkout: summaryModalData.historicalWorkout })}
        {...(summaryModalData?.weeklyVolumeData && { weeklyVolumeData: summaryModalData.weeklyVolumeData })}
        {...(summaryModalData?.nextWorkoutSuggestion && { nextWorkoutSuggestion: summaryModalData.nextWorkoutSuggestion })}
        {...(summaryModalData?.isOnTPath !== undefined && { isOnTPath: summaryModalData.isOnTPath })}
        {...(summaryModalData?.historicalRating !== undefined && { historicalRating: summaryModalData.historicalRating })}
        syncStatus="synced"
        onSaveWorkout={handleSaveWorkout}
        onRateWorkout={handleRateWorkout}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  innerContainer: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...TextStyles.body,
    color: Colors.mutedForeground,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  errorText: {
    ...TextStyles.h3,
    color: Colors.destructive,
    marginBottom: Spacing.sm,
  },
  errorSubtext: {
    ...TextStyles.body,
    color: Colors.mutedForeground,
    textAlign: 'center',
  },
  programHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  programTitle: {
    ...TextStyles.body,
    color: Colors.foreground,
    fontWeight: '600',
  },
  sectionHeader: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.background,
  },
  sectionTitle: {
    ...TextStyles.h5,
    color: Colors.foreground,
    fontWeight: '600',
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingBottom: 120,
  },
  workoutItem: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  workoutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
  },
  workoutHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  workoutName: {
    ...TextStyles.h4,
    color: Colors.foreground,
    fontWeight: '600',
    marginLeft: Spacing.sm,
  },
  exerciseCount: {
    ...TextStyles.caption,
    color: Colors.mutedForeground,
  },
  exercisesContainer: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    padding: Spacing.lg,
  },
  exercisePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.secondary,
    borderRadius: 8,
    marginBottom: Spacing.sm,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    ...TextStyles.body,
    color: Colors.foreground,
    fontWeight: '500',
  },
  exerciseMuscle: {
    ...TextStyles.caption,
    color: Colors.mutedForeground,
    marginTop: 2,
  },
  exerciseTarget: {
    alignItems: 'flex-end',
  },
  targetText: {
    ...TextStyles.caption,
    color: Colors.mutedForeground,
    textAlign: 'right',
  },
  startWorkoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: 8,
    marginTop: Spacing.md,
    gap: Spacing.sm,
    minHeight: 48,
  },
  startWorkoutButtonPressed: {
    backgroundColor: Colors.primary,
    opacity: 0.8,
  },
  startWorkoutText: {
    ...TextStyles.button,
    color: Colors.white,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  emptyText: {
    ...TextStyles.h4,
    color: Colors.foreground,
    marginBottom: Spacing.sm,
  },
  emptySubtext: {
    ...TextStyles.body,
    color: Colors.mutedForeground,
    textAlign: 'center',
    maxWidth: 280,
  },
  adHocContainer: {
    marginTop: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  adHocButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.secondary,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
  },
  adHocButtonPressed: {
    backgroundColor: Colors.muted,
  },
  adHocButtonText: {
    ...TextStyles.button,
    color: Colors.foreground,
    fontWeight: '600',
  },
  descriptionContainer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.background,
  },
  descriptionText: {
    ...TextStyles.body,
    color: Colors.mutedForeground,
    textAlign: 'center',
  },
  gymToggleContainer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  workoutButtonsContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingLeft: 0,
    paddingRight: Spacing.xl * 3,
    paddingVertical: Spacing.sm,
  },
  workoutButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
  },
  workoutButtonSelected: {
    opacity: 0.8,
    borderWidth: 2,
    borderColor: Colors.white,
  },
  workoutButtonPressed: {
    opacity: 0.7,
  },
  workoutButtonText: {
    ...TextStyles.button,
    color: Colors.white,
    fontWeight: '600',
    textAlign: 'center',
  },
  selectedWorkoutContainer: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  selectedWorkoutTitle: {
    ...TextStyles.h5,
    color: Colors.foreground,
    fontWeight: '600',
    marginBottom: Spacing.md,
  },
  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.secondary,
    borderRadius: 8,
    marginBottom: Spacing.sm,
  },
  contentArea: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    marginHorizontal: Spacing.sm,
    marginTop: 0,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  contentTitle: {
    ...TextStyles.h5,
    color: Colors.foreground,
    fontWeight: '600',
    marginBottom: Spacing.md,
  },
  workoutListContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl * 2,
  },
  exerciseCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  exerciseHeader: {
    padding: Spacing.lg,
  },
  expandedContent: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    padding: Spacing.lg,
  },
  setHeaders: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.secondary,
    borderRadius: 6,
    marginBottom: Spacing.sm,
  },
  headerText: {
    ...TextStyles.captionMedium,
    color: Colors.mutedForeground,
    textAlign: 'center',
  },
  setColumn: {
    width: 30,
  },
  prevColumn: {
    flex: 1,
  },
  weightColumn: {
    width: 80,
  },
  repsColumn: {
    width: 60,
  },
  doneColumn: {
    width: 32,
    marginLeft: Spacing.sm,
  },
  addSetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.secondary,
    borderRadius: 8,
    marginTop: Spacing.sm,
    gap: Spacing.xs,
  },
  addSetButtonPressed: {
    backgroundColor: Colors.muted,
  },
  addSetText: {
    ...TextStyles.buttonSmall,
    color: Colors.primary,
  },
  exercisesList: {
    paddingBottom: Spacing.xl,
  },
  workoutControls: {
    marginTop: Spacing.lg,
  },
  startWorkoutContainer: {
    marginTop: Spacing.lg,
    alignItems: 'center',
  },
  workoutActionButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
    justifyContent: 'center',
    marginTop: Spacing.lg,
  },
  cancelWorkoutButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.mutedForeground,
    backgroundColor: Colors.secondary,
    minHeight: 48,
  },
  cancelWorkoutButtonPressed: {
    backgroundColor: Colors.muted,
  },
  cancelWorkoutText: {
    ...TextStyles.button,
    color: Colors.mutedForeground,
    fontWeight: '600',
  },
  workoutsScroll: {
    paddingHorizontal: Spacing.lg,
    paddingTop: 0,
    paddingBottom: 0,
  },
  noExercisesText: {
    ...TextStyles.body,
    color: Colors.mutedForeground,
    textAlign: 'center',
    marginTop: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  workoutTitleContainer: {
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  loadingExercisesContainer: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingExercisesText: {
    ...TextStyles.body,
    color: Colors.mutedForeground,
    textAlign: 'center',
  },
});
