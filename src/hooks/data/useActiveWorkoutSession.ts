"use client";

import { useState, useCallback, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import { Tables, SetLogState, WorkoutExercise, ExerciseDefinition, GroupedTPath } from '@/types/supabase';
import { db, addToSyncQueue, LocalWorkoutSession } from '@/lib/db';
import { useSession } from '@/components/session-context-provider';
import { useGym } from '@/components/gym-context-provider';
import { supabase } from '@/integrations/supabase/client';

const DEFAULT_INITIAL_SETS = 3;

// Helper function to check if a set has any user input
const hasUserInput = (set: SetLogState): boolean => {
  return (set.weight_kg !== null && set.weight_kg > 0) ||
         (set.reps !== null && set.reps > 0) ||
         (set.reps_l !== null && set.reps_l > 0) ||
         (set.reps_r !== null && set.reps_r > 0) ||
         (set.time_seconds !== null && set.time_seconds > 0);
};

interface UseActiveWorkoutSessionProps {
  groupedTPaths: GroupedTPath[];
  workoutExercisesCache: Record<string, WorkoutExercise[]>;
}

export const useActiveWorkoutSession = ({ groupedTPaths, workoutExercisesCache }: UseActiveWorkoutSessionProps) => {
  const [activeWorkout, setActiveWorkout] = useState<Tables<'t_paths'> | null>(null);
  const [exercisesForSession, setExercisesForSession] = useState<WorkoutExercise[]>([]);
  const [exercisesWithSets, setExercisesWithSets] = useState<Record<string, SetLogState[]>>({});
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [completedExercises, setCompletedExercises] = useState<Set<string>>(new Set());
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [expandedExerciseCards, setExpandedExerciseCards] = useState<Record<string, boolean>>({});
  const [isWorkoutSessionStarted, setIsWorkoutSessionStarted] = useState(false); // NEW STATE

  const isWorkoutActive = useMemo(() => !!activeWorkout, [activeWorkout]);
  const hasUnsavedChanges = useMemo(() => {
    if (!isWorkoutActive) return false;
    return Object.values(exercisesWithSets).flat().some(set => !set.isSaved && hasUserInput(set));
  }, [isWorkoutActive, exercisesWithSets]);

  const _resetLocalState = useCallback(() => {
    console.log("[ActiveWorkoutSession] _resetLocalState called.");
    setActiveWorkout(null);
    setExercisesForSession([]);
    setExercisesWithSets({});
    setCurrentSessionId(null);
    setSessionStartTime(null);
    setCompletedExercises(new Set());
    setIsCreatingSession(false);
    setExpandedExerciseCards({});
    setIsWorkoutSessionStarted(false); // RESET NEW STATE
  }, []);

  const { session } = useSession();
  const { activeGym } = useGym();

  const resetWorkoutSession = useCallback(async () => {
    console.log("[ActiveWorkoutSession] resetWorkoutSession called.");
    if (session?.user.id) {
      try {
        const allDrafts = await db.draft_set_logs.toArray();
        const userDraftKeys = allDrafts.map(draft => [draft.exercise_id, draft.set_index] as [string, number]);
        if (userDraftKeys.length > 0) {
          await db.draft_set_logs.bulkDelete(userDraftKeys);
          console.log("[ActiveWorkoutSession] Cleared draft set logs from IndexedDB.");
        }
      } catch (error) {
        console.error("[ActiveWorkoutSession] Error clearing draft set logs:", error);
        toast.error("Failed to clear local workout drafts.");
      }
    }
    _resetLocalState();
  }, [session, _resetLocalState]);

  const selectWorkout = useCallback(async (workoutId: string | null) => {
    console.log(`[ActiveWorkoutSession] selectWorkout called with workoutId: ${workoutId}`);
    await resetWorkoutSession();
    if (!workoutId) return;

    if (workoutId === 'ad-hoc') {
      console.log("[ActiveWorkoutSession] Setting active workout to Ad Hoc.");
      setActiveWorkout({ id: 'ad-hoc', template_name: 'Ad Hoc Workout', is_bonus: false, user_id: null, created_at: new Date().toISOString(), version: null, settings: null, progression_settings: null, parent_t_path_id: null, gym_id: null });
      return;
    }

    const selectedWorkout = groupedTPaths.flatMap(g => g.childWorkouts).find(w => w.id === workoutId);
    if (selectedWorkout) {
      console.log(`[ActiveWorkoutSession] Found selected workout: ${selectedWorkout.template_name}`);
      let exercises = workoutExercisesCache[selectedWorkout.id] || [];
      console.log(`[ActiveWorkoutSession] Initial exercises from cache for ${selectedWorkout.template_name}:`, exercises.map(e => e.name));

      if (activeGym) {
        try {
          const { data: gymLinks, error: gymLinksError } = await supabase.from('gym_exercises').select('exercise_id').eq('gym_id', activeGym.id);
          if (gymLinksError) throw gymLinksError;
          const { data: allLinks, error: allLinksError } = await supabase.from('gym_exercises').select('exercise_id');
          if (allLinksError) throw allLinksError;

          const availableIds = new Set((gymLinks || []).map(l => l.exercise_id));
          const allLinkedIds = new Set((allLinks || []).map(l => l.exercise_id));
          exercises = exercises.filter(ex => !allLinkedIds.has(ex.id) || availableIds.has(ex.id));
          console.log(`[ActiveWorkoutSession] Exercises after gym filtering for ${selectedWorkout.template_name}:`, exercises.map(e => e.name));
        } catch (error) {
          console.error("[ActiveWorkoutSession] Error filtering exercises by active gym:", error);
          toast.error("Failed to filter exercises by active gym.");
        }
      }
      setActiveWorkout(selectedWorkout);
      setExercisesForSession(exercises);
      const initialSets = Object.fromEntries(exercises.map(ex => [ex.id, Array.from({ length: DEFAULT_INITIAL_SETS }, () => ({ id: null, created_at: null, session_id: null, exercise_id: ex.id, weight_kg: null, reps: null, reps_l: null, reps_r: null, time_seconds: null, is_pb: false, isSaved: false, isPR: false, lastWeight: null, lastReps: null, lastRepsL: null, lastRepsR: null, lastTimeSeconds: null }))]));
      setExercisesWithSets(initialSets);
      setCompletedExercises(new Set());
      setExpandedExerciseCards(Object.fromEntries(exercises.map(ex => [ex.id, false]))); // Changed to false for collapsed by default
    } else {
      toast.error("Selected workout not found.");
      console.error("[ActiveWorkoutSession] Error: Selected workout not found for ID:", workoutId);
    }
  }, [resetWorkoutSession, groupedTPaths, workoutExercisesCache, activeGym, supabase]);

  const createWorkoutSessionInDb = useCallback(async (templateName: string, firstSetTimestamp: string): Promise<string> => {
    console.log(`[ActiveWorkoutSession] createWorkoutSessionInDb called for template: ${templateName}, timestamp: ${firstSetTimestamp}`);
    if (!session) {
      console.error("[ActiveWorkoutSession] Error: User not authenticated when trying to create workout session.");
      throw new Error("User not authenticated.");
    }
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
      setIsWorkoutSessionStarted(true); // SET NEW STATE TO TRUE
      console.log(`[ActiveWorkoutSession] New workout session created in DB and IndexedDB: ${newSessionId}`);
      return newSessionId;
    } catch (error) {
      console.error("[ActiveWorkoutSession] Error creating workout session in DB:", error);
      toast.error("Failed to start workout session.");
      throw error;
    } finally {
      setIsCreatingSession(false);
    }
  }, [session, activeWorkout]);

  const finishWorkoutSession = useCallback(async (): Promise<string | null> => {
    console.log("[ActiveWorkoutSession] finishWorkoutSession called.");
    if (!currentSessionId || !sessionStartTime || !session || !activeWorkout) {
      console.error("[ActiveWorkoutSession] Error: Workout session not properly started or missing data for finishing.");
      toast.error("Workout session not properly started.");
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
        console.log(`[ActiveWorkoutSession] Workout session ${currentSessionId} updated in IndexedDB and added to sync queue.`);
      }
      await db.draft_set_logs.where('session_id').equals(currentSessionId).delete();
      console.log(`[ActiveWorkoutSession] Draft set logs for session ${currentSessionId} cleared.`);
      
      console.log(`[ActiveWorkoutSession] Invoking process-achievements for user ${session.user.id}, session ${currentSessionId}`);
      const { error: achievementError } = await supabase.functions.invoke('process-achievements', { body: { user_id: session.user.id, session_id: currentSessionId } });
      if (achievementError) {
        console.error("[ActiveWorkoutSession] Error invoking process-achievements:", achievementError);
        toast.error("Failed to process achievements.");
      }

      const finishedSessionId = currentSessionId;
      await resetWorkoutSession();
      console.log(`[ActiveWorkoutSession] Workout session ${finishedSessionId} finished successfully.`);
      return finishedSessionId;
    } catch (error) {
      console.error("[ActiveWorkoutSession] Error finishing workout session:", error);
      toast.error("Failed to save workout duration.");
      return null;
    }
  }, [currentSessionId, sessionStartTime, session, activeWorkout, supabase, resetWorkoutSession]);

  const updateExerciseSets = useCallback((exerciseId: string, newSets: SetLogState[]) => {
    console.log(`[ActiveWorkoutSession] updateExerciseSets called for exerciseId: ${exerciseId}`);
    setExercisesWithSets(prev => ({ ...prev, [exerciseId]: newSets }));
  }, []);

  const markExerciseAsCompleted = useCallback((exerciseId: string) => {
    console.log(`[ActiveWorkoutSession] markExerciseAsCompleted called for exerciseId: ${exerciseId}`);
    setCompletedExercises((prev: Set<string>) => new Set(prev).add(exerciseId));
    setExpandedExerciseCards(prev => ({ ...prev, [exerciseId]: false }));
  }, []);

  const addExerciseToSession = useCallback(async (exercise: ExerciseDefinition) => {
    console.log(`[ActiveWorkoutSession] addExerciseToSession called for exercise: ${exercise.name}`);
    if (exercisesForSession.some(ex => ex.id === exercise.id)) {
      toast.info(`'${exercise.name}' is already in this session.`);
      return;
    }
    setExercisesForSession(prev => [{ ...exercise, is_bonus_exercise: false }, ...prev]);
    const newSets = Array.from({ length: DEFAULT_INITIAL_SETS }, () => ({ id: null, created_at: null, session_id: currentSessionId, exercise_id: exercise.id, weight_kg: null, reps: null, reps_l: null, reps_r: null, time_seconds: null, is_pb: false, isSaved: false, isPR: false, lastWeight: null, lastReps: null, lastRepsL: null, lastRepsR: null, lastTimeSeconds: null }));
    updateExerciseSets(exercise.id, newSets);
    setExpandedExerciseCards(prev => ({ ...prev, [exercise.id]: false })); // Changed to false for collapsed by default
    console.log(`[ActiveWorkoutSession] Exercise ${exercise.name} added to session.`);
  }, [exercisesForSession, currentSessionId, updateExerciseSets]);

  const removeExerciseFromSession = useCallback(async (exerciseId: string) => {
    console.log(`[ActiveWorkoutSession] removeExerciseFromSession called for exerciseId: ${exerciseId}`);
    setExercisesForSession(prev => prev.filter(ex => ex.id !== exerciseId));
    setExercisesWithSets(prev => { const newSets = { ...prev }; delete newSets[exerciseId]; return newSets; });
    setCompletedExercises((prev: Set<string>) => { const newCompleted = new Set(prev); newCompleted.delete(exerciseId); return newCompleted; });
    setExpandedExerciseCards(prev => { const newExpanded = { ...prev }; delete newExpanded[exerciseId]; return newExpanded; });
    console.log(`[ActiveWorkoutSession] Exercise ${exerciseId} removed from session.`);
  }, []);

  const substituteExercise = useCallback(async (oldExerciseId: string, newExercise: WorkoutExercise) => {
    console.log(`[ActiveWorkoutSession] substituteExercise called: old=${oldExerciseId}, new=${newExercise.name}`);
    if (exercisesForSession.some(ex => ex.id === newExercise.id)) {
      toast.info(`'${newExercise.name}' is already in this session.`);
      return;
    }
    setExercisesForSession(prev => prev.map(ex => ex.id === oldExerciseId ? newExercise : ex));
    const newSets = Array.from({ length: DEFAULT_INITIAL_SETS }, () => ({ id: null, created_at: null, session_id: currentSessionId, exercise_id: newExercise.id, weight_kg: null, reps: null, reps_l: null, reps_r: null, time_seconds: null, is_pb: false, isSaved: false, isPR: false, lastWeight: null, lastReps: null, lastRepsL: null, lastRepsR: null, lastTimeSeconds: null }));
    updateExerciseSets(newExercise.id, newSets);
    setExercisesWithSets(prev => { const newSets = { ...prev }; delete newSets[oldExerciseId]; return newSets; });
    setCompletedExercises((prev: Set<string>) => { const newCompleted = new Set(prev); newCompleted.delete(oldExerciseId); return newCompleted; });
    setExpandedExerciseCards(prev => { const newExpanded = { ...prev }; delete newExpanded[oldExerciseId]; newExpanded[newExercise.id] = false; return newExpanded; }); // Changed to false for collapsed by default
    console.log(`[ActiveWorkoutSession] Exercise ${oldExerciseId} substituted with ${newExercise.name}.`);
  }, [exercisesForSession, currentSessionId, updateExerciseSets]);

  const toggleExerciseCardExpansion = useCallback((exerciseId: string) => {
    console.log(`[ActiveWorkoutSession] toggleExerciseCardExpansion called for exerciseId: ${exerciseId}`);
    setExpandedExerciseCards(prev => ({ ...prev, [exerciseId]: !prev[exerciseId] }));
  }, []);

  // The useEffect for reactivity
  useEffect(() => {
    const refreshActiveWorkoutExercises = async () => {
      console.log("[ActiveWorkoutSession] Reactivity useEffect triggered.");
      if (!activeWorkout || activeWorkout.id === 'ad-hoc') {
        console.log("[ActiveWorkoutSession] No active workout or it's ad-hoc, skipping reactivity update.");
        return;
      }

      const newExercisesFromCache = workoutExercisesCache[activeWorkout.id];
      console.log(`[ActiveWorkoutSession] Active workout ID: ${activeWorkout.id}, Name: ${activeWorkout.template_name}`);
      console.log("[ActiveWorkoutSession] New exercises from cache (raw):", newExercisesFromCache?.map(e => e.name));

      if (!newExercisesFromCache) {
        console.log("[ActiveWorkoutSession] No new exercises found in cache for active workout, skipping update.");
        return;
      }

      let filteredNewExercises = newExercisesFromCache;

      if (activeGym) {
        try {
          const { data: gymLinks, error: gymLinksError } = await supabase.from('gym_exercises').select('exercise_id').eq('gym_id', activeGym.id);
          if (gymLinksError) throw gymLinksError;
          const { data: allLinks, error: allLinksError } = await supabase.from('gym_exercises').select('exercise_id');
          if (allLinksError) throw allLinksError;

          const availableIds = new Set((gymLinks || []).map(l => l.exercise_id));
          const allLinkedIds = new Set((allLinks || []).map(l => l.exercise_id));
          filteredNewExercises = newExercisesFromCache.filter(ex => !allLinkedIds.has(ex.id) || availableIds.has(ex.id));
          console.log("[ActiveWorkoutSession] New exercises after gym filtering:", filteredNewExercises.map(e => e.name));
        } catch (error) {
          console.error("[ActiveWorkoutSession] Error filtering exercises by active gym in reactivity effect:", error);
          toast.error("Failed to update workout exercises based on active gym.");
          return;
        }
      }

      const currentIds = exercisesForSession.map(e => e.id).sort().join(',');
      const newIds = filteredNewExercises.map(e => e.id).sort().join(',');

      console.log(`[ActiveWorkoutSession] Current exercise IDs in state: ${currentIds}`);
      console.log(`[ActiveWorkoutSession] New exercise IDs from filtered cache: ${newIds}`);

      if (currentIds !== newIds) {
        console.log("[ActiveWorkoutSession] Detected change in exercise IDs. Updating session exercises.");
        setExercisesForSession(filteredNewExercises);
        const initialSets = Object.fromEntries(filteredNewExercises.map(ex => [ex.id, Array.from({ length: DEFAULT_INITIAL_SETS }, () => ({ id: null, created_at: null, session_id: currentSessionId, exercise_id: ex.id, weight_kg: null, reps: null, reps_l: null, reps_r: null, time_seconds: null, is_pb: false, isSaved: false, isPR: false, lastWeight: null, lastReps: null, lastRepsL: null, lastRepsR: null, lastTimeSeconds: null }))]));
        setExercisesWithSets(initialSets);
        setCompletedExercises(new Set());
        setExpandedExerciseCards(Object.fromEntries(filteredNewExercises.map(ex => [ex.id, false]))); // Changed to false for collapsed by default
      } else {
        console.log("[ActiveWorkoutSession] No change in exercise IDs. Skipping update.");
      }
    };
    refreshActiveWorkoutExercises();
  }, [activeWorkout, workoutExercisesCache, activeGym, supabase, currentSessionId]); // Removed exercisesForSession from dependencies

  return useMemo(() => ({
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
    isWorkoutSessionStarted, // EXPOSE NEW STATE
  }), [
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
    isWorkoutSessionStarted,
  ]);
};