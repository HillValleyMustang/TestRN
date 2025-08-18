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
import { Tables } from "./supabase-generated"; // Import Tables from generated types

export interface SetLogState extends Omit<Tables<'set_logs'>, 'id' | 'created_at'> {
  id: string | null; // Explicitly allow null for new sets
  created_at: string | null; // Explicitly allow null for new sets
  isSaved: boolean;
  isPR: boolean;
  lastWeight?: number | null;
  lastReps?: number | null;
  lastTimeSeconds?: number | null;
}