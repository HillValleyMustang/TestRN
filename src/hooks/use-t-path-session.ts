"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Session, SupabaseClient } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { Tables, TablesInsert, SetLogState, WorkoutExercise } from '@/types/supabase';

type TPath = Tables<'t_paths'>;
type SetLogInsert = TablesInsert<'set_logs'>;

// Define a type for the joined data from t_path_exercises
// This type precisely matches the structure returned by the Supabase select query
type TPathExerciseJoin = {
  id: string;
  created_at: string | null;
  exercise_id: string;
  template_id: string;
  order_index: number;
  is_bonus_exercise: boolean | null; // Explicitly included as it's selected
  exercise_definitions: Pick<Tables<'exercise_definitions'>, 'id' | 'name' | 'main_muscle' | 'type' | 'category' | 'description' | 'pro_tip' | 'video_url'>[] | null; // Changed to array
};

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
  refreshExercisesForTPath: (oldExerciseId?: string, newExercise?: WorkoutExercise | null) => void; // New refresh function
}

export const useTPathSession = ({ tPathId, session, supabase, router }: UseTPathSessionProps): UseTPathSessionReturn => {
  const [tPath, setTPath] = useState<TPath | null>(null);
  const [exercisesForTPath, setExercisesForTPath] = useState<WorkoutExercise[]>([]);
  const [exercisesWithSets, setExercisesWithSets] = useState<Record<string, SetLogState[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);

  const logToSupabase = useCallback(async (logType: string, data: any) => {
    if (!session?.user?.id) return;
    try {
      const { error: logError } = await supabase.from('client_logs').insert({
        user_id: session.user.id,
        log_type: logType,
        data: data,
      });
      if (logError) {
        console.error(`Failed to log to Supabase (${logType}):`, logError.message);
      }
    } catch (err) {
      console.error(`Unexpected error logging to Supabase (${logType}):`, err);
    }
  }, [session, supabase]);

  const fetchWorkoutData = useCallback(async () => {
    if (!session) {
      router.push('/login');
      return;
    }

    // Return early if tPathId is not provided, but keep loading true
    if (!tPathId) {
      setLoading(true); // Keep loading true while waiting for a valid tPathId
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // 1. Fetch the specific workout (which is a child T-Path)
      const { data: tPathData, error: fetchTPathError } = await supabase
        .from('t_paths')
        .select('id, template_name, is_bonus, version, settings, progression_settings, parent_t_path_id, created_at, user_id')
        .eq('id', tPathId)
        .eq('user_id', session.user.id)
        .eq('is_bonus', true)
        .single();

      if (fetchTPathError || !tPathData) {
        const errorMessage = fetchTPathError?.message || "Workout not found or not accessible.";
        toast.error(errorMessage);
        throw new Error(errorMessage);
      }
      setTPath(tPathData as TPath);

      // 2. Fetch all exercises associated with this specific workout (child T-Path)
      const { data: tPathExercisesData, error: fetchTPathExercisesError } = await supabase
        .from('t_path_exercises')
        .select(`
          id, created_at, exercise_id, template_id, order_index, is_bonus_exercise,
          exercise_definitions (
            id, name, main_muscle, type, category, description, pro_tip, video_url
          )
        `)
        .eq('template_id', tPathId)
        .order('order_index', { ascending: true });

      await logToSupabase('raw_tpath_exercises_data', tPathExercisesData);

      if (fetchTPathExercisesError) {
        toast.error(fetchTPathExercisesError.message);
        throw new Error(fetchTPathExercisesError.message);
      }

      const fetchedExercises: WorkoutExercise[] = (tPathExercisesData as TPathExerciseJoin[])
        .filter(te => {
          const hasExerciseDef = te.exercise_definitions && te.exercise_definitions.length > 0;
          if (!hasExerciseDef) {
            // Log filtered out exercises
            logToSupabase('filtered_out_exercise', { t_path_exercise_id: te.id, reason: 'missing_exercise_definition' });
          }
          return hasExerciseDef;
        })
        .map(te => ({
          ...(te.exercise_definitions![0] as Tables<'exercise_definitions'>),
          is_bonus_exercise: !!te.is_bonus_exercise,
        }));
      
      await logToSupabase('mapped_fetched_exercises', fetchedExercises);
      setExercisesForTPath(fetchedExercises);

      // 3. Fetch the ID of the most recent previous workout session for the user
      const { data: lastSessionData, error: lastSessionError } = await supabase
        .from('workout_sessions')
        .select('id')
        .eq('user_id', session.user.id)
        .eq('template_name', tPathData.template_name)
        .order('session_date', { ascending: false })
        .limit(1)
        .single();

      if (lastSessionError && lastSessionError.code !== 'PGRST116') {
        logToSupabase('last_session_fetch_warning', { error: lastSessionError.message });
      }

      const lastSessionId = lastSessionData ? lastSessionData.id : null;

      // 4. Fetch last set data for each exercise using the lastSessionId
      const lastSetsData: Record<string, { weight_kg: number | null, reps: number | null, time_seconds: number | null }> = {};
      for (const ex of fetchedExercises) {
        if (lastSessionId) {
          const { data: lastSet, error: lastSetError } = await supabase
            .from('set_logs')
            .select('weight_kg, reps, time_seconds')
            .eq('exercise_id', ex.id)
            .eq('session_id', lastSessionId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          if (lastSetError && lastSetError.code !== 'PGRST116') {
            logToSupabase('last_set_fetch_warning', { exercise_id: ex.id, error: lastSetError.message });
          }
          if (lastSet) {
            lastSetsData[ex.id] = {
              weight_kg: lastSet.weight_kg,
              reps: lastSet.reps,
              time_seconds: lastSet.time_seconds,
            };
          }
        }
      }
      await logToSupabase('last_sets_data', lastSetsData);

      // 5. Create a new workout session entry
      const { data: sessionData, error: sessionError } = await supabase
        .from('workout_sessions')
        .insert({
          user_id: session.user.id,
          template_name: tPathData.template_name,
          session_date: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (sessionError || !sessionData) {
        throw new Error(sessionError?.message || "Failed to create workout session.");
      }
      setCurrentSessionId(sessionData.id);
      setSessionStartTime(new Date());
      await logToSupabase('new_workout_session_created', { session_id: sessionData.id, template_name: tPathData.template_name });

      // 6. Initialize sets for each exercise with last set data
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
      await logToSupabase('initial_sets_initialized', initialSets);
      setExercisesWithSets(initialSets);

    } catch (err: any) {
      setError(err.message || "Failed to load workout. Please try again.");
      toast.error(err.message || "Failed to load workout.");
      logToSupabase('fetch_workout_data_error', { error: err.message, stack: err.stack });
    } finally {
      setLoading(false);
    }
  }, [tPathId, session, supabase, router, logToSupabase]);

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
  };
};