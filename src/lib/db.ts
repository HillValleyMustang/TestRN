"use client";

import Dexie, { Table } from 'dexie';
import { TablesInsert, TablesUpdate, Tables } from '@/types/supabase'; // Import Tables
import { Session } from '@supabase/supabase-js'; // Import Session type
import { UserAchievementsRow } from '@/types/supabase-generated/tables/user_achievements'; // Import UserAchievementsRow
import { Json } from '@/types/supabase-generated/json'; // Import Json type

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
  version: number | null; // Added missing property
  settings: Json | null; // Added missing property
  progression_settings: Json | null; // Added missing property
  gym_id: string | null;
}
export interface LocalProfile extends Tables<'profiles'> {
  id: string;
  active_t_path_id: string | null;
  preferred_session_length: string | null;
  created_at: string; // Must be non-null for local cache
  first_name: string | null; // Added missing property
  last_name: string | null; // Added missing property
  full_name: string | null; // Added missing property
  height_cm: number | null; // Added missing property
  weight_kg: number | null; // Added missing property
  body_fat_pct: number | null; // Added missing property
  primary_goal: string | null; // Added missing property
  health_notes: string | null; // Added missing property
  default_rest_time_seconds: number | null; // Added missing property
  preferred_distance_unit: string | null; // Added missing property
  preferred_muscles: string | null; // Added missing property
  preferred_weight_unit: string | null; // Added missing property
  target_date: string | null; // Added missing property
  updated_at: string | null; // Added missing property
  last_ai_coach_use_at: string | null; // Added missing property
  total_points: number | null; // Added missing property
  current_streak: number | null; // Added missing property
  longest_streak: number | null; // Added missing property
  last_workout_date: string | null; // Added missing property
  rolling_workout_status: string | null; // Added missing property
  t_path_generation_status: string | null; // NEW
  t_path_generation_error: string | null; // NEW
}
export interface LocalTPathExercise extends Tables<'t_path_exercises'> {
  id: string;
  template_id: string;
  exercise_id: string;
  order_index: number;
  is_bonus_exercise: boolean | null;
  created_at: string; // Must be non-null for local cache
}
// NEW: LocalUserAchievement
export interface LocalUserAchievement extends UserAchievementsRow {
  id: string;
  user_id: string;
  achievement_id: string;
  unlocked_at: string | null;
}

// NEW: LocalUserAlert
export interface LocalUserAlert extends Tables<'user_alerts'> {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string | null;
  created_at: string;
  is_read: boolean | null;
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
  user_achievements_cache!: Table<LocalUserAchievement, string>; // NEW: Cache user achievements
  user_alerts!: Table<LocalUserAlert, string>; // NEW: User Alerts table

  constructor() {
    super('WorkoutTrackerDB');
    this.version(10).stores({
      workout_sessions: '&id, user_id, session_date, t_path_id, template_name',
      set_logs: '&id, session_id, exercise_id',
      sync_queue: '++id, timestamp',
      draft_set_logs: '[exercise_id+set_index], session_id, exercise_id',
      supabase_session: '&id',
      exercise_definitions_cache: '&id, user_id, library_id',
      t_paths_cache: '&id, user_id, parent_t_path_id',
      profiles_cache: '&id',
      t_path_exercises_cache: '&id, template_id, exercise_id',
      user_achievements_cache: '&id, user_id, achievement_id',
      user_alerts: '&id, user_id, created_at',
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