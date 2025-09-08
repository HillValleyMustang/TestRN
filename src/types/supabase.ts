/**
 * This file contains custom application-specific types and re-exports
 * the core Supabase database types from the generated modular structure.
 *
 * To regenerate the core database types, run:
 * `supabase gen types typescript --local > src/types/supabase-generated/database.ts`
 * Then, ensure other generated files (json, tables, enums) are consistent.
 */

// Import generated Supabase types to be used and re-exported
import type { Json, Database, Tables, TablesInsert, TablesUpdate, Enums, UserAchievementsRow, AiCoachUsageLogsRow, GetLastExerciseSetsForExerciseReturns } from "./supabase-generated";
export type { Json, Database, Tables, TablesInsert, TablesUpdate, Enums, GetLastExerciseSetsForExerciseReturns }; // Export new RPC types

// --- Custom Types ---
// These are application-specific types that extend or combine Supabase-generated types.

// Consolidated SetLogState for use across hooks and components
export interface SetLogState extends Omit<Tables<'set_logs'>, 'id' | 'created_at'> {
  id: string | null; // Explicitly allow null for new sets
  created_at: string | null; // Explicitly allow null for new sets
  isSaved: boolean;
  isPR: boolean; // This is for set-level PR
  lastWeight?: number | null;
  lastReps?: number | null;
  lastRepsL?: number | null; // ADDED
  lastRepsR?: number | null; // ADDED
  lastTimeSeconds?: number | null;
}

// Explicitly define extended Profile types to include preferred_session_length and active_t_path_id
export type Profile = Tables<'profiles'> & {
  total_exercises_completed?: number | null; // TEMPORARY FIX: This should be automatically generated.
};

export type ProfileInsert = TablesInsert<'profiles'>;

export type ProfileUpdate = TablesUpdate<'profiles'>;

// Define a type for set logs joined with exercise definitions, including is_pb
export type SetLogWithExercise = Pick<Tables<'set_logs'>, 'id' | 'weight_kg' | 'reps' | 'reps_l' | 'reps_r' | 'time_seconds' | 'is_pb' | 'created_at' | 'exercise_id' | 'session_id'> & {
  exercise_definitions: Pick<Tables<'exercise_definitions'>, 'id' | 'name' | 'main_muscle' | 'type' | 'category'> | null;
  // Added fields for progressive overload comparison
  last_session_weight_kg?: number | null;
  last_session_reps?: number | null;
  last_session_reps_l?: number | null;
  last_session_reps_r?: number | null;
  last_session_time_seconds?: number | null;
};

// New type for exercises when fetched as part of a workout, including bonus status
export type WorkoutExercise = Tables<'exercise_definitions'> & {
  is_bonus_exercise: boolean;
  icon_url: string | null; // Added icon_url
};

// New type for user_exercise_prs table
export type UserExercisePR = Tables<'user_exercise_prs'>;
export type UserExercisePRInsert = TablesInsert<'user_exercise_prs'>;
export type UserExercisePRUpdate = TablesUpdate<'user_exercise_prs'>;

// Re-export UserAchievementRow for direct use
export type UserAchievement = UserAchievementsRow;

// New type for ai_coach_usage_logs table
export type AiCoachUsageLog = AiCoachUsageLogsRow;