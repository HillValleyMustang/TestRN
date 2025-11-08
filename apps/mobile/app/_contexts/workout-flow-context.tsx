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
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};
import { ToastAndroid } from 'react-native';

// Import types and utilities
import type { TPath, WorkoutSession } from '@data/storage';
import type { FetchedExerciseDefinition } from '../_lib/supabase';
import { database, addToSyncQueue } from '../_lib/database';
import { fetchExerciseDefinitions } from '../_lib/supabase';
import { useAuth } from './auth-context';

// Define types for workout state
interface SetLogState {
  id: string | null;
  created_at: string | null;
  session_id: string | null;
  exercise_id: string;
  weight_kg: number | null;
  reps: number | null;
  reps_l: number | null;
  reps_r: number | null;
  time_seconds: number | null;
  is_pb: boolean;
  isSaved: boolean;
  isPR: boolean;
  lastWeight: number | null;
  lastReps: number | null;
  lastRepsL: number | null;
  lastRepsR: number | null;
  lastTimeSeconds: number | null;
}

interface WorkoutExercise extends FetchedExerciseDefinition {
  is_bonus_exercise?: boolean;
}

const DEFAULT_INITIAL_SETS = 3;

// Helper function to check if a set has any user input
const hasUserInput = (set: SetLogState): boolean => {
  return (
    (set.weight_kg !== null && set.weight_kg > 0) ||
    (set.reps !== null && set.reps > 0) ||
    (set.reps_l !== null && set.reps_l > 0) ||
    (set.reps_r !== null && set.reps_r > 0) ||
    (set.time_seconds !== null && set.time_seconds > 0)
  );
};

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
  selectAndStartWorkout: (workoutId: string | null) => Promise<void>;
  startWorkout: (firstSetTimestamp: string) => Promise<void>;
  finishWorkout: () => Promise<string | null>;
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
}

const WorkoutFlowContext = createContext<WorkoutFlowContextValue | undefined>(
  undefined
);

export const WorkoutFlowProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const router = useRouter();
  const { userId } = useAuth();

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
    _resetLocalState();
  }, [_resetLocalState]);

  // Select workout
  const selectWorkout = useCallback(async (workoutId: string | null) => {
    console.log('[WorkoutFlow] selectWorkout called with:', workoutId);
    await resetWorkoutSession();
    if (!workoutId || !userId) {
      console.log('[WorkoutFlow] No workoutId or userId, returning');
      return;
    }

    if (workoutId === 'ad-hoc') {
      console.log('[WorkoutFlow] Setting up ad-hoc workout');
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
    console.log('[WorkoutFlow] Fetching workout from database:', workoutId);
    const workout = await database.getTPath(workoutId);
    if (workout) {
      console.log('[WorkoutFlow] Workout found:', workout.template_name);
      setActiveWorkout(workout);

      // Load exercises immediately for structured workouts
      try {
        console.log('[WorkoutFlow] Loading exercises for workout');
        const exercises = await database.getTPathExercises(workoutId);
        console.log('[WorkoutFlow] Found exercises:', exercises.length);
        const exerciseIds = exercises.map(ex => ex.exercise_id);

        if (exerciseIds.length > 0) {
          console.log('[WorkoutFlow] Fetching exercise definitions for:', exerciseIds.length, 'exercises');
          const exerciseDefs = await fetchExerciseDefinitions(exerciseIds);
          console.log('[WorkoutFlow] Fetched exercise definitions:', exerciseDefs.length);
          const exerciseDefMap = new Map(exerciseDefs.map((def: any) => [def.id, def]));

          const workoutExercises: WorkoutExercise[] = exercises
            .sort((a, b) => a.order_index - b.order_index)
            .map(ex => {
              const def = exerciseDefMap.get(ex.exercise_id);
              return def ? { ...def, is_bonus_exercise: ex.is_bonus_exercise } : null;
            })
            .filter(Boolean) as WorkoutExercise[];

          console.log('[WorkoutFlow] Setting exercises for session:', workoutExercises.length);
          setExercisesForSession(workoutExercises);
          setExpandedExerciseCards(Object.fromEntries(workoutExercises.map(ex => [ex.id, false])));
        } else {
          console.log('[WorkoutFlow] No exercise IDs found');
          setExercisesForSession([]);
          setExercisesWithSets({});
          setCompletedExercises(new Set());
          setExpandedExerciseCards({});
        }
      } catch (error) {
        console.error('[WorkoutFlow] Error loading exercises in selectWorkout:', error);
        ToastAndroid.show('Failed to load workout exercises.', ToastAndroid.SHORT);
        setExercisesForSession([]);
        setExercisesWithSets({});
        setCompletedExercises(new Set());
        setExpandedExerciseCards({});
      }
    } else {
      console.log('[WorkoutFlow] Workout not found in database');
      ToastAndroid.show('Selected workout not found.', ToastAndroid.SHORT);
    }
  }, [resetWorkoutSession, userId]);

  // Combined select and start workout function
  const selectAndStartWorkout = useCallback(async (workoutId: string | null) => {
    console.log('[WorkoutFlow] selectAndStartWorkout called with:', workoutId);
    // Don't reset the session here - let the caller handle it if needed
    // await resetWorkoutSession();
    if (!workoutId || !userId) {
      console.log('[WorkoutFlow] No workoutId or userId, returning');
      return;
    }

    if (workoutId === 'ad-hoc') {
      console.log('[WorkoutFlow] Setting up ad-hoc workout');
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
      // Start the workout immediately for ad-hoc
      const firstSetTimestamp = new Date().toISOString();
      console.log('[WorkoutFlow] startWorkout called with exercises:', 0);
      if (!userId) {
        console.log('[WorkoutFlow] Cannot start workout - missing userId');
        ToastAndroid.show('Cannot start workout session.', ToastAndroid.SHORT);
        return;
      }

      if (!activeWorkout) {
        console.log('[WorkoutFlow] Cannot start workout - no activeWorkout');
        ToastAndroid.show('Cannot start workout session.', ToastAndroid.SHORT);
        return;
      }

      if (0 === 0) {
        console.log('[WorkoutFlow] Cannot start workout - no exercises found');
        ToastAndroid.show('Cannot start workout - no exercises found.', ToastAndroid.SHORT);
        return;
      }

      setIsCreatingSession(true);
      try {
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
          created_at: new Date().toISOString(),
        };

        console.log('[WorkoutFlow] Creating session:', newSessionId);
        await database.addWorkoutSession(sessionData);
        await addToSyncQueue('create', 'workout_sessions', sessionData);

        setCurrentSessionId(newSessionId);
        setSessionStartTime(new Date(firstSetTimestamp));

        // Initialize sets for exercises
        console.log('[WorkoutFlow] Initializing sets for', 0, 'exercises');
        const initialSets = {};
        setExercisesWithSets(initialSets);
        setExpandedExerciseCards({});
        console.log('[WorkoutFlow] Workout session started successfully');

      } catch (error) {
        console.error('[WorkoutFlow] Error starting workout session:', error);
        ToastAndroid.show('Failed to start workout session.', ToastAndroid.SHORT);
      } finally {
        setIsCreatingSession(false);
      }
      return;
    }

    // Fetch workout from database
    console.log('[WorkoutFlow] Fetching workout from database:', workoutId);
    const workout = await database.getTPath(workoutId);
    if (workout) {
      console.log('[WorkoutFlow] Workout found:', workout.template_name);
      setActiveWorkout(workout);

      // Load exercises immediately for structured workouts
      try {
        console.log('[WorkoutFlow] Loading exercises for workout');
        const exercises = await database.getTPathExercises(workoutId);
        console.log('[WorkoutFlow] Found exercises:', exercises.length);
        const exerciseIds = exercises.map(ex => ex.exercise_id);

        if (exerciseIds.length > 0) {
          console.log('[WorkoutFlow] Fetching exercise definitions for:', exerciseIds.length, 'exercises');
          const exerciseDefs = await fetchExerciseDefinitions(exerciseIds);
          console.log('[WorkoutFlow] Fetched exercise definitions:', exerciseDefs.length);
          const exerciseDefMap = new Map(exerciseDefs.map((def: any) => [def.id, def]));

          const workoutExercises: WorkoutExercise[] = exercises
            .sort((a, b) => a.order_index - b.order_index)
            .map(ex => {
              const def = exerciseDefMap.get(ex.exercise_id);
              return def ? { ...def, is_bonus_exercise: ex.is_bonus_exercise } : null;
            })
            .filter(Boolean) as WorkoutExercise[];

          console.log('[WorkoutFlow] Setting exercises for session:', workoutExercises.length);
          setExercisesForSession(workoutExercises);
          setExpandedExerciseCards(Object.fromEntries(workoutExercises.map(ex => [ex.id, false])));

          // Start workout after exercises are loaded
          const firstSetTimestamp = new Date().toISOString();
          console.log('[WorkoutFlow] startWorkout called with exercises:', workoutExercises.length);
          if (!userId) {
            console.log('[WorkoutFlow] Cannot start workout - missing userId');
            ToastAndroid.show('Cannot start workout session.', ToastAndroid.SHORT);
            return;
          }

          if (!workout) {
            console.log('[WorkoutFlow] Cannot start workout - no activeWorkout');
            ToastAndroid.show('Cannot start workout session.', ToastAndroid.SHORT);
            return;
          }

          if (workoutExercises.length === 0) {
            console.log('[WorkoutFlow] Cannot start workout - no exercises found');
            ToastAndroid.show('Cannot start workout - no exercises found.', ToastAndroid.SHORT);
            return;
          }

          setIsCreatingSession(true);
          try {
            const newSessionId = generateUUID();
            const sessionData: WorkoutSession = {
              id: newSessionId,
              user_id: userId,
              session_date: firstSetTimestamp,
              template_name: workout.template_name,
              completed_at: null,
              rating: null,
              duration_string: null,
              t_path_id: workout.id === 'ad-hoc' ? null : workout.id,
              created_at: new Date().toISOString(),
            };

            console.log('[WorkoutFlow] Creating session:', newSessionId);
            await database.addWorkoutSession(sessionData);
            await addToSyncQueue('create', 'workout_sessions', sessionData);

            setCurrentSessionId(newSessionId);
            setSessionStartTime(new Date(firstSetTimestamp));

            // Initialize sets for exercises
            console.log('[WorkoutFlow] Initializing sets for', workoutExercises.length, 'exercises');
            const initialSets = Object.fromEntries(
              workoutExercises.map(ex => [
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
            setExpandedExerciseCards(Object.fromEntries(workoutExercises.map(ex => [ex.id, false])));
            console.log('[WorkoutFlow] Workout session started successfully');

          } catch (error) {
            console.error('[WorkoutFlow] Error starting workout session:', error);
            ToastAndroid.show('Failed to start workout session.', ToastAndroid.SHORT);
          } finally {
            setIsCreatingSession(false);
          }
        } else {
          console.log('[WorkoutFlow] No exercise IDs found');
          setExercisesForSession([]);
          setExercisesWithSets({});
          setCompletedExercises(new Set());
          setExpandedExerciseCards({});
        }
      } catch (error) {
        console.error('[WorkoutFlow] Error loading exercises in selectAndStartWorkout:', error);
        ToastAndroid.show('Failed to load workout exercises.', ToastAndroid.SHORT);
        setExercisesForSession([]);
        setExercisesWithSets({});
        setCompletedExercises(new Set());
        setExpandedExerciseCards({});
      }
    } else {
      console.log('[WorkoutFlow] Workout not found in database');
      ToastAndroid.show('Selected workout not found.', ToastAndroid.SHORT);
    }
  }, [resetWorkoutSession, userId]);

  // Start workout session
  const startWorkout = useCallback(async (firstSetTimestamp: string) => {
    console.log('[WorkoutFlow] startWorkout called with exercises:', exercisesForSession.length);
    if (!userId) {
      console.log('[WorkoutFlow] Cannot start workout - missing userId');
      ToastAndroid.show('Cannot start workout session.', ToastAndroid.SHORT);
      return;
    }

    if (!activeWorkout) {
      console.log('[WorkoutFlow] Cannot start workout - no activeWorkout');
      ToastAndroid.show('Cannot start workout session.', ToastAndroid.SHORT);
      return;
    }

    if (exercisesForSession.length === 0) {
      console.log('[WorkoutFlow] Cannot start workout - no exercises found');
      ToastAndroid.show('Cannot start workout - no exercises found.', ToastAndroid.SHORT);
      return;
    }

    setIsCreatingSession(true);
    try {
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
        created_at: new Date().toISOString(),
      };

      console.log('[WorkoutFlow] Creating session:', newSessionId);
      await database.addWorkoutSession(sessionData);
      await addToSyncQueue('create', 'workout_sessions', sessionData);

      setCurrentSessionId(newSessionId);
      setSessionStartTime(new Date(firstSetTimestamp));

      // Initialize sets for exercises
      console.log('[WorkoutFlow] Initializing sets for', exercisesForSession.length, 'exercises');
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
      console.log('[WorkoutFlow] Workout session started successfully');

    } catch (error) {
      console.error('[WorkoutFlow] Error starting workout session:', error);
      ToastAndroid.show('Failed to start workout session.', ToastAndroid.SHORT);
    } finally {
      setIsCreatingSession(false);
    }
  }, [userId, activeWorkout, exercisesForSession]);

  // Finish workout session
  const finishWorkout = useCallback(async (): Promise<string | null> => {
    if (!currentSessionId || !sessionStartTime || !activeWorkout) {
      ToastAndroid.show('Workout session not properly started.', ToastAndroid.SHORT);
      return null;
    }

    // Check if workout has any logged sets (prevent saving incomplete workouts)
    const hasLoggedSets = Object.values(exercisesWithSets).some(sets =>
      sets.some(set => set.isSaved && hasUserInput(set))
    );

    if (!hasLoggedSets) {
      console.log('[WorkoutFlow] No logged sets found - not saving incomplete workout');
      ToastAndroid.show('No workout data logged. Session not saved.', ToastAndroid.SHORT);
      // Reset the session without saving
      await resetWorkoutSession();
      return null;
    }

    const endTime = new Date();
    const durationMs = endTime.getTime() - sessionStartTime.getTime();
    const durationSeconds = Math.round(durationMs / 1000);
    const durationString = durationSeconds < 60
      ? `${durationSeconds} seconds`
      : durationSeconds < 3600
      ? `${Math.floor(durationSeconds / 60)} minutes`
      : `${Math.floor(durationSeconds / 3600)}h ${Math.floor((durationSeconds % 3600) / 60)}m`;

    console.log('[WorkoutFlow] Finishing workout session:', currentSessionId);
    console.log('[WorkoutFlow] Duration calculated:', durationString, 'from', durationMs, 'ms');

    try {
      const updatePayload = { duration_string: durationString, completed_at: endTime.toISOString() };
      console.log('[WorkoutFlow] Update payload:', updatePayload);

      // Update the session in database
      if (userId) {
        const existingSessions = await database.getWorkoutSessions(userId);
        const existingSession = existingSessions.find(s => s.id === currentSessionId);
        console.log('[WorkoutFlow] Found existing session:', !!existingSession);
        if (existingSession) {
          const updatedSession = { ...existingSession, ...updatePayload };
          console.log('[WorkoutFlow] Updating session with:', updatedSession);
          await database.addWorkoutSession(updatedSession); // This will replace due to INSERT OR REPLACE
          await addToSyncQueue('update', 'workout_sessions', updatedSession);
          console.log('[WorkoutFlow] Session updated successfully');

          // Force a longer delay to ensure the update is committed
          await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
          console.error('[WorkoutFlow] Could not find session to update:', currentSessionId);
        }
      }

      const finishedSessionId = currentSessionId;

      // Don't reset workout session here - let the summary screen handle it
      // await resetWorkoutSession();

      // Don't show toast here - let the summary modal handle the completion message
      return finishedSessionId;
    } catch (error) {
      console.error('[WorkoutFlow] Error finishing workout session:', error);
      ToastAndroid.show('Failed to save workout duration.', ToastAndroid.SHORT);
      return null;
    }
  }, [currentSessionId, sessionStartTime, activeWorkout, userId, exercisesWithSets, resetWorkoutSession]);

  // Update set
  const updateSet = useCallback((exerciseId: string, setIndex: number, updates: Partial<SetLogState>) => {
    setExercisesWithSets(prev => {
      const exerciseSets = prev[exerciseId];
      if (!exerciseSets || !exerciseSets[setIndex]) return prev;

      const updatedSets = [...exerciseSets];
      updatedSets[setIndex] = { ...updatedSets[setIndex], ...updates };

      return { ...prev, [exerciseId]: updatedSets };
    });
  }, []);

  // Log set (mark as completed and save)
  const logSet = useCallback(async (exerciseId: string, setId: string, reps: number, weight: number) => {
    console.log('logSet called with:', { exerciseId, setId, reps, weight });

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
        console.error('Cannot save set - no current session ID');
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

      console.log('Saving set to database:', setData);
      await database.addSetLog(setData);
      await addToSyncQueue('create', 'set_logs', setData);
      console.log('Set saved successfully');
    } catch (error) {
      console.error('Error saving set to database:', error);
    }
  }, [currentSessionId]);

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

    setExercisesForSession(prev => [{ ...exercise, is_bonus_exercise: false }, ...prev]);
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
    console.log('[WorkoutFlow] confirmLeave called');
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
