"use client";

import { useState, useCallback, useEffect } from 'react';
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

// NEW: Helper function to check if a set has any user input
const hasUserInput = (set: SetLogState): boolean => {
  return (set.weight_kg !== null && set.weight_kg > 0) ||
         (set.reps !== null && set.reps > 0) ||
         (set.reps_l !== null && set.reps_l > 0) ||
         (set.reps_r !== null && set.reps_r > 0) ||
         (set.time_seconds !== null && set.time_seconds > 0);
};

interface UseWorkoutSessionStateProps {
  allAvailableExercises: ExerciseDefinition[];
  workoutExercisesCache: Record<string, WorkoutExercise[]>; // NEW: Pass cache to initialize
}

interface UseWorkoutSessionStateReturn {
  activeWorkout: TPath | null;
  exercisesForSession: WorkoutExercise[];
  exercisesWithSets: Record<string, SetLogState[]>;
  currentSessionId: string | null;
  sessionStartTime: Date | null;
  completedExercises: Set<string>;
  isCreatingSession: boolean;
  isWorkoutActive: boolean; // New derived state
  hasUnsavedChanges: boolean; // New derived state
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
  finishWorkoutSession: () => Promise<string | null>;
}

export const useWorkoutSessionState = ({ allAvailableExercises, workoutExercisesCache }: UseWorkoutSessionStateProps): UseWorkoutSessionStateReturn => {
  const { session, supabase } = useSession();

  const [activeWorkout, setActiveWorkout] = useState<TPath | null>(null);
  const [exercisesForSession, setExercisesForSession] = useState<WorkoutExercise[]>([]);
  const [exercisesWithSets, setExercisesWithSets] = useState<Record<string, SetLogState[]>>({});
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [completedExercises, setCompletedExercises] = useState<Set<string>>(new Set());
  const [isCreatingSession, setIsCreatingSession] = useState(false);

  // Derived state for workout activity
  const isWorkoutActive = !!activeWorkout; // A workout is active as soon as one is selected.

  // Derived state for unsaved changes
  const hasUnsavedChanges = isWorkoutActive && Object.values(exercisesWithSets).some(setsArray =>
    setsArray.some(set => !set.isSaved && hasUserInput(set)) // Only count as unsaved if there's actual input
  );

  // NEW: Internal function to clear only the local React state
  const _resetLocalState = useCallback(() => {
    setActiveWorkout(null);
    setExercisesForSession([]);
    setExercisesWithSets({});
    setCurrentSessionId(null);
    setSessionStartTime(null);
    setCompletedExercises(new Set());
  }, []);

  // MODIFIED: resetWorkoutSession now clears IndexedDB drafts and then local state
  const resetWorkoutSession = useCallback(async () => {
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
    _resetLocalState(); // Clear local state after clearing IndexedDB
  }, [session, _resetLocalState]);

  // NEW: Effect to load drafts when activeWorkout or currentSessionId changes
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

      // Determine the session_id to filter drafts by.
      // For ad-hoc before session creation, it's null. Otherwise, it's currentSessionId.
      const targetSessionId = activeWorkout.id === 'ad-hoc' ? null : currentSessionId;

      let drafts: LocalDraftSetLog[] = [];
      if (targetSessionId === null) {
        // For ad-hoc workouts before session creation, session_id is null
        // FIX: Using filter() for robust null checking
        drafts = await db.draft_set_logs.filter(draft => draft.session_id === null).toArray();
      } else {
        // For T-Path workouts or ad-hoc after session creation, session_id is a string
        drafts = await db.draft_set_logs.where('session_id').equals(targetSessionId).toArray();
      }

      const newExercisesForSession: WorkoutExercise[] = [];
      const newExercisesWithSets: Record<string, SetLogState[]> = {};
      const newCompletedExercises = new Set<string>();
      let loadedSessionId: string | null = null;
      let loadedSessionStartTime: Date | null = null;

      if (drafts.length > 0) {
        // Group drafts by exercise_id
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
            newExercisesForSession.push({ ...exerciseDef, is_bonus_exercise: false }); // Assume not bonus for ad-hoc or if not explicitly stored
            
            const setsForExercise: SetLogState[] = sortedDrafts.map(draft => ({
              id: draft.set_log_id || null,
              created_at: null, // Will be populated on save
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
              lastWeight: null, lastReps: null, lastRepsL: null, lastRepsR: null, lastTimeSeconds: null, // Will be fetched by useExerciseSets
            }));
            newExercisesWithSets[exerciseId] = setsForExercise;

            // If all sets for this exercise are saved, mark as completed
            if (setsForExercise.every(set => set.isSaved)) {
              newCompletedExercises.add(exerciseId);
            }

            // Try to infer session ID and start time from drafts
            if (drafts[0].session_id && !loadedSessionId) {
              loadedSessionId = drafts[0].session_id;
            }
          }
        }
        // If a session ID was loaded from drafts, try to get its start time
        if (loadedSessionId) {
          const sessionRecord = await db.workout_sessions.get(loadedSessionId);
          if (sessionRecord?.session_date) {
            loadedSessionStartTime = new Date(sessionRecord.session_date);
          }
        }
      } else {
        // No drafts found for this workout. Initialize based on workout type.
        if (activeWorkout.id !== 'ad-hoc') {
          // For T-Path workouts, load from cache
          const cachedExercises = workoutExercisesCache[activeWorkout.id] || [];
          newExercisesForSession.push(...cachedExercises);
          // Initialize empty sets for these exercises
          cachedExercises.forEach(ex => {
            newExercisesWithSets[ex.id] = Array.from({ length: DEFAULT_INITIAL_SETS }).map(() => ({
              id: null, created_at: null, session_id: null, exercise_id: ex.id,
              weight_kg: null, reps: null, reps_l: null, reps_r: null, time_seconds: null,
              is_pb: false, isSaved: false, isPR: false, lastWeight: null, lastReps: null, lastRepsL: null, lastRepsR: null, lastTimeSeconds: null,
            }));
          });
        }
        // For ad-hoc, newExercisesForSession and newExercisesWithSets remain empty
      }

      setExercisesForSession(newExercisesForSession);
      setExercisesWithSets(newExercisesWithSets);
      setCompletedExercises(newCompletedExercises);
      setCurrentSessionId(loadedSessionId);
      setSessionStartTime(loadedSessionStartTime);
    };

    loadDraftsForActiveWorkout();
  }, [session?.user.id, activeWorkout, currentSessionId, allAvailableExercises, workoutExercisesCache, _resetLocalState]); // Added _resetLocalState to dependencies

  // MODIFIED: createWorkoutSessionInDb now updates existing drafts
  const createWorkoutSessionInDb = useCallback(async (templateName: string, firstSetTimestamp: string): Promise<string> => {
    if (!session) throw new Error("User not authenticated.");
    setIsCreatingSession(true);
    try {
      const newSessionId = uuidv4();
      const sessionDataToSave: LocalWorkoutSession = {
        id: newSessionId,
        user_id: session.user.id,
        template_name: templateName,
        t_path_id: activeWorkout?.id === 'ad-hoc' ? null : activeWorkout?.id, // Add the direct link
        session_date: firstSetTimestamp,
        duration_string: null,
        rating: null,
        created_at: new Date().toISOString(),
        completed_at: null,
      };

      await db.workout_sessions.put(sessionDataToSave);
      await addToSyncQueue('create', 'workout_sessions', sessionDataToSave);

      // Update all existing drafts (which currently have session_id: null) to the new session ID
      const draftsToUpdate = await db.draft_set_logs.filter(draft => draft.session_id === null).toArray();
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
  }, [session, activeWorkout]);

  const addExerciseToSession = useCallback(async (exercise: ExerciseDefinition) => {
    if (!session) return;
    if (!isValidId(exercise.id)) {
      console.error("Attempted to add exercise with invalid ID:", exercise);
      toast.error("Cannot add exercise: invalid exercise ID.");
      return;
    }

    // Check if exercise is already in session
    if (exercisesForSession.some(ex => ex.id === exercise.id)) {
      toast.info(`'${exercise.name}' is already in this workout session.`);
      return;
    }

    let lastWeight = null, lastReps = null, lastTimeSeconds = null, lastRepsL = null, lastRepsR = null;
    
    const { data: lastExerciseSets, error: rpcError } = await supabase.rpc('get_last_exercise_sets_for_exercise', {
      p_user_id: session.user.id,
      p_exercise_id: exercise.id,
    });

    // Only log if there's an actual error message and it's not the "no rows found" error
    if (rpcError && rpcError.code !== 'PGRST116') { 
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
        session_id: currentSessionId, // This will be null for ad-hoc until first set is saved
        weight_kg: newSet.weight_kg,
        reps: newSet.reps,
        reps_l: newSet.reps_l,
        reps_r: newSet.reps_r,
        time_seconds: newSet.time_seconds,
        isSaved: false, set_log_id: null, // NEW
        is_pb: false,
      };
      console.assert(isValidDraftKey(draftPayload.exercise_id, draftPayload.set_index), `Invalid draft key in addExerciseToSession put: [${draftPayload.exercise_id}, ${draftPayload.set_index}]`);
      db.draft_set_logs.put(draftPayload);
      return newSet;
    });

    setExercisesWithSets(prev => ({ ...prev, [exercise.id]: newSetsForExercise }));
  }, [currentSessionId, session, supabase, exercisesForSession]);

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
      .filter(draft => draft.session_id === currentSessionId) // Filter by currentSessionId (can be null for ad-hoc)
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

    // Check if new exercise is already in session
    if (exercisesForSession.some(ex => ex.id === newExercise.id)) {
      toast.info(`'${newExercise.name}' is already in this workout session.`);
      return;
    }

    setExercisesForSession(prev => prev.map(ex => ex.id === oldExerciseId ? newExercise : ex));
    setExercisesWithSets(prev => {
      const newSets = { ...prev };
      // Create new sets for the substituted exercise
      const newSetsForExercise: SetLogState[] = Array.from({ length: DEFAULT_INITIAL_SETS }).map((_, setIndex) => {
        const newSet: SetLogState = { id: null, created_at: null, session_id: currentSessionId, exercise_id: newExercise.id, weight_kg: null, reps: null, reps_l: null, reps_r: null, time_seconds: null, is_pb: false, isSaved: false, isPR: false, lastWeight: null, lastReps: null, lastRepsL: null, lastRepsR: null, lastTimeSeconds: null };
        const draftPayload: LocalDraftSetLog = {
          exercise_id: newExercise.id,
          set_index: setIndex,
          session_id: currentSessionId, // This will be null for ad-hoc until first set is saved
          weight_kg: newSet.weight_kg,
          reps: newSet.reps,
          reps_l: newSet.reps_l,
          reps_r: newSet.reps_r,
          time_seconds: newSet.time_seconds,
          isSaved: false, set_log_id: null, // NEW
          is_pb: false,
        };
        console.assert(isValidDraftKey(draftPayload.exercise_id, draftPayload.set_index), `Invalid draft key in substituteExercise put: [${draftPayload.exercise_id}, ${draftPayload.set_index}]`);
        db.draft_set_logs.put(draftPayload);
        return newSet;
      });
      newSets[newExercise.id] = newSetsForExercise;
      delete newSets[oldExerciseId]; // Remove old exercise's sets
      return newSets;
    });
    setCompletedExercises((prev: Set<string>) => { const newCompleted = new Set(prev); newCompleted.delete(oldExerciseId); return newCompleted; });
    
    // Delete drafts for the old exercise
    const draftsToDelete = await db.draft_set_logs
      .where('exercise_id').equals(oldExerciseId)
      .filter(draft => draft.session_id === currentSessionId) // Filter by currentSessionId (can be null for ad-hoc)
      .toArray();
    
    if (draftsToDelete.length > 0) {
      const keysToDelete = draftsToDelete.map(d => [d.exercise_id, d.set_index] as [string, number]); // Explicitly cast to tuple
      console.assert(keysToDelete.every(key => isValidDraftKey(key[0], key[1])), `Invalid draft keys in substituteExercise bulkDelete: ${JSON.stringify(keysToDelete)}`);
      await db.draft_set_logs.bulkDelete(keysToDelete);
    }
  }, [currentSessionId, exercisesForSession]);

  const updateExerciseSets = useCallback((exerciseId: string, newSets: SetLogState[]) => {
    setExercisesWithSets(prev => ({ ...prev, [exerciseId]: newSets }));
  }, []);

  const markExerciseAsCompleted = useCallback((exerciseId: string, isNewPR: boolean) => {
    setCompletedExercises(prev => {
      const newCompleted = new Set(prev);
      newCompleted.add(exerciseId);
      return newCompleted;
    });
  }, []);

  const finishWorkoutSession = useCallback(async (): Promise<string | null> => {
    if (!currentSessionId || !sessionStartTime || !session || !activeWorkout) {
      toast.error("Workout session not properly started or no sets logged yet.");
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
      
      // Create a complete payload for the sync queue to prevent race condition errors
      const fullSyncPayload = {
        id: currentSessionId,
        user_id: session.user.id,
        session_date: sessionStartTime.toISOString(),
        template_name: activeWorkout.template_name,
        t_path_id: activeWorkout.id === 'ad-hoc' ? null : activeWorkout.id,
        ...updatePayload
      };
      await addToSyncQueue('update', 'workout_sessions', fullSyncPayload);

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

      toast.success("Workout session finished! Generating Summary.");
      const finishedSessionId = currentSessionId;
      await resetWorkoutSession();
      return finishedSessionId;
    } catch (err: any) {
      toast.error("Failed to save workout duration locally: " + err.message);
      console.error("Error saving duration:", err);
      return null;
    }
  }, [currentSessionId, sessionStartTime, session, supabase, resetWorkoutSession, activeWorkout]);

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