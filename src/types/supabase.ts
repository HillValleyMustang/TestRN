/**
 * This file contains custom application-specific types and re-exports
 * the core Supabase database types from the generated modular structure.
 *
 * To regenerate the core database types, run:
 * `supabase gen types typescript --local > src/types/supabase-generated/database.ts`
 * Then, ensure other generated files (json, tables, enums) are consistent.
 */

// Re-export generated Supabase types for convenience
export type { Json, Database, Tables, TablesInsert, TablesUpdate, Enums } from "./supabase-generated";

// --- Custom Types ---
// These are application-specific types that extend or combine Supabase-generated types.

// Consolidated SetLogState for use across hooks and components
import { Tables, TablesInsert, TablesUpdate } from "./supabase-generated"; // Import necessary types from generated

export interface SetLogState extends Omit<Tables<'set_logs'>, 'id' | 'created_at'> {
  id: string | null; // Explicitly allow null for new sets
  created_at: string | null; // Explicitly allow null for new sets
  isSaved: boolean;
  isPR: boolean;
  lastWeight?: number | null;
  lastReps?: number | null;
  lastTimeSeconds?: number | null;
}

// Explicitly define extended Profile types to include preferred_session_length and active_t_path_id
export type Profile = Tables<'profiles'> & {
  preferred_session_length: string | null;
  active_t_path_id: string | null;
};

export type ProfileInsert = TablesInsert<'profiles'> & {
  preferred_session_length?: string | null;
  active_t_path_id?: string | null;
};

export type ProfileUpdate = TablesUpdate<'profiles'> & {
  preferred_session_length?: string | null;
  active_t_path_id?: string | null;
};