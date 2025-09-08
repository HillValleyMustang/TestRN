/**
 * This index file re-exports all generated Supabase types for easier import.
 * It is part of the Supabase generated types, refactored for modularity.
 */

// Import generated Supabase types to be used and re-exported
import type { Json } from "./json"; // Corrected: Import Json directly
import type { Database } from "./database"; // Corrected: Import Database directly
import type { Tables, TablesInsert, TablesUpdate } from "./tables"; // Corrected: Import Tables types directly
import type { Enums } from "./enums"; // Corrected: Import Enums directly
import type { UserAchievementsRow } from "./tables/user_achievements"; // Corrected: Import specific table row type
import type { AiCoachUsageLogsRow } from "./tables/ai_coach_usage_logs"; // Corrected: Import specific table row type
import type { GetLastExerciseSetsForExerciseReturns } from "./functions/get_last_exercise_sets_for_exercise";
import type { GetTotalCompletedExerciseInstancesArgs, GetTotalCompletedExerciseInstancesReturns } from "./functions/get_total_completed_exercise_instances";

export type {
  Json, // Re-export Json
  Database,
  Tables,
  TablesInsert,
  TablesUpdate,
  Enums,
  UserAchievementsRow,
  AiCoachUsageLogsRow,
  GetLastExerciseSetsForExerciseReturns,
  GetTotalCompletedExerciseInstancesArgs,
  GetTotalCompletedExerciseInstancesReturns,
};