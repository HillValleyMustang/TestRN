"use client";

import Dexie, { Table } from 'dexie';
import { TablesInsert, TablesUpdate, Tables } from '@/types/supabase'; // Import Tables
import { Session } from '@supabase/supabase-js'; // Import Session type

export interface SyncQueueItem {
  id?: number;
  operation: 'create' | 'update' | 'delete';
  table: 'workout_sessions' | 'set_logs';
  payload: { id: string; [key: string]: any }; // The data to sync, must have an ID
  timestamp: number;
  attempts: number;
  error?: string;
}

// Local versions of tables will have a string UUID as primary key
export interface LocalWorkoutSession extends Tables<'workout_sessions'> {
  id: string;
  user_id: string; // Must be non-null for local cache
  session_date: string;
  template_name: string | null;
  completed_at: string | null;
  rating: number | null;
  duration_string: string | null;
  t_path_id: string | null;
  created_at: string; // Must be non-null for local cache
}
export interface LocalSetLog extends Tables<'set_logs'> {
  id: string;
  session_id: string; // Must be non-null for local cache
  exercise_id: string; // Must be non-null for local cache
  weight_kg: number | null;
  reps: number | null;
  reps_l: number | null;
  reps_r: number | null;
  time_seconds: number | null;
  is_pb: boolean | null;
  created_at: string; // Must be non-null for local cache
}

export interface LocalDraftSetLog {
  exercise_id: string;
  set_index: number; // To uniquely identify a draft set within an exercise
  session_id: string | null; // Can be null if workout session hasn't started yet
  weight_kg: number | null;
  reps: number | null;
  reps_l: number | null;
  reps_r: number | null;
  time_seconds: number | null;
  isSaved?: boolean | null; // NEW: Flag to indicate if this draft corresponds to a saved set_log
  set_log_id?: string | null; // NEW: Link to the actual set_log ID if saved
  is_pb?: boolean | null; // NEW: Flag to store PR status
}

// New interface for storing the Supabase session
export interface LocalSupabaseSession {
  id: string; // A fixed ID, e.g., 'current_session'
  session: Session;
  last_updated: number; // Timestamp for when it was last updated
}

// New interfaces for cached data
export interface LocalExerciseDefinition extends Tables<'exercise_definitions'> {
  id: string;
  user_id: string | null;
  library_id: string | null;
  name: string;
  main_muscle: string;
  type: string;
  is_favorite: boolean | null;
  category: string | null; // Added category
  created_at: string; // Must be non-null for local cache
}
export interface LocalTPath extends Tables<'t_paths'> {
  id: string;
  user_id: string | null;
  template_name: string;
  is_bonus: boolean | null;
  parent_t_path_id: string | null;
  created_at: string; // Must be non-null for local cache
}
export interface LocalProfile extends Tables<'profiles'> {
  id: string;
  active_t_path_id: string | null;
  preferred_session_length: string | null;
  created_at: string; // Must be non-null for local cache
}
export interface LocalTPathExercise extends Tables<'t_path_exercises'> {
  id: string;
  template_id: string;
  exercise_id: string;
  order_index: number;
  is_bonus_exercise: boolean | null;
  created_at: string; // Must be non-null for local cache
}

export class AppDatabase extends Dexie {
  workout_sessions!: Table<LocalWorkoutSession, string>;
  set_logs!: Table<LocalSetLog, string>;
  sync_queue!: Table<SyncQueueItem, number>;
  draft_set_logs!: Table<LocalDraftSetLog, [string, number]>; // Composite primary key
  supabase_session!: Table<LocalSupabaseSession, string>; // New table for Supabase session
  exercise_definitions_cache!: Table<LocalExerciseDefinition, string>; // New table for caching exercises
  t_paths_cache!: Table<LocalTPath, string>; // New table for caching T-Paths
  profiles_cache!: Table<LocalProfile, string>; // New: Cache Profile
  t_path_exercises_cache!: Table<LocalTPathExercise, string>; // New: Cache TPathExercises

  constructor() {
    super('WorkoutTrackerDB');
    this.version(1).stores({
      workout_sessions: '&id, user_id, session_date',
      set_logs: '&id, session_id, exercise_id',
      sync_queue: '++id, timestamp',
      draft_set_logs: '[exercise_id+set_index], session_id',
    });
    this.version(2).stores({
      supabase_session: '&id', // Primary key is 'id'
    }).upgrade(tx => {
      // Add any migration logic here if needed for existing users
      // For now, we just add the new table.
    });
    // Increment version for new tables
    this.version(3).stores({
      exercise_definitions_cache: '&id, user_id, library_id', // Cache exercises
      t_paths_cache: '&id, user_id, parent_t_path_id', // Cache T-Paths
    });
    // **FIX**: Remove the fragile compound index and add a simple index on exercise_id for performance.
    this.version(4).stores({
        draft_set_logs: '[exercise_id+set_index], session_id, exercise_id',
    }).upgrade(tx => {
        // Dexie handles the re-indexing automatically when the schema definition changes.
        // No data migration is needed here as we are only adding a new index.
        return tx.table('draft_set_logs').toCollection().modify(draft => {});
    });
    // New version for profiles_cache and t_path_exercises_cache
    this.version(5).stores({
      profiles_cache: '&id', // Cache user profile
      t_path_exercises_cache: '&id, template_id, exercise_id', // Cache t_path_exercises
    });
    // New version to add t_path_id to workout_sessions
    this.version(6).stores({
      workout_sessions: '&id, user_id, session_date, t_path_id',
    });
    // New version to add is_pb to draft_set_logs
    this.version(7).stores({
      draft_set_logs: '[exercise_id+set_index], session_id, exercise_id',
    });
    // New version to add template_name index to workout_sessions
    this.version(8).stores({
      workout_sessions: '&id, user_id, session_date, t_path_id, template_name',
    });
  }
}

export const db = new AppDatabase();

// Helper function to add an operation to the sync queue
export const addToSyncQueue = async (
  operation: 'create' | 'update' | 'delete',
  table: 'workout_sessions' | 'set_logs',
  payload: { id: string; [key: string]: any }
) => {
  await db.sync_queue.add({
    operation,
    table,
    payload,
    timestamp: Date.now(),
    attempts: 0,
  });
};