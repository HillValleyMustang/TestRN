"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Session, SupabaseClient } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { Tables, SetLogState, WorkoutExercise } from '@/types/supabase';

type ExerciseDefinition = Tables<'exercise_definitions'>;
type WorkoutSession = Tables<'workout_sessions'>;

interface UseAdHocWorkoutSessionProps {
  session: Session | null;
  supabase: SupabaseClient;
  router: ReturnType<typeof useRouter>;
}

interface UseAdHocWorkoutSessionReturn {
  allExercises: ExerciseDefinition[];
  exercisesForSession: WorkoutExercise[];
  exercisesWithSets: Record<string, SetLogState[]>;
  loading: boolean;
  error: string | null;
  currentSessionId: string | null;
  sessionStartTime: Date | null;
  addExerciseToSession: (exercise: ExerciseDefinition) => void;
  removeExerciseFromSession: (exerciseId: string) => void;
  setExercisesWithSets: React.Dispatch<React.SetStateAction<Record<string, SetLogState[]>>>;
  updateSessionStartTime: (timestamp: string) => void; // New function to update session start time
  markExerciseAsCompleted: (exerciseId: string, isNewPR: boolean) => void; // New function to mark exercise complete
  completedExercises: Set<string>; // New state to track completed exercises
  setExercisesForSession: React.Dispatch<React.SetStateAction<WorkoutExercise[]>>; // Expose setter
}

const DEFAULT_INITIAL_SETS = 3; // Define default initial sets for ad-hoc

export const useAdHocWorkoutSession = ({ session, supabase, router }: UseAdHocWorkoutSessionProps): UseAdHocWorkoutSessionReturn => {
  const [allExercises, setAllExercises] = useState<ExerciseDefinition[]>([]);
  const [exercisesForSession, setExercisesForSession] = useState<WorkoutExercise[]>([]);
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
  }, []);

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
        .select('id, name, main_muscle, type, category, description, pro_tip, video_url, library_id, is_favorite, created_at, user_id')
        .eq('user_id', session.user.id)
        .order('name', { ascending: true });

      if (fetchExercisesError) {
        throw new Error(fetchExercisesError.message);
      }
      setAllExercises(exercisesData as ExerciseDefinition[] || []);

      // 2. Create a new ad-hoc workout session entry
      // Initially set session_date to current time, will be updated by onFirstSetSaved
      const { data: sessionData, error: sessionError } = await supabase
        .from('workout_sessions')
        .insert({
          user_id: session.user.id,
          template_name: 'Ad Hoc Workout',
          session_date: new Date().toISOString(), // Initial timestamp
        })
        .select('id, session_date') // Select session_date to ensure it's available
        .single();

      if (sessionError || !sessionData) {
        throw new Error(sessionError?.message || "Failed to create ad-hoc workout session.");
      }
      setCurrentSessionId(sessionData.id);
      setSessionStartTime(new Date(sessionData.session_date)); // Set initial session start time

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
      const newWorkoutExercise: WorkoutExercise = {
        ...exercise,
        is_bonus_exercise: false,
      };
      const updatedExercises = [...prev, newWorkoutExercise];
      // Initialize sets for the newly added exercise with last set data
      setExercisesWithSets(prevSets => ({
        ...prevSets,
        [newWorkoutExercise.id]: Array.from({ length: DEFAULT_INITIAL_SETS }).map(() => ({ // Initialize with 3 sets
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
    updateSessionStartTime,
    markExerciseAsCompleted,
    completedExercises,
    setExercisesForSession, // Expose setter
  };
};