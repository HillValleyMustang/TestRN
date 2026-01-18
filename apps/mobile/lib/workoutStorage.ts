/**
 * Workout Storage Utilities
 * Handles persistence of in-flight workout state using AsyncStorage
 * Provides type-safe storage and retrieval of workout state for resume functionality
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { TPath } from '@data/storage';

// Storage key pattern
const getWorkoutStateKey = (userId: string): string => `@workout_state_${userId}`;

// Expiration time: 4 hours (workouts should only last max 2 hours)
const WORKOUT_STATE_EXPIRATION_MS = 4 * 60 * 60 * 1000; // 4 hours in milliseconds

// Types for workout state persistence
export interface SetLogState {
  id: string | null;
  created_at: string | null;
  session_id: string | null;
  exercise_id: string;
  weight_kg: number | null;
  reps: number | null;
  reps_l: number | null;
  reps_r: number | null;
  time_seconds: number | null;
  is_pb: boolean;
  isSaved: boolean;
  isPR: boolean;
  lastWeight: number | null;
  lastReps: number | null;
  lastRepsL: number | null;
  lastRepsR: number | null;
  lastTimeSeconds: number | null;
}

export interface WorkoutExercise {
  id: string;
  name: string;
  main_muscle: string;
  type: string;
  category: string | null;
  description: string | null;
  pro_tip: string | null;
  video_url: string | null;
  equipment: string | null;
  user_id: string | null;
  library_id: string | null;
  created_at: string | null;
  is_favorite: boolean | null;
  icon_url: string | null;
  is_bonus_exercise?: boolean;
}

export interface InFlightWorkoutState {
  activeWorkout: TPath | null;
  exercisesForSession: WorkoutExercise[];
  exercisesWithSets: Record<string, SetLogState[]>;
  currentSessionId: string | null;
  sessionStartTime: string | null; // ISO string
  completedExercises: string[]; // Array of exercise IDs
  expandedExerciseCards: Record<string, boolean>;
  savedAt: number; // Timestamp for expiration check
}

/**
 * Save workout state to AsyncStorage
 */
export const saveWorkoutState = async (
  userId: string,
  state: Omit<InFlightWorkoutState, 'savedAt'>
): Promise<void> => {
  try {
    const stateWithTimestamp: InFlightWorkoutState = {
      ...state,
      savedAt: Date.now(),
    };

    const storageKey = getWorkoutStateKey(userId);
    await AsyncStorage.setItem(storageKey, JSON.stringify(stateWithTimestamp));
    console.log('[WorkoutStorage] Saved workout state for user:', userId);
  } catch (error) {
    console.error('[WorkoutStorage] Error saving workout state:', error);
    throw new Error('Failed to save workout state');
  }
};

/**
 * Load workout state from AsyncStorage
 */
export const loadWorkoutState = async (userId: string): Promise<InFlightWorkoutState | null> => {
  try {
    const storageKey = getWorkoutStateKey(userId);
    const data = await AsyncStorage.getItem(storageKey);
    
    if (!data) {
      return null;
    }

    const parsedState: InFlightWorkoutState = JSON.parse(data);

    // Check if state is stale
    if (isWorkoutStateStale(parsedState)) {
      console.log('[WorkoutStorage] Workout state is stale, clearing...');
      await clearWorkoutState(userId);
      return null;
    }

    return parsedState;
  } catch (error) {
    console.error('[WorkoutStorage] Error loading workout state:', error);
    return null;
  }
};

/**
 * Clear workout state from AsyncStorage
 */
export const clearWorkoutState = async (userId: string): Promise<void> => {
  try {
    const storageKey = getWorkoutStateKey(userId);
    await AsyncStorage.removeItem(storageKey);
    console.log('[WorkoutStorage] Cleared workout state for user:', userId);
  } catch (error) {
    console.error('[WorkoutStorage] Error clearing workout state:', error);
    throw new Error('Failed to clear workout state');
  }
};

/**
 * Check if workout state is stale (older than 4 hours)
 */
export const isWorkoutStateStale = (state: InFlightWorkoutState): boolean => {
  const age = Date.now() - state.savedAt;
  return age > WORKOUT_STATE_EXPIRATION_MS;
};

/**
 * Check if workout state exists for a user
 */
export const hasWorkoutState = async (userId: string): Promise<boolean> => {
  try {
    const storageKey = getWorkoutStateKey(userId);
    const data = await AsyncStorage.getItem(storageKey);
    if (!data) {
      return false;
    }

    const parsedState: InFlightWorkoutState = JSON.parse(data);
    // Return false if stale (will be cleared on next load)
    return !isWorkoutStateStale(parsedState);
  } catch (error) {
    console.error('[WorkoutStorage] Error checking workout state:', error);
    return false;
  }
};
