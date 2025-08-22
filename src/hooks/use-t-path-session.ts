"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Session, SupabaseClient } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { Tables, TablesInsert, SetLogState, WorkoutExercise } from '@/types/supabase';

type TPath = Tables<'t_paths'>;
type SetLogInsert = TablesInsert<'set_logs'>; // Corrected type argument

interface UseTPathSessionProps {
  tPathId: string;
  session: Session | null;
  supabase: SupabaseClient;
  router: ReturnType<typeof useRouter>;
}

interface UseTPathSessionReturn {
  tPath: TPath | null;
  exercisesForTPath: WorkoutExercise[];
  exercisesWithSets: Record<string, SetLogState[]>;
  loading: boolean;
  error: string | null;
  currentSessionId: string | null;
  sessionStartTime: Date | null;
  setExercisesWithSets: React.Dispatch<React.SetStateAction<Record<string, SetLogState[]>>>;
  refreshExercisesForTPath: (oldExerciseId?: string, newExercise?: WorkoutExercise | null) => void;
  updateSessionStartTime: (timestamp: string) => void; // New function to update session start time
  markExerciseAsCompleted: (exerciseId: string, isNewPR: boolean) => void; // New function to mark exercise complete
  completedExercises: Set<string>; // New state to track completed exercises
}

export const useTPathSession = ({ tPathId, session, supabase, router }: UseTPathSessionProps): UseTPathSessionReturn => {
  const [tPath, setTPath] = useState<TPath | null>(null);
  const [exercisesForTPath, setExercisesForTPath] = useState<WorkoutExercise[]>([]);
  const [exercisesWithSets, setExercisesWithSets] = useState<Record<string, SetLogState[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [completedExercises, setCompletedExercises] = useState<Set<string>>(new Set()); // Track completed exercises

  const updateSessionStartTime = useCallback(async (timestamp: string) => {
    if (!currentSessionId) return;

    // Only update if sessionStartTime hasn't been set yet (i.e., this is the very first set saved)
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
    // Optionally, you could log the PR status here if needed for a global view
  }, []);

  const fetchWorkoutData = useCallback(async () => {
    if (!session) {
      router.push('/login');
      return;
    }
    if (!tPathId) {
      setLoading(true);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // 1. Fetch the workout T-Path
      const { data: tPathData, error: fetchTPathError } = await supabase
        .from('t_paths')
        .select('id, template_name, is_bonus, version, settings, progression_settings, parent_t_path_id, created_at, user_id')
        .eq('id', tPathId)
        .eq('user_id', session.user.id)
        .single();

      if (fetchTPathError || !tPathData) {
        throw new Error(fetchTPathError?.message || "Workout not found or is not accessible by this user.");
      }
      setTPath(tPathData as TPath);

      // 2. Fetch exercise associations for this workout (more robust two-step query)
      const { data: tPathExercises, error: fetchLinksError } = await supabase
        .from('t_path_exercises')
        .select('exercise_id, is_bonus_exercise, order_index')
        .eq('template_id', tPathId)
        .order('order_index', { ascending: true });

      if (fetchLinksError) throw fetchLinksError;

      if (!tPathExercises || tPathExercises.length === 0) {
        setExercisesForTPath([]);
        setLoading(false);
        return; // Stop here if no exercises are linked
      }

      const exerciseIds = tPathExercises.map(e => e.exercise_id);
      const exerciseInfoMap = new Map(tPathExercises.map(e => [e.exercise_id, { is_bonus_exercise: !!e.is_bonus_exercise, order_index: e.order_index }]));

      // 3. Fetch the details for those exercises
      const { data: exerciseDetails, error: fetchDetailsError } = await supabase
        .from('exercise_definitions')
        .select('*')
        .in('id', exerciseIds);
      
      if (fetchDetailsError) throw fetchDetailsError;

      // Combine the data
      const fetchedExercises: WorkoutExercise[] = (exerciseDetails as Tables<'exercise_definitions'>[] || [])
        .map(ex => ({
          ...ex,
          is_bonus_exercise: exerciseInfoMap.get(ex.id)?.is_bonus_exercise || false,
        }))
        .sort((a, b) => (exerciseInfoMap.get(a.id)?.order_index || 0) - (exerciseInfoMap.get(b.id)?.order_index || 0));

      setExercisesForTPath(fetchedExercises);

      // 4. Create a new workout session entry
      // Initially set session_date to current time, will be updated by onFirstSetSaved
      const { data: sessionData, error: sessionError } = await supabase
        .from('workout_sessions')
        .insert({
          user_id: session.user.id,
          template_name: tPathData.template_name,
          session_date: new Date().toISOString(), // Initial timestamp
        })
        .select('id, session_date') // Select session_date to ensure it's available
        .single();

      if (sessionError || !sessionData) {
        throw new Error(sessionError?.message || "Failed to create workout session.");
      }
      setCurrentSessionId(sessionData.id);
      setSessionStartTime(new Date(sessionData.session_date)); // Set initial session start time

      // 5. Fetch last set data for each exercise
      const { data: lastSessionData, error: lastSessionError } = await supabase
        .from('workout_sessions')
        .select('id')
        .eq('user_id', session.user.id)
        .eq('template_name', tPathData.template_name)
        .order('session_date', { ascending: false })
        .limit(1)
        .single();
      
      const lastSessionId = lastSessionData ? lastSessionData.id : null;
      const lastSetsData: Record<string, { weight_kg: number | null, reps: number | null, time_seconds: number | null }> = {};
      if (lastSessionId) {
        for (const ex of fetchedExercises) {
            const { data: lastSet, error: lastSetError } = await supabase
              .from('set_logs')
              .select('weight_kg, reps, time_seconds')
              .eq('exercise_id', ex.id)
              .eq('session_id', lastSessionId)
              .order('created_at', { ascending: false })
              .limit(1)
              .single();
            if (lastSetError && lastSetError.code !== 'PGRST116') {
              console.warn(`Could not fetch last set for ${ex.name}: ${lastSetError.message}`);
            }
            if (lastSet) {
              lastSetsData[ex.id] = lastSet;
            }
        }
      }

      // 6. Initialize sets for each exercise
      const initialSets: Record<string, SetLogState[]> = {};
      fetchedExercises.forEach(ex => {
        const lastSet = lastSetsData[ex.id];
        initialSets[ex.id] = [{
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
        }];
      });
      setExercisesWithSets(initialSets);

    } catch (err: any) {
      setError(err.message || "Failed to load workout. Please try again.");
      toast.error(err.message || "Failed to load workout.");
    } finally {
      setLoading(false);
    }
  }, [tPathId, session, supabase, router]);

  useEffect(() => {
    fetchWorkoutData();
  }, [fetchWorkoutData]);

  const refreshExercisesForTPath = useCallback((oldExerciseId?: string, newExercise?: WorkoutExercise | null) => {
    setExercisesForTPath(prevExercises => {
      if (oldExerciseId && newExercise) {
        return prevExercises.map(ex => ex.id === oldExerciseId ? newExercise : ex);
      } else if (oldExerciseId && newExercise === null) {
        return prevExercises.filter(ex => ex.id !== oldExerciseId);
      }
      return prevExercises;
    });
  }, []);

  return {
    tPath,
    exercisesForTPath,
    exercisesWithSets,
    loading,
    error,
    currentSessionId,
    sessionStartTime,
    setExercisesWithSets,
    refreshExercisesForTPath,
    updateSessionStartTime,
    markExerciseAsCompleted,
    completedExercises,
  };
};