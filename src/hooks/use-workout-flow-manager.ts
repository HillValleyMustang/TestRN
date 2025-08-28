"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Session, SupabaseClient } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { Tables, SetLogState, WorkoutExercise } from '@/types/supabase';

type TPath = Tables<'t_paths'>;
type ExerciseDefinition = Tables<'exercise_definitions'>;

interface WorkoutWithLastCompleted extends TPath {
  last_completed_at: string | null;
}

interface GroupedTPath {
  mainTPath: TPath;
  childWorkouts: WorkoutWithLastCompleted[];
}

interface UseWorkoutFlowManagerProps {
  initialWorkoutId?: string | null;
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
  selectWorkout: (workoutId: string | null) => Promise<void>;
  addExerciseToSession: (exercise: ExerciseDefinition) => void;
  removeExerciseFromSession: (exerciseId: string) => void;
  substituteExercise: (oldExerciseId: string, newExercise: WorkoutExercise) => void;
  updateSessionStartTime: (timestamp: string) => void;
  markExerciseAsCompleted: (exerciseId: string, isNewPR: boolean) => void;
  resetWorkoutSession: () => void;
  updateExerciseSets: (exerciseId: string, newSets: SetLogState[]) => void;
  groupedTPaths: GroupedTPath[];
  isCreatingSession: boolean;
  createWorkoutSessionInDb: (templateName: string, firstSetTimestamp: string) => Promise<string>; // Added this line
}

const DEFAULT_INITIAL_SETS = 3;

export const useWorkoutFlowManager = ({ initialWorkoutId, session, supabase, router }: UseWorkoutFlowManagerProps): UseWorkoutFlowManagerReturn => {
  const [activeWorkout, setActiveWorkout] = useState<TPath | null>(null);
  const [exercisesForSession, setExercisesForSession] = useState<WorkoutExercise[]>([]);
  const [exercisesWithSets, setExercisesWithSets] = useState<Record<string, SetLogState[]>>({});
  const [allAvailableExercises, setAllAvailableExercises] = useState<ExerciseDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [completedExercises, setCompletedExercises] = useState<Set<string>>(new Set());
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string | null>(initialWorkoutId ?? null);
  const [groupedTPaths, setGroupedTPaths] = useState<GroupedTPath[]>([]);
  const [workoutExercisesCache, setWorkoutExercisesCache] = useState<Record<string, WorkoutExercise[]>>({});
  const [isCreatingSession, setIsCreatingSession] = useState(false);

  const resetWorkoutSession = useCallback(() => {
    setActiveWorkout(null);
    setExercisesForSession([]);
    setExercisesWithSets({});
    setCurrentSessionId(null);
    setSessionStartTime(null);
    setCompletedExercises(new Set());
  }, []);

  useEffect(() => {
    if (!session) {
      setLoading(false);
      return;
    }

    const prefetchAllData = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: exercisesData, error: fetchExercisesError } = await supabase
          .from('exercise_definitions')
          .select('id, name, main_muscle, type, category, description, pro_tip, video_url, library_id, is_favorite, created_at, user_id')
          .or(`user_id.eq.${session.user.id},user_id.is.null`)
          .order('name', { ascending: true });
        if (fetchExercisesError) throw fetchExercisesError;
        setAllAvailableExercises(exercisesData as ExerciseDefinition[] || []);

        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('active_t_path_id')
          .eq('id', session.user.id)
          .single();
        if (profileError && profileError.code !== 'PGRST116') throw profileError;
        const activeMainTPathId = profileData?.active_t_path_id || null;

        let mainTPathsData: TPath[] = [];
        if (activeMainTPathId) {
          const { data, error: mainTPathsError } = await supabase
            .from('t_paths')
            .select('id, template_name, is_bonus, version, settings, progression_settings, parent_t_path_id, created_at, user_id')
            .eq('id', activeMainTPathId)
            .is('parent_t_path_id', null);
          if (mainTPathsError) throw mainTPathsError;
          mainTPathsData = data as TPath[] || [];
        }

        const { data: childWorkoutsData, error: childWorkoutsError } = await supabase
          .from('t_paths')
          .select('id, template_name, is_bonus, version, settings, progression_settings, parent_t_path_id, created_at, user_id')
          .eq('user_id', session.user.id)
          .eq('is_bonus', true);
        if (childWorkoutsError) throw childWorkoutsError;
        const allChildWorkouts = (childWorkoutsData as TPath[]) || [];

        const workoutsWithLastDatePromises = allChildWorkouts.map(async (workout) => {
          const { data: lastSessionDate } = await supabase.rpc('get_last_workout_date_for_t_path', { p_t_path_id: workout.id });
          return { ...workout, last_completed_at: lastSessionDate?.[0]?.session_date || null };
        });
        const allChildWorkoutsWithLastDate = await Promise.all(workoutsWithLastDatePromises);

        const newGroupedTPaths: GroupedTPath[] = mainTPathsData.map(mainTPath => ({
          mainTPath,
          childWorkouts: allChildWorkoutsWithLastDate.filter(cw => cw.parent_t_path_id === mainTPath.id),
        }));
        setGroupedTPaths(newGroupedTPaths);

        const exercisePromises = allChildWorkouts.map(async (workout) => {
          const { data: tPathExercises, error: fetchLinksError } = await supabase
            .from('t_path_exercises')
            .select('exercise_id, is_bonus_exercise, order_index')
            .eq('template_id', workout.id)
            .order('order_index', { ascending: true });
          if (fetchLinksError) return { workoutId: workout.id, exercises: [] };
          if (!tPathExercises || tPathExercises.length === 0) return { workoutId: workout.id, exercises: [] };

          const exerciseIds = tPathExercises.map(e => e.exercise_id);
          const exerciseInfoMap = new Map(tPathExercises.map(e => [e.exercise_id, { is_bonus_exercise: !!e.is_bonus_exercise, order_index: e.order_index }]));
          const { data: exerciseDetails, error: fetchDetailsError } = await supabase.from('exercise_definitions').select('*').in('id', exerciseIds);
          if (fetchDetailsError) return { workoutId: workout.id, exercises: [] };

          const exercises: WorkoutExercise[] = (exerciseDetails as Tables<'exercise_definitions'>[] || [])
            .map(ex => ({ ...ex, is_bonus_exercise: exerciseInfoMap.get(ex.id)?.is_bonus_exercise || false }))
            .sort((a, b) => (exerciseInfoMap.get(a.id)?.order_index || 0) - (exerciseInfoMap.get(b.id)?.order_index || 0));
          return { workoutId: workout.id, exercises };
        });
        const results = await Promise.all(exercisePromises);
        const newCache: Record<string, WorkoutExercise[]> = {};
        results.forEach(result => { newCache[result.workoutId] = result.exercises; });
        setWorkoutExercisesCache(newCache);

      } catch (err: any) {
        setError(err.message || "Failed to prefetch workout data.");
        toast.error(err.message || "Failed to prefetch workout data.");
      } finally {
        setLoading(false);
      }
    };

    prefetchAllData();
  }, [session, supabase]);

  // New function to create the workout session in the database
  const createWorkoutSessionInDb = useCallback(async (templateName: string, firstSetTimestamp: string): Promise<string> => {
    if (!session) throw new Error("User not authenticated.");
    setIsCreatingSession(true);
    try {
      const { data: sessionData, error: sessionError } = await supabase
        .from('workout_sessions')
        .insert({ user_id: session.user.id, template_name: templateName, session_date: firstSetTimestamp })
        .select('id, session_date')
        .single();

      if (sessionError || !sessionData) {
        throw new Error(sessionError?.message || "Failed to create workout session in DB.");
      }
      setCurrentSessionId(sessionData.id);
      setSessionStartTime(new Date(sessionData.session_date));
      toast.success("Workout session started!");
      return sessionData.id;
    } catch (err: any) {
      setError(err.message || "Failed to create workout session.");
      toast.error(err.message || "Failed to create workout session.");
      throw err; // Re-throw to propagate the error
    } finally {
      setIsCreatingSession(false);
    }
  }, [session, supabase]);

  const selectWorkout = useCallback(async (workoutId: string | null) => {
    setSelectedWorkoutId(workoutId);
    if (workoutId) {
      // Reset session-specific states, but don't create DB entry yet
      resetWorkoutSession();

      let currentWorkout: TPath | null = null;
      let exercises: WorkoutExercise[] = [];
      // let sessionTemplateName: string = 'Ad Hoc Workout'; // This is now handled by createWorkoutSessionInDb

      if (workoutId === 'ad-hoc') {
        currentWorkout = { id: 'ad-hoc', template_name: 'Ad Hoc Workout', is_bonus: false, user_id: session?.user.id || null, created_at: new Date().toISOString(), version: 1, settings: null, progression_settings: null, parent_t_path_id: null };
        exercises = [];
      } else {
        const group = groupedTPaths.find(g => g.childWorkouts.some(cw => cw.id === workoutId));
        currentWorkout = group?.childWorkouts.find((w: WorkoutWithLastCompleted) => w.id === workoutId) || null;
        if (!currentWorkout) {
          toast.error("Selected workout not found.");
          resetWorkoutSession();
          return;
        }
        // sessionTemplateName = currentWorkout.template_name; // This is now handled by createWorkoutSessionInDb
        exercises = workoutExercisesCache[workoutId] || [];
      }

      setActiveWorkout(currentWorkout);
      setExercisesForSession(exercises);

      // Fetch last sets data for initial display (without creating session)
      const exerciseIdsInWorkout = exercises.map(ex => ex.id);
      const lastSetsData: Record<string, { weight_kg: number | null, reps: number | null, time_seconds: number | null }> = {};
      if (exerciseIdsInWorkout.length > 0 && session) {
        const { data: previousSets } = await supabase.from('set_logs').select(`exercise_id, weight_kg, reps, time_seconds, workout_sessions!inner(user_id)`).in('exercise_id', exerciseIdsInWorkout).eq('workout_sessions.user_id', session.user.id).order('created_at', { ascending: false });
        const mostRecentPreviousSets = new Map<string, { weight_kg: number | null, reps: number | null, time_seconds: number | null }>();
        for (const set of previousSets || []) { if (!mostRecentPreviousSets.has(set.exercise_id)) { mostRecentPreviousSets.set(set.exercise_id, { weight_kg: set.weight_kg, reps: set.reps, time_seconds: set.time_seconds }); } }
        mostRecentPreviousSets.forEach((value, key) => { lastSetsData[key] = value; });
      }

      const initialSets: Record<string, SetLogState[]> = {};
      exercises.forEach(ex => {
        const lastSet = lastSetsData[ex.id];
        initialSets[ex.id] = Array.from({ length: DEFAULT_INITIAL_SETS }).map(() => ({ id: null, created_at: null, session_id: null, exercise_id: ex.id, weight_kg: null, reps: null, reps_l: null, reps_r: null, time_seconds: null, is_pb: false, isSaved: false, isPR: false, lastWeight: lastSet?.weight_kg, lastReps: lastSet?.reps, lastTimeSeconds: lastSet?.time_seconds }));
      });
      setExercisesWithSets(initialSets);

    } else {
      resetWorkoutSession();
    }
  }, [session, supabase, resetWorkoutSession, groupedTPaths, workoutExercisesCache]);

  useEffect(() => {
    if (initialWorkoutId && !loading) {
      selectWorkout(initialWorkoutId);
    }
  }, [initialWorkoutId, loading, selectWorkout]);

  const updateSessionStartTime = useCallback(async (timestamp: string) => {
    // This function is now redundant as session creation is handled by createWorkoutSessionInDb
    // and sessionStartTime is set there.
    // However, if it's called, we ensure currentSessionId exists before attempting to update.
    if (currentSessionId && !sessionStartTime) {
      const { error } = await supabase.from('workout_sessions').update({ session_date: timestamp }).eq('id', currentSessionId);
      if (error) toast.error("Failed to record workout start time.");
      else setSessionStartTime(new Date(timestamp));
    }
  }, [currentSessionId, sessionStartTime, supabase]);

  const markExerciseAsCompleted = useCallback((exerciseId: string, isNewPR: boolean) => {
    setCompletedExercises(prev => new Set(prev).add(exerciseId));
  }, []);

  const addExerciseToSession = useCallback(async (exercise: ExerciseDefinition) => {
    if (!session) return; // Ensure session exists for user_id
    let lastWeight = null, lastReps = null, lastTimeSeconds = null;
    const { data: lastSet } = await supabase.from('set_logs').select('weight_kg, reps, time_seconds').eq('exercise_id', exercise.id).order('created_at', { ascending: false }).limit(1).single();
    if (lastSet) { lastWeight = lastSet.weight_kg; lastReps = lastSet.reps; lastTimeSeconds = lastSet.time_seconds; }
    setExercisesForSession(prev => [{ ...exercise, is_bonus_exercise: false }, ...prev]);
    setExercisesWithSets(prev => ({ ...prev, [exercise.id]: Array.from({ length: DEFAULT_INITIAL_SETS }).map(() => ({ id: null, created_at: null, session_id: currentSessionId, exercise_id: exercise.id, weight_kg: null, reps: null, reps_l: null, reps_r: null, time_seconds: null, is_pb: false, isSaved: false, isPR: false, lastWeight, lastReps, lastTimeSeconds })) }));
  }, [currentSessionId, session, supabase]);

  const removeExerciseFromSession = useCallback((exerciseId: string) => {
    setExercisesForSession(prev => prev.filter(ex => ex.id !== exerciseId));
    setExercisesWithSets(prev => { const newSets = { ...prev }; delete newSets[exerciseId]; return newSets; });
    setCompletedExercises(prev => { const newCompleted = new Set(prev); newCompleted.delete(exerciseId); return newCompleted; });
  }, []);

  const substituteExercise = useCallback((oldExerciseId: string, newExercise: WorkoutExercise) => {
    setExercisesForSession(prev => prev.map(ex => ex.id === oldExerciseId ? newExercise : ex));
    setExercisesWithSets(prev => {
      const newSets = { ...prev };
      if (!newSets[newExercise.id]) {
        newSets[newExercise.id] = Array.from({ length: DEFAULT_INITIAL_SETS }).map(() => ({ id: null, created_at: null, session_id: currentSessionId, exercise_id: newExercise.id, weight_kg: null, reps: null, reps_l: null, reps_r: null, time_seconds: null, is_pb: false, isSaved: false, isPR: false, lastWeight: null, lastReps: null, lastTimeSeconds: null }));
      }
      delete newSets[oldExerciseId];
      return newSets;
    });
    setCompletedExercises(prev => { const newCompleted = new Set(prev); newCompleted.delete(oldExerciseId); return newCompleted; });
  }, [currentSessionId]);

  const updateExerciseSets = useCallback((exerciseId: string, newSets: SetLogState[]) => {
    setExercisesWithSets(prev => ({ ...prev, [exerciseId]: newSets }));
  }, []);

  return { activeWorkout, exercisesForSession, exercisesWithSets, allAvailableExercises, loading, error, currentSessionId, sessionStartTime, completedExercises, selectWorkout, addExerciseToSession, removeExerciseFromSession, substituteExercise, updateSessionStartTime, markExerciseAsCompleted, resetWorkoutSession, updateExerciseSets, groupedTPaths, isCreatingSession, createWorkoutSessionInDb };
};