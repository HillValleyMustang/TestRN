"use client";

import Dexie, { Table } from 'dexie';
import { TablesInsert, TablesUpdate } from '@/types/supabase';

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
}
export interface LocalSetLog extends TablesInsert<'set_logs'> {
  id: string;
}

export class AppDatabase extends Dexie {
  workout_sessions!: Table<LocalWorkoutSession, string>;
  set_logs!: Table<LocalSetLog, string>;
  sync_queue!: Table<SyncQueueItem, number>;

  constructor() {
    super('WorkoutTrackerDB');
    this.version(1).stores({
      workout_sessions: '&id, user_id, session_date',
      set_logs: '&id, session_id, exercise_id',
      sync_queue: '++id, timestamp',
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