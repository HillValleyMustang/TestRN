import * as SQLite from 'expo-sqlite';
import type { SyncQueueItem, SyncQueueStore, WorkoutSession, SetLog, WorkoutTemplate, TemplateExercise } from '@data/storage';

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
      
      CREATE TABLE IF NOT EXISTS workout_templates (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        exercises TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      
      CREATE INDEX IF NOT EXISTS idx_session_date ON workout_sessions(session_date);
      CREATE INDEX IF NOT EXISTS idx_set_logs_session ON set_logs(session_id);
      CREATE INDEX IF NOT EXISTS idx_sync_queue_timestamp ON sync_queue(timestamp);
      CREATE INDEX IF NOT EXISTS idx_templates_user ON workout_templates(user_id);
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

  async getPersonalRecord(userId: string, exerciseId: string): Promise<number> {
    const db = this.getDB();
    const result = await db.getFirstAsync<{ max_weight: number }>(
      `SELECT MAX(weight_kg) as max_weight 
       FROM set_logs sl
       JOIN workout_sessions ws ON sl.session_id = ws.id
       WHERE ws.user_id = ? AND sl.exercise_id = ?`,
      [userId, exerciseId]
    );
    return result?.max_weight || 0;
  }

  async saveTemplate(template: WorkoutTemplate): Promise<void> {
    const db = this.getDB();
    await db.runAsync(
      `INSERT OR REPLACE INTO workout_templates 
       (id, user_id, name, description, exercises, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        template.id,
        template.user_id,
        template.name,
        template.description,
        JSON.stringify(template.exercises),
        template.created_at,
        template.updated_at,
      ]
    );
  }

  async getTemplates(userId: string): Promise<WorkoutTemplate[]> {
    const db = this.getDB();
    const result = await db.getAllAsync<any>(
      'SELECT * FROM workout_templates WHERE user_id = ? ORDER BY updated_at DESC',
      [userId]
    );
    return result.map(row => ({
      ...row,
      exercises: JSON.parse(row.exercises),
    }));
  }

  async getTemplate(templateId: string): Promise<WorkoutTemplate | null> {
    const db = this.getDB();
    const result = await db.getFirstAsync<any>(
      'SELECT * FROM workout_templates WHERE id = ?',
      [templateId]
    );
    if (!result) return null;
    return {
      ...result,
      exercises: JSON.parse(result.exercises),
    };
  }

  async deleteTemplate(templateId: string): Promise<void> {
    const db = this.getDB();
    await db.runAsync('DELETE FROM workout_templates WHERE id = ?', [templateId]);
  }

  async getWorkoutStats(userId: string, days: number = 30): Promise<{
    totalWorkouts: number;
    totalVolume: number;
    averageVolume: number;
    currentStreak: number;
    longestStreak: number;
  }> {
    const db = this.getDB();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const workouts = await db.getAllAsync<WorkoutSession>(
      `SELECT * FROM workout_sessions 
       WHERE user_id = ? AND session_date >= ? 
       ORDER BY session_date DESC`,
      [userId, startDate.toISOString()]
    );

    const volumeResult = await db.getFirstAsync<{ total_volume: number }>(
      `SELECT SUM(sl.weight_kg * sl.reps) as total_volume
       FROM set_logs sl
       JOIN workout_sessions ws ON sl.session_id = ws.id
       WHERE ws.user_id = ? AND ws.session_date >= ?`,
      [userId, startDate.toISOString()]
    );

    const totalVolume = volumeResult?.total_volume || 0;
    const totalWorkouts = workouts.length;
    const averageVolume = totalWorkouts > 0 ? totalVolume / totalWorkouts : 0;

    const allWorkouts = await db.getAllAsync<{ session_date: string }>(
      `SELECT session_date FROM workout_sessions 
       WHERE user_id = ? 
       ORDER BY session_date DESC`,
      [userId]
    );

    const { currentStreak, longestStreak } = this.calculateStreaks(allWorkouts.map(w => w.session_date));

    return {
      totalWorkouts,
      totalVolume,
      averageVolume,
      currentStreak,
      longestStreak,
    };
  }

  private calculateStreaks(dates: string[]): { currentStreak: number; longestStreak: number } {
    if (dates.length === 0) return { currentStreak: 0, longestStreak: 0 };

    const uniqueDates = [...new Set(dates.map(d => d.split('T')[0]))].sort().reverse();
    
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    let lastDate: Date | null = null;

    for (const dateStr of uniqueDates) {
      const date = new Date(dateStr);
      
      if (lastDate === null) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const daysDiff = Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysDiff <= 1) {
          currentStreak = 1;
          tempStreak = 1;
        }
      } else {
        const daysDiff = Math.floor((lastDate.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysDiff === 1) {
          tempStreak++;
          if (currentStreak > 0) currentStreak++;
        } else {
          if (currentStreak > 0) currentStreak = 0;
          tempStreak = 1;
        }
      }
      
      longestStreak = Math.max(longestStreak, tempStreak);
      lastDate = date;
    }

    return { currentStreak, longestStreak };
  }

  async getWorkoutFrequency(userId: string, days: number = 30): Promise<Array<{ date: string; count: number }>> {
    const db = this.getDB();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const result = await db.getAllAsync<{ date: string; count: number }>(
      `SELECT DATE(session_date) as date, COUNT(*) as count
       FROM workout_sessions
       WHERE user_id = ? AND session_date >= ?
       GROUP BY DATE(session_date)
       ORDER BY date ASC`,
      [userId, startDate.toISOString()]
    );

    return result;
  }

  async getVolumeHistory(userId: string, days: number = 30): Promise<Array<{ date: string; volume: number }>> {
    const db = this.getDB();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const result = await db.getAllAsync<{ date: string; volume: number }>(
      `SELECT DATE(ws.session_date) as date, SUM(sl.weight_kg * sl.reps) as volume
       FROM set_logs sl
       JOIN workout_sessions ws ON sl.session_id = ws.id
       WHERE ws.user_id = ? AND ws.session_date >= ?
       GROUP BY DATE(ws.session_date)
       ORDER BY date ASC`,
      [userId, startDate.toISOString()]
    );

    return result;
  }

  async getPRHistory(userId: string, exerciseId: string): Promise<Array<{ date: string; weight: number }>> {
    const db = this.getDB();
    
    const result = await db.getAllAsync<{ date: string; weight: number }>(
      `SELECT DATE(ws.session_date) as date, MAX(sl.weight_kg) as weight
       FROM set_logs sl
       JOIN workout_sessions ws ON sl.session_id = ws.id
       WHERE ws.user_id = ? AND sl.exercise_id = ?
       GROUP BY DATE(ws.session_date)
       ORDER BY date ASC`,
      [userId, exerciseId]
    );

    return result;
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
