"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Session, SupabaseClient } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { Tables, SetLogState, WorkoutExercise, Profile as ProfileType, UserAchievement, GetLastExerciseSetsForExerciseReturns } from '@/types/supabase';
import { v4 as uuidv4 } from 'uuid';
import { db, addToSyncQueue, LocalWorkoutSession, LocalDraftSetLog } from '@/lib/db';

type TPath = Tables<'t_paths'>;
type ExerciseDefinition = Tables<'exercise_definitions'>;
type WorkoutSession = Tables<'workout_sessions'>;

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
  createWorkoutSessionInDb: (templateName: string, firstSetTimestamp: string) => Promise<string>;
  finishWorkoutSession: () => Promise<void>;
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

  const resetWorkoutSession = useCallback(async () => { // Made async
    setActiveWorkout(null);
    setExercisesForSession([]);
    setExercisesWithSets({});
    setCurrentSessionId(null);
    setSessionStartTime(null);
    setCompletedExercises(new Set());
    // Clear all drafts for the current user
    if (session?.user.id) {
      await db.draft_set_logs.clear(); // Clear all drafts
    }
  }, [session]); // Added session to dependencies

  const markExerciseAsCompleted = useCallback((exerciseId: string, isNewPR: boolean) => {
    setCompletedExercises((prev: Set<string>) => new Set(prev).add(exerciseId));
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
          .select('id, name, main_muscle, type, category, description, pro_tip, video_url, library_id, is_favorite, created_at, user_id, icon_url')
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

  const createWorkoutSessionInDb = useCallback(async (templateName: string, firstSetTimestamp: string): Promise<string> => {
    if (!session) throw new Error("User not authenticated.");
    setIsCreatingSession(true);
    try {
      const newSessionId = uuidv4();
      const sessionDataToSave: LocalWorkoutSession = {
        id: newSessionId,
        user_id: session.user.id,
        template_name: templateName,
        session_date: firstSetTimestamp,
        duration_string: null,
        rating: null,
        created_at: new Date().toISOString(),
        completed_at: null,
      };

      await db.workout_sessions.put(sessionDataToSave);
      await addToSyncQueue('create', 'workout_sessions', sessionDataToSave);

      // Update existing drafts to link to this new session ID
      const draftsToUpdate = await db.draft_set_logs.where({ session_id: null }).toArray();
      const updatePromises = draftsToUpdate.map(draft =>
        db.draft_set_logs.update([draft.exercise_id, draft.set_index], { session_id: newSessionId })
      );
      await Promise.all(updatePromises);

      setCurrentSessionId(newSessionId);
      setSessionStartTime(new Date(firstSetTimestamp));
      return newSessionId;
    } catch (err: any) {
      setError(err.message || "Failed to create workout session locally.");
      toast.error(err.message || "Failed to create workout session locally.");
      throw err;
    } finally {
      setIsCreatingSession(false);
    }
  }, [session]);

  const selectWorkout = useCallback(async (workoutId: string | null) => {
    setSelectedWorkoutId(workoutId);
    if (workoutId) {
      await resetWorkoutSession(); // Reset and clear drafts first

      let currentWorkout: TPath | null = null;
      let exercises: WorkoutExercise[] = [];

      if (workoutId === 'ad-hoc') {
        currentWorkout = { id: 'ad-hoc', template_name: 'Ad Hoc Workout', is_bonus: false, user_id: session?.user.id || null, created_at: new Date().toISOString(), version: 1, settings: null, progression_settings: null, parent_t_path_id: null };
        // For ad-hoc, we load exercises from drafts if they exist, otherwise start empty
        const adHocDrafts = await db.draft_set_logs.where({ session_id: null }).toArray();
        const adHocExerciseIds = Array.from(new Set(adHocDrafts.map(d => d.exercise_id)));
        
        if (adHocExerciseIds.length > 0) {
          const { data: adHocExerciseDetails, error: fetchAdHocError } = await supabase
            .from('exercise_definitions')
            .select('*')
            .in('id', adHocExerciseIds);
          if (fetchAdHocError) {
            console.error("Error fetching ad-hoc exercise details from drafts:", fetchAdHocError);
          } else {
            exercises = (adHocExerciseDetails as Tables<'exercise_definitions'>[] || []).map(ex => ({ ...ex, is_bonus_exercise: false }));
          }
        }
      } else {
        const group = groupedTPaths.find(g => g.childWorkouts.some(cw => cw.id === workoutId));
        currentWorkout = group?.childWorkouts.find((w: WorkoutWithLastCompleted) => w.id === workoutId) || null;
        if (!currentWorkout) {
          toast.error("Selected workout not found.");
          await resetWorkoutSession();
          return;
        }
        exercises = workoutExercisesCache[workoutId] || [];
      }

      setActiveWorkout(currentWorkout);
      setExercisesForSession(exercises);

      const lastSetsPromises = exercises.map(async (ex) => {
        if (!session) return { exerciseId: ex.id, sets: [] };
        const { data: lastExerciseSets, error: rpcError } = await supabase.rpc('get_last_exercise_sets_for_exercise', {
          p_user_id: session.user.id,
          p_exercise_id: ex.id,
        });
        if (rpcError) {
          console.error(`Error fetching last sets for exercise ${ex.name}:`, rpcError);
          return { exerciseId: ex.id, sets: [] };
        }
        return { exerciseId: ex.id, sets: lastExerciseSets || [] };
      });

      const allLastSetsData = await Promise.all(lastSetsPromises);
      const lastSetsMap = new Map<string, GetLastExerciseSetsForExerciseReturns>();
      allLastSetsData.forEach(item => lastSetsMap.set(item.exerciseId, item.sets));

      const initialSets: Record<string, SetLogState[]> = {};
      for (const ex of exercises) {
        const lastAttemptSets = lastSetsMap.get(ex.id) || [];
        const drafts = await db.draft_set_logs.where({ exercise_id: ex.id, session_id: currentSessionId }).sortBy('set_index');

        if (drafts.length > 0) {
          initialSets[ex.id] = drafts.map((draft, setIndex) => {
            const correspondingLastSet = lastAttemptSets[setIndex];
            return {
              id: null, created_at: null, session_id: draft.session_id, exercise_id: draft.exercise_id,
              weight_kg: draft.weight_kg, reps: draft.reps, reps_l: draft.reps_l, reps_r: draft.reps_r, time_seconds: draft.time_seconds,
              is_pb: false, isSaved: false, isPR: false,
              lastWeight: correspondingLastSet?.weight_kg || null,
              lastReps: correspondingLastSet?.reps || null,
              lastRepsL: correspondingLastSet?.reps_l || null,
              lastRepsR: correspondingLastSet?.reps_r || null,
              lastTimeSeconds: correspondingLastSet?.time_seconds || null,
            };
          });
        } else {
          initialSets[ex.id] = Array.from({ length: DEFAULT_INITIAL_SETS }).map((_, setIndex) => {
            const correspondingLastSet = lastAttemptSets[setIndex];
            return {
              id: null, created_at: null, session_id: currentSessionId, exercise_id: ex.id,
              weight_kg: null, reps: null, reps_l: null, reps_r: null, time_seconds: null,
              is_pb: false, isSaved: false, isPR: false,
              lastWeight: correspondingLastSet?.weight_kg || null,
              lastReps: correspondingLastSet?.reps || null,
              lastRepsL: correspondingLastSet?.reps_l || null,
              lastRepsR: correspondingLastSet?.reps_r || null,
              lastTimeSeconds: correspondingLastSet?.time_seconds || null,
            };
          });
        }
      }
      setExercisesWithSets(initialSets);

    } else {
      await resetWorkoutSession();
    }
  }, [session, supabase, resetWorkoutSession, groupedTPaths, workoutExercisesCache, currentSessionId]); // Added currentSessionId to dependencies

  useEffect(() => {
    if (initialWorkoutId && !loading) {
      selectWorkout(initialWorkoutId);
    }
  }, [initialWorkoutId, loading, selectWorkout]);

  const updateSessionStartTime = useCallback(async (timestamp: string) => {
    if (currentSessionId && !sessionStartTime) {
      setSessionStartTime(new Date(timestamp));
    }
  }, [currentSessionId, sessionStartTime]);

  const addExerciseToSession = useCallback(async (exercise: ExerciseDefinition) => {
    if (!session) return;
    let lastWeight = null, lastReps = null, lastTimeSeconds = null, lastRepsL = null, lastRepsR = null;
    
    const { data: lastExerciseSets, error: rpcError } = await supabase.rpc('get_last_exercise_sets_for_exercise', {
      p_user_id: session.user.id,
      p_exercise_id: exercise.id,
    });

    if (rpcError) {
      console.error(`Error fetching last sets for ad-hoc exercise ${exercise.name}:`, rpcError);
    } else if (lastExerciseSets && lastExerciseSets.length > 0) {
      const firstLastSet = lastExerciseSets[0];
      lastWeight = firstLastSet.weight_kg;
      lastReps = firstLastSet.reps;
      lastRepsL = firstLastSet.reps_l;
      lastRepsR = firstLastSet.reps_r;
      lastTimeSeconds = firstLastSet.time_seconds;
    }

    setExercisesForSession(prev => [{ ...exercise, is_bonus_exercise: false }, ...prev]);
    
    const newSetsForExercise: SetLogState[] = Array.from({ length: DEFAULT_INITIAL_SETS }).map((_, setIndex) => {
      const newSet: SetLogState = { 
        id: null, created_at: null, session_id: currentSessionId, exercise_id: exercise.id, 
        weight_kg: null, reps: null, reps_l: null, reps_r: null, time_seconds: null, 
        is_pb: false, isSaved: false, isPR: false, 
        lastWeight, lastReps, lastRepsL, lastRepsR, lastTimeSeconds
      };
      // Save new set as a draft immediately
      const draftPayload: LocalDraftSetLog = {
        exercise_id: exercise.id,
        set_index: setIndex,
        session_id: currentSessionId,
        weight_kg: newSet.weight_kg,
        reps: newSet.reps,
        reps_l: newSet.reps_l,
        reps_r: newSet.reps_r,
        time_seconds: newSet.time_seconds,
      };
      db.draft_set_logs.put(draftPayload); // No await needed, fire and forget
      return newSet;
    });

    setExercisesWithSets(prev => ({ ...prev, [exercise.id]: newSetsForExercise }));
  }, [currentSessionId, session, supabase]);

  const removeExerciseFromSession = useCallback(async (exerciseId: string) => { // Made async
    setExercisesForSession(prev => prev.filter(ex => ex.id !== exerciseId));
    setExercisesWithSets(prev => { const newSets = { ...prev }; delete newSets[exerciseId]; return newSets; });
    setCompletedExercises((prev: Set<string>) => { const newCompleted = new Set(prev); newCompleted.delete(exerciseId); return newCompleted; });
    // Clear drafts for the removed exercise
    await db.draft_set_logs.where({ exercise_id: exerciseId, session_id: currentSessionId }).delete();
  }, [currentSessionId]);

  const substituteExercise = useCallback(async (oldExerciseId: string, newExercise: WorkoutExercise) => { // Made async
    setExercisesForSession(prev => prev.map(ex => ex.id === oldExerciseId ? newExercise : ex));
    setExercisesWithSets(prev => {
      const newSets = { ...prev };
      if (!newSets[newExercise.id]) {
        const newSetsForExercise: SetLogState[] = Array.from({ length: DEFAULT_INITIAL_SETS }).map((_, setIndex) => {
          const newSet: SetLogState = { id: null, created_at: null, session_id: currentSessionId, exercise_id: newExercise.id, weight_kg: null, reps: null, reps_l: null, reps_r: null, time_seconds: null, is_pb: false, isSaved: false, isPR: false, lastWeight: null, lastReps: null, lastRepsL: null, lastRepsR: null, lastTimeSeconds: null };
          // Save new set as a draft immediately
          const draftPayload: LocalDraftSetLog = {
            exercise_id: newExercise.id,
            set_index: setIndex,
            session_id: currentSessionId,
            weight_kg: newSet.weight_kg,
            reps: newSet.reps,
            reps_l: newSet.reps_l,
            reps_r: newSet.reps_r,
            time_seconds: newSet.time_seconds,
          };
          db.draft_set_logs.put(draftPayload); // No await needed, fire and forget
          return newSet;
        });
        newSets[newExercise.id] = newSetsForExercise;
      }
      delete newSets[oldExerciseId];
      return newSets;
    });
    setCompletedExercises((prev: Set<string>) => { const newCompleted = new Set(prev); newCompleted.delete(oldExerciseId); return newCompleted; });
    // Clear drafts for the old exercise
    await db.draft_set_logs.where({ exercise_id: oldExerciseId, session_id: currentSessionId }).delete();
  }, [currentSessionId]);

  const updateExerciseSets = useCallback((exerciseId: string, newSets: SetLogState[]) => {
    setExercisesWithSets(prev => ({ ...prev, [exerciseId]: newSets }));
  }, []);

  const finishWorkoutSession = useCallback(async () => {
    if (!currentSessionId || !sessionStartTime || !session) {
      toast.error("Workout session not properly started or no sets logged yet.");
      return;
    }

    const endTime = new Date();
    const durationMs = endTime.getTime() - sessionStartTime.getTime();
    const durationMinutes = Math.round(durationMs / (1000 * 60));

    let durationString = '';
    if (durationMinutes < 60) {
      durationString = `${durationMinutes} minutes`;
    } else {
      const hours = Math.floor(durationMinutes / 60);
      const minutes = durationMinutes % 60;
      durationString = `${hours}h ${minutes}m`;
    }

    try {
      const updatePayload = { duration_string: durationString, completed_at: endTime.toISOString() };
      
      // Update local DB first
      await db.workout_sessions.update(currentSessionId, updatePayload);
      
      // Add to sync queue
      await addToSyncQueue('update', 'workout_sessions', { id: currentSessionId, ...updatePayload });

      // Clear all drafts associated with this session
      await db.draft_set_logs.where({ session_id: currentSessionId }).delete();

      // Explicitly invoke the achievement processing function from the client
      const { error: achievementError } = await supabase.functions.invoke('process-achievements', {
        body: { user_id: session.user.id, session_id: currentSessionId },
      });

      if (achievementError) {
        console.error("Error processing achievements:", achievementError);
        toast.warning("Could not check for new achievements, but your workout was saved!");
      }

      toast.success("Workout session finished and saved locally!");
      router.push(`/workout-summary/${currentSessionId}`);
      await resetWorkoutSession(); // Ensure reset is awaited
    } catch (err: any) {
      toast.error("Failed to save workout duration locally: " + err.message);
      console.error("Error saving duration:", err);
    }
  }, [currentSessionId, sessionStartTime, session, supabase, router, resetWorkoutSession]);

  return { activeWorkout, exercisesForSession, exercisesWithSets, allAvailableExercises, loading, error, currentSessionId, sessionStartTime, completedExercises, selectWorkout, addExerciseToSession, removeExerciseFromSession, substituteExercise, updateSessionStartTime, markExerciseAsCompleted, resetWorkoutSession, updateExerciseSets, groupedTPaths, isCreatingSession, createWorkoutSessionInDb, finishWorkoutSession };
};