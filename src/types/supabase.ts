/**
 * This file contains custom application-specific types and re-exports
 * the core Supabase database types.
 *
 * To regenerate the core database types, run:
 * `supabase gen types typescript --local > src/types/supabase-generated/database.ts`
 * Then, ensure other generated files (json, tables, enums) are consistent.
 */

// Import generated Supabase types to be used and re-exported
import type { Json } from "./supabase-generated/json";
import type { Database } from "./supabase-generated/database";
import type { Tables, TablesInsert, TablesUpdate } from "./supabase-generated/tables";
import type { Enums } from "./supabase-generated/enums";
import type { UserAchievementsRow } from "./supabase-generated/tables/user_achievements";
import type { AiCoachUsageLogsRow } from "./supabase-generated/tables/ai_coach_usage_logs";
import type { GetLastExerciseSetsForExerciseReturns } from "./supabase-generated/functions/get_last_exercise_sets_for_exercise";
import type { GetTotalCompletedExerciseInstancesArgs, GetTotalCompletedExerciseInstancesReturns } from "./supabase-generated/functions/get_total_completed_exercise_instances";
import type { BodyFatReferenceImagesRow } from "./supabase-generated/tables/body_fat_reference_images";
import type { UserAlertsRow } from "./supabase-generated/tables/user_alerts";
import type { ExerciseDefinitionsRow } from "./supabase-generated/tables/exercise_definitions"; // Import ExerciseDefinitionsRow

export type { Json, Database, Tables, TablesInsert, TablesUpdate, Enums, GetLastExerciseSetsForExerciseReturns, GetTotalCompletedExerciseInstancesArgs, GetTotalCompletedExerciseInstancesReturns };

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
export type Profile = Tables<'profiles'>;

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
// NEW: LocalUserAchievement type
export type LocalUserAchievement = UserAchievementsRow;

// NEW: BodyFatReferenceImage type
export type BodyFatReferenceImage = BodyFatReferenceImagesRow;

// NEW: UserAlert type
export type UserAlert = UserAlertsRow;


// New type for ai_coach_usage_logs table
export type AiCoachUsageLog = AiCoachUsageLogsRow;

// Centralized FetchedExerciseDefinition for consistency across manage-exercises components
export interface FetchedExerciseDefinition extends Omit<Tables<'exercise_definitions'>, 'id'> {
  id: string | null; // Allow null for new exercises (e.g., when creating from global)
  is_favorited_by_current_user?: boolean; // For global exercises favorited by user
  duplicate_status?: 'none' | 'global' | 'my-exercises'; // NEW: Add duplicate status
  existing_id?: string | null; // ID of the duplicate exercise if found
}

// Centralized type for workouts with last completed date
export interface WorkoutWithLastCompleted extends Tables<'t_paths'> {
  id: string; // Ensure ID is always present
  template_name: string; // Ensure template_name is always present
  last_completed_at: string | null;
}

// Centralized type for workout sessions with aggregated details
export interface WorkoutSessionWithAggregatedDetails extends Tables<'workout_sessions'> {
  id: string; // Ensure ID is always present
  template_name: string | null; // Ensure template_name is always present
  session_date: string; // Ensure session_date is always present
  completed_at: string | null; // Ensure completed_at is always present
  duration_string: string | null; // Ensure duration_string is always present
  exercise_count: number;
  total_volume_kg: number;
  has_prs: boolean;
}

// Centralized type for grouped T-Paths
export interface GroupedTPath {
  mainTPath: Tables<'t_paths'>;
  childWorkouts: WorkoutWithLastCompleted[];
}

// NEW: WorkoutExerciseWithDetails type for exercises in a workout template
export interface WorkoutExerciseWithDetails extends ExerciseDefinitionsRow {
  id: string; // Ensure ID is always present
  name: string; // Ensure name is always present
  order_index: number;
  is_bonus_exercise: boolean;
  t_path_exercise_id: string; // ID from t_path_exercises table
}

// Export the full ExerciseDefinitionsRow as ExerciseDefinition
export type ExerciseDefinition = ExerciseDefinitionsRow;