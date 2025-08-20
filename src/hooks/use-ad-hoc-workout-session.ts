"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Session, SupabaseClient } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { Tables, SetLogState } from '@/types/supabase';

type ExerciseDefinition = Tables<'exercise_definitions'>;
type WorkoutSession = Tables<'workout_sessions'>;

interface UseAdHocWorkoutSessionProps {
  session: Session | null;
  supabase: SupabaseClient;
  router: ReturnType<typeof useRouter>;
}

interface UseAdHocWorkoutSessionReturn {
  allExercises: ExerciseDefinition[];
  exercisesForSession: ExerciseDefinition[];
  exercisesWithSets: Record<string, SetLogState[]>;
  loading: boolean;
  error: string | null;
  currentSessionId: string | null;
  sessionStartTime: Date | null;
  addExerciseToSession: (exercise: ExerciseDefinition) => void;
  removeExerciseFromSession: (exerciseId: string) => void;
  setExercisesWithSets: React.Dispatch<React.SetStateAction<Record<string, SetLogState[]>>>;
}

export const useAdHocWorkoutSession = ({ session, supabase, router }: UseAdHocWorkoutSessionProps): UseAdHocWorkoutSessionReturn => {
  const [allExercises, setAllExercises] = useState<ExerciseDefinition[]>([]);
  const [exercisesForSession, setExercisesForSession] = useState<ExerciseDefinition[]>([]);
  const [exercisesWithSets, setExercisesWithSets] = useState<Record<string, SetLogState[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);

  const fetchInitialData = useCallback(async () => {
    if (!session) {
      router.push('/login');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // 1. Fetch all available exercise definitions for the user
      const { data: exercisesData, error: fetchExercisesError } = await supabase
        .from('exercise_definitions')
        .select('id, name, main_muscle, type, category, description, pro_tip, video_url, library_id, is_favorite, created_at, user_id') // Specify all columns required by ExerciseDefinition
        .eq('user_id', session.user.id)
        .order('name', { ascending: true });

      if (fetchExercisesError) {
        throw new Error(fetchExercisesError.message);
      }
      setAllExercises(exercisesData as ExerciseDefinition[] || []); // Explicitly cast

      // 2. Create a new ad-hoc workout session entry
      const { data: sessionData, error: sessionError } = await supabase
        .from('workout_sessions')
        .insert({
          user_id: session.user.id,
          template_name: 'Ad Hoc Workout', // Name for ad-hoc sessions
          session_date: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (sessionError || !sessionData) {
        throw new Error(sessionError?.message || "Failed to create ad-hoc workout session.");
      }
      setCurrentSessionId(sessionData.id);
      setSessionStartTime(new Date());

    } catch (err: any) {
      console.error("Failed to initialize ad-hoc workout:", err);
      setError(err.message || "Failed to start ad-hoc workout. Please try again.");
      toast.error(err.message || "Failed to start ad-hoc workout.");
    } finally {
      setLoading(false);
    }
  }, [session, supabase, router]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  const addExerciseToSession = useCallback(async (exercise: ExerciseDefinition) => {
    if (!currentSessionId) {
      toast.error("Ad-hoc session not initialized. Please refresh the page.");
      return;
    }

    // Fetch last set data for this specific exercise
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
      const updatedExercises = [...prev, exercise];
      // Initialize sets for the newly added exercise with last set data
      setExercisesWithSets(prevSets => ({
        ...prevSets,
        [exercise.id]: [{
          id: null,
          created_at: null,
          session_id: currentSessionId,
          exercise_id: exercise.id,
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
        }],
      }));
      return updatedExercises;
    });
  }, [currentSessionId, supabase]); // Added supabase to dependencies

  const removeExerciseFromSession = useCallback((exerciseId: string) => {
    setExercisesForSession(prev => prev.filter(ex => ex.id !== exerciseId));
    setExercisesWithSets(prevSets => {
      const newSets = { ...prevSets };
      delete newSets[exerciseId]; // Remove sets associated with the removed exercise
      return newSets;
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
    addExerciseToSession,
    removeExerciseFromSession,
    setExercisesWithSets,
  };
};