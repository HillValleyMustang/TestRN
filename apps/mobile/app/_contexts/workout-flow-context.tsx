import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { BackHandler } from 'react-native';
import { useRouter } from 'expo-router';
// Simple UUID generator for React Native
import { ToastAndroid } from 'react-native';
import { generateUUID } from '../../lib/utils';
import { createTaggedLogger } from '../../lib/logger';

const log = createTaggedLogger('WorkoutFlowContext');

// Import types and utilities
import type { TPath, WorkoutSession } from '@data/storage';
import type { FetchedExerciseDefinition } from '../_lib/supabase';
import { database, addToSyncQueue } from '../_lib/database';
import { fetchExerciseDefinitions } from '../_lib/supabase';
import { supabase } from '../_lib/supabase';
import { useAuth } from './auth-context';
import { useData } from './data-context';
import { saveWorkoutState, loadWorkoutState, clearWorkoutState, type InFlightWorkoutState } from '../../lib/workoutStorage';
import { type SetLogState, hasUserInput } from '../../types/workout';

interface WorkoutExercise extends FetchedExerciseDefinition {
  is_bonus_exercise?: boolean;
}

const DEFAULT_INITIAL_SETS = 3;

interface WorkoutFlowContextValue {
  // State
  isWorkoutActive: boolean;
  hasUnsavedChanges: boolean;
  activeWorkout: TPath | null;
  exercisesForSession: WorkoutExercise[];
  exercisesWithSets: Record<string, SetLogState[]>;
  currentSessionId: string | null;
  sessionStartTime: Date | null;
  completedExercises: Set<string>;
  isCreatingSession: boolean;
  expandedExerciseCards: Record<string, boolean>;
  showUnsavedChangesDialog: boolean;

  // Actions
  selectWorkout: (workoutId: string | null) => Promise<void>;
  selectWorkoutOnly: (workoutId: string | null) => Promise<void>;
  selectAndStartWorkout: (workoutId: string | null) => Promise<void>;
  startWorkout: (firstSetTimestamp: string) => Promise<void>;
  finishWorkout: (rating?: number) => Promise<string | null>;
  updateSet: (exerciseId: string, setIndex: number, updates: Partial<SetLogState>) => void;
  addSet: (exerciseId: string) => void;
  removeSet: (exerciseId: string, setIndex: number) => void;
  logSet: (exerciseId: string, setId: string, reps: number, weight: number) => void;
  markExerciseAsCompleted: (exerciseId: string) => void;
  addExerciseToSession: (exercise: FetchedExerciseDefinition) => Promise<void>;
  removeExerciseFromSession: (exerciseId: string) => Promise<void>;
  substituteExercise: (oldExerciseId: string, newExercise: WorkoutExercise) => Promise<void>;
  toggleExerciseCardExpansion: (exerciseId: string) => void;
  resetWorkoutSession: () => Promise<void>;

  // Navigation
  requestNavigation: (action: () => void) => void;
  confirmLeave: (onLeave?: () => void) => void;
  cancelLeave: () => void;

  // Resume functionality
  loadSavedWorkoutState: () => Promise<InFlightWorkoutState | null>;
  resumeWorkout: (state: InFlightWorkoutState) => Promise<void>;
}

const WorkoutFlowContext = createContext<WorkoutFlowContextValue | undefined>(
  undefined
);

export const WorkoutFlowProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const router = useRouter();
  const { userId } = useAuth();
  const { exerciseRefreshCounter } = useData();

  // Core workout state
  const [activeWorkout, setActiveWorkout] = useState<TPath | null>(null);
  const [exercisesForSession, setExercisesForSession] = useState<WorkoutExercise[]>([]);
  const [exercisesWithSets, setExercisesWithSets] = useState<Record<string, SetLogState[]>>({});
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [completedExercises, setCompletedExercises] = useState<Set<string>>(new Set());
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [expandedExerciseCards, setExpandedExerciseCards] = useState<Record<string, boolean>>({});

  // Navigation state
  const [showUnsavedChangesDialog, setShowUnsavedChangesDialog] = useState(false);
  const pendingActionRef = useRef<(() => void) | null>(null);

  // Computed state
  const isWorkoutActive = useMemo(() => !!activeWorkout, [activeWorkout]);
  const hasUnsavedChanges = useMemo(() => {
    if (!isWorkoutActive) return false;
    return Object.values(exercisesWithSets).flat().some(set => !set.isSaved && hasUserInput(set));
  }, [isWorkoutActive, exercisesWithSets]);

  // Auto-save workout state to AsyncStorage (debounced)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    // Only save if workout is active and we have a userId
    if (!isWorkoutActive || !userId || !currentSessionId) {
      return;
    }

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounce save by 500ms
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const stateToSave: Omit<InFlightWorkoutState, 'savedAt'> = {
          activeWorkout,
          exercisesForSession,
          exercisesWithSets,
          currentSessionId,
          sessionStartTime: sessionStartTime ? sessionStartTime.toISOString() : null,
          completedExercises: Array.from(completedExercises),
          expandedExerciseCards,
        };
        await saveWorkoutState(userId, stateToSave);
      } catch (error) {
        log.error('[WorkoutFlow] Error auto-saving workout state:', error);
      }
    }, 500);

    // Cleanup timeout on unmount or dependency change
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [
    isWorkoutActive,
    userId,
    activeWorkout,
    exercisesForSession,
    exercisesWithSets,
    currentSessionId,
    sessionStartTime,
    completedExercises,
    expandedExerciseCards,
  ]);

  // Reset local state
  const _resetLocalState = useCallback(() => {
    setActiveWorkout(null);
    setExercisesForSession([]);
    setExercisesWithSets({});
    setCurrentSessionId(null);
    setSessionStartTime(null);
    setCompletedExercises(new Set());
    setIsCreatingSession(false);
    setExpandedExerciseCards({});
  }, []);

  // Reset workout session
  const resetWorkoutSession = useCallback(async () => {
    // Capture sessionId before resetting state (since _resetLocalState clears it)
    const sessionIdToDelete = currentSessionId;
    
    // CRITICAL: Only delete INCOMPLETE sessions from database
    // Completed sessions should be preserved for dashboard display
    if (sessionIdToDelete) {
      try {
        // Check if session is completed before deleting
        const session = await database.getWorkoutSessionById(sessionIdToDelete);
        
        if (session && session.completed_at) {
          // Don't delete completed sessions - they should persist for dashboard
        } else {
          await database.deleteWorkoutSession(sessionIdToDelete);
        }
      } catch (error) {
        log.error('[WorkoutFlow] Error handling workout session deletion:', error);
        // Don't block the reset if deletion fails
      }
    }
    
    _resetLocalState();
    // Clear saved workout state from AsyncStorage
    if (userId) {
      try {
        await clearWorkoutState(userId);
      } catch (error) {
        log.error('[WorkoutFlow] Error clearing workout state:', error);
      }
    }
  }, [_resetLocalState, userId, currentSessionId]);

  // Select workout
  const selectWorkout = useCallback(async (workoutId: string | null) => {
    await resetWorkoutSession();
    if (!workoutId || !userId) {
      return;
    }

    if (workoutId === 'ad-hoc') {
      setActiveWorkout({
        id: 'ad-hoc',
        user_id: userId,
        template_name: 'Ad Hoc Workout',
        description: null,
        is_main_program: false,
        parent_t_path_id: null,
        order_index: null,
        is_ai_generated: false,
        ai_generation_params: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      // For ad-hoc workouts, start with empty exercises
      setExercisesForSession([]);
      setExercisesWithSets({});
      setCompletedExercises(new Set());
      setExpandedExerciseCards({});
      return;
    }

    // Fetch workout from database
    const workout = await database.getTPath(workoutId);
    if (workout) {
      setActiveWorkout(workout);

      // Load exercises immediately for structured workouts
      try {
        const exercises = await database.getTPathExercises(workoutId);
        const exerciseIds = exercises.map(ex => ex.exercise_id);

        if (exerciseIds.length > 0) {
          // Show all exercises assigned to the workout
          // Note: We don't filter by gym here because exercises are already assigned to workouts
          // by the generate-t-path function based on gym availability. The gym filtering
          // happens during workout generation, not during display.
          const exerciseDefs = await fetchExerciseDefinitions(exerciseIds);
          
          // Check if exercise definitions are available
          if (exerciseDefs && exerciseDefs.length > 0) {
            const exerciseDefMap = new Map(exerciseDefs.map((def: any) => [def.id, def]));

            // Deduplicate exercises by exercise_id - keep first occurrence based on order_index
            const seenExerciseIds = new Set<string>();
            const uniqueExercises = exercises
              .sort((a, b) => a.order_index - b.order_index)
              .filter(ex => {
                if (seenExerciseIds.has(ex.exercise_id)) {
                  log.warn(`[WorkoutFlow] Duplicate exercise ID detected: ${ex.exercise_id}, skipping duplicate`);
                  return false;
                }
                seenExerciseIds.add(ex.exercise_id);
                return true;
              });

            const workoutExercises: WorkoutExercise[] = uniqueExercises
              .map(ex => {
                const def = exerciseDefMap.get(ex.exercise_id);
                return def ? { ...def, is_bonus_exercise: ex.is_bonus_exercise } : null;
              })
              .filter(Boolean) as WorkoutExercise[];

            setExercisesForSession(workoutExercises);
            setExpandedExerciseCards(Object.fromEntries(workoutExercises.map(ex => [ex.id, false])));
          } else {
            // Fallback when exercise_definitions table is empty
            log.warn('[WorkoutFlow] No exercise definitions found in Supabase, using fallback names');
            
            const fallbackExercises = exercises
              .sort((a, b) => a.order_index - b.order_index)
              .map(ex => ({
                id: ex.exercise_id,
                name: `Exercise ${ex.exercise_id.slice(0, 8)}`, // Use first 8 chars of ID as fallback
                main_muscle: 'Unknown',
                type: 'strength' as const,
                category: 'compound' as const,
                description: null,
                pro_tip: null,
                video_url: null,
                equipment: 'bodyweight',
                movement_type: 'strength' as const,
                movement_pattern: 'push' as const,
                created_at: null,
                updated_at: null,
                is_favorited_by_current_user: false,
                duplicate_status: 'none' as const,
                existing_id: null,
                is_bonus_exercise: ex.is_bonus_exercise
              }));

            setExercisesForSession(fallbackExercises);
            setExpandedExerciseCards(Object.fromEntries(fallbackExercises.map(ex => [ex.id, false])));
          }
        } else {
          setExercisesForSession([]);
          setExercisesWithSets({});
          setCompletedExercises(new Set());
          setExpandedExerciseCards({});
        }
      } catch (error) {
        log.error('[WorkoutFlow] Error loading exercises in selectWorkout:', error);
        ToastAndroid.show('Failed to load workout exercises.', ToastAndroid.SHORT);
        setExercisesForSession([]);
        setExercisesWithSets({});
        setCompletedExercises(new Set());
        setExpandedExerciseCards({});
      }
    } else {
      log.warn('[WorkoutFlow] Workout not found in database:', workoutId);
      ToastAndroid.show('Selected workout not found.', ToastAndroid.SHORT);
    }
  }, [resetWorkoutSession, userId]);

  // Select workout (loads exercises but doesn't start session)
  const selectWorkoutOnly = useCallback(async (workoutId: string | null) => {
    await resetWorkoutSession();
    if (!workoutId || !userId) {
      return;
    }

    if (workoutId === 'ad-hoc') {
      setActiveWorkout({
        id: 'ad-hoc',
        user_id: userId,
        template_name: 'Ad Hoc Workout',
        description: null,
        is_main_program: false,
        parent_t_path_id: null,
        order_index: null,
        is_ai_generated: false,
        ai_generation_params: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      // For ad-hoc workouts, start with empty exercises
      setExercisesForSession([]);
      setExercisesWithSets({});
      setCompletedExercises(new Set());
      setExpandedExerciseCards({});
      return;
    }

    // Fetch workout from database
    const workout = await database.getTPath(workoutId);
    if (workout) {
      setActiveWorkout(workout);

      // Load exercises for preview (no session started)
      try {
        const exercises = await database.getTPathExercises(workoutId);
        const exerciseIds = exercises.map(ex => ex.exercise_id);

        if (exerciseIds.length > 0) {
          // Show all exercises assigned to the workout
          // Note: We don't filter by gym here because exercises are already assigned to workouts
          // by the generate-t-path function based on gym availability. The gym filtering
          // happens during workout generation, not during display.
          const exerciseDefs = await fetchExerciseDefinitions(exerciseIds);

          // Check if exercise definitions are available
          if (exerciseDefs && exerciseDefs.length > 0) {
            const exerciseDefMap = new Map(exerciseDefs.map((def: any) => [def.id, def]));

            const workoutExercises: WorkoutExercise[] = exercises
              .sort((a, b) => a.order_index - b.order_index)
              .map(ex => {
                const def = exerciseDefMap.get(ex.exercise_id);
                return def ? { ...def, is_bonus_exercise: ex.is_bonus_exercise } : null;
              })
              .filter(Boolean) as WorkoutExercise[];

            setExercisesForSession(workoutExercises);
            setExpandedExerciseCards(Object.fromEntries(workoutExercises.map(ex => [ex.id, false])));
          } else {
            // Fallback when exercise_definitions table is empty
            log.warn('[WorkoutFlow] No exercise definitions found in Supabase, using fallback names');

            const fallbackExercises = exercises
              .sort((a, b) => a.order_index - b.order_index)
              .map(ex => ({
                id: ex.exercise_id,
                name: `Exercise ${ex.exercise_id.slice(0, 8)}`, // Use first 8 chars of ID as fallback
                main_muscle: 'Unknown',
                type: 'strength' as const,
                category: 'compound' as const,
                description: null,
                pro_tip: null,
                video_url: null,
                equipment: 'bodyweight',
                movement_type: 'strength' as const,
                movement_pattern: 'push' as const,
                created_at: null,
                updated_at: null,
                is_favorited_by_current_user: false,
                duplicate_status: 'none' as const,
                existing_id: null,
                is_bonus_exercise: ex.is_bonus_exercise
              }));

            setExercisesForSession(fallbackExercises);
            setExpandedExerciseCards(Object.fromEntries(fallbackExercises.map(ex => [ex.id, false])));
          }
        } else {
          setExercisesForSession([]);
          setExercisesWithSets({});
          setCompletedExercises(new Set());
          setExpandedExerciseCards({});
        }
      } catch (error) {
        log.error('[WorkoutFlow] Error loading exercises in selectWorkoutOnly:', error);
        ToastAndroid.show('Failed to load workout exercises.', ToastAndroid.SHORT);
        setExercisesForSession([]);
        setExercisesWithSets({});
        setCompletedExercises(new Set());
        setExpandedExerciseCards({});
      }
    } else {
      log.warn('[WorkoutFlow] Workout not found in database:', workoutId);
      ToastAndroid.show('Selected workout not found.', ToastAndroid.SHORT);
    }
  }, [resetWorkoutSession, userId]);

  // Combined select and start workout function (kept for backward compatibility)
  const selectAndStartWorkout = useCallback(async (workoutId: string | null) => {
    // For now, just select the workout (don't auto-start session)
    await selectWorkoutOnly(workoutId);
  }, [selectWorkoutOnly]);

  // Start workout session
  const startWorkout = useCallback(async (firstSetTimestamp: string) => {
    if (!userId) {
      ToastAndroid.show('Cannot start workout session.', ToastAndroid.SHORT);
      return;
    }

    if (!activeWorkout) {
      ToastAndroid.show('Cannot start workout session.', ToastAndroid.SHORT);
      return;
    }

    if (exercisesForSession.length === 0) {
      ToastAndroid.show('Cannot start workout - no exercises found.', ToastAndroid.SHORT);
      return;
    }

    setIsCreatingSession(true);
    try {
      // Get active gym_id from profile to associate workout with gym
      let activeGymId: string | null = null;
      try {
        const profile = await database.getProfile(userId);
        activeGymId = profile?.active_gym_id || null;
      } catch (error) {
        log.warn('[WorkoutFlow] Failed to get active_gym_id from profile:', error);
      }

      const newSessionId = generateUUID();
      const sessionData: WorkoutSession = {
        id: newSessionId,
        user_id: userId,
        session_date: firstSetTimestamp,
        template_name: activeWorkout.template_name,
        completed_at: null,
        rating: null,
        duration_string: null,
        t_path_id: activeWorkout.id === 'ad-hoc' ? null : activeWorkout.id,
        gym_id: activeGymId,
        created_at: new Date().toISOString(),
      };

      await database.addWorkoutSession(sessionData);
      await addToSyncQueue('create', 'workout_sessions', sessionData);

      setCurrentSessionId(newSessionId);
      setSessionStartTime(new Date(firstSetTimestamp));

      // Initialize sets for exercises
      const initialSets = Object.fromEntries(
        exercisesForSession.map(ex => [
          ex.id,
          Array.from({ length: DEFAULT_INITIAL_SETS }, () => ({
            id: generateUUID(),
            created_at: null,
            session_id: newSessionId,
            exercise_id: ex.id,
            weight_kg: null,
            reps: null,
            reps_l: null,
            reps_r: null,
            time_seconds: null,
            is_pb: false,
            isSaved: false,
            isPR: false,
            lastWeight: null,
            lastReps: null,
            lastRepsL: null,
            lastRepsR: null,
            lastTimeSeconds: null,
          }))
        ])
      );
      setExercisesWithSets(initialSets);
      setExpandedExerciseCards(Object.fromEntries(exercisesForSession.map(ex => [ex.id, false])));
    } catch (error) {
      log.error('[WorkoutFlow] Error starting workout session:', error);
      ToastAndroid.show('Failed to start workout session.', ToastAndroid.SHORT);
    } finally {
      setIsCreatingSession(false);
    }
  }, [userId, activeWorkout, exercisesForSession]);

  // Finish workout session
  const finishWorkout = useCallback(async (rating?: number): Promise<string | null> => {
    if (!currentSessionId || !sessionStartTime || !activeWorkout) {
      ToastAndroid.show('Workout session not properly started.', ToastAndroid.SHORT);
      return null;
    }

    // Save ALL sets that have user input (not just unsaved ones, since "Save Exercise" no longer saves to DB)
    const setsToSave: Array<{ exerciseId: string; set: SetLogState; setIndex: number }> = [];
    for (const [exerciseId, sets] of Object.entries(exercisesWithSets)) {
      sets.forEach((set, setIndex) => {
        if (hasUserInput(set)) {
          setsToSave.push({ exerciseId, set, setIndex });
        }
      });
    }

    // Save all sets with user input to database
    for (const { exerciseId, set, setIndex } of setsToSave) {
      try {
        // Generate ID if set doesn't have one
        const setId = set.id || generateUUID();
        const setData = {
          id: setId,
          session_id: currentSessionId!,
          exercise_id: exerciseId,
          weight_kg: set.weight_kg,
          reps: set.reps,
          reps_l: set.reps_l,
          reps_r: set.reps_r,
          time_seconds: set.time_seconds,
          is_pb: set.is_pb || set.isPR || false,
          created_at: set.created_at || new Date().toISOString(),
        };

        log.log('Saving set to database:', setData);
        await database.addSetLog(setData);
        await addToSyncQueue('create', 'set_logs', setData);

        // Update the set as saved in local state with the generated ID
        updateSet(exerciseId, setIndex, { id: setId, isSaved: true, created_at: setData.created_at });
      } catch (error) {
        log.error('Error saving set:', error);
      }
    }

    const endTime = new Date();
    const durationMs = endTime.getTime() - sessionStartTime.getTime();
    const durationSeconds = Math.round(durationMs / 1000);
    const durationString = durationSeconds < 60
      ? `${durationSeconds} seconds`
      : durationSeconds < 3600
      ? `${Math.floor(durationSeconds / 60)}m ${durationSeconds % 60}s`
      : `${Math.floor(durationSeconds / 3600)}h ${Math.floor((durationSeconds % 3600) / 60)}m`;

    try {
      const updatePayload: any = { duration_string: durationString, completed_at: endTime.toISOString() };
      if (rating !== undefined) {
        updatePayload.rating = rating;
      }

      // Update the session in database
      if (userId) {
        // Directly query the session by its ID instead of filtering from all sessions
        const existingSession = await database.getWorkoutSessionById(currentSessionId);
        if (existingSession) {
          const updatedSession = { ...existingSession, ...updatePayload };
          await database.addWorkoutSession(updatedSession); // This will replace due to INSERT OR REPLACE
          await addToSyncQueue('update', 'workout_sessions', updatedSession);

          // Force a longer delay to ensure the update is committed
          await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
          log.error('[WorkoutFlow] Could not find session to update:', currentSessionId);
        }
      }

      const finishedSessionId = currentSessionId;

      // Clear saved workout state from AsyncStorage after successful completion
      if (userId) {
        try {
          await clearWorkoutState(userId);
        } catch (error) {
          log.error('[WorkoutFlow] Error clearing workout state after completion:', error);
        }
      }

      // Don't reset workout session here - let the summary screen handle it
      // await resetWorkoutSession();

      // Don't show toast here - let the summary modal handle the completion message
      return finishedSessionId;
    } catch (error) {
      log.error('[WorkoutFlow] Error finishing workout session:', error);
      ToastAndroid.show('Failed to save workout duration.', ToastAndroid.SHORT);
      return null;
    }
  }, [currentSessionId, sessionStartTime, activeWorkout, userId, exercisesWithSets, resetWorkoutSession]);

  // Update set
  const updateSet = useCallback(async (exerciseId: string, setIndex: number, updates: Partial<SetLogState>) => {
    // Auto-start workout session when user enters weight/reps data
    const hasWeightOrRepsData = updates.weight_kg !== undefined || updates.reps !== undefined ||
                               updates.reps_l !== undefined || updates.reps_r !== undefined ||
                               updates.time_seconds !== undefined;

    if (!currentSessionId && activeWorkout && hasWeightOrRepsData) {
      await startWorkout(new Date().toISOString());
    }

    setExercisesWithSets(prev => {
      const exerciseSets = prev[exerciseId];
      if (!exerciseSets || !exerciseSets[setIndex]) return prev;

      const updatedSets = [...exerciseSets];
      updatedSets[setIndex] = { ...updatedSets[setIndex], ...updates };

      return { ...prev, [exerciseId]: updatedSets };
    });
  }, [currentSessionId, activeWorkout, startWorkout]);

  // Log set (mark as completed and save) - starts session if not already started
  const logSet = useCallback(async (exerciseId: string, setId: string, reps: number, weight: number) => {
    log.log('logSet called with:', { exerciseId, setId, reps, weight });

    // Start workout session if not already started
    if (!currentSessionId && activeWorkout) {
      await startWorkout(new Date().toISOString());
    }

    setExercisesWithSets(prev => {
      const exerciseSets = prev[exerciseId];
      if (!exerciseSets) return prev;

      const setIndex = exerciseSets.findIndex(set => set.id === setId);
      if (setIndex === -1) return prev;

      const updatedSets = [...exerciseSets];
      updatedSets[setIndex] = {
        ...updatedSets[setIndex],
        reps,
        weight_kg: weight,
        isSaved: true,
        created_at: new Date().toISOString(),
      };

      return { ...prev, [exerciseId]: updatedSets };
    });

    // Save to database
    try {
      if (!currentSessionId) {
        log.error('Cannot save set - no current session ID');
        return;
      }

      const setData = {
        id: setId,
        session_id: currentSessionId,
        exercise_id: exerciseId,
        weight_kg: weight,
        reps: reps,
        reps_l: null,
        reps_r: null,
        time_seconds: null,
        is_pb: false,
        created_at: new Date().toISOString(),
      };

      log.log('Saving set to database:', setData);
      await database.addSetLog(setData);
      await addToSyncQueue('create', 'set_logs', setData);
      log.log('Set saved successfully');
    } catch (error) {
      log.error('Error saving set to database:', error);
    }
  }, [currentSessionId, activeWorkout, startWorkout]);

  // Add set
  const addSet = useCallback((exerciseId: string) => {
    setExercisesWithSets(prev => {
      const exerciseSets = prev[exerciseId] || [];
      const newSet: SetLogState = {
        id: generateUUID(),
        created_at: null,
        session_id: currentSessionId,
        exercise_id: exerciseId,
        weight_kg: null,
        reps: null,
        reps_l: null,
        reps_r: null,
        time_seconds: null,
        is_pb: false,
        isSaved: false,
        isPR: false,
        lastWeight: null,
        lastReps: null,
        lastRepsL: null,
        lastRepsR: null,
        lastTimeSeconds: null,
      };
      return { ...prev, [exerciseId]: [...exerciseSets, newSet] };
    });
  }, [currentSessionId]);

  // Remove set
  const removeSet = useCallback((exerciseId: string, setIndex: number) => {
    setExercisesWithSets(prev => {
      const exerciseSets = prev[exerciseId];
      if (!exerciseSets) return prev;

      const updatedSets = exerciseSets.filter((_, index) => index !== setIndex);
      return { ...prev, [exerciseId]: updatedSets };
    });
  }, []);

  // Mark exercise as completed
  const markExerciseAsCompleted = useCallback((exerciseId: string) => {
    setCompletedExercises(prev => new Set(prev).add(exerciseId));
    setExpandedExerciseCards(prev => ({ ...prev, [exerciseId]: false }));
  }, []);

  // Add exercise to session
  const addExerciseToSession = useCallback(async (exercise: FetchedExerciseDefinition) => {
    if (exercisesForSession.some(ex => ex.id === exercise.id)) {
      ToastAndroid.show(`${exercise.name} is already in this session.`, ToastAndroid.SHORT);
      return;
    }

    setExercisesForSession(prev => [...prev, { ...exercise, is_bonus_exercise: false }]);
    const newSets: SetLogState[] = Array.from({ length: DEFAULT_INITIAL_SETS }, () => ({
      id: generateUUID(),
      created_at: null,
      session_id: currentSessionId,
      exercise_id: exercise.id!,
      weight_kg: null,
      reps: null,
      reps_l: null,
      reps_r: null,
      time_seconds: null,
      is_pb: false,
      isSaved: false,
      isPR: false,
      lastWeight: null,
      lastReps: null,
      lastRepsL: null,
      lastRepsR: null,
      lastTimeSeconds: null,
    }));
    setExercisesWithSets(prev => ({ ...prev, [exercise.id!]: newSets }));
    setExpandedExerciseCards(prev => ({ ...prev, [exercise.id!]: false }));
  }, [exercisesForSession, currentSessionId]);

  // Remove exercise from session
  const removeExerciseFromSession = useCallback(async (exerciseId: string) => {
    setExercisesForSession(prev => prev.filter(ex => ex.id !== exerciseId));
    setExercisesWithSets(prev => {
      const newSets = { ...prev };
      delete newSets[exerciseId];
      return newSets;
    });
    setCompletedExercises(prev => {
      const newCompleted = new Set(prev);
      newCompleted.delete(exerciseId);
      return newCompleted;
    });
    setExpandedExerciseCards(prev => {
      const newExpanded = { ...prev };
      delete newExpanded[exerciseId];
      return newExpanded;
    });
  }, []);

  // Substitute exercise
  const substituteExercise = useCallback(async (oldExerciseId: string, newExercise: WorkoutExercise) => {
    if (exercisesForSession.some(ex => ex.id === newExercise.id)) {
      ToastAndroid.show(`${newExercise.name} is already in this session.`, ToastAndroid.SHORT);
      return;
    }

    setExercisesForSession(prev => prev.map(ex => ex.id === oldExerciseId ? newExercise : ex));
    const newSets: SetLogState[] = Array.from({ length: DEFAULT_INITIAL_SETS }, () => ({
      id: generateUUID(),
      created_at: null,
      session_id: currentSessionId,
      exercise_id: newExercise.id!,
      weight_kg: null,
      reps: null,
      reps_l: null,
      reps_r: null,
      time_seconds: null,
      is_pb: false,
      isSaved: false,
      isPR: false,
      lastWeight: null,
      lastReps: null,
      lastRepsL: null,
      lastRepsR: null,
      lastTimeSeconds: null,
    }));
    setExercisesWithSets(prev => {
      const newSetsMap = { ...prev };
      delete newSetsMap[oldExerciseId];
      if (newExercise.id) {
        newSetsMap[newExercise.id] = newSets;
      }
      return newSetsMap;
    });
    setCompletedExercises(prev => {
      const newCompleted = new Set(prev);
      newCompleted.delete(oldExerciseId);
      return newCompleted;
    });
    setExpandedExerciseCards(prev => {
      const newExpanded = { ...prev };
      delete newExpanded[oldExerciseId];
      if (newExercise.id) {
        newExpanded[newExercise.id] = false;
      }
      return newExpanded;
    });
  }, [exercisesForSession, currentSessionId]);

  // Toggle exercise card expansion
  const toggleExerciseCardExpansion = useCallback((exerciseId: string) => {
    setExpandedExerciseCards(prev => ({ ...prev, [exerciseId]: !prev[exerciseId] }));
  }, []);

  // Navigation handlers
  const requestNavigation = useCallback(
    (action: () => void) => {
      if (hasUnsavedChanges) {
        pendingActionRef.current = action;
        setShowUnsavedChangesDialog(true);
        return;
      }
      action();
    },
    [hasUnsavedChanges]
  );

  const confirmLeave = useCallback(async (onLeave?: () => void) => {
    setShowUnsavedChangesDialog(false);
    await resetWorkoutSession();
    const action = pendingActionRef.current;
    pendingActionRef.current = null;
    // Force a small delay to ensure state has propagated
    setTimeout(() => {
      if (typeof onLeave === 'function') {
        onLeave();
      } else if (action) {
        action();
      }
    }, 100);
  }, [resetWorkoutSession]);

  const cancelLeave = useCallback(() => {
    setShowUnsavedChangesDialog(false);
    pendingActionRef.current = null;
  }, []);

  // Load saved workout state from AsyncStorage
  const loadSavedWorkoutState = useCallback(async (): Promise<InFlightWorkoutState | null> => {
    if (!userId) {
      return null;
    }
    try {
      const savedState = await loadWorkoutState(userId);
      return savedState;
    } catch (error) {
      log.error('[WorkoutFlow] Error loading saved workout state:', error);
      return null;
    }
  }, [userId]);

  // Resume workout from saved state
  const resumeWorkout = useCallback(async (state: InFlightWorkoutState): Promise<void> => {
    if (!userId) {
      log.error('[WorkoutFlow] Cannot resume workout - no userId');
      return;
    }

    try {
      // Verify session still exists in database, create new one if not
      let sessionId = state.currentSessionId;
      if (sessionId) {
        const existingSession = await database.getWorkoutSessionById(sessionId);
        if (!existingSession) {
          // Create new session
          const newSessionId = generateUUID();
          const sessionData: WorkoutSession = {
            id: newSessionId,
            user_id: userId,
            session_date: state.sessionStartTime || new Date().toISOString(),
            template_name: state.activeWorkout?.template_name || 'Ad Hoc Workout',
            completed_at: null,
            rating: null,
            duration_string: null,
            t_path_id: state.activeWorkout?.id === 'ad-hoc' ? null : state.activeWorkout?.id || null,
            created_at: new Date().toISOString(),
          };
          await database.addWorkoutSession(sessionData);
          await addToSyncQueue('create', 'workout_sessions', sessionData);
          sessionId = newSessionId;
        }
      }

      // Restore all state
      setActiveWorkout(state.activeWorkout);
      setExercisesForSession(state.exercisesForSession);
      setExercisesWithSets(state.exercisesWithSets);
      setCurrentSessionId(sessionId);
      setSessionStartTime(state.sessionStartTime ? new Date(state.sessionStartTime) : null);
      setCompletedExercises(new Set(state.completedExercises));
      setExpandedExerciseCards(state.expandedExerciseCards);
    } catch (error) {
      log.error('[WorkoutFlow] Error resuming workout:', error);
      ToastAndroid.show('Failed to resume workout.', ToastAndroid.SHORT);
    }
  }, [userId]);

  // Handle hardware back press
  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const handler = () => {
      pendingActionRef.current = () => router.back();
      setShowUnsavedChangesDialog(true);
      return true;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', handler);
    return () => subscription.remove();
  }, [hasUnsavedChanges, router]);

  // Load exercises when activeWorkout changes (for ad-hoc workouts that start empty)
  useEffect(() => {
    if (!activeWorkout || !userId || activeWorkout.id !== 'ad-hoc') {
      return;
    }

    // For ad-hoc workouts, just ensure empty state
    setExercisesForSession([]);
    setExercisesWithSets({});
    setCompletedExercises(new Set());
    setExpandedExerciseCards({});
  }, [activeWorkout, userId]);

  // Re-read exercises from SQLite when exercise order/list changes
  // (triggered by reorder/add/delete in Manage T-Path page)
  useEffect(() => {
    if (exerciseRefreshCounter === 0) return;
    if (!activeWorkout || activeWorkout.id === 'ad-hoc' || !userId) return;

    const refreshExercises = async () => {
      try {
        const exercises = await database.getTPathExercises(activeWorkout.id);
        const exerciseIds = exercises.map(ex => ex.exercise_id);
        if (exerciseIds.length === 0) return;

        const exerciseDefs = await fetchExerciseDefinitions(exerciseIds);
        if (!exerciseDefs || exerciseDefs.length === 0) return;

        const exerciseDefMap = new Map(exerciseDefs.map((def: any) => [def.id, def]));
        const seenExerciseIds = new Set<string>();
        const uniqueExercises = exercises
          .sort((a, b) => a.order_index - b.order_index)
          .filter(ex => {
            if (seenExerciseIds.has(ex.exercise_id)) return false;
            seenExerciseIds.add(ex.exercise_id);
            return true;
          });

        const workoutExercises: WorkoutExercise[] = uniqueExercises
          .map(ex => {
            const def = exerciseDefMap.get(ex.exercise_id);
            return def ? { ...def, is_bonus_exercise: ex.is_bonus_exercise } : null;
          })
          .filter(Boolean) as WorkoutExercise[];

        setExercisesForSession(workoutExercises);
      } catch (error) {
        log.error('[WorkoutFlow] Error refreshing exercises:', error);
      }
    };

    refreshExercises();
  }, [exerciseRefreshCounter, activeWorkout, userId]);

  const value = useMemo(
    () => ({
      // State
      isWorkoutActive,
      hasUnsavedChanges,
      activeWorkout,
      exercisesForSession,
      exercisesWithSets,
      currentSessionId,
      sessionStartTime,
      completedExercises,
      isCreatingSession,
      expandedExerciseCards,
      showUnsavedChangesDialog,

      // Actions
      selectWorkout,
      selectWorkoutOnly,
      selectAndStartWorkout,
      startWorkout,
      finishWorkout,
      updateSet,
      addSet,
      removeSet,
      logSet,
      markExerciseAsCompleted,
      addExerciseToSession,
      removeExerciseFromSession,
      substituteExercise,
      toggleExerciseCardExpansion,
      resetWorkoutSession,

      // Navigation
      requestNavigation,
      confirmLeave,
      cancelLeave,

      // Resume functionality
      loadSavedWorkoutState,
      resumeWorkout,
    }),
    [
      isWorkoutActive,
      hasUnsavedChanges,
      activeWorkout,
      exercisesForSession,
      exercisesWithSets,
      currentSessionId,
      sessionStartTime,
      completedExercises,
      isCreatingSession,
      expandedExerciseCards,
      showUnsavedChangesDialog,
      selectWorkout,
      selectAndStartWorkout,
      startWorkout,
      finishWorkout,
      updateSet,
      addSet,
      removeSet,
      markExerciseAsCompleted,
      addExerciseToSession,
      removeExerciseFromSession,
      substituteExercise,
      toggleExerciseCardExpansion,
      resetWorkoutSession,
      requestNavigation,
      confirmLeave,
      cancelLeave,
      loadSavedWorkoutState,
      resumeWorkout,
    ]
  );

  return (
    <WorkoutFlowContext.Provider value={value}>
      {children}
    </WorkoutFlowContext.Provider>
  );
};

export const useWorkoutFlow = () => {
  const context = useContext(WorkoutFlowContext);
  if (!context) {
    throw new Error('useWorkoutFlow must be used within a WorkoutFlowProvider');
  }
  return context;
};

export default WorkoutFlowProvider;
