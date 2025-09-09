/**
 * This index file re-exports all generated Supabase types for easier import.
 * It is part of the Supabase generated types, refactored for modularity.
 */

// Import core types
import type { Json } from "./json";
import type { Database } from "./database";

// Import table row types
import type { ActivityLogsRow } from "./tables/activity_logs";
import type { AiCoachUsageLogsRow } from "./tables/ai_coach_usage_logs";
import type { BodyFatReferenceImagesRow } from "./tables/body_fat_reference_images";
import type { ExerciseDefinitionsRow } from "./tables/exercise_definitions";
import type { NotificationsRow } from "./tables/notifications";
import type { ProfilesRow } from "./tables/profiles";
import type { SetLogsRow } from "./tables/set_logs";
import type { TPathExercisesRow } from "./tables/t_path_exercises";
import type { TPathsRow } from "./tables/t_paths";
import type { UserAchievementsRow } from "./tables/user_achievements";
import type { UserExercisePrsRow } from "./tables/user_exercise_prs";
import type { UserNotificationsRow } from "./tables/user_notifications";
import type { WorkoutExerciseStructureRow } from "./tables/workout_exercise_structure";
import type { WorkoutSessionsRow } from "./tables/workout_sessions";

// Import function return types
import type { GetNotificationsWithReadStatusReturns } from "./functions/get_notifications_with_read_status";
import type { HandleNewUserReturns } from "./functions/handle_new_user";
import type { GetLastExerciseSetsForExerciseReturns } from "./functions/get_last_exercise_sets_for_exercise";
import type { GetTotalCompletedExerciseInstancesArgs, GetTotalCompletedExerciseInstancesReturns } from "./functions/get_total_completed_exercise_instances"; // NEW: Import Args type

// Re-export all necessary types
export type {
  Json,
  Database,

  // Re-export Tables, TablesInsert, TablesUpdate, Enums from the utility file
  // These are not directly defined in database.ts
  // They are defined in tables.ts and enums.ts and then re-exported by the main supabase.ts
  // For internal generated types, we need to define them here or import from tables.ts
  // For simplicity, I'll define them here based on the Database structure.
  Tables,
  TablesInsert,
  TablesUpdate,
  Enums,

  // Re-export specific row types
  ActivityLogsRow,
  AiCoachUsageLogsRow,
  BodyFatReferenceImagesRow,
  ExerciseDefinitionsRow,
  NotificationsRow,
  ProfilesRow,
  SetLogsRow,
  TPathExercisesRow,
  TPathsRow,
  UserAchievementsRow,
  UserExercisePrsRow,
  UserNotificationsRow,
  WorkoutExerciseStructureRow,
  WorkoutSessionsRow,

  // Re-export function return types
  GetNotificationsWithReadStatusReturns,
  HandleNewUserReturns,
  GetLastExerciseSetsForExerciseReturns,
  GetTotalCompletedExerciseInstancesArgs, // NEW: Re-export Args type
  GetTotalCompletedExerciseInstancesReturns,
};

// Define Tables, TablesInsert, TablesUpdate, Enums based on Database structure for internal use
// This mirrors the logic in src/types/supabase.ts but keeps it within the generated context
type PublicSchema = Database["public"];

type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
            Row: infer R;
          }
      ? R
      : never
    : never;

type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never;