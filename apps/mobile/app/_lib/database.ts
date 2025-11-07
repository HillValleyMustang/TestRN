import * as SQLite from 'expo-sqlite';
import type {
  SyncQueueItem,
  SyncQueueStore,
  WorkoutSession,
  SetLog,
  WorkoutTemplate,
  TPath,
  TPathExercise,
  TPathProgress,
  TPathWithExercises,
  Gym,
} from '@data/storage';

const DB_NAME = 'fitness_tracker.db';

class Database {
  private db: SQLite.SQLiteDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  async init(): Promise<void> {
    if (this.db) {
      return;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = (async () => {
      try {
        this.db = await SQLite.openDatabaseAsync(DB_NAME);
      } catch (error: any) {
        const message = typeof error?.message === 'string' ? error.message : '';
        if (
          message.includes("Couldn't create directory") ||
          message.includes('Could not open database')
        ) {
          await SQLite.deleteDatabaseAsync(DB_NAME);
          this.db = await SQLite.openDatabaseAsync(DB_NAME);
        } else {
          this.initPromise = null;
          throw error;
        }
      }

      await this.db!.execAsync(`
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

      CREATE TABLE IF NOT EXISTS user_preferences (
        user_id TEXT PRIMARY KEY NOT NULL,
        unit_system TEXT DEFAULT 'metric',
        theme TEXT DEFAULT 'dark',
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS body_measurements (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT NOT NULL,
        measurement_date TEXT NOT NULL,
        weight_kg REAL,
        body_fat_percentage REAL,
        chest_cm REAL,
        waist_cm REAL,
        hips_cm REAL,
        left_arm_cm REAL,
        right_arm_cm REAL,
        left_thigh_cm REAL,
        right_thigh_cm REAL,
        notes TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS user_goals (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT NOT NULL,
        goal_type TEXT NOT NULL,
        target_value REAL NOT NULL,
        current_value REAL,
        start_date TEXT NOT NULL,
        target_date TEXT,
        status TEXT DEFAULT 'active',
        exercise_id TEXT,
        notes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS user_achievements (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT NOT NULL,
        achievement_id TEXT NOT NULL,
        unlocked_at TEXT NOT NULL,
        progress_value REAL
      );

      CREATE TABLE IF NOT EXISTS t_paths (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT NOT NULL,
        template_name TEXT NOT NULL,
        description TEXT,
        is_main_program INTEGER DEFAULT 0,
        parent_t_path_id TEXT,
        order_index INTEGER,
        is_ai_generated INTEGER DEFAULT 0,
        ai_generation_params TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (parent_t_path_id) REFERENCES t_paths(id)
      );

      CREATE TABLE IF NOT EXISTS t_path_exercises (
        id TEXT PRIMARY KEY NOT NULL,
        t_path_id TEXT NOT NULL,
        exercise_id TEXT NOT NULL,
        order_index INTEGER NOT NULL,
        is_bonus_exercise INTEGER DEFAULT 0,
        target_sets INTEGER,
        target_reps_min INTEGER,
        target_reps_max INTEGER,
        notes TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (t_path_id) REFERENCES t_paths(id)
      );

      CREATE TABLE IF NOT EXISTS t_path_progress (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT NOT NULL,
        t_path_id TEXT NOT NULL,
        completed_at TEXT,
        last_accessed_at TEXT,
        total_workouts_completed INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (t_path_id) REFERENCES t_paths(id)
      );

      CREATE TABLE IF NOT EXISTS gyms (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        equipment TEXT NOT NULL,
        is_active INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      
      CREATE INDEX IF NOT EXISTS idx_session_date ON workout_sessions(session_date);
      CREATE INDEX IF NOT EXISTS idx_set_logs_session ON set_logs(session_id);
      CREATE INDEX IF NOT EXISTS idx_sync_queue_timestamp ON sync_queue(timestamp);
      CREATE INDEX IF NOT EXISTS idx_templates_user ON workout_templates(user_id);
      CREATE INDEX IF NOT EXISTS idx_measurements_user ON body_measurements(user_id);
      CREATE INDEX IF NOT EXISTS idx_measurements_date ON body_measurements(measurement_date);
      CREATE INDEX IF NOT EXISTS idx_goals_user ON user_goals(user_id);
      CREATE INDEX IF NOT EXISTS idx_achievements_user ON user_achievements(user_id);
      CREATE INDEX IF NOT EXISTS idx_t_paths_user ON t_paths(user_id);
      CREATE INDEX IF NOT EXISTS idx_t_paths_parent ON t_paths(parent_t_path_id);
      CREATE INDEX IF NOT EXISTS idx_t_path_exercises_tpath ON t_path_exercises(t_path_id);
      CREATE INDEX IF NOT EXISTS idx_t_path_progress_user ON t_path_progress(user_id);
      CREATE INDEX IF NOT EXISTS idx_t_path_progress_tpath ON t_path_progress(t_path_id);
      CREATE INDEX IF NOT EXISTS idx_gyms_user ON gyms(user_id);
      CREATE INDEX IF NOT EXISTS idx_gyms_active ON gyms(is_active);
    `);
    })();

    await this.initPromise;
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

  async replaceSetLogsForSession(
    sessionId: string,
    logs: SetLog[]
  ): Promise<void> {
    const db = this.getDB();
    await db.runAsync('DELETE FROM set_logs WHERE session_id = ?', [sessionId]);

    for (const log of logs) {
      await db.runAsync(
        `INSERT OR REPLACE INTO set_logs
         (id, session_id, exercise_id, weight_kg, reps, reps_l, reps_r, time_seconds, is_pb, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          log.id,
          log.session_id,
          log.exercise_id,
          log.weight_kg,
          log.reps,
          log.reps_l,
          log.reps_r,
          log.time_seconds,
          log.is_pb ? 1 : 0,
          log.created_at,
        ]
      );
    }
  }

  async getWorkoutSessions(userId: string): Promise<WorkoutSession[]> {
    const db = this.getDB();
    const result = await db.getAllAsync<WorkoutSession>(
      'SELECT * FROM workout_sessions WHERE user_id = ? ORDER BY session_date DESC',
      [userId]
    );
    return result;
  }

  async getRecentWorkoutSummaries(
    userId: string,
    limit: number = 3
  ): Promise<
    Array<{
      session: WorkoutSession;
      exercise_count: number;
      first_set_at: string | null;
      last_set_at: string | null;
    }>
  > {
    const db = this.getDB();
    const rows = await db.getAllAsync<any>(
      `SELECT ws.*, COUNT(DISTINCT sl.exercise_id) as exercise_count,
              MIN(sl.created_at) as first_set_at, MAX(sl.created_at) as last_set_at
       FROM workout_sessions ws
       LEFT JOIN set_logs sl ON sl.session_id = ws.id
       WHERE ws.user_id = ? AND ws.completed_at IS NOT NULL
       GROUP BY ws.id
       ORDER BY ws.session_date DESC
       LIMIT ?`,
      [userId, limit]
    );

    return rows.map(row => ({
      session: {
        id: row.id,
        user_id: row.user_id,
        session_date: row.session_date,
        template_name: row.template_name,
        completed_at: row.completed_at,
        rating: row.rating,
        duration_string: row.duration_string,
        t_path_id: row.t_path_id,
        created_at: row.created_at,
      },
      exercise_count: Number(row.exercise_count) || 0,
      first_set_at: row.first_set_at ?? null,
      last_set_at: row.last_set_at ?? null,
    }));
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
    if (!result) {
      return null;
    }
    return {
      ...result,
      exercises: JSON.parse(result.exercises),
    };
  }

  async deleteTemplate(templateId: string): Promise<void> {
    const db = this.getDB();
    await db.runAsync('DELETE FROM workout_templates WHERE id = ?', [
      templateId,
    ]);
  }

  async getWorkoutStats(
    userId: string,
    days: number = 30
  ): Promise<{
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

    const { currentStreak, longestStreak } = this.calculateStreaks(
      allWorkouts.map(w => w.session_date)
    );

    return {
      totalWorkouts,
      totalVolume,
      averageVolume,
      currentStreak,
      longestStreak,
    };
  }

  private calculateStreaks(dates: string[]): {
    currentStreak: number;
    longestStreak: number;
  } {
    if (dates.length === 0) {
      return { currentStreak: 0, longestStreak: 0 };
    }

    const uniqueDates = [...new Set(dates.map(d => d.split('T')[0]))]
      .sort()
      .reverse();

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    let lastDate: Date | null = null;

    for (const dateStr of uniqueDates) {
      const date = new Date(dateStr);

      if (lastDate === null) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const daysDiff = Math.floor(
          (today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysDiff <= 1) {
          currentStreak = 1;
          tempStreak = 1;
        }
      } else {
        const daysDiff = Math.floor(
          (lastDate.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysDiff === 1) {
          tempStreak++;
          if (currentStreak > 0) {
            currentStreak++;
          }
        } else {
          if (currentStreak > 0) {
            currentStreak = 0;
          }
          tempStreak = 1;
        }
      }

      longestStreak = Math.max(longestStreak, tempStreak);
      lastDate = date;
    }

    return { currentStreak, longestStreak };
  }

  async getWorkoutFrequency(
    userId: string,
    days: number = 30
  ): Promise<Array<{ date: string; count: number }>> {
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

  async getVolumeHistory(
    userId: string,
    days: number = 30
  ): Promise<Array<{ date: string; volume: number }>> {
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

  async getPRHistory(
    userId: string,
    exerciseId: string
  ): Promise<Array<{ date: string; weight: number }>> {
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

  async getUserPreferences(
    userId: string
  ): Promise<{ unit_system: string; theme: string } | null> {
    const db = this.getDB();
    const result = await db.getFirstAsync<{
      unit_system: string;
      theme: string;
    }>('SELECT unit_system, theme FROM user_preferences WHERE user_id = ?', [
      userId,
    ]);
    return result || null;
  }

  async saveUserPreferences(
    userId: string,
    preferences: { unit_system?: string; theme?: string }
  ): Promise<void> {
    const db = this.getDB();
    const now = new Date().toISOString();

    const existing = await this.getUserPreferences(userId);

    if (existing) {
      await db.runAsync(
        `UPDATE user_preferences 
         SET unit_system = ?, theme = ?, updated_at = ?
         WHERE user_id = ?`,
        [
          preferences.unit_system || existing.unit_system,
          preferences.theme || existing.theme,
          now,
          userId,
        ]
      );
    } else {
      await db.runAsync(
        `INSERT INTO user_preferences (user_id, unit_system, theme, updated_at)
         VALUES (?, ?, ?, ?)`,
        [
          userId,
          preferences.unit_system || 'metric',
          preferences.theme || 'dark',
          now,
        ]
      );
    }
  }

  async saveBodyMeasurement(measurement: {
    id: string;
    user_id: string;
    measurement_date: string;
    weight_kg?: number;
    body_fat_percentage?: number;
    chest_cm?: number;
    waist_cm?: number;
    hips_cm?: number;
    left_arm_cm?: number;
    right_arm_cm?: number;
    left_thigh_cm?: number;
    right_thigh_cm?: number;
    notes?: string;
    created_at: string;
  }): Promise<void> {
    const db = this.getDB();
    await db.runAsync(
      `INSERT OR REPLACE INTO body_measurements 
       (id, user_id, measurement_date, weight_kg, body_fat_percentage, chest_cm, waist_cm, hips_cm, left_arm_cm, right_arm_cm, left_thigh_cm, right_thigh_cm, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        measurement.id,
        measurement.user_id,
        measurement.measurement_date,
        measurement.weight_kg || null,
        measurement.body_fat_percentage || null,
        measurement.chest_cm || null,
        measurement.waist_cm || null,
        measurement.hips_cm || null,
        measurement.left_arm_cm || null,
        measurement.right_arm_cm || null,
        measurement.left_thigh_cm || null,
        measurement.right_thigh_cm || null,
        measurement.notes || null,
        measurement.created_at,
      ]
    );
  }

  async getBodyMeasurements(userId: string): Promise<any[]> {
    const db = this.getDB();
    const result = await db.getAllAsync<any>(
      'SELECT * FROM body_measurements WHERE user_id = ? ORDER BY measurement_date DESC, created_at DESC',
      [userId]
    );
    return result;
  }

  async getWeightHistory(
    userId: string,
    days?: number
  ): Promise<Array<{ date: string; weight: number }>> {
    const db = this.getDB();
    let query = `SELECT DATE(measurement_date) as date, weight_kg as weight
                 FROM body_measurements
                 WHERE user_id = ? AND weight_kg IS NOT NULL`;
    const params: any[] = [userId];

    if (days) {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      query += ' AND measurement_date >= ?';
      params.push(startDate.toISOString());
    }

    query += ' ORDER BY measurement_date ASC';

    const result = await db.getAllAsync<{ date: string; weight: number }>(
      query,
      params
    );
    return result;
  }

  async deleteBodyMeasurement(measurementId: string): Promise<void> {
    const db = this.getDB();
    await db.runAsync('DELETE FROM body_measurements WHERE id = ?', [
      measurementId,
    ]);
  }

  async saveGoal(goal: {
    id: string;
    user_id: string;
    goal_type: string;
    target_value: number;
    current_value?: number;
    start_date: string;
    target_date?: string;
    status?: string;
    exercise_id?: string;
    notes?: string;
    created_at: string;
    updated_at: string;
  }): Promise<void> {
    const db = this.getDB();
    await db.runAsync(
      `INSERT OR REPLACE INTO user_goals 
       (id, user_id, goal_type, target_value, current_value, start_date, target_date, status, exercise_id, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        goal.id,
        goal.user_id,
        goal.goal_type,
        goal.target_value,
        goal.current_value || null,
        goal.start_date,
        goal.target_date || null,
        goal.status || 'active',
        goal.exercise_id || null,
        goal.notes || null,
        goal.created_at,
        goal.updated_at,
      ]
    );
  }

  async getGoals(userId: string, status?: string): Promise<any[]> {
    const db = this.getDB();
    let query = 'SELECT * FROM user_goals WHERE user_id = ?';
    const params: any[] = [userId];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC';

    const result = await db.getAllAsync<any>(query, params);
    return result;
  }

  async getGoal(goalId: string): Promise<any | null> {
    const db = this.getDB();
    const result = await db.getFirstAsync<any>(
      'SELECT * FROM user_goals WHERE id = ?',
      [goalId]
    );
    return result || null;
  }

  async updateGoalProgress(
    goalId: string,
    currentValue: number,
    status?: string
  ): Promise<void> {
    const db = this.getDB();
    const now = new Date().toISOString();

    if (status) {
      await db.runAsync(
        'UPDATE user_goals SET current_value = ?, status = ?, updated_at = ? WHERE id = ?',
        [currentValue, status, now, goalId]
      );
    } else {
      await db.runAsync(
        'UPDATE user_goals SET current_value = ?, updated_at = ? WHERE id = ?',
        [currentValue, now, goalId]
      );
    }
  }

  async deleteGoal(goalId: string): Promise<void> {
    const db = this.getDB();
    await db.runAsync('DELETE FROM user_goals WHERE id = ?', [goalId]);
  }

  async unlockAchievement(achievement: {
    id: string;
    user_id: string;
    achievement_id: string;
    unlocked_at: string;
    progress_value?: number;
  }): Promise<void> {
    const db = this.getDB();
    await db.runAsync(
      `INSERT OR REPLACE INTO user_achievements 
       (id, user_id, achievement_id, unlocked_at, progress_value)
       VALUES (?, ?, ?, ?, ?)`,
      [
        achievement.id,
        achievement.user_id,
        achievement.achievement_id,
        achievement.unlocked_at,
        achievement.progress_value || null,
      ]
    );
  }

  async getUserAchievements(userId: string): Promise<any[]> {
    const db = this.getDB();
    const result = await db.getAllAsync<any>(
      'SELECT * FROM user_achievements WHERE user_id = ? ORDER BY unlocked_at DESC',
      [userId]
    );
    return result;
  }

  async hasAchievement(
    userId: string,
    achievementId: string
  ): Promise<boolean> {
    const db = this.getDB();
    const result = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM user_achievements WHERE user_id = ? AND achievement_id = ?',
      [userId, achievementId]
    );
    return (result?.count || 0) > 0;
  }

  async addTPath(tPath: TPath): Promise<void> {
    const db = this.getDB();
    await db.runAsync(
      `INSERT OR REPLACE INTO t_paths 
       (id, user_id, template_name, description, is_main_program, parent_t_path_id, order_index, is_ai_generated, ai_generation_params, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        tPath.id,
        tPath.user_id,
        tPath.template_name,
        tPath.description,
        tPath.is_main_program ? 1 : 0,
        tPath.parent_t_path_id,
        tPath.order_index,
        tPath.is_ai_generated ? 1 : 0,
        tPath.ai_generation_params,
        tPath.created_at,
        tPath.updated_at,
      ]
    );
  }

  async getTPath(tPathId: string): Promise<TPathWithExercises | null> {
    const db = this.getDB();
    const tPath = await db.getFirstAsync<any>(
      'SELECT * FROM t_paths WHERE id = ?',
      [tPathId]
    );

    if (!tPath) {
      return null;
    }

    const exercises = await db.getAllAsync<any>(
      'SELECT * FROM t_path_exercises WHERE t_path_id = ? ORDER BY order_index ASC',
      [tPathId]
    );

    return {
      ...tPath,
      is_main_program: Boolean(tPath.is_main_program),
      is_ai_generated: Boolean(tPath.is_ai_generated),
      exercises: exercises.map(ex => ({
        ...ex,
        is_bonus_exercise: Boolean(ex.is_bonus_exercise),
      })),
    };
  }

  async getTPaths(
    userId: string,
    mainProgramsOnly: boolean = false
  ): Promise<TPath[]> {
    const db = this.getDB();
    let query = 'SELECT * FROM t_paths WHERE user_id = ?';
    const params: any[] = [userId];

    if (mainProgramsOnly) {
      query += ' AND is_main_program = 1';
    }

    query += ' ORDER BY order_index ASC, created_at DESC';

    const result = await db.getAllAsync<any>(query, params);
    return result.map(row => ({
      ...row,
      is_main_program: Boolean(row.is_main_program),
      is_ai_generated: Boolean(row.is_ai_generated),
    }));
  }

  async getTPathsByParent(parentId: string): Promise<TPath[]> {
    const db = this.getDB();
    const result = await db.getAllAsync<any>(
      'SELECT * FROM t_paths WHERE parent_t_path_id = ? ORDER BY order_index ASC',
      [parentId]
    );
    return result.map(row => ({
      ...row,
      is_main_program: Boolean(row.is_main_program),
      is_ai_generated: Boolean(row.is_ai_generated),
    }));
  }

  async updateTPath(tPathId: string, updates: Partial<TPath>): Promise<void> {
    const db = this.getDB();
    const now = new Date().toISOString();

    const fields: string[] = [];
    const values: any[] = [];

    if (updates.template_name !== undefined) {
      fields.push('template_name = ?');
      values.push(updates.template_name);
    }
    if (updates.description !== undefined) {
      fields.push('description = ?');
      values.push(updates.description);
    }
    if (updates.is_main_program !== undefined) {
      fields.push('is_main_program = ?');
      values.push(updates.is_main_program ? 1 : 0);
    }
    if (updates.order_index !== undefined) {
      fields.push('order_index = ?');
      values.push(updates.order_index);
    }

    fields.push('updated_at = ?');
    values.push(now);
    values.push(tPathId);

    if (fields.length > 1) {
      await db.runAsync(
        `UPDATE t_paths SET ${fields.join(', ')} WHERE id = ?`,
        values
      );
    }
  }

  async deleteTPath(tPathId: string): Promise<void> {
    const db = this.getDB();
    await db.runAsync('DELETE FROM t_path_exercises WHERE t_path_id = ?', [
      tPathId,
    ]);
    await db.runAsync('DELETE FROM t_path_progress WHERE t_path_id = ?', [
      tPathId,
    ]);
    await db.runAsync('DELETE FROM t_paths WHERE id = ?', [tPathId]);
  }

  async addTPathExercise(exercise: TPathExercise): Promise<void> {
    const db = this.getDB();
    await db.runAsync(
      `INSERT OR REPLACE INTO t_path_exercises 
       (id, t_path_id, exercise_id, order_index, is_bonus_exercise, target_sets, target_reps_min, target_reps_max, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        exercise.id,
        exercise.t_path_id,
        exercise.exercise_id,
        exercise.order_index,
        exercise.is_bonus_exercise ? 1 : 0,
        exercise.target_sets,
        exercise.target_reps_min,
        exercise.target_reps_max,
        exercise.notes,
        exercise.created_at,
      ]
    );
  }

  async getTPathExercises(tPathId: string): Promise<TPathExercise[]> {
    const db = this.getDB();
    const result = await db.getAllAsync<any>(
      'SELECT * FROM t_path_exercises WHERE t_path_id = ? ORDER BY order_index ASC',
      [tPathId]
    );
    return result.map(row => ({
      ...row,
      is_bonus_exercise: Boolean(row.is_bonus_exercise),
    }));
  }

  async deleteTPathExercise(exerciseId: string): Promise<void> {
    const db = this.getDB();
    await db.runAsync('DELETE FROM t_path_exercises WHERE id = ?', [
      exerciseId,
    ]);
  }

  async updateTPathProgress(progress: TPathProgress): Promise<void> {
    const db = this.getDB();
    await db.runAsync(
      `INSERT OR REPLACE INTO t_path_progress 
       (id, user_id, t_path_id, completed_at, last_accessed_at, total_workouts_completed, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        progress.id,
        progress.user_id,
        progress.t_path_id,
        progress.completed_at,
        progress.last_accessed_at,
        progress.total_workouts_completed,
        progress.created_at,
        progress.updated_at,
      ]
    );
  }

  async getTPathProgress(
    userId: string,
    tPathId: string
  ): Promise<TPathProgress | null> {
    const db = this.getDB();
    const result = await db.getFirstAsync<any>(
      'SELECT * FROM t_path_progress WHERE user_id = ? AND t_path_id = ?',
      [userId, tPathId]
    );
    return result || null;
  }

  async getAllTPathProgress(userId: string): Promise<TPathProgress[]> {
    const db = this.getDB();
    const result = await db.getAllAsync<any>(
      'SELECT * FROM t_path_progress WHERE user_id = ? ORDER BY last_accessed_at DESC',
      [userId]
    );
    return result;
  }

  async addGym(gym: Gym): Promise<void> {
    const db = this.getDB();
    await db.runAsync(
      `INSERT OR REPLACE INTO gyms 
       (id, user_id, name, description, equipment, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        gym.id,
        gym.user_id,
        gym.name,
        gym.description,
        JSON.stringify(gym.equipment),
        gym.is_active ? 1 : 0,
        gym.created_at,
        gym.updated_at,
      ]
    );
  }

  async getGym(gymId: string): Promise<Gym | null> {
    const db = this.getDB();
    const result = await db.getFirstAsync<any>(
      'SELECT * FROM gyms WHERE id = ?',
      [gymId]
    );
    if (!result) {
      return null;
    }
    return {
      ...result,
      equipment: JSON.parse(result.equipment),
      is_active: Boolean(result.is_active),
    };
  }

  async getGyms(userId: string): Promise<Gym[]> {
    const db = this.getDB();
    const result = await db.getAllAsync<any>(
      'SELECT * FROM gyms WHERE user_id = ? ORDER BY is_active DESC, name ASC',
      [userId]
    );
    return result.map(row => ({
      ...row,
      equipment: JSON.parse(row.equipment),
      is_active: Boolean(row.is_active),
    }));
  }

  async getActiveGym(userId: string): Promise<Gym | null> {
    const db = this.getDB();
    const result = await db.getFirstAsync<any>(
      'SELECT * FROM gyms WHERE user_id = ? AND is_active = 1 LIMIT 1',
      [userId]
    );
    if (!result) {
      return null;
    }
    return {
      ...result,
      equipment: JSON.parse(result.equipment),
      is_active: Boolean(result.is_active),
    };
  }

  async updateGym(gymId: string, updates: Partial<Gym>): Promise<void> {
    const db = this.getDB();
    const now = new Date().toISOString();

    const fields: string[] = [];
    const values: any[] = [];

    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
    }
    if (updates.description !== undefined) {
      fields.push('description = ?');
      values.push(updates.description);
    }
    if (updates.equipment !== undefined) {
      fields.push('equipment = ?');
      values.push(JSON.stringify(updates.equipment));
    }
    if (updates.is_active !== undefined) {
      fields.push('is_active = ?');
      values.push(updates.is_active ? 1 : 0);
    }

    fields.push('updated_at = ?');
    values.push(now);
    values.push(gymId);

    if (fields.length > 1) {
      await db.runAsync(
        `UPDATE gyms SET ${fields.join(', ')} WHERE id = ?`,
        values
      );
    }
  }

  async setActiveGym(userId: string, gymId: string): Promise<void> {
    const db = this.getDB();
    await db.runAsync('UPDATE gyms SET is_active = 0 WHERE user_id = ?', [
      userId,
    ]);
    await db.runAsync('UPDATE gyms SET is_active = 1 WHERE id = ?', [gymId]);
  }

  async deleteGym(gymId: string): Promise<void> {
    const db = this.getDB();
    await db.runAsync('DELETE FROM gyms WHERE id = ?', [gymId]);
  }

  // Cleanup incomplete workout sessions older than specified hours
  async cleanupIncompleteSessions(olderThanHours: number = 24): Promise<number> {
    const db = this.getDB();
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - olderThanHours);

    console.log(`[Database] Cleaning up incomplete sessions older than ${olderThanHours} hours (${cutoffDate.toISOString()})`);

    // Get incomplete sessions to clean up
    const incompleteSessions = await db.getAllAsync<{ id: string }>(
      'SELECT id FROM workout_sessions WHERE completed_at IS NULL AND created_at < ?',
      [cutoffDate.toISOString()]
    );

    if (incompleteSessions.length > 0) {
      const sessionIds = incompleteSessions.map(s => s.id);
      console.log(`[Database] Found ${incompleteSessions.length} incomplete sessions to clean up:`, sessionIds);

      // Remove associated set logs first
      await db.runAsync(
        `DELETE FROM set_logs WHERE session_id IN (${sessionIds.map(() => '?').join(',')})`,
        sessionIds
      );

      // Remove the sessions
      await db.runAsync(
        `DELETE FROM workout_sessions WHERE id IN (${sessionIds.map(() => '?').join(',')})`,
        sessionIds
      );

      console.log(`[Database] Cleaned up ${incompleteSessions.length} incomplete sessions and their associated data`);
      return incompleteSessions.length;
    } else {
      console.log('[Database] No incomplete sessions to clean up');
      return 0;
    }
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
        [
          item.operation,
          item.table,
          JSON.stringify(item.payload),
          item.timestamp,
          item.attempts,
          item.error || null,
        ]
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
  // For workout sessions, only queue if completed (has completed_at)
  if (table === 'workout_sessions' && operation !== 'delete') {
    if (!payload.completed_at) {
      console.log(`[addToSyncQueue] Skipping incomplete workout session: ${payload.id}`);
      return;
    }
  }

  // For set logs, allow all for now - cleanup will handle orphaned records
  // Complex session checking removed to avoid database conflicts

  await database.syncQueue.add({
    operation,
    table,
    payload,
    timestamp: Date.now(),
    attempts: 0,
  });
};

export default Database;
