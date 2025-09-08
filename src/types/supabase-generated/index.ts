/**
 * This index file re-exports all generated Supabase types for easier import.
 * It is part of the Supabase generated types, refactored for modularity.
 */

// Import generated Supabase types to be used and re-exported
import type { Json, Database, Tables, TablesInsert, TablesUpdate, Enums, UserAchievementsRow, AiCoachUsageLogsRow, GetLastExerciseSetsForExerciseReturns, GetTotalCompletedExerciseInstancesArgs, GetTotalCompletedExerciseInstancesReturns } from "./database";
import type { BodyFatReferenceImagesRow } from "./tables/body_fat_reference_images"; // NEW: Import specific table row type

export type {
  Json, // Re-export Json
  Database,
  Tables,
  TablesInsert,
  TablesUpdate,
  Enums,
  UserAchievementsRow,
  AiCoachUsageLogsRow,
  BodyFatReferenceImagesRow, // NEW: Re-export BodyFatReferenceImagesRow
  GetLastExerciseSetsForExerciseReturns,
  GetTotalCompletedExerciseInstancesArgs,
  GetTotalCompletedExerciseInstancesReturns,
};