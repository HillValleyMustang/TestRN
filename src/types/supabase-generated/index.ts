/**
 * This index file re-exports all generated Supabase types for easier import.
 * It is part of the Supabase generated types, refactored for modularity.
 */

// Import generated Supabase types to be used and re-exported
import type { Json, Database } from "./database";
import type { Tables, TablesInsert, TablesUpdate } from "./tables";
import type { Enums } from "./enums";
import type { UserAchievementsRow } from "./tables/user_achievements";
import type { AiCoachUsageLogsRow } from "./tables/ai_coach_usage_logs";
import type { GetLastExerciseSetsForExerciseReturns } from "./functions/get_last_exercise_sets_for_exercise";
import type { GetTotalCompletedExerciseInstancesArgs, GetTotalCompletedExerciseInstancesReturns } from "./functions/get_total_completed_exercise_instances";

export type {
  Json,
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