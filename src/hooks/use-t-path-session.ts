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

  const fetchWorkoutData = useCallback(async () => {
    console.log('useTPathSession: Starting fetchWorkoutData...');
    console.log('useTPathSession: tPathId:', tPathId);
    console.log('useTPathSession: session:', session ? 'present' : 'null');

    if (!session) {
      router.push('/login');
      return;
    }

    if (!tPathId) {
      setLoading(false);
      setError("Transformation Path ID is missing.");
      console.error('useTPathSession: Transformation Path ID is missing.');
      toast.error("Transformation Path ID is missing."); // Added toast
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // 1. Fetch the specific workout (which is a child T-Path)
      const { data: tPathData, error: fetchTPathError } = await supabase
        .from('t_paths')
        .select('id, template_name, is_bonus, version, settings, progression_settings, parent_t_path_id, created_at, user_id') // Specify all columns required by TPath
        .eq('id', tPathId)
        .eq('user_id', session.user.id) // Ensure it belongs to the current user
        .eq('is_bonus', true) // It must be a child workout
        .single();

      console.log('useTPathSession: Fetched tPathData:', tPathData);

      if (fetchTPathError || !tPathData) {
        const errorMessage = fetchTPathError?.message || "Workout not found or not accessible.";
        console.error('useTPathSession: Error fetching tPathData:', errorMessage);
        toast.error(errorMessage); // Added toast
        throw new Error(errorMessage);
      }
      setTPath(tPathData as TPath); // Explicitly cast

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

      console.log('useTPathSession: Raw tPathExercisesData from Supabase:', tPathExercisesData);

      if (fetchTPathExercisesError) {
        console.error('useTPathSession: Error fetching tPathExercisesData:', fetchTPathExercisesError.message);
        toast.error(fetchTPathExercisesError.message); // Added toast
        throw new Error(fetchTPathExercisesError.message);
      }

      const fetchedExercises: WorkoutExercise[] = (tPathExercisesData as TPathExerciseJoin[])
        .filter(te => {
          const hasExerciseDef = te.exercise_definitions && te.exercise_definitions.length > 0;
          if (!hasExerciseDef) {
            console.warn(`useTPathSession: Filtering out t_path_exercise ${te.id} because exercise_definitions is missing or empty.`);
          }
          return hasExerciseDef;
        })
        .map(te => ({
          ...(te.exercise_definitions![0] as Tables<'exercise_definitions'>), // Access the first element
          is_bonus_exercise: !!te.is_bonus_exercise, // Add the bonus flag and ensure it's boolean
        }));
      
      console.log('useTPathSession: Mapped fetchedExercises (after filter/map):', fetchedExercises);
      setExercisesForTPath(fetchedExercises);

      // 3. Fetch the ID of the most recent previous workout session for the user
      const { data: lastSessionData, error: lastSessionError } = await supabase
        .from('workout_sessions')
        .select('id')
        .eq('user_id', session.user.id)
        .eq('template_name', tPathData.template_name) // Filter by the specific workout name
        .order('session_date', { ascending: false })
        .limit(1)
        .single();

      console.log('useTPathSession: Fetched lastSessionData:', lastSessionData);

      if (lastSessionError && lastSessionError.code !== 'PGRST116') {
        console.warn("useTPathSession: Error fetching last session ID:", lastSessionError.message);
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
            .eq('session_id', lastSessionId) // Ensure it's from the last session of THIS workout
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          if (lastSetError && lastSetError.code !== 'PGRST116') {
            console.warn(`useTPathSession: Could not fetch last set for exercise ${ex.name}:`, lastSetError.message);
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
      console.log('useTPathSession: lastSetsData:', lastSetsData);

      // 5. Create a new workout session entry
      const { data: sessionData, error: sessionError } = await supabase
        .from('workout_sessions')
        .insert({
          user_id: session.user.id,
          template_name: tPathData.template_name, // Use the specific workout's name
          session_date: new Date().toISOString(),
        })
        .select('id')
        .single();

      console.log('useTPathSession: Created new sessionData:', sessionData);

      if (sessionError || !sessionData) {
        throw new Error(sessionError?.message || "Failed to create workout session.");
      }
      setCurrentSessionId(sessionData.id);
      setSessionStartTime(new Date());

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
      console.log('useTPathSession: Initialized initialSets:', initialSets);
      setExercisesWithSets(initialSets);

    } catch (err: any) {
      console.error("useTPathSession: Caught error in fetchWorkoutData:", err);
      setError(err.message || "Failed to load workout. Please try again.");
      toast.error(err.message || "Failed to load workout.");
    } finally {
      setLoading(false);
      console.log('useTPathSession: fetchWorkoutData finished. Loading set to false.');
    }
  }, [tPathId, session, supabase, router]);

  useEffect(() => {
    fetchWorkoutData();
  }, [fetchWorkoutData]);

  // New function to refresh the exercises list
  const refreshExercisesForTPath = useCallback((oldExerciseId?: string, newExercise?: WorkoutExercise | null) => {
    setExercisesForTPath(prevExercises => {
      if (oldExerciseId && newExercise) {
        // Substitute an exercise
        return prevExercises.map(ex => ex.id === oldExerciseId ? newExercise : ex);
      } else if (oldExerciseId && newExercise === null) {
        // Remove an exercise
        return prevExercises.filter(ex => ex.id !== oldExerciseId);
      }
      // If no specific old/new exercise, just re-fetch all (though this might be less efficient)
      // For now, we'll rely on the explicit substitute/remove logic.
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