"use client";

import { useCallback, useEffect, Dispatch, SetStateAction } from 'react';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import { TablesInsert, TablesUpdate, SetLogState, Tables, WorkoutExercise, WorkoutWithLastCompleted } from '@/types/supabase'; // Import WorkoutWithLastCompleted
import { convertWeight } from '@/lib/unit-conversions';
import { db, addToSyncQueue, LocalWorkoutSession, LocalDraftSetLog } from '@/lib/db';
import { useSession } from '@/components/session-context-provider';
// Removed: import { useCoreWorkoutSessionState } from './use-core-workout-session-state'; // No longer needed to import coreState directly here

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

interface UseWorkoutSessionPersistenceProps {
  allAvailableExercises: ExerciseDefinition[];
  workoutExercisesCache: Record<string, WorkoutExercise[]>;
  // Directly pass the state and setters this hook needs
  activeWorkout: TPath | null;
  currentSessionId: string | null;
  sessionStartTime: Date | null;
  setIsCreatingSession: Dispatch<SetStateAction<boolean>>;
  setCurrentSessionId: Dispatch<SetStateAction<string | null>>;
  setSessionStartTime: Dispatch<SetStateAction<Date | null>>;
  _resetLocalState: () => void;
}

interface UseWorkoutSessionPersistenceReturn {
  resetWorkoutSession: () => Promise<void>;
  createWorkoutSessionInDb: (templateName: string, firstSetTimestamp: string) => Promise<string>;
  finishWorkoutSession: () => Promise<string | null>;
}

export const useWorkoutSessionPersistence = ({
  allAvailableExercises,
  workoutExercisesCache,
  activeWorkout,
  currentSessionId,
  sessionStartTime,
  setIsCreatingSession,
  setCurrentSessionId,
  setSessionStartTime,
  _resetLocalState,
}: UseWorkoutSessionPersistenceProps): UseWorkoutSessionPersistenceReturn => {
  const { session, supabase } = useSession();

  const resetWorkoutSession = useCallback(async () => {
    if (session?.user.id) {
      console.log(`[useWorkoutSessionPersistence] Resetting workout session, clearing all drafts.`);
      const allDrafts = await db.draft_set_logs.toArray();
      const userDraftKeys = allDrafts
        .filter(draft => isValidId(draft.exercise_id))
        .map(draft => [draft.exercise_id, draft.set_index] as [string, number]);
      
      if (userDraftKeys.length > 0) {
        console.assert(userDraftKeys.every(key => isValidDraftKey(key[0], key[1])), `Invalid draft keys in resetWorkoutSession bulkDelete: ${JSON.stringify(userDraftKeys)}`);
        await db.draft_set_logs.bulkDelete(userDraftKeys);
      }
    }
    _resetLocalState();
  }, [session, _resetLocalState]);

  const createWorkoutSessionInDb = useCallback(async (templateName: string, firstSetTimestamp: string): Promise<string> => {
    if (!session) throw new Error("User not authenticated.");
    setIsCreatingSession(true);
    try {
      const newSessionId = uuidv4();
      const sessionDataToSave: LocalWorkoutSession = {
        id: newSessionId,
        user_id: session.user.id,
        template_name: templateName,
        t_path_id: !activeWorkout || activeWorkout.id === 'ad-hoc' ? null : activeWorkout.id,
        session_date: firstSetTimestamp,
        duration_string: null,
        rating: null,
        created_at: new Date().toISOString(),
        completed_at: null,
      };

      await db.workout_sessions.put(sessionDataToSave);
      await addToSyncQueue('create', 'workout_sessions', sessionDataToSave);
      console.log(`[createWorkoutSessionInDb] New workout session ${newSessionId} created locally and added to sync queue.`);

      const draftsToUpdate = await db.draft_set_logs.filter(draft => draft.session_id === null).toArray();
      console.log(`[createWorkoutSessionInDb] Found ${draftsToUpdate.length} drafts with null session_id to update.`);
      const updatePromises = draftsToUpdate.map(async (draft) => {
        console.assert(isValidDraftKey(draft.exercise_id, draft.set_index), `Invalid draft key in createWorkoutSessionInDb update: [${draft.exercise_id}, ${draft.set_index}]`);
        console.log(`[createWorkoutSessionInDb] Attempting to update draft [${draft.exercise_id}, ${draft.set_index}] from session_id: ${draft.session_id} to ${newSessionId}`);
        const result = await db.draft_set_logs.update([draft.exercise_id, draft.set_index], { session_id: newSessionId });
        console.log(`[createWorkoutSessionInDb] Update result for [${draft.exercise_id}, ${draft.set_index}]: ${result === 1 ? 'Success' : 'Failed/Not Found'}`);
        return result;
      });
      await Promise.all(updatePromises);
      console.log(`[createWorkoutSessionInDb] All drafts with null session_id updated to ${newSessionId}.`);

      setCurrentSessionId(newSessionId);
      setSessionStartTime(new Date(firstSetTimestamp));
      return newSessionId;
    } catch (err: any) {
      toast.error(err.message || "Failed to create workout session locally.");
      throw err;
    } finally {
      setIsCreatingSession(false);
    }
  }, [session, activeWorkout, setIsCreatingSession, setCurrentSessionId, setSessionStartTime]);

  const finishWorkoutSession = useCallback(async (): Promise<string | null> => {
    if (!currentSessionId || !sessionStartTime || !session || !activeWorkout) {
      toast.error("Workout session not properly started or no sets logged yet.");
      console.error("finishWorkoutSession: Missing currentSessionId, sessionStartTime, session, or activeWorkout.");
      return null;
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
      
      const fullSyncPayload: LocalWorkoutSession = { // Explicitly type fullSyncPayload
        id: currentSessionId,
        user_id: session.user.id,
        session_date: sessionStartTime.toISOString(),
        template_name: activeWorkout.template_name,
        t_path_id: activeWorkout.id === 'ad-hoc' ? null : activeWorkout.id,
        created_at: sessionStartTime.toISOString(), // Ensure created_at is present
        rating: null, // Ensure rating is present
        ...updatePayload
      };
      await addToSyncQueue('update', 'workout_sessions', fullSyncPayload);

      const draftsToDelete = await db.draft_set_logs
        .where('session_id').equals(currentSessionId)
        .toArray();
      
      if (draftsToDelete.length > 0) {
        const keysToDelete = draftsToDelete.map(d => [d.exercise_id, d.set_index] as [string, number]);
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

      // Removed: toast.success("Workout session finished! Generating Summary.");
      const finishedSessionId = currentSessionId;
      await resetWorkoutSession();
      return finishedSessionId;
    } catch (err: any) {
      toast.error("Failed to save workout duration: " + err.message);
      console.error("useWorkoutSessionState: Error in finishWorkoutSession:", err);
      return null;
    }
  }, [currentSessionId, sessionStartTime, session, supabase, resetWorkoutSession, activeWorkout, setIsCreatingSession, setCurrentSessionId, setSessionStartTime]);

  // Effect to load drafts when activeWorkout or currentSessionId changes
  useEffect(() => {
    const loadDraftsForActiveWorkout = async () => {
      if (!session?.user.id) {
        _resetLocalState();
        return;
      }

      if (!activeWorkout) {
        _resetLocalState();
        return;
      }

      const targetSessionId = activeWorkout.id === 'ad-hoc' ? null : currentSessionId;

      let drafts: LocalDraftSetLog[] = [];
      if (targetSessionId === null) {
        drafts = await db.draft_set_logs.filter((draft: LocalDraftSetLog) => draft.session_id === null).toArray();
      } else {
        drafts = await db.draft_set_logs.where('session_id').equals(targetSessionId).toArray();
      }

      const newExercisesForSession: WorkoutExercise[] = [];
      const newExercisesWithSets: Record<string, SetLogState[]> = {};
      const newCompletedExercises = new Set<string>();
      let loadedSessionId: string | null = null;
      let loadedSessionStartTime: Date | null = null;

      if (drafts.length > 0) {
        const groupedDrafts = drafts.reduce((acc, draft) => {
          if (!acc[draft.exercise_id]) {
            acc[draft.exercise_id] = [];
          }
          acc[draft.exercise_id].push(draft);
          return acc;
        }, {} as Record<string, LocalDraftSetLog[]>);

        for (const exerciseId in groupedDrafts) {
          const sortedDrafts = groupedDrafts[exerciseId].sort((a, b) => a.set_index - b.set_index);
          const exerciseDef = allAvailableExercises.find(ex => ex.id === exerciseId);

          if (exerciseDef) {
            newExercisesForSession.push({ ...exerciseDef, is_bonus_exercise: false });
            
            const setsForExercise: SetLogState[] = sortedDrafts.map(draft => ({
              id: draft.set_log_id || null,
              created_at: null,
              session_id: draft.session_id,
              exercise_id: draft.exercise_id,
              weight_kg: draft.weight_kg,
              reps: draft.reps,
              reps_l: draft.reps_l,
              reps_r: draft.reps_r,
              time_seconds: draft.time_seconds,
              is_pb: draft.is_pb || false,
              isSaved: draft.isSaved || false,
              isPR: draft.is_pb || false,
              lastWeight: null, lastReps: null, lastRepsL: null, lastRepsR: null, lastTimeSeconds: null,
            }));
            newExercisesWithSets[exerciseId] = setsForExercise;

            if (setsForExercise.every(set => set.isSaved)) {
              newCompletedExercises.add(exerciseId);
            }

            if (drafts[0].session_id && !loadedSessionId) {
              loadedSessionId = drafts[0].session_id;
            }
          }
        }
        if (loadedSessionId) {
          const sessionRecord = await db.workout_sessions.get(loadedSessionId);
          if (sessionRecord?.session_date) {
            loadedSessionStartTime = new Date(sessionRecord.session_date);
          }
        }
      } else {
        if (activeWorkout.id !== 'ad-hoc') {
          const cachedExercises = workoutExercisesCache[activeWorkout.id] || [];
          newExercisesForSession.push(...cachedExercises);
          cachedExercises.forEach(ex => {
            newExercisesWithSets[ex.id] = Array.from({ length: DEFAULT_INITIAL_SETS }).map(() => ({
              id: null, created_at: null, session_id: null, exercise_id: ex.id,
              weight_kg: null, reps: null, reps_l: null, reps_r: null, time_seconds: null,
              is_pb: false, isSaved: false, isPR: false, lastWeight: null, lastReps: null, lastRepsL: null, lastRepsR: null, lastTimeSeconds: null,
            }));
          });
        }
      }

      // These setters are from the coreState, so they are not directly available here.
      // This useEffect should not be setting coreState directly.
      // The coreState is updated by the useWorkoutSessionState hook, which wraps this.
      // This useEffect is primarily for loading drafts and deriving initial state.
      // The actual state updates are handled by the parent useWorkoutSessionState.
    };

    loadDraftsForActiveWorkout();
  }, [session?.user.id, activeWorkout, currentSessionId, allAvailableExercises, workoutExercisesCache, _resetLocalState, setIsCreatingSession, setCurrentSessionId, setSessionStartTime]); // Added setters to dependencies
  // The setters (setIsCreatingSession, setCurrentSessionId, setSessionStartTime) are now dependencies of this useCallback.
  // This is because they are used within the callback, even if not directly in the useEffect's dependency array.
  // However, this useEffect is not meant to *set* these states directly, but rather to *read* them and *derive* initial state.
  // The actual state updates are handled by the parent useWorkoutSessionState.

  return {
    resetWorkoutSession,
    createWorkoutSessionInDb,
    finishWorkoutSession,
  };
};