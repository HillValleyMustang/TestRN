"use client";

import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import { Tables, SetLogState, WorkoutExercise, GetLastExerciseSetsForExerciseReturns } from '@/types/supabase';
import { db, addToSyncQueue, LocalWorkoutSession, LocalDraftSetLog } from '@/lib/db';
import { useSession } from '@/components/session-context-provider';

// Import new modular hooks
import { useCoreWorkoutSessionState } from './use-core-workout-session-state';
import { useWorkoutSessionPersistence } from './use-workout-session-persistence';
import { useSessionExerciseManagement } from './use-session-exercise-management';

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
  workoutExercisesCache: Record<string, WorkoutExercise[]>;
}

interface UseWorkoutSessionStateReturn {
  activeWorkout: TPath | null;
  exercisesForSession: WorkoutExercise[];
  exercisesWithSets: Record<string, SetLogState[]>;
  currentSessionId: string | null;
  sessionStartTime: Date | null;
  completedExercises: Set<string>;
  isCreatingSession: boolean;
  isWorkoutActive: boolean;
  hasUnsavedChanges: boolean;
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
  expandedExerciseCards: Record<string, boolean>;
  toggleExerciseCardExpansion: (exerciseId: string) => void;
}

export const useWorkoutSessionState = ({ allAvailableExercises, workoutExercisesCache }: UseWorkoutSessionStateProps): UseWorkoutSessionStateReturn => {
  const { session, supabase } = useSession();

  // Core state management
  const coreState = useCoreWorkoutSessionState();
  const {
    activeWorkout,
    exercisesForSession,
    exercisesWithSets,
    currentSessionId,
    sessionStartTime,
    completedExercises,
    isCreatingSession,
    isWorkoutActive,
    hasUnsavedChanges,
    expandedExerciseCards, // Include here
    setActiveWorkout,
    setExercisesForSession,
    setExercisesWithSets,
    setCurrentSessionId,
    setSessionStartTime,
    setCompletedExercises,
    setIsCreatingSession,
    setExpandedExerciseCards,
    _resetLocalState,
  } = coreState;

  // Persistence logic
  const {
    resetWorkoutSession,
    createWorkoutSessionInDb,
    finishWorkoutSession,
  } = useWorkoutSessionPersistence({
    allAvailableExercises,
    workoutExercisesCache,
    activeWorkout,
    currentSessionId,
    sessionStartTime,
    setIsCreatingSession,
    setCurrentSessionId,
    setSessionStartTime,
    _resetLocalState,
  });

  // Exercise management within session
  const {
    markExerciseAsCompleted,
    addExerciseToSession,
    removeExerciseFromSession,
    substituteExercise,
    updateExerciseSets,
  } = useSessionExerciseManagement({
    allAvailableExercises,
    coreState: {
      activeWorkout, exercisesForSession, exercisesWithSets, currentSessionId, sessionStartTime,
      completedExercises, isCreatingSession, isWorkoutActive, hasUnsavedChanges,
      expandedExerciseCards, // Include here
      setActiveWorkout, setExercisesForSession, setExercisesWithSets, setCurrentSessionId,
      setSessionStartTime, setCompletedExercises, setIsCreatingSession, setExpandedExerciseCards, _resetLocalState,
    },
    supabase: supabase,
  });

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
      const newExpandedExerciseCards: Record<string, boolean> = {};

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
              newExpandedExerciseCards[exerciseId] = false; // Collapse if completed
            } else {
              newExpandedExerciseCards[exerciseId] = true; // Expand if not completed
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
            newExpandedExerciseCards[ex.id] = true; // Expand new exercises by default
          });
        }
      }

      setExercisesForSession(newExercisesForSession);
      setExercisesWithSets(newExercisesWithSets);
      setCompletedExercises(newCompletedExercises);
      setCurrentSessionId(loadedSessionId);
      setSessionStartTime(loadedSessionStartTime);
      setExpandedExerciseCards(newExpandedExerciseCards);
    };

    loadDraftsForActiveWorkout();
  }, [session?.user.id, activeWorkout, currentSessionId, allAvailableExercises, workoutExercisesCache, _resetLocalState, setExercisesForSession, setExercisesWithSets, setCompletedExercises, setCurrentSessionId, setSessionStartTime, setExpandedExerciseCards]);

  const toggleExerciseCardExpansion = useCallback((exerciseId: string) => {
    setExpandedExerciseCards(prev => ({
      ...prev,
      [exerciseId]: !prev[exerciseId]
    }));
  }, [setExpandedExerciseCards]);

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
    toggleExerciseCardExpansion,
  };
};