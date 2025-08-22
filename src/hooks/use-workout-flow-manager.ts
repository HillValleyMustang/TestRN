"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Session, SupabaseClient } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { Tables, TablesInsert, SetLogState, WorkoutExercise } from '@/types/supabase';

type ExerciseDefinition = Tables<'exercise_definitions'>;
type WorkoutSession = Tables<'workout_sessions'>;
type TPath = Tables<'t_paths'>;

interface UseWorkoutFlowManagerProps {
  session: Session | null;
  supabase: SupabaseClient;
  router: ReturnType<typeof useRouter>;
}

interface UseWorkoutFlowManagerReturn {
  allExercises: ExerciseDefinition[];
  exercisesForSession: WorkoutExercise[];
  exercisesWithSets: Record<string, SetLogState[]>;
  loading: boolean;
  error: string | null;
  currentSessionId: string | null;
  sessionStartTime: Date | null;
  startNewSession: (workoutName: string, tPathId: string | null) => Promise<void>;
  addExerciseToSession: (exercise: ExerciseDefinition) => void;
  removeExerciseFromSession: (exerciseId: string) => void;
  setExercisesWithSets: React.Dispatch<React.SetStateAction<Record<string, SetLogState[]>>>;
  updateSessionStartTime: (timestamp: string) => void;
  markExerciseAsCompleted: (exerciseId: string, isNewPR: boolean) => void;
  completedExercises: Set<string>;
  setExercisesForSession: React.Dispatch<React.SetStateAction<WorkoutExercise[]>>;
}

const DEFAULT_INITIAL_SETS = 3;

export const useWorkoutFlowManager = ({ session, supabase, router }: UseWorkoutFlowManagerProps): UseWorkoutFlowManagerReturn => {
  const [allExercises, setAllExercises] = useState<ExerciseDefinition[]>([]);
  const [exercisesForSession, setExercisesForSession] = useState<WorkoutExercise[]>([]);
  const [exercisesWithSets, setExercisesWithSets] = useState<Record<string, SetLogState[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [completedExercises, setCompletedExercises] = useState<Set<string>>(new Set());

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

  const fetchAllExercises = useCallback(async () => {
    if (!session) return;
    try {
      const { data: exercisesData, error: fetchExercisesError } = await supabase
        .from('exercise_definitions')
        .select('id, name, main_muscle, type, category, description, pro_tip, video_url, library_id, is_favorite, created_at, user_id')
        .or(`user_id.eq.${session.user.id},user_id.is.null`)
        .order('name', { ascending: true });

      if (fetchExercisesError) {
        throw new Error(fetchExercisesError.message);
      }
      setAllExercises(exercisesData as ExerciseDefinition[] || []);
    } catch (err: any) {
      console.error("Failed to fetch all exercises:", err);
      setError(err.message || "Failed to load exercises.");
      toast.error(err.message || "Failed to load exercises.");
    }
  }, [session, supabase]);

  useEffect(() => {
    fetchAllExercises();
  }, [fetchAllExercises]);

  const startNewSession = useCallback(async (workoutName: string, tPathId: string | null) => {
    if (!session) {
      router.push('/login');
      return;
    }

    setLoading(true);
    setError(null);
    setExercisesForSession([]);
    setExercisesWithSets({});
    setCurrentSessionId(null);
    setSessionStartTime(null);
    setCompletedExercises(new Set());

    try {
      // 1. Create a new workout session entry
      const { data: sessionData, error: sessionError } = await supabase
        .from('workout_sessions')
        .insert({
          user_id: session.user.id,
          template_name: workoutName,
          session_date: new Date().toISOString(), // Initial timestamp
        })
        .select('id, session_date')
        .single();

      if (sessionError || !sessionData) {
        throw new Error(sessionError?.message || "Failed to create workout session.");
      }
      setCurrentSessionId(sessionData.id);
      setSessionStartTime(new Date(sessionData.session_date));

      let fetchedExercises: WorkoutExercise[] = [];

      if (tPathId) { // Templated workout
        // Fetch exercise associations for this workout
        const { data: tPathExercises, error: fetchLinksError } = await supabase
          .from('t_path_exercises')
          .select('exercise_id, is_bonus_exercise, order_index')
          .eq('template_id', tPathId)
          .order('order_index', { ascending: true });

        if (fetchLinksError) throw fetchLinksError;

        if (tPathExercises && tPathExercises.length > 0) {
          const exerciseIds = tPathExercises.map(e => e.exercise_id);
          const exerciseInfoMap = new Map(tPathExercises.map(e => [e.exercise_id, { is_bonus_exercise: !!e.is_bonus_exercise, order_index: e.order_index }]));

          const { data: exerciseDetails, error: fetchDetailsError } = await supabase
            .from('exercise_definitions')
            .select('*')
            .in('id', exerciseIds);
          
          if (fetchDetailsError) throw fetchDetailsError;

          fetchedExercises = (exerciseDetails as Tables<'exercise_definitions'>[] || [])
            .map(ex => ({
              ...ex,
              is_bonus_exercise: exerciseInfoMap.get(ex.id)?.is_bonus_exercise || false,
            }))
            .sort((a, b) => (exerciseInfoMap.get(a.id)?.order_index || 0) - (exerciseInfoMap.get(b.id)?.order_index || 0));
        }
      }
      // For ad-hoc, fetchedExercises will remain empty initially, and exercises will be added via addExerciseToSession

      setExercisesForSession(fetchedExercises);

      // Fetch last set data for each exercise and initialize sets
      const initialSets: Record<string, SetLogState[]> = {};
      for (const ex of fetchedExercises) {
        const { data: lastSet, error: lastSetError } = await supabase
          .from('set_logs')
          .select('weight_kg, reps, time_seconds')
          .eq('exercise_id', ex.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        if (lastSetError && lastSetError.code !== 'PGRST116') {
          console.warn(`Could not fetch last set for ${ex.name}: ${lastSetError.message}`);
        }
        initialSets[ex.id] = Array.from({ length: DEFAULT_INITIAL_SETS }).map(() => ({
          id: null, created_at: null, session_id: sessionData.id, exercise_id: ex.id,
          weight_kg: null, reps: null, reps_l: null, reps_r: null, time_seconds: null, is_pb: false,
          isSaved: false, isPR: false,
          lastWeight: lastSet?.weight_kg, lastReps: lastSet?.reps, lastTimeSeconds: lastSet?.time_seconds,
        }));
      }
      setExercisesWithSets(initialSets);

    } catch (err: any) {
      setError(err.message || "Failed to start workout. Please try again.");
      toast.error(err.message || "Failed to start workout.");
    } finally {
      setLoading(false);
    }
  }, [session, supabase, router]);

  const addExerciseToSession = useCallback(async (exercise: ExerciseDefinition) => {
    if (!currentSessionId) {
      toast.error("Workout session not initialized. Please select a workout first.");
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
        is_bonus_exercise: false, // Ad-hoc exercises are not bonus
      };
      const updatedExercises = [...prev, newWorkoutExercise];
      setExercisesWithSets(prevSets => ({
        ...prevSets,
        [newWorkoutExercise.id]: Array.from({ length: DEFAULT_INITIAL_SETS }).map(() => ({
          id: null, created_at: null, session_id: currentSessionId, exercise_id: newWorkoutExercise.id,
          weight_kg: null, reps: null, reps_l: null, reps_r: null, time_seconds: null, is_pb: false,
          isSaved: false, isPR: false,
          lastWeight: lastWeight, lastReps: lastReps, lastTimeSeconds: lastTimeSeconds,
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

  return {
    allExercises,
    exercisesForSession,
    exercisesWithSets,
    loading,
    error,
    currentSessionId,
    sessionStartTime,
    startNewSession,
    addExerciseToSession,
    removeExerciseFromSession,
    setExercisesWithSets,
    updateSessionStartTime,
    markExerciseAsCompleted,
    completedExercises,
    setExercisesForSession,
  };
};