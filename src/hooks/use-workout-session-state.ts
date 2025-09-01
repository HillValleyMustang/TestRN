"use client";

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import { Tables, SetLogState, WorkoutExercise, GetLastExerciseSetsForExerciseReturns } from '@/types/supabase';
import { db, addToSyncQueue, LocalWorkoutSession, LocalDraftSetLog } from '@/lib/db';
import { useSession } from '@/components/session-context-provider';

type TPath = Tables<'t_paths'>;
type ExerciseDefinition = Tables<'exercise_definitions'>;

const DEFAULT_INITIAL_SETS = 3;

// Helper function to validate if an ID is a non-empty string
const isValidId = (id: string | null | undefined): id is string => {
  return typeof id === 'string' && id.length > 0;
};

// Helper function to validate a composite key for draft_set_logs
const isValidDraftKey = (exerciseId: string | null | undefined, setIndex: number | null | undefined): boolean => {
  return isValidId(exerciseId) && typeof setIndex === 'number' && setIndex >= 0;
};

interface UseWorkoutSessionStateProps {
  allAvailableExercises: ExerciseDefinition[];
}

interface UseWorkoutSessionStateReturn {
  activeWorkout: TPath | null;
  exercisesForSession: WorkoutExercise[];
  exercisesWithSets: Record<string, SetLogState[]>;
  currentSessionId: string | null;
  sessionStartTime: Date | null;
  completedExercises: Set<string>;
  isCreatingSession: boolean;
  setActiveWorkout: (workout: TPath | null) => void;
  setExercisesForSession: (exercises: WorkoutExercise[]) => void;
  setExercisesWithSets: (sets: Record<string, SetLogState[]>) => void;
  setCurrentSessionId: (id: string | null) => void;
  setSessionStartTime: (time: Date | null) => void;
  setCompletedExercises: (exercises: Set<string>) => void;
  resetWorkoutSession: () => Promise<void>;
  markExerciseAsCompleted: (exerciseId: string, isNewPR: boolean) => void;
  addExerciseToSession: (exercise: ExerciseDefinition) => Promise<void>;
  removeExerciseFromSession: (exerciseId: string) => Promise<void>;
  substituteExercise: (oldExerciseId: string, newExercise: WorkoutExercise) => Promise<void>;
  updateExerciseSets: (exerciseId: string, newSets: SetLogState[]) => void;
  createWorkoutSessionInDb: (templateName: string, firstSetTimestamp: string) => Promise<string>;
  finishWorkoutSession: () => Promise<void>;
}

export const useWorkoutSessionState = ({ allAvailableExercises }: UseWorkoutSessionStateProps): UseWorkoutSessionStateReturn => {
  const { session, supabase } = useSession();
  const router = useRouter();

  const [activeWorkout, setActiveWorkout] = useState<TPath | null>(null);
  const [exercisesForSession, setExercisesForSession] = useState<WorkoutExercise[]>([]);
  const [exercisesWithSets, setExercisesWithSets] = useState<Record<string, SetLogState[]>>({});
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [completedExercises, setCompletedExercises] = useState<Set<string>>(new Set());
  const [isCreatingSession, setIsCreatingSession] = useState(false);

  const resetWorkoutSession = useCallback(async () => {
    setActiveWorkout(null);
    setExercisesForSession([]);
    setExercisesWithSets({});
    setCurrentSessionId(null);
    setSessionStartTime(null);
    setCompletedExercises(new Set());
    if (session?.user.id) {
      // Clear all drafts for the current user
      const allDrafts = await db.draft_set_logs.toArray();
      const userDraftKeys = allDrafts
        .filter(draft => isValidId(draft.exercise_id)) // Ensure exercise_id is valid
        .map(draft => [draft.exercise_id, draft.set_index] as [string, number]); // Explicitly cast to tuple
      
      if (userDraftKeys.length > 0) {
        console.assert(userDraftKeys.every(key => isValidDraftKey(key[0], key[1])), `Invalid draft keys in resetWorkoutSession bulkDelete: ${JSON.stringify(userDraftKeys)}`);
        await db.draft_set_logs.bulkDelete(userDraftKeys);
      }
    }
  }, [session]);

  const markExerciseAsCompleted = useCallback((exerciseId: string, isNewPR: boolean) => {
    setCompletedExercises((prev: Set<string>) => new Set(prev).add(exerciseId));
  }, []);

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

      const draftsToUpdate = await db.draft_set_logs.where({ session_id: null }).toArray();
      const updatePromises = draftsToUpdate.map(draft => {
        console.assert(isValidDraftKey(draft.exercise_id, draft.set_index), `Invalid draft key in createWorkoutSessionInDb update: [${draft.exercise_id}, ${draft.set_index}]`);
        return db.draft_set_logs.update([draft.exercise_id, draft.set_index], { session_id: newSessionId });
      });
      await Promise.all(updatePromises);

      setCurrentSessionId(newSessionId);
      setSessionStartTime(new Date(firstSetTimestamp));
      return newSessionId;
    } catch (err: any) {
      toast.error(err.message || "Failed to create workout session locally.");
      throw err;
    } finally {
      setIsCreatingSession(false);
    }
  }, [session]);

  const addExerciseToSession = useCallback(async (exercise: ExerciseDefinition) => {
    if (!session) return;
    if (!isValidId(exercise.id)) {
      console.error("Attempted to add exercise with invalid ID:", exercise);
      toast.error("Cannot add exercise: invalid exercise ID.");
      return;
    }

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
      console.assert(isValidDraftKey(draftPayload.exercise_id, draftPayload.set_index), `Invalid draft key in addExerciseToSession put: [${draftPayload.exercise_id}, ${draftPayload.set_index}]`);
      db.draft_set_logs.put(draftPayload);
      return newSet;
    });

    setExercisesWithSets(prev => ({ ...prev, [exercise.id]: newSetsForExercise }));
  }, [currentSessionId, session, supabase]);

  const removeExerciseFromSession = useCallback(async (exerciseId: string) => {
    if (!isValidId(exerciseId)) {
      console.error("Attempted to remove exercise with invalid ID:", exerciseId);
      toast.error("Cannot remove exercise: invalid exercise ID.");
      return;
    }
    setExercisesForSession(prev => prev.filter(ex => ex.id !== exerciseId));
    setExercisesWithSets(prev => { const newSets = { ...prev }; delete newSets[exerciseId]; return newSets; });
    setCompletedExercises((prev: Set<string>) => { const newCompleted = new Set(prev); newCompleted.delete(exerciseId); return newCompleted; });
    
    // Delete all drafts for this exercise and session
    const draftsToDelete = await db.draft_set_logs
      .where('exercise_id').equals(exerciseId)
      .filter(draft => draft.session_id === currentSessionId)
      .toArray();
    
    if (draftsToDelete.length > 0) {
      const keysToDelete = draftsToDelete.map(d => [d.exercise_id, d.set_index] as [string, number]); // Explicitly cast to tuple
      console.assert(keysToDelete.every(key => isValidDraftKey(key[0], key[1])), `Invalid draft keys in removeExerciseFromSession bulkDelete: ${JSON.stringify(keysToDelete)}`);
      await db.draft_set_logs.bulkDelete(keysToDelete);
    }
  }, [currentSessionId]);

  const substituteExercise = useCallback(async (oldExerciseId: string, newExercise: WorkoutExercise) => {
    if (!isValidId(oldExerciseId) || !isValidId(newExercise.id)) {
      console.error("Attempted to substitute exercise with invalid IDs:", oldExerciseId, newExercise);
      toast.error("Cannot substitute exercise: invalid exercise ID(s).");
      return;
    }

    setExercisesForSession(prev => prev.map(ex => ex.id === oldExerciseId ? newExercise : ex));
    setExercisesWithSets(prev => {
      const newSets = { ...prev };
      if (!newSets[newExercise.id]) {
        const newSetsForExercise: SetLogState[] = Array.from({ length: DEFAULT_INITIAL_SETS }).map((_, setIndex) => {
          const newSet: SetLogState = { id: null, created_at: null, session_id: currentSessionId, exercise_id: newExercise.id, weight_kg: null, reps: null, reps_l: null, reps_r: null, time_seconds: null, is_pb: false, isSaved: false, isPR: false, lastWeight: null, lastReps: null, lastRepsL: null, lastRepsR: null, lastTimeSeconds: null };
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
          console.assert(isValidDraftKey(draftPayload.exercise_id, draftPayload.set_index), `Invalid draft key in substituteExercise put: [${draftPayload.exercise_id}, ${draftPayload.set_index}]`);
          db.draft_set_logs.put(draftPayload);
          return newSet;
        });
        newSets[newExercise.id] = newSetsForExercise;
      }
      delete newSets[oldExerciseId];
      return newSets;
    });
    setCompletedExercises((prev: Set<string>) => { const newCompleted = new Set(prev); newCompleted.delete(oldExerciseId); return newCompleted; });
    
    // Delete drafts for the old exercise
    const draftsToDelete = await db.draft_set_logs
      .where('exercise_id').equals(oldExerciseId)
      .filter(draft => draft.session_id === currentSessionId)
      .toArray();
    
    if (draftsToDelete.length > 0) {
      const keysToDelete = draftsToDelete.map(d => [d.exercise_id, d.set_index] as [string, number]); // Explicitly cast to tuple
      console.assert(keysToDelete.every(key => isValidDraftKey(key[0], key[1])), `Invalid draft keys in substituteExercise bulkDelete: ${JSON.stringify(keysToDelete)}`);
      await db.draft_set_logs.bulkDelete(keysToDelete);
    }
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
      
      await db.workout_sessions.update(currentSessionId, updatePayload);
      await addToSyncQueue('update', 'workout_sessions', { id: currentSessionId, ...updatePayload });

      // Delete all drafts for the current session
      const draftsToDelete = await db.draft_set_logs
        .where('session_id').equals(currentSessionId)
        .toArray();
      
      if (draftsToDelete.length > 0) {
        const keysToDelete = draftsToDelete.map(d => [d.exercise_id, d.set_index] as [string, number]); // Explicitly cast to tuple
        console.assert(keysToDelete.every(key => isValidDraftKey(key[0], key[1])), `Invalid draft keys in finishWorkoutSession bulkDelete: ${JSON.stringify(keysToDelete)}`);
        await db.draft_set_logs.bulkDelete(keysToDelete);
      }

      const { error: achievementError } = await supabase.functions.invoke('process-achievements', {
        body: { user_id: session.user.id, session_id: currentSessionId },
      });

      if (achievementError) {
        console.error("Error processing achievements:", achievementError);
        toast.warning("Could not check for new achievements, but your workout was saved!");
      }

      toast.success("Workout session finished and saved locally!");
      router.push(`/workout-summary/${currentSessionId}`);
      await resetWorkoutSession();
    } catch (err: any) {
      toast.error("Failed to save workout duration locally: " + err.message);
      console.error("Error saving duration:", err);
    }
  }, [currentSessionId, sessionStartTime, session, supabase, router, resetWorkoutSession]);

  return {
    activeWorkout,
    exercisesForSession,
    exercisesWithSets,
    currentSessionId,
    sessionStartTime,
    completedExercises,
    isCreatingSession,
    setActiveWorkout,
    setExercisesForSession,
    setExercisesWithSets,
    setCurrentSessionId,
    setSessionStartTime,
    setCompletedExercises,
    resetWorkoutSession,
    markExerciseAsCompleted,
    addExerciseToSession,
    removeExerciseFromSession,
    substituteExercise,
    updateExerciseSets,
    createWorkoutSessionInDb,
    finishWorkoutSession,
  };
};