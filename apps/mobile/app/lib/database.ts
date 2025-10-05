import * as SQLite from 'expo-sqlite';
import type { SyncQueueItem, SyncQueueStore, WorkoutSession, SetLog } from '@data/storage';

const DB_NAME = 'fitness_tracker.db';

class Database {
  private db: SQLite.SQLiteDatabase | null = null;

  async init(): Promise<void> {
    this.db = await SQLite.openDatabaseAsync(DB_NAME);
    
    await this.db.execAsync(`
      PRAGMA journal_mode = WAL;
      
      CREATE TABLE IF NOT EXISTS workout_sessions (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT NOT NULL,
        session_date TEXT NOT NULL,
        template_name TEXT,
        completed_at TEXT,
        rating INTEGER,
        duration_string TEXT,
        t_path_id TEXT,
        created_at TEXT NOT NULL
      );
      
      CREATE TABLE IF NOT EXISTS set_logs (
        id TEXT PRIMARY KEY NOT NULL,
        session_id TEXT NOT NULL,
        exercise_id TEXT NOT NULL,
        weight_kg REAL,
        reps INTEGER,
        reps_l INTEGER,
        reps_r INTEGER,
        time_seconds INTEGER,
        is_pb INTEGER,
        created_at TEXT NOT NULL,
        FOREIGN KEY (session_id) REFERENCES workout_sessions(id)
      );
      
      CREATE TABLE IF NOT EXISTS sync_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        operation TEXT NOT NULL,
        table_name TEXT NOT NULL,
        payload TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0,
        error TEXT
      );
      
      CREATE INDEX IF NOT EXISTS idx_session_date ON workout_sessions(session_date);
      CREATE INDEX IF NOT EXISTS idx_set_logs_session ON set_logs(session_id);
      CREATE INDEX IF NOT EXISTS idx_sync_queue_timestamp ON sync_queue(timestamp);
    `);
  }

  getDB(): SQLite.SQLiteDatabase {
    if (!this.db) {
      throw new Error('Database not initialized. Call init() first.');
    }
    return this.db;
  }

  async addWorkoutSession(session: WorkoutSession): Promise<void> {
    const db = this.getDB();
    await db.runAsync(
      `INSERT OR REPLACE INTO workout_sessions 
       (id, user_id, session_date, template_name, completed_at, rating, duration_string, t_path_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        session.id,
        session.user_id,
        session.session_date,
        session.template_name,
        session.completed_at,
        session.rating,
        session.duration_string,
        session.t_path_id,
        session.created_at,
      ]
    );
  }

  async addSetLog(setLog: SetLog): Promise<void> {
    const db = this.getDB();
    await db.runAsync(
      `INSERT OR REPLACE INTO set_logs 
       (id, session_id, exercise_id, weight_kg, reps, reps_l, reps_r, time_seconds, is_pb, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        setLog.id,
        setLog.session_id,
        setLog.exercise_id,
        setLog.weight_kg,
        setLog.reps,
        setLog.reps_l,
        setLog.reps_r,
        setLog.time_seconds,
        setLog.is_pb ? 1 : 0,
        setLog.created_at,
      ]
    );
  }

  async getWorkoutSessions(userId: string): Promise<WorkoutSession[]> {
    const db = this.getDB();
    const result = await db.getAllAsync<WorkoutSession>(
      'SELECT * FROM workout_sessions WHERE user_id = ? ORDER BY session_date DESC',
      [userId]
    );
    return result;
  }

  async getSetLogs(sessionId: string): Promise<SetLog[]> {
    const db = this.getDB();
    const result = await db.getAllAsync<any>(
      'SELECT * FROM set_logs WHERE session_id = ? ORDER BY created_at ASC',
      [sessionId]
    );
    return result.map(row => ({
      ...row,
      is_pb: row.is_pb === 1,
    }));
  }

  syncQueue: SyncQueueStore = {
    getAll: async (): Promise<SyncQueueItem[]> => {
      const db = this.getDB();
      const result = await db.getAllAsync<any>(
        'SELECT * FROM sync_queue ORDER BY timestamp ASC'
      );
      return result.map(row => ({
        id: row.id,
        operation: row.operation,
        table: row.table_name,
        payload: JSON.parse(row.payload),
        timestamp: row.timestamp,
        attempts: row.attempts,
        error: row.error,
      }));
    },

    add: async (item: Omit<SyncQueueItem, 'id'>): Promise<number> => {
      const db = this.getDB();
      const result = await db.runAsync(
        'INSERT INTO sync_queue (operation, table_name, payload, timestamp, attempts, error) VALUES (?, ?, ?, ?, ?, ?)',
        [item.operation, item.table, JSON.stringify(item.payload), item.timestamp, item.attempts, item.error || null]
      );
      return result.lastInsertRowId;
    },

    remove: async (id: number): Promise<void> => {
      const db = this.getDB();
      await db.runAsync('DELETE FROM sync_queue WHERE id = ?', [id]);
    },

    incrementAttempts: async (id: number, error: string): Promise<void> => {
      const db = this.getDB();
      await db.runAsync(
        'UPDATE sync_queue SET attempts = attempts + 1, error = ? WHERE id = ?',
        [error, id]
      );
    },

    clear: async (): Promise<void> => {
      const db = this.getDB();
      await db.runAsync('DELETE FROM sync_queue');
    },
  };
}

export const database = new Database();

export const addToSyncQueue = async (
  operation: 'create' | 'update' | 'delete',
  table: 'workout_sessions' | 'set_logs',
  payload: { id: string; [key: string]: any }
) => {
  await database.syncQueue.add({
    operation,
    table,
    payload,
    timestamp: Date.now(),
    attempts: 0,
  });
};
