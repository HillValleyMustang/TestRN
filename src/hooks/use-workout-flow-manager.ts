"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Session, SupabaseClient } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { Tables, SetLogState, WorkoutExercise } from '@/types/supabase';
import { getMaxMinutes } from '@/lib/utils';

type TPath = Tables<'t_paths'>;
type ExerciseDefinition = Tables<'exercise_definitions'>;

interface UseWorkoutFlowManagerProps {
  activeWorkoutId?: string | null; // Renamed from initialWorkoutId
  session: Session | null;
  supabase: SupabaseClient;
  router: ReturnType<typeof useRouter>;
}

interface UseWorkoutFlowManagerReturn {
  activeWorkout: TPath | null;
  exercisesForSession: WorkoutExercise[];
  exercisesWithSets: Record<string, SetLogState[]>;
  allAvailableExercises: ExerciseDefinition[];
  loading: boolean;
  error: string | null;
  currentSessionId: string | null;
  sessionStartTime: Date | null;
  completedExercises: Set<string>;
  addExerciseToSession: (exercise: ExerciseDefinition) => void;
  removeExerciseFromSession: (exerciseId: string) => void;
  substituteExercise: (oldExerciseId: string, newExercise: WorkoutExercise) => void;
  updateSessionStartTime: (timestamp: string) => void;
  markExerciseAsCompleted: (exerciseId: string, isNewPR: boolean) => void;
  resetWorkoutSession: () => void;
  updateExerciseSets: (exerciseId: string, newSets: SetLogState[]) => void;
}

const DEFAULT_INITIAL_SETS = 3;

export const useWorkoutFlowManager = ({ activeWorkoutId, session, supabase, router }: UseWorkoutFlowManagerProps): UseWorkoutFlowManagerReturn => {
  const [activeWorkout, setActiveWorkout] = useState<TPath | null>(null);
  const [exercisesForSession, setExercisesForSession] = useState<WorkoutExercise[]>([]);
  const [exercisesWithSets, setExercisesWithSets] = useState<Record<string, SetLogState[]>>({});
  const [allAvailableExercises, setAllAvailableExercises] = useState<ExerciseDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [completedExercises, setCompletedExercises] = useState<Set<string>>(new Set());

  const resetWorkoutSession = useCallback(() => {
    setActiveWorkout(null);
    setExercisesForSession([]);
    setExercisesWithSets({});
    setCurrentSessionId(null);
    setSessionStartTime(null);
    setCompletedExercises(new Set());
    setLoading(false);
  }, []);

  const updateSessionStartTime = useCallback(async (timestamp: string) => {
    if (!currentSessionId) return;
    if (!sessionStartTime) {
      const { error: updateError } = await supabase
        .from('workout_sessions')
        .update({ session_date: timestamp })
        .eq('id', currentSessionId);

      if (updateError) {
        console.error("Failed to update workout session start time:", updateError);
        toast.error("Failed to record workout start time.");
      } else {
        setSessionStartTime(new Date(timestamp));
      }
    }
  }, [currentSessionId, sessionStartTime, supabase]);

  const markExerciseAsCompleted = useCallback((exerciseId: string, isNewPR: boolean) => {
    setCompletedExercises(prev => new Set(prev).add(exerciseId));
  }, []);

  const fetchAllAvailableExercises = useCallback(async () => {
    if (!session) return;
    const { data: exercisesData, error: fetchExercisesError } = await supabase
      .from('exercise_definitions')
      .select('id, name, main_muscle, type, category, description, pro_tip, video_url, library_id, is_favorite, created_at, user_id')
      .or(`user_id.eq.${session.user.id},user_id.is.null`)
      .order('name', { ascending: true });

    if (fetchExercisesError) {
      throw new Error(fetchExercisesError.message);
    }
    setAllAvailableExercises(exercisesData as ExerciseDefinition[] || []);
  }, [session, supabase]);

  const initializeWorkoutSession = useCallback(async (workoutIdToInitialize: string | null) => {
    if (!session) {
      router.push('/login');
      return;
    }

    setLoading(true); // Start loading when a workout is selected
    setError(null);
    resetWorkoutSession();

    try {
      await fetchAllAvailableExercises();

      let currentWorkout: TPath | null = null;
      let exercises: WorkoutExercise[] = [];
      let sessionTemplateName: string = 'Ad Hoc Workout';

      if (workoutIdToInitialize === 'ad-hoc') {
        currentWorkout = {
          id: 'ad-hoc',
          template_name: 'Ad Hoc Workout',
          is_bonus: false,
          user_id: session.user.id,
          created_at: new Date().toISOString(),
          version: 1,
          settings: null,
          progression_settings: null,
          parent_t_path_id: null,
        };
        sessionTemplateName = 'Ad Hoc Workout';
        exercises = [];
      } else if (workoutIdToInitialize) {
        const { data: tPathData, error: fetchTPathError } = await supabase
          .from('t_paths')
          .select('id, template_name, is_bonus, version, settings, progression_settings, parent_t_path_id, created_at, user_id')
          .eq('id', workoutIdToInitialize)
          .eq('user_id', session.user.id)
          .eq('is_bonus', true) // Ensure it's a child workout
          .single();

        if (fetchTPathError || !tPathData) {
          throw new Error(fetchTPathError?.message || "Workout not found or is not accessible by this user.");
        }
        currentWorkout = tPathData as TPath;
        sessionTemplateName = tPathData.template_name;

        const { data: tPathExercises, error: fetchLinksError } = await supabase
          .from('t_path_exercises')
          .select('exercise_id, is_bonus_exercise, order_index')
          .eq('template_id', workoutIdToInitialize)
          .order('order_index', { ascending: true });

        if (fetchLinksError) throw fetchLinksError;

        if (!tPathExercises || tPathExercises.length === 0) {
          exercises = [];
        } else {
          const exerciseIds = tPathExercises.map(e => e.exercise_id);
          const exerciseInfoMap = new Map(tPathExercises.map(e => [e.exercise_id, { is_bonus_exercise: !!e.is_bonus_exercise, order_index: e.order_index }]));

          const { data: exerciseDetails, error: fetchDetailsError } = await supabase
            .from('exercise_definitions')
            .select('*')
            .in('id', exerciseIds);

          if (fetchDetailsError) throw fetchDetailsError;

          exercises = (exerciseDetails as Tables<'exercise_definitions'>[] || [])
            .map(ex => ({
              ...ex,
              is_bonus_exercise: exerciseInfoMap.get(ex.id)?.is_bonus_exercise || false,
            }))
            .sort((a, b) => (exerciseInfoMap.get(a.id)?.order_index || 0) - (exerciseInfoMap.get(b.id)?.order_index || 0));
        }
      } else {
        setLoading(false);
        // If no workoutIdToInitialize, just return without setting activeWorkout
        return;
      }

      setActiveWorkout(currentWorkout);
      setExercisesForSession(exercises);

      const { data: sessionData, error: sessionError } = await supabase
        .from('workout_sessions')
        .insert({
          user_id: session.user.id,
          template_name: sessionTemplateName,
          session_date: new Date().toISOString(),
        })
        .select('id, session_date')
        .single();

      if (sessionError || !sessionData) {
        throw new Error(sessionError?.message || "Failed to create workout session.");
      }
      setCurrentSessionId(sessionData.id);
      setSessionStartTime(new Date(sessionData.session_date));

      const lastSetsData: Record<string, { weight_kg: number | null, reps: number | null, time_seconds: number | null }> = {}; // Cache for last set data
      
      const exerciseIdsInCurrentWorkout = exercises.map(ex => ex.id);

      if (exerciseIdsInCurrentWorkout.length > 0) {
        // Fetch all previous sets for the exercises in the current workout,
        // ensuring they belong to the current user and are not from the session being initialized.
        const { data: previousSets, error: previousSetsError } = await supabase
          .from('set_logs')
          .select(`
            exercise_id,
            weight_kg,
            reps,
            time_seconds,
            workout_sessions!inner(user_id)
          `)
          .in('exercise_id', exerciseIdsInCurrentWorkout)
          .eq('workout_sessions.user_id', session.user.id) // Ensure sets belong to the current user
          .neq('session_id', sessionData.id) // Exclude the current session being created
          .order('created_at', { ascending: false }); // Order by created_at to get the most recent

        if (previousSetsError) {
          console.warn("Error fetching previous sets for last workout data:", previousSetsError);
        } else {
          // Group the fetched sets by exercise_id and take the most recent one for each
          const mostRecentPreviousSets = new Map<string, { weight_kg: number | null, reps: number | null, time_seconds: number | null }>();
          for (const set of previousSets || []) {
            if (!mostRecentPreviousSets.has(set.exercise_id)) {
              mostRecentPreviousSets.set(set.exercise_id, {
                weight_kg: set.weight_kg,
                reps: set.reps,
                time_seconds: set.time_seconds,
              });
            }
          }
          mostRecentPreviousSets.forEach((value, key) => {
            lastSetsData[key] = value;
          });
        }
      }
      

      const initialSets: Record<string, SetLogState[]> = {};
      exercises.forEach(ex => {
        const lastSet = lastSetsData[ex.id];
        initialSets[ex.id] = Array.from({ length: DEFAULT_INITIAL_SETS }).map(() => ({
          id: null,
          created_at: null,
          session_id: sessionData.id,
          exercise_id: ex.id,
          weight_kg: null,
          reps: null,
          reps_l: null,
          reps_r: null,
          time_seconds: null,
          is_pb: false,
          isSaved: false,
          isPR: false,
          lastWeight: lastSet?.weight_kg,
          lastReps: lastSet?.reps,
          lastTimeSeconds: lastSet?.time_seconds,
        }));
      });
      setExercisesWithSets(initialSets);

    } catch (err: any) {
      setError(err.message || "Failed to load workout. Please try again.");
      toast.error(err.message || "Failed to load workout.");
      resetWorkoutSession();
    } finally {
      setLoading(false);
    } // End of try-catch-finally
  }, [session, supabase, router, resetWorkoutSession, fetchAllAvailableExercises]); // Dependencies for initializeWorkoutSession

  useEffect(() => { // This useEffect now reacts to activeWorkoutId prop
    if (session && activeWorkoutId !== undefined) { // Check if activeWorkoutId is explicitly set (even to null)
      initializeWorkoutSession(activeWorkoutId);
    } else if (session) { // If no activeWorkoutId is provided, just fetch all exercises
      fetchAllAvailableExercises().finally(() => setLoading(false));
    } else if (!session) {
      setLoading(false);
    }
  }, [session, activeWorkoutId, initializeWorkoutSession, fetchAllAvailableExercises]); // Dependencies for this useEffect

  const addExerciseToSession = useCallback(async (exercise: ExerciseDefinition) => {
    if (!currentSessionId) {
      toast.error("Workout session not initialized. Please refresh the page.");
      return;
    }

    let lastWeight = null;
    let lastReps = null;
    let lastTimeSeconds = null;

    try {
      const { data: lastSet, error: lastSetError } = await supabase
        .from('set_logs')
        .select('weight_kg, reps, time_seconds')
        .eq('exercise_id', exercise.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (lastSetError && lastSetError.code !== 'PGRST116') {
        console.warn(`Could not fetch last set for exercise ${exercise.name}:`, lastSetError.message);
      }
      if (lastSet) {
        lastWeight = lastSet.weight_kg;
        lastReps = lastSet.reps;
        lastTimeSeconds = lastSet.time_seconds;
      }
    } catch (err) {
      console.error("Error fetching last set for ad-hoc exercise:", err);
    }

    setExercisesForSession(prev => {
      const newWorkoutExercise: WorkoutExercise = {
        ...exercise,
        is_bonus_exercise: false,
      };
      const updatedExercises = [...prev, newWorkoutExercise];
      setExercisesWithSets(prevSets => ({
        ...prevSets,
        [newWorkoutExercise.id]: Array.from({ length: DEFAULT_INITIAL_SETS }).map(() => ({
          id: null,
          created_at: null,
          session_id: currentSessionId,
          exercise_id: newWorkoutExercise.id,
          weight_kg: null,
          reps: null,
          reps_l: null,
          reps_r: null,
          time_seconds: null,
          is_pb: false,
          isSaved: false,
          isPR: false,
          lastWeight: lastWeight,
          lastReps: lastReps,
          lastTimeSeconds: lastTimeSeconds,
        })),
      }));
      return updatedExercises;
    });
  }, [currentSessionId, supabase]);

  const removeExerciseFromSession = useCallback((exerciseId: string) => {
    setExercisesForSession(prev => prev.filter(ex => ex.id !== exerciseId));
    setExercisesWithSets(prevSets => {
      const newSets = { ...prevSets };
      delete newSets[exerciseId];
      return newSets;
    });
    setCompletedExercises(prev => {
      const newCompleted = new Set(prev);
      newCompleted.delete(exerciseId);
      return newCompleted;
    });
  }, []);

  const substituteExercise = useCallback((oldExerciseId: string, newExercise: WorkoutExercise) => {
    setExercisesForSession(prev => prev.map(ex => ex.id === oldExerciseId ? newExercise : ex));
    setExercisesWithSets(prevSets => {
      const newSets = { ...prevSets };
      if (!newSets[newExercise.id]) {
        newSets[newExercise.id] = Array.from({ length: DEFAULT_INITIAL_SETS }).map(() => ({
          id: null,
          created_at: null,
          session_id: currentSessionId,
          exercise_id: newExercise.id,
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
          lastTimeSeconds: null,
        }));
      }
      delete newSets[oldExerciseId];
      return newSets;
    });
    setCompletedExercises(prev => {
      const newCompleted = new Set(prev);
      newCompleted.delete(oldExerciseId);
      return newCompleted;
    });
  }, [currentSessionId]);

  const updateExerciseSets = useCallback((exerciseId: string, newSets: SetLogState[]) => {
    setExercisesWithSets(prev => ({
      ...prev,
      [exerciseId]: newSets,
    }));
  }, []);

  return {
    activeWorkout,
    exercisesForSession,
    exercisesWithSets,
    allAvailableExercises,
    loading,
    error,
    currentSessionId,
    sessionStartTime,
    completedExercises,
    addExerciseToSession,
    removeExerciseFromSession,
    substituteExercise,
    updateSessionStartTime,
    markExerciseAsCompleted,
    resetWorkoutSession,
    updateExerciseSets,
  };
};