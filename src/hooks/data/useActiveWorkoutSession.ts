"use client";

import { useState, useCallback, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import { Tables, SetLogState, WorkoutExercise } from '@/types/supabase';
import { db, addToSyncQueue, LocalWorkoutSession } from '@/lib/db';
import { useSession } from '@/components/session-context-provider';
import { useWorkoutDataFetcher } from '@/hooks/use-workout-data-fetcher';
import { useGym } from '@/components/gym-context-provider';

const DEFAULT_INITIAL_SETS = 3;

// Helper function to check if a set has any user input
const hasUserInput = (set: SetLogState): boolean => {
  return (set.weight_kg !== null && set.weight_kg > 0) ||
         (set.reps !== null && set.reps > 0) ||
         (set.reps_l !== null && set.reps_l > 0) ||
         (set.reps_r !== null && set.reps_r > 0) ||
         (set.time_seconds !== null && set.time_seconds > 0);
};

export const useActiveWorkoutSession = () => {
  // State management is now directly within this hook
  const [activeWorkout, setActiveWorkout] = useState<Tables<'t_paths'> | null>(null);
  const [exercisesForSession, setExercisesForSession] = useState<WorkoutExercise[]>([]);
  const [exercisesWithSets, setExercisesWithSets] = useState<Record<string, SetLogState[]>>({});
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [completedExercises, setCompletedExercises] = useState<Set<string>>(new Set());
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [expandedExerciseCards, setExpandedExerciseCards] = useState<Record<string, boolean>>({});

  const isWorkoutActive = useMemo(() => !!activeWorkout, [activeWorkout]);
  const hasUnsavedChanges = useMemo(() => {
    if (!isWorkoutActive) return false;
    return Object.values(exercisesWithSets).flat().some(set => !set.isSaved && hasUserInput(set));
  }, [isWorkoutActive, exercisesWithSets]);

  const _resetLocalState = useCallback(() => {
    setActiveWorkout(null);
    setExercisesForSession([]);
    setExercisesWithSets({});
    setCurrentSessionId(null);
    setSessionStartTime(null);
    setCompletedExercises(new Set());
    setIsCreatingSession(false);
    setExpandedExerciseCards({});
  }, []);


  const { session, supabase } = useSession();
  const { activeGym } = useGym();
  const { workoutExercisesCache, groupedTPaths } = useWorkoutDataFetcher();

  const resetWorkoutSession = useCallback(async () => {
    if (session?.user.id) {
      const allDrafts = await db.draft_set_logs.toArray();
      const userDraftKeys = allDrafts.map(draft => [draft.exercise_id, draft.set_index] as [string, number]);
      if (userDraftKeys.length > 0) {
        await db.draft_set_logs.bulkDelete(userDraftKeys);
      }
    }
    _resetLocalState();
  }, [session, _resetLocalState]);

  const selectWorkout = useCallback(async (workoutId: string | null) => {
    await resetWorkoutSession();
    if (!workoutId) return;

    if (workoutId === 'ad-hoc') {
      setActiveWorkout({ id: 'ad-hoc', template_name: 'Ad Hoc Workout', is_bonus: false, user_id: null, created_at: new Date().toISOString(), version: null, settings: null, progression_settings: null, parent_t_path_id: null, gym_id: null });
      return;
    }

    const selectedWorkout = groupedTPaths.flatMap(g => g.childWorkouts).find(w => w.id === workoutId);
    if (selectedWorkout) {
      let exercises = workoutExercisesCache[selectedWorkout.id] || [];
      if (activeGym) {
        const { data: gymLinks } = await supabase.from('gym_exercises').select('exercise_id').eq('gym_id', activeGym.id);
        const { data: allLinks } = await supabase.from('gym_exercises').select('exercise_id');
        const availableIds = new Set((gymLinks || []).map(l => l.exercise_id));
        const allLinkedIds = new Set((allLinks || []).map(l => l.exercise_id));
        exercises = exercises.filter(ex => !allLinkedIds.has(ex.id) || availableIds.has(ex.id));
      }
      setActiveWorkout(selectedWorkout);
      setExercisesForSession(exercises);
      const initialSets = Object.fromEntries(exercises.map(ex => [ex.id, Array.from({ length: DEFAULT_INITIAL_SETS }, () => ({ id: null, created_at: null, session_id: null, exercise_id: ex.id, weight_kg: null, reps: null, reps_l: null, reps_r: null, time_seconds: null, is_pb: false, isSaved: false, isPR: false, lastWeight: null, lastReps: null, lastRepsL: null, lastRepsR: null, lastTimeSeconds: null }))]));
      setExercisesWithSets(initialSets);
      setExpandedExerciseCards(Object.fromEntries(exercises.map(ex => [ex.id, true])));
    } else {
      toast.info("Selected workout not found.");
    }
  }, [resetWorkoutSession, groupedTPaths, workoutExercisesCache, activeGym, supabase, setActiveWorkout, setExercisesForSession, setExercisesWithSets, setExpandedExerciseCards]);

  const createWorkoutSessionInDb = useCallback(async (templateName: string, firstSetTimestamp: string): Promise<string> => {
    if (!session) throw new Error("User not authenticated.");
    setIsCreatingSession(true);
    try {
      const newSessionId = uuidv4();
      const sessionData: LocalWorkoutSession = {
        id: newSessionId,
        user_id: session.user.id,
        template_name: templateName,
        t_path_id: activeWorkout?.id === 'ad-hoc' ? null : activeWorkout?.id || null,
        session_date: firstSetTimestamp,
        duration_string: null,
        rating: null,
        created_at: new Date().toISOString(),
        completed_at: null,
      };
      await db.workout_sessions.put(sessionData);
      await addToSyncQueue('create', 'workout_sessions', sessionData);
      setCurrentSessionId(newSessionId);
      setSessionStartTime(new Date(firstSetTimestamp));
      return newSessionId;
    } finally {
      setIsCreatingSession(false);
    }
  }, [session, activeWorkout, setIsCreatingSession, setCurrentSessionId, setSessionStartTime]);

  const finishWorkoutSession = useCallback(async (): Promise<string | null> => {
    if (!currentSessionId || !sessionStartTime || !session || !activeWorkout) {
      toast.info("Workout session not properly started.");
      return null;
    }
    const endTime = new Date();
    const durationMs = endTime.getTime() - sessionStartTime.getTime();
    const durationMinutes = Math.round(durationMs / 60000);
    const durationString = durationMinutes < 60 ? `${durationMinutes} minutes` : `${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60}m`;

    try {
      const updatePayload = { duration_string: durationString, completed_at: endTime.toISOString() };
      await db.workout_sessions.update(currentSessionId, updatePayload);
      const fullSessionData = await db.workout_sessions.get(currentSessionId);
      if (fullSessionData) {
        await addToSyncQueue('update', 'workout_sessions', fullSessionData);
      }
      await db.draft_set_logs.where('session_id').equals(currentSessionId).delete();
      await supabase.functions.invoke('process-achievements', { body: { user_id: session.user.id, session_id: currentSessionId } });
      const finishedSessionId = currentSessionId;
      await resetWorkoutSession();
      return finishedSessionId;
    } catch (err: any) {
      toast.error("Failed to save workout duration.");
      return null;
    }
  }, [currentSessionId, sessionStartTime, session, activeWorkout, supabase, resetWorkoutSession]);

  const updateExerciseSets = useCallback((exerciseId: string, newSets: SetLogState[]) => {
    setExercisesWithSets(prev => ({ ...prev, [exerciseId]: newSets }));
  }, [setExercisesWithSets]);

  const markExerciseAsCompleted = useCallback((exerciseId: string) => {
    setCompletedExercises(prev => new Set(prev).add(exerciseId));
    setExpandedExerciseCards(prev => ({ ...prev, [exerciseId]: false }));
  }, [setCompletedExercises, setExpandedExerciseCards]);

  const addExerciseToSession = useCallback(async (exercise: Tables<'exercise_definitions'>) => {
    if (exercisesForSession.some(ex => ex.id === exercise.id)) {
      toast.info(`'${exercise.name}' is already in this session.`);
      return;
    }
    setExercisesForSession(prev => [{ ...exercise, is_bonus_exercise: false }, ...prev]);
    const newSets = Array.from({ length: DEFAULT_INITIAL_SETS }, () => ({ id: null, created_at: null, session_id: currentSessionId, exercise_id: exercise.id, weight_kg: null, reps: null, reps_l: null, reps_r: null, time_seconds: null, is_pb: false, isSaved: false, isPR: false, lastWeight: null, lastReps: null, lastRepsL: null, lastRepsR: null, lastTimeSeconds: null }));
    updateExerciseSets(exercise.id, newSets);
    setExpandedExerciseCards(prev => ({ ...prev, [exercise.id]: true }));
  }, [exercisesForSession, currentSessionId, updateExerciseSets, setExercisesForSession, setExpandedExerciseCards]);

  const removeExerciseFromSession = useCallback(async (exerciseId: string) => {
    setExercisesForSession(prev => prev.filter(ex => ex.id !== exerciseId));
    setExercisesWithSets(prev => { const newSets = { ...prev }; delete newSets[exerciseId]; return newSets; });
    setCompletedExercises(prev => { const newCompleted = new Set(prev); newCompleted.delete(exerciseId); return newCompleted; });
    setExpandedExerciseCards(prev => { const newExpanded = { ...prev }; delete newExpanded[exerciseId]; return newExpanded; });
  }, [setExercisesForSession, setExercisesWithSets, setCompletedExercises, setExpandedExerciseCards]);

  const substituteExercise = useCallback(async (oldExerciseId: string, newExercise: WorkoutExercise) => {
    if (exercisesForSession.some(ex => ex.id === newExercise.id)) {
      toast.info(`'${newExercise.name}' is already in this session.`);
      return;
    }
    setExercisesForSession(prev => prev.map(ex => ex.id === oldExerciseId ? newExercise : ex));
    const newSets = Array.from({ length: DEFAULT_INITIAL_SETS }, () => ({ id: null, created_at: null, session_id: currentSessionId, exercise_id: newExercise.id, weight_kg: null, reps: null, reps_l: null, reps_r: null, time_seconds: null, is_pb: false, isSaved: false, isPR: false, lastWeight: null, lastReps: null, lastRepsL: null, lastRepsR: null, lastTimeSeconds: null }));
    updateExerciseSets(newExercise.id, newSets);
    setExercisesWithSets(prev => { const newSets = { ...prev }; delete newSets[oldExerciseId]; return newSets; });
    setCompletedExercises(prev => { const newCompleted = new Set(prev); newCompleted.delete(oldExerciseId); return newCompleted; });
    setExpandedExerciseCards(prev => { const newExpanded = { ...prev }; delete newExpanded[oldExerciseId]; newExpanded[newExercise.id] = true; return newExpanded; });
  }, [exercisesForSession, currentSessionId, updateExerciseSets, setExercisesForSession, setExercisesWithSets, setCompletedExercises, setExpandedExerciseCards]);

  const toggleExerciseCardExpansion = useCallback((exerciseId: string) => {
    setExpandedExerciseCards(prev => ({ ...prev, [exerciseId]: !prev[exerciseId] }));
  }, [setExpandedExerciseCards]);

  // The new useEffect for reactivity
  useEffect(() => {
    const refreshActiveWorkoutExercises = async () => {
      if (activeWorkout && activeWorkout.id !== 'ad-hoc' && workoutExercisesCache[activeWorkout.id]) {
        let newExercisesFromCache = workoutExercisesCache[activeWorkout.id];
        
        if (activeGym) {
          const { data: gymLinks } = await supabase.from('gym_exercises').select('exercise_id').eq('gym_id', activeGym.id);
          const { data: allLinks } = await supabase.from('gym_exercises').select('exercise_id');
          const availableIds = new Set((gymLinks || []).map(l => l.exercise_id));
          const allLinkedIds = new Set((allLinks || []).map(l => l.exercise_id));
          newExercisesFromCache = newExercisesFromCache.filter(ex => !allLinkedIds.has(ex.id) || availableIds.has(ex.id));
        }

        const currentIds = exercisesForSession.map(e => e.id).sort().join(',');
        const newIds = newExercisesFromCache.map(e => e.id).sort().join(',');

        if (currentIds !== newIds) {
          toast.info(`Your workout '${activeWorkout.template_name}' has been updated.`);
          setExercisesForSession(newExercisesFromCache);
          const initialSets = Object.fromEntries(newExercisesFromCache.map(ex => [ex.id, Array.from({ length: DEFAULT_INITIAL_SETS }, () => ({ id: null, created_at: null, session_id: currentSessionId, exercise_id: ex.id, weight_kg: null, reps: null, reps_l: null, reps_r: null, time_seconds: null, is_pb: false, isSaved: false, isPR: false, lastWeight: null, lastReps: null, lastRepsL: null, lastRepsR: null, lastTimeSeconds: null }))]));
          setExercisesWithSets(initialSets);
          setCompletedExercises(new Set());
          setExpandedExerciseCards(Object.fromEntries(newExercisesFromCache.map(ex => [ex.id, true])));
        }
      }
    };
    refreshActiveWorkoutExercises();
  }, [activeWorkout, workoutExercisesCache, exercisesForSession, activeGym, supabase, setExercisesForSession, setExercisesWithSets, setCompletedExercises, setExpandedExerciseCards, currentSessionId]);

  return {
    activeWorkout,
    exercisesForSession,
    exercisesWithSets,
    currentSessionId,
    sessionStartTime,
    completedExercises,
    isCreatingSession,
    isWorkoutActive,
    hasUnsavedChanges,
    expandedExerciseCards,
    selectWorkout,
    resetWorkoutSession,
    createWorkoutSessionInDb,
    finishWorkoutSession,
    updateExerciseSets,
    markExerciseAsCompleted,
    addExerciseToSession,
    removeExerciseFromSession,
    substituteExercise,
    toggleExerciseCardExpansion,
    updateSessionStartTime: (timestamp: string) => setSessionStartTime(new Date(timestamp)),
  };
};