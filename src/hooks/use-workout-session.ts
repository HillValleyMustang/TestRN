"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Session, SupabaseClient } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { Tables, TablesInsert } from '@/types/supabase';

type WorkoutTemplate = Tables<'workout_templates'>;
type ExerciseDefinition = Tables<'exercise_definitions'>;
type SetLogInsert = TablesInsert<'set_logs'>;

// Define a type for the joined data from template_exercises
type TemplateExerciseJoin = Tables<'template_exercises'> & {
  exercise_definitions: Tables<'exercise_definitions'>[] | null;
};

export interface SetLogState extends SetLogInsert {
  isSaved: boolean;
  isPR: boolean;
  lastWeight?: number | null;
  lastReps?: number | null;
  lastTimeSeconds?: number | null;
}

interface UseWorkoutSessionProps {
  templateId: string;
  session: Session | null;
  supabase: SupabaseClient;
  router: ReturnType<typeof useRouter>;
}

interface UseWorkoutSessionReturn {
  workoutTemplate: WorkoutTemplate | null;
  exercisesForTemplate: ExerciseDefinition[];
  exercisesWithSets: Record<string, SetLogState[]>;
  loading: boolean;
  error: string | null;
  currentSessionId: string | null;
  sessionStartTime: Date | null;
  setExercisesWithSets: React.Dispatch<React.SetStateAction<Record<string, SetLogState[]>>>;
}

export const useWorkoutSession = ({ templateId, session, supabase, router }: UseWorkoutSessionProps): UseWorkoutSessionReturn => {
  const [workoutTemplate, setWorkoutTemplate] = useState<WorkoutTemplate | null>(null);
  const [exercisesForTemplate, setExercisesForTemplate] = useState<ExerciseDefinition[]>([]);
  const [exercisesWithSets, setExercisesWithSets] = useState<Record<string, SetLogState[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);

  const fetchWorkoutData = useCallback(async () => {
    if (!session) {
      router.push('/login');
      return;
    }

    if (!templateId) {
      setLoading(false);
      setError("Workout template ID is missing.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // 1. Fetch the workout template
      const { data: templateData, error: fetchTemplateError } = await supabase
        .from('workout_templates')
        .select('*')
        .eq('id', templateId)
        .eq('user_id', session.user.id)
        .single();

      if (fetchTemplateError || !templateData) {
        throw new Error(fetchTemplateError?.message || "Workout template not found.");
      }
      setWorkoutTemplate(templateData);

      // 2. Fetch all exercises associated with this template via template_exercises
      const { data: templateExercisesData, error: fetchTemplateExercisesError } = await supabase
        .from('template_exercises')
        .select(`
          id, created_at, exercise_id, template_id, order_index,
          exercise_definitions (
            id, name, main_muscle, type, category, description, pro_tip, video_url
          )
        `)
        .eq('template_id', templateId)
        .order('order_index', { ascending: true });

      if (fetchTemplateExercisesError) {
        throw new Error(fetchTemplateExercisesError.message);
      }

      const fetchedExercises: ExerciseDefinition[] = (templateExercisesData as TemplateExerciseJoin[])
        .filter(te => te.exercise_definitions && te.exercise_definitions.length > 0)
        .map(te => te.exercise_definitions![0] as ExerciseDefinition);
      setExercisesForTemplate(fetchedExercises);

      // 3. Fetch the ID of the most recent previous workout session for the user
      const { data: lastSessionData, error: lastSessionError } = await supabase
        .from('workout_sessions')
        .select('id')
        .eq('user_id', session.user.id)
        .order('session_date', { ascending: false })
        .limit(1)
        .single();

      if (lastSessionError && lastSessionError.code !== 'PGRST116') {
        console.warn("Error fetching last session ID:", lastSessionError.message);
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
            console.warn(`Could not fetch last set for exercise ${ex.name}:`, lastSetError.message);
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

      // 5. Create a new workout session entry
      const { data: sessionData, error: sessionError } = await supabase
        .from('workout_sessions')
        .insert({
          user_id: session.user.id,
          template_name: templateData.template_name,
          session_date: new Date().toISOString(),
        })
        .select('id')
        .single();

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
          weight_kg: null,
          reps: null,
          reps_l: null,
          reps_r: null,
          time_seconds: null,
          isSaved: false,
          isPR: false,
          lastWeight: lastSet?.weight_kg,
          lastReps: lastSet?.reps,
          lastTimeSeconds: lastSet?.time_seconds,
        }];
      });
      setExercisesWithSets(initialSets);

    } catch (err: any) {
      console.error("Failed to fetch workout data:", err);
      setError(err.message || "Failed to load workout. Please try again.");
      toast.error(err.message || "Failed to load workout.");
    } finally {
      setLoading(false);
    }
  }, [templateId, session, supabase, router]);

  useEffect(() => {
    fetchWorkoutData();
  }, [fetchWorkoutData]);

  return {
    workoutTemplate,
    exercisesForTemplate,
    exercisesWithSets,
    loading,
    error,
    currentSessionId,
    sessionStartTime,
    setExercisesWithSets,
  };
};