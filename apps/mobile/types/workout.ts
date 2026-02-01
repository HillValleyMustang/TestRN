// Shared workout types and helpers used across the mobile app

import type { TPath } from '@data/storage/models';

/**
 * State for a single set log entry (in-flight workout tracking)
 */
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

/**
 * Check if a set has meaningful user input (non-zero values)
 */
export const hasUserInput = (set: SetLogState): boolean => {
  return (
    (set.weight_kg !== null && set.weight_kg > 0) ||
    (set.reps !== null && set.reps > 0) ||
    (set.reps_l !== null && set.reps_l > 0) ||
    (set.reps_r !== null && set.reps_r > 0) ||
    (set.time_seconds !== null && set.time_seconds > 0)
  );
};

/**
 * Check if a set has incomplete data (e.g. weight without reps)
 */
export const hasIncompleteSetData = (set: SetLogState): boolean => {
  const hasWeight = set.weight_kg !== null && set.weight_kg > 0;
  const hasReps = set.reps !== null && set.reps > 0;
  const hasRepsL = set.reps_l !== null && set.reps_l > 0;
  const hasRepsR = set.reps_r !== null && set.reps_r > 0;

  // If user has entered data, they must have both weight and reps for standard exercises
  if (hasWeight && !hasReps) return true;
  if (hasReps && !hasWeight) return true;

  // For unilateral exercises, check if they have one side but not the other
  if ((hasRepsL && !hasRepsR) || (hasRepsR && !hasRepsL)) return true;

  return false;
};

/**
 * TPath with completion statistics (used on manage-t-paths screen)
 */
export interface WorkoutWithStats extends TPath {
  last_completed_at: string | null;
  completion_count: number;
}
