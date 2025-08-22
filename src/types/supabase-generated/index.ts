/**
 * This index file re-exports all generated Supabase types for easier import.
 * It is part of the Supabase generated types, refactored for modularity.
 */

export type { Json } from "./json";
export type { Database } from "./database";
export * from "./tables"; // Correctly re-export all from tables.ts
export * from "./enums";  // Correctly re-export all from enums.ts

// No individual table/function exports here to avoid circular dependencies.
// Application code should use `Tables<'table_name'>` or `Database['public']['Tables']['table_name']['Row']`