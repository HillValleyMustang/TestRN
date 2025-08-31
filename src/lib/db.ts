"use client";

import Dexie, { Table } from 'dexie';
import { TablesInsert, TablesUpdate } from '@/types/supabase';
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
export interface LocalWorkoutSession extends TablesInsert<'workout_sessions'> {
  id: string;
  completed_at?: string | null;
}
export interface LocalSetLog extends TablesInsert<'set_logs'> {
  id: string;
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
}

// New interface for storing the Supabase session
export interface LocalSupabaseSession {
  id: string; // A fixed ID, e.g., 'current_session'
  session: Session;
  last_updated: number; // Timestamp for when it was last updated
}

export class AppDatabase extends Dexie {
  workout_sessions!: Table<LocalWorkoutSession, string>;
  set_logs!: Table<LocalSetLog, string>;
  sync_queue!: Table<SyncQueueItem, number>;
  draft_set_logs!: Table<LocalDraftSetLog, [string, number]>; // Composite primary key
  supabase_session!: Table<LocalSupabaseSession, string>; // New table for Supabase session

  constructor() {
    super('WorkoutTrackerDB');
    this.version(1).stores({
      workout_sessions: '&id, user_id, session_date',
      set_logs: '&id, session_id, exercise_id',
      sync_queue: '++id, timestamp',
      draft_set_logs: '[exercise_id+set_index], session_id', // Define composite key
    });
    this.version(2).stores({
      supabase_session: '&id', // Primary key is 'id'
    }).upgrade(tx => {
      // Add any migration logic here if needed for existing users
      // For now, we just add the new table.
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