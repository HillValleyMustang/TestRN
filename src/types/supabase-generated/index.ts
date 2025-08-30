/**
 * This index file re-exports all generated Supabase types for easier import.
 * It is part of the Supabase generated types, refactored for modularity.
 */

// Import generated Supabase types to be used and re-exported
import type { Json } from "./json";
import type { Database } from "./database";
import type { Tables, TablesInsert, TablesUpdate } from "./tables";
import type { Enums } from "./enums";

export type { Json, Database, Tables, TablesInsert, TablesUpdate, Enums };

// Re-exporting all from tables.ts and enums.ts to ensure they are available
export * from "./tables";
export * from "./enums";
export * from "./tables/user_achievements"; // Export the new user_achievements types
export * from "./tables/ai_coach_usage_logs"; // Export the new ai_coach_usage_logs types

// No individual table/function exports here to avoid circular dependencies.
// Application code should use `Tables<'table_name'>` or `Database['public']['Tables']['table_name']['Row']`