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

// Conditional debug logging - only logs in development
const debugLog = (...args: any[]) => {
  if (__DEV__) {
    console.log('[Database]', ...args);
  }
};

class Database {
  private db: SQLite.SQLiteDatabase | null = null;
  private initPromise: Promise<void> | null = null;
  private migrationComplete: boolean = false;
  private migrationPromise: Promise<void> | null = null;

  async init(): Promise<void> {
    if (this.db) {
      return;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = (async () => {
      console.log('[Database] Starting database initialization with MIGRATION BLOCKING');

      try {
        this.db = await SQLite.openDatabaseAsync(DB_NAME);
        console.log('[Database] Database connection opened');
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

      // CRITICAL: Run migration BEFORE creating any other tables
      console.log('[Database] Starting MIGRATION BLOCKING SYSTEM...');
      await this.runMigrations();
      this.migrationComplete = true;
      console.log('[Database] MIGRATION COMPLETE - Creating standard tables...');

      // Only create standard tables AFTER migration is complete
      await this.db!.execAsync(`
      PRAGMA journal_mode = WAL;

      CREATE TABLE IF NOT EXISTS workout_sessions (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT,
        template_name TEXT,
        duration_string TEXT,
        session_date TEXT NOT NULL,
        created_at TEXT NOT NULL,
        rating INTEGER,
        completed_at TEXT,
        t_path_id TEXT,
        sync_status TEXT DEFAULT 'local_only'
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
        right_thigh_cm REAL,
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
        user_id TEXT,
        template_name TEXT NOT NULL,
        is_bonus INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        version INTEGER DEFAULT 1,
        settings TEXT,
        progression_settings TEXT,
        parent_t_path_id TEXT,
        gym_id TEXT,
        is_main_program INTEGER DEFAULT 0,
        is_ai_generated INTEGER DEFAULT 0,
        description TEXT,
        order_index INTEGER
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
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS gym_exercises (
        gym_id TEXT NOT NULL,
        exercise_id TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS profiles (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT NOT NULL,
        full_name TEXT,
        height_cm INTEGER,
        weight_kg REAL,
        body_fat_pct INTEGER,
        primary_goal TEXT,
        target_date DATE,
        health_notes TEXT,
        preferred_muscles TEXT,
        created_at TEXT NOT NULL,
        first_name TEXT,
        last_name TEXT,
        preferred_weight_unit TEXT DEFAULT 'kg',
        preferred_distance_unit TEXT DEFAULT 'km',
        default_rest_time_seconds INTEGER DEFAULT 60,
        last_ai_coach_use_at TEXT,
        preferred_session_length TEXT,
        active_t_path_id TEXT,
        updated_at TEXT NOT NULL,
        total_points INTEGER DEFAULT 0,
        current_streak INTEGER DEFAULT 0,
        longest_streak INTEGER DEFAULT 0,
        last_workout_date DATE,
        rolling_workout_status TEXT DEFAULT 'Ready to Start',
        active_location_tag TEXT,
        active_gym_id TEXT,
        t_path_generation_status TEXT DEFAULT 'not_started',
        t_path_generation_error TEXT,
        programme_type TEXT,
        onboarding_completed INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS exercise_definitions (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT,
        name TEXT NOT NULL,
        main_muscle TEXT NOT NULL,
        description TEXT,
        pro_tip TEXT,
        video_url TEXT,
        type TEXT NOT NULL DEFAULT 'weight',
        category TEXT,
        created_at TEXT NOT NULL,
        library_id TEXT,
        is_favorite INTEGER DEFAULT 0,
        icon_url TEXT,
        location_tags TEXT,
        movement_type TEXT,
        movement_pattern TEXT
      );

      -- Performance indexes matching Supabase schema
      CREATE INDEX IF NOT EXISTS idx_set_logs_session_exercise ON set_logs(session_id, exercise_id);
      CREATE INDEX IF NOT EXISTS idx_exercise_definitions_main_muscle ON exercise_definitions(main_muscle);
      CREATE INDEX IF NOT EXISTS idx_exercise_definitions_type ON exercise_definitions(type);
      CREATE INDEX IF NOT EXISTS idx_exercise_definitions_user_id ON exercise_definitions(user_id);
      CREATE INDEX IF NOT EXISTS idx_t_path_exercises_template_id ON t_path_exercises(template_id);
      CREATE INDEX IF NOT EXISTS idx_t_path_exercises_exercise_id ON t_path_exercises(exercise_id);
      CREATE INDEX IF NOT EXISTS idx_workout_sessions_user_completed ON workout_sessions(user_id, completed_at DESC);
      CREATE INDEX IF NOT EXISTS idx_gym_exercises ON gym_exercises(gym_id, exercise_id);
      CREATE INDEX IF NOT EXISTS idx_t_paths_user_id ON t_paths(user_id);
      CREATE INDEX IF NOT EXISTS idx_t_path_progress_user ON t_path_progress(user_id);
      CREATE INDEX IF NOT EXISTS idx_t_path_progress_tpath ON t_path_progress(t_path_id);
      CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(id);
      CREATE INDEX IF NOT EXISTS idx_body_measurements_user ON body_measurements(user_id);
      CREATE INDEX IF NOT EXISTS idx_body_measurements_date ON body_measurements(measurement_date);
      CREATE INDEX IF NOT EXISTS idx_user_goals_user ON user_goals(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements(user_id);
      CREATE INDEX IF NOT EXISTS idx_gyms_user ON gyms(user_id);
    `);

      console.log('[Database] ✓ All tables created successfully');
      console.log('[Database] ✓ DATABASE INITIALIZATION COMPLETED');
    })();

    await this.initPromise;
  }

  private async runMigrations(): Promise<void> {
    if (this.migrationPromise) {
      return this.migrationPromise;
    }

    this.migrationPromise = (async () => {
      const db = this.getDB();
      
      if (__DEV__) {
        console.log(`[DEBUG] 🔄 MIGRATION BLOCKING: Starting comprehensive migrations`);
        console.log(`[DEBUG] 📅 Migration start time: ${new Date().toISOString()}`);
      }
      
      // CRITICAL: This migration must block ALL other database operations
      let migrationSuccessful = false;
      let retryCount = 0;
      const maxRetries = 5; // Increased retries for critical fix
      
      while (!migrationSuccessful && retryCount < maxRetries) {
        try {
          debugLog(`📋 MIGRATION ATTEMPT ${retryCount + 1}/${maxRetries}`);
          
          // PHASE 1: Check ALL existing table schemas BEFORE migration
          debugLog(`🔍 PHASE 1: Analyzing existing database structure...`);
          const allTables = await db.getAllAsync<any>("SELECT name FROM sqlite_master WHERE type='table'");
          debugLog(`📊 Found ${allTables.length} tables:`, allTables.map(t => t.name));
          
          // Check t_path_exercises table
          try {
            const tPathExercisesTableInfo = await db.getAllAsync<any>("PRAGMA table_info(t_path_exercises);");
            const tPathExercisesColumns = tPathExercisesTableInfo.map((col: any) => col.name);
            debugLog(`📋 Current t_path_exercises columns:`, tPathExercisesColumns);
          } catch (tableError: any) {
            debugLog(`⚠️  t_path_exercises table doesn't exist or error:`, tableError.message);
          }
          
          // Check profiles table
          try {
            const profilesTableInfo = await db.getAllAsync<any>("PRAGMA table_info(profiles);");
            const profileColumns = profilesTableInfo.map((col: any) => col.name);
            debugLog(`📋 Current profiles columns:`, profileColumns);
            
            // Log existing profile records count
            const profileRecordCount = await db.getFirstAsync<any>('SELECT COUNT(*) as count FROM profiles');
            debugLog(`📊 Existing profile records:`, profileRecordCount?.count || 0);
            
          } catch (profilesError: any) {
            debugLog(`⚠️  Profiles table doesn't exist or error:`, profilesError.message);
          }
          
          // PHASE 2: Migration t_path_exercises table
          console.log(`[DEBUG] 🔧 PHASE 2: Migrating t_path_exercises table...`);
          
          // Check if table needs migration first (safer approach)
          const tPathExercisesTableInfo = await db.getAllAsync<any>("PRAGMA table_info(t_path_exercises);");
          const tPathExercisesColumns = tPathExercisesTableInfo.map((col: any) => col.name);
          
          // Only drop and recreate if template_id column is missing
          if (!tPathExercisesColumns.includes('template_id')) {
            console.log(`[DEBUG] 🔄 template_id column missing, performing table migration...`);
            
            // Backup existing data if any (before dropping)
            const existingData = await db.getAllAsync<any>('SELECT * FROM t_path_exercises');
            console.log(`[DEBUG] 💾 Backing up ${existingData.length} existing t_path_exercises records`);
            
            // Drop and recreate with proper schema
            await db.execAsync('DROP TABLE IF EXISTS t_path_exercises');
            console.log(`[DEBUG] ✅ Dropped existing t_path_exercises table`);
            
            await db.execAsync(`CREATE TABLE t_path_exercises (
              id TEXT PRIMARY KEY NOT NULL,
              template_id TEXT NOT NULL,
              exercise_id TEXT NOT NULL,
              order_index INTEGER NOT NULL DEFAULT 0,
              created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
              is_bonus_exercise INTEGER DEFAULT 0
            )`);
            console.log(`[DEBUG] ✅ Created fresh t_path_exercises table with template_id`);
            
            // Restore data if any existed (using t_path_id -> template_id mapping)
            if (existingData.length > 0) {
              console.log(`[DEBUG] 🔄 Restoring ${existingData.length} t_path_exercises records...`);
              
              for (const record of existingData) {
                try {
                  // Map old t_path_id to template_id
                  const templateId = record.t_path_id || record.template_id;
                  await db.runAsync(
                    `INSERT OR REPLACE INTO t_path_exercises
                     (id, template_id, exercise_id, order_index, created_at, is_bonus_exercise)
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    [
                      record.id,
                      templateId,
                      record.exercise_id,
                      record.order_index || 0,
                      record.created_at || new Date().toISOString(),
                      record.is_bonus_exercise ? 1 : 0
                    ]
                  );
                } catch (restoreError: any) {
                  console.warn(`[DEBUG] ⚠️  Failed to restore t_path_exercises record:`, restoreError.message);
                }
              }
              
              console.log(`[DEBUG] ✅ Completed t_path_exercises data restoration`);
            }
          } else {
            console.log(`[DEBUG] ✅ t_path_exercises table already has template_id column - no migration needed`);
          }
          
          // Verify t_path_exercises table structure
          const tPathExercisesFinalCheck = await db.getAllAsync<any>("PRAGMA table_info(t_path_exercises);");
          const tPathExercisesFinalColumns = tPathExercisesFinalCheck.map((col: any) => col.name);
          console.log(`[DEBUG] ✅ t_path_exercises final columns:`, tPathExercisesFinalColumns);
          
          if (!tPathExercisesFinalColumns.includes('template_id')) {
            throw new Error('CRITICAL: template_id column missing after t_path_exercises table creation');
          }

          // PHASE 2.5: Migration t_paths table (add missing columns)
          console.log(`[DEBUG] 🔧 PHASE 2.5: Migrating t_paths table...`);
          try {
            // Check current t_paths table structure
            const tPathsTableInfo = await db.getAllAsync<any>("PRAGMA table_info(t_paths);");
            const tPathsColumns = tPathsTableInfo.map((col: any) => col.name);
            console.log(`[DEBUG] 📋 Current t_paths columns:`, tPathsColumns);
            
            // Add missing columns to t_paths table
            const tPathsMissingColumns = ['is_main_program', 'is_ai_generated', 'description', 'order_index'].filter(col => !tPathsColumns.includes(col));
            
            if (tPathsMissingColumns.length > 0) {
              console.log(`[DEBUG] ➕ Adding missing t_paths columns via ALTER TABLE:`, tPathsMissingColumns);
              
              for (const column of tPathsMissingColumns) {
                try {
                  console.log(`[DEBUG] 🔧 Adding t_paths column: ${column}`);
                  
                  if (column === 'is_main_program') {
                    await db.execAsync('ALTER TABLE t_paths ADD COLUMN is_main_program INTEGER DEFAULT 0');
                    console.log(`[DEBUG] ✅ Successfully added is_main_program column`);
                  } else if (column === 'is_ai_generated') {
                    await db.execAsync('ALTER TABLE t_paths ADD COLUMN is_ai_generated INTEGER DEFAULT 0');
                    console.log(`[DEBUG] ✅ Successfully added is_ai_generated column`);
                  } else if (column === 'description') {
                    await db.execAsync('ALTER TABLE t_paths ADD COLUMN description TEXT');
                    console.log(`[DEBUG] ✅ Successfully added description column`);
                  } else if (column === 'order_index') {
                    await db.execAsync('ALTER TABLE t_paths ADD COLUMN order_index INTEGER');
                    console.log(`[DEBUG] ✅ Successfully added order_index column`);
                  }
                } catch (alterError: any) {
                  console.error(`[DEBUG] ❌ Failed to add ${column} column:`, alterError.message);
                  // Continue with other columns
                }
              }
            } else {
              console.log(`[DEBUG] ✅ No missing t_paths columns - table already complete`);
            }
            
            // Verify t_paths table after migration
            const afterTPathsMigrationInfo = await db.getAllAsync<any>("PRAGMA table_info(t_paths);");
            const afterTPathsColumns = afterTPathsMigrationInfo.map((col: any) => col.name);
            console.log(`[DEBUG] ✅ Final t_paths columns:`, afterTPathsColumns);
            
          } catch (tPathsError: any) {
            console.error(`[DEBUG] ❌ t_paths table migration failed:`, tPathsError.message);
            // Continue without failing - t_paths errors are less critical
          }
          
          // PHASE 2.6: Migration workout_sessions table - add sync_status column
          console.log(`[DEBUG] 🔧 PHASE 2.6: Migrating workout_sessions table...`);
          try {
            // Check current workout_sessions table structure
            const workoutSessionsTableInfo = await db.getAllAsync<any>("PRAGMA table_info(workout_sessions);");
            const workoutSessionsColumns = workoutSessionsTableInfo.map((col: any) => col.name);
            console.log(`[DEBUG] 📋 Current workout_sessions columns:`, workoutSessionsColumns);

            // Add sync_status column if missing
            if (!workoutSessionsColumns.includes('sync_status')) {
              console.log(`[DEBUG] ➕ Adding sync_status column to workout_sessions table`);
              await db.execAsync('ALTER TABLE workout_sessions ADD COLUMN sync_status TEXT DEFAULT "local_only"');
              console.log(`[DEBUG] ✅ Successfully added sync_status column to workout_sessions`);
            } else {
              console.log(`[DEBUG] ✅ sync_status column already exists in workout_sessions table`);
            }

            // Verify workout_sessions table after migration
            const afterWorkoutSessionsMigrationInfo = await db.getAllAsync<any>("PRAGMA table_info(workout_sessions);");
            const afterWorkoutSessionsColumns = afterWorkoutSessionsMigrationInfo.map((col: any) => col.name);
            console.log(`[DEBUG] ✅ Final workout_sessions columns:`, afterWorkoutSessionsColumns);

          } catch (workoutSessionsError: any) {
            console.error(`[DEBUG] ❌ workout_sessions table migration failed:`, workoutSessionsError.message);
            // Continue without failing - workout_sessions errors are less critical
          }

          // PHASE 3: Migration profiles table - add missing columns
          console.log(`[DEBUG] 🔧 PHASE 3: Migrating profiles table...`);
          try {
            // First, try ALTER TABLE approach
            console.log(`[DEBUG] 🔄 Attempting ALTER TABLE approach for profiles...`);
            
            const profilesTableInfo = await db.getAllAsync<any>("PRAGMA table_info(profiles);");
            const profileColumns = profilesTableInfo.map((col: any) => col.name);
            console.log(`[DEBUG] 📋 Profiles columns before ALTER:`, profileColumns);
            
            // Add missing columns to profiles table - include ALL expected columns
            const allExpectedColumns = [
              'user_id', 'target_date', 'preferred_weight_unit', 'preferred_distance_unit',
              'last_ai_coach_use_at', 'total_points', 'current_streak', 'longest_streak',
              'last_workout_date', 'rolling_workout_status', 'active_location_tag'
            ];
            
            const missingColumns = allExpectedColumns.filter(col => !profileColumns.includes(col));
            
            if (missingColumns.length > 0) {
              console.log(`[DEBUG] ➕ Adding ALL missing columns via ALTER TABLE:`, missingColumns);
              
              for (const column of missingColumns) {
                try {
                  console.log(`[DEBUG] 🔧 Adding column: ${column}`);
                  
                  if (column === 'user_id') {
                    await db.execAsync('ALTER TABLE profiles ADD COLUMN user_id TEXT');
                    console.log(`[DEBUG] ✅ Successfully added user_id column`);
                  } else if (column === 'target_date') {
                    await db.execAsync('ALTER TABLE profiles ADD COLUMN target_date DATE');
                    console.log(`[DEBUG] ✅ Successfully added target_date column`);
                  } else if (column === 'preferred_weight_unit') {
                    await db.execAsync('ALTER TABLE profiles ADD COLUMN preferred_weight_unit TEXT DEFAULT "kg"');
                    console.log(`[DEBUG] ✅ Successfully added preferred_weight_unit column`);
                  } else if (column === 'preferred_distance_unit') {
                    await db.execAsync('ALTER TABLE profiles ADD COLUMN preferred_distance_unit TEXT DEFAULT "km"');
                    console.log(`[DEBUG] ✅ Successfully added preferred_distance_unit column`);
                  } else if (column === 'last_ai_coach_use_at') {
                    await db.execAsync('ALTER TABLE profiles ADD COLUMN last_ai_coach_use_at TEXT');
                    console.log(`[DEBUG] ✅ Successfully added last_ai_coach_use_at column`);
                  } else if (column === 'total_points') {
                    await db.execAsync('ALTER TABLE profiles ADD COLUMN total_points INTEGER DEFAULT 0');
                    console.log(`[DEBUG] ✅ Successfully added total_points column`);
                  } else if (column === 'current_streak') {
                    await db.execAsync('ALTER TABLE profiles ADD COLUMN current_streak INTEGER DEFAULT 0');
                    console.log(`[DEBUG] ✅ Successfully added current_streak column`);
                  } else if (column === 'longest_streak') {
                    await db.execAsync('ALTER TABLE profiles ADD COLUMN longest_streak INTEGER DEFAULT 0');
                    console.log(`[DEBUG] ✅ Successfully added longest_streak column`);
                  } else if (column === 'last_workout_date') {
                    await db.execAsync('ALTER TABLE profiles ADD COLUMN last_workout_date DATE');
                    console.log(`[DEBUG] ✅ Successfully added last_workout_date column`);
                  } else if (column === 'rolling_workout_status') {
                    await db.execAsync('ALTER TABLE profiles ADD COLUMN rolling_workout_status TEXT DEFAULT "Ready to Start"');
                    console.log(`[DEBUG] ✅ Successfully added rolling_workout_status column`);
                  } else if (column === 'active_location_tag') {
                    await db.execAsync('ALTER TABLE profiles ADD COLUMN active_location_tag TEXT');
                    console.log(`[DEBUG] ✅ Successfully added active_location_tag column`);
                  }
                } catch (alterError: any) {
                  console.error(`[DEBUG] ❌ Failed to add ${column} column:`, alterError.message);
                  // Continue with other columns
                }
              }
            } else {
              console.log(`[DEBUG] ✅ No missing columns - profiles table already complete`);
            }
            
            // Verification: Check columns again after ALTER TABLE migration
            const afterAlterMigrationInfo = await db.getAllAsync<any>("PRAGMA table_info(profiles);");
            const afterAlterColumns = afterAlterMigrationInfo.map((col: any) => col.name);
            console.log(`[DEBUG] 📋 Profiles columns after ALTER:`, afterAlterColumns);
            
            // If still missing critical columns, recreate the table
            const criticalMissing = ['user_id', 'target_date'].filter(col => !afterAlterColumns.includes(col));
            if (criticalMissing.length > 0) {
              console.log(`[DEBUG] ⚠️  CRITICAL: Still missing columns after ALTER TABLE:`, criticalMissing);
              console.log(`[DEBUG] 🔄 Falling back to table recreation method...`);
              
              await this.recreateProfilesTable(db);
            } else {
              console.log(`[DEBUG] ✅ ALTER TABLE migration successful - all critical columns present`);
            }
            
          } catch (profilesError: any) {
            console.error(`[DEBUG] ❌ Profiles ALTER TABLE migration failed:`, profilesError.message);
            console.log(`[DEBUG] 🔄 Falling back to table recreation method...`);
            
            await this.recreateProfilesTable(db);
          }
          
          // PHASE 4: Final verification and testing
          console.log(`[DEBUG] 🔍 PHASE 4: Final migration verification...`);
          
          // Verify t_path_exercises table
          const finalTPathExercisesCheck = await db.getAllAsync<any>("PRAGMA table_info(t_path_exercises);");
          const finalTPathExercisesColumns = finalTPathExercisesCheck.map((col: any) => col.name);
          console.log(`[DEBUG] ✅ Final t_path_exercises columns:`, finalTPathExercisesColumns);
          
          if (!finalTPathExercisesColumns.includes('template_id')) {
            throw new Error('CRITICAL: template_id column missing after final verification');
          }
          
          // Test basic operations
          const tPathExercisesTest = await db.getAllAsync<any>('SELECT COUNT(*) as count FROM t_path_exercises');
          console.log(`[DEBUG] ✅ t_path_exercises table operational (${tPathExercisesTest[0]?.count || 0} records)`);
          
          // Verify profiles table with comprehensive test
          try {
            const profilesTest = await db.getAllAsync<any>('SELECT COUNT(*) as count FROM profiles');
            console.log(`[DEBUG] ✅ Profiles table operational (${profilesTest[0]?.count || 0} records)`);
            
            // Test the specific columns that were causing issues
            const columnTest = await db.getFirstAsync<any>("SELECT user_id, target_date FROM profiles LIMIT 1");
            console.log(`[DEBUG] ✅ Column test result:`, columnTest);
            
          } catch (profilesTestError: any) {
            console.error(`[DEBUG] ❌ Profiles table test failed:`, profilesTestError.message);
          }
          
          console.log(`[DEBUG] 🎉 MIGRATION SUCCESS: All migrations completed successfully`);
          migrationSuccessful = true;
          
        } catch (error: any) {
          retryCount++;
          console.error(`[DEBUG] ❌ MIGRATION ATTEMPT ${retryCount} FAILED:`, error.message);
          console.error(`[DEBUG] 📊 Error stack:`, error.stack);
          
          if (retryCount >= maxRetries) {
            console.error(`[DEBUG] 🚨 CRITICAL: ALL MIGRATION ATTEMPTS FAILED`);
            throw new Error(`MIGRATION BLOCKING failed after ${maxRetries} attempts: ${error.message}`);
          }
          
          // Longer wait before retry for critical operations
          console.log(`[DEBUG] ⏳ Waiting 500ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      console.log(`[DEBUG] 🏁 MIGRATION BLOCKING COMPLETED - All database schema mismatches resolved`);
      console.log(`[DEBUG] 📅 Migration completion time: ${new Date().toISOString()}`);
    })();

    return this.migrationPromise;
  }
  
  private async recreateProfilesTable(db: any): Promise<void> {
    console.log(`[DEBUG] 🔄 Recreating profiles table with full schema...`);
    
    // Backup existing data if any
    let existingData: any[] = [];
    try {
      existingData = await db.getAllAsync('SELECT * FROM profiles');
      console.log(`[DEBUG] 💾 Backing up ${existingData.length} existing profile records`);
      
      // Log sample of existing data structure
      if (existingData.length > 0) {
        console.log(`[DEBUG] 📋 Sample existing record keys:`, Object.keys(existingData[0]));
      }
    } catch (backupError: any) {
      console.warn(`[DEBUG] ⚠️  Failed to backup existing data:`, backupError.message);
    }
    
    // Drop and recreate table
    await db.execAsync('DROP TABLE profiles');
    console.log(`[DEBUG] 🗑️  Dropped old profiles table`);
    
    await db.execAsync(`
      CREATE TABLE profiles (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT NOT NULL,
        full_name TEXT,
        height_cm INTEGER,
        weight_kg REAL,
        body_fat_pct INTEGER,
        primary_goal TEXT,
        target_date DATE,
        health_notes TEXT,
        preferred_muscles TEXT,
        created_at TEXT NOT NULL,
        first_name TEXT,
        last_name TEXT,
        preferred_weight_unit TEXT DEFAULT 'kg',
        preferred_distance_unit TEXT DEFAULT 'km',
        default_rest_time_seconds INTEGER DEFAULT 60,
        last_ai_coach_use_at TEXT,
        preferred_session_length TEXT,
        active_t_path_id TEXT,
        updated_at TEXT NOT NULL,
        total_points INTEGER DEFAULT 0,
        current_streak INTEGER DEFAULT 0,
        longest_streak INTEGER DEFAULT 0,
        last_workout_date DATE,
        rolling_workout_status TEXT DEFAULT 'Ready to Start',
        active_location_tag TEXT,
        active_gym_id TEXT,
        t_path_generation_status TEXT DEFAULT 'not_started',
        t_path_generation_error TEXT,
        programme_type TEXT,
        onboarding_completed INTEGER DEFAULT 0
      )
    `);
    console.log(`[DEBUG] ✅ Created new profiles table with full schema`);
    
    // Restore data if any existed
    if (existingData.length > 0) {
      console.log(`[DEBUG] 🔄 Restoring ${existingData.length} profile records...`);
      
      for (let i = 0; i < existingData.length; i++) {
        const profile = existingData[i];
        try {
          await db.runAsync(
            `INSERT OR REPLACE INTO profiles
             (id, user_id, full_name, height_cm, weight_kg, body_fat_pct, primary_goal, target_date, health_notes, preferred_muscles, created_at, first_name, last_name, preferred_weight_unit, preferred_distance_unit, default_rest_time_seconds, last_ai_coach_use_at, preferred_session_length, active_t_path_id, updated_at, total_points, current_streak, longest_streak, last_workout_date, rolling_workout_status, active_location_tag, active_gym_id, t_path_generation_status, t_path_generation_error, programme_type, onboarding_completed)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              profile.id,
              profile.user_id || profile.id,
              profile.full_name || null,
              profile.height_cm || null,
              profile.weight_kg || null,
              profile.body_fat_pct || null,
              profile.primary_goal || null,
              profile.target_date || null,
              profile.health_notes || null,
              profile.preferred_muscles || null,
              profile.created_at || new Date().toISOString(),
              profile.first_name || null,
              profile.last_name || null,
              profile.preferred_weight_unit || 'kg',
              profile.preferred_distance_unit || 'km',
              profile.default_rest_time_seconds || 60,
              profile.last_ai_coach_use_at || null,
              profile.preferred_session_length || null,
              profile.active_t_path_id || null,
              profile.updated_at || new Date().toISOString(),
              profile.total_points || 0,
              profile.current_streak || 0,
              profile.longest_streak || 0,
              profile.last_workout_date || null,
              profile.rolling_workout_status || 'Ready to Start',
              profile.active_location_tag || null,
              profile.active_gym_id || null,
              profile.t_path_generation_status || 'not_started',
              profile.t_path_generation_error || null,
              profile.programme_type || null,
              profile.onboarding_completed ? 1 : 0
            ]
          );
          
          if ((i + 1) % 10 === 0) {
            console.log(`[DEBUG] 🔄 Restored ${i + 1}/${existingData.length} records...`);
          }
          
        } catch (restoreError: any) {
          console.error(`[DEBUG] ❌ Failed to restore record ${i + 1}:`, restoreError.message);
          console.error(`[DEBUG] 📋 Failed record data:`, profile);
        }
      }
      
      console.log(`[DEBUG] ✅ Successfully restored ${existingData.length} profile records`);
    } else {
      console.log(`[DEBUG] ℹ️  No existing data to restore`);
    }
    
    // Final verification
    const restoredCount = await db.getFirstAsync('SELECT COUNT(*) as count FROM profiles');
    console.log(`[DEBUG] ✅ Final profile count: ${restoredCount?.count || 0}`);
    
    // Verify critical columns exist
    const finalProfilesTableInfo = await db.getAllAsync("PRAGMA table_info(profiles);");
    const finalProfileColumns = finalProfilesTableInfo.map((col: any) => col.name);
    console.log(`[DEBUG] ✅ Final profiles columns:`, finalProfileColumns);
    
    const criticalColumns = ['user_id', 'target_date'];
    const missingCritical = criticalColumns.filter(col => !finalProfileColumns.includes(col));
    if (missingCritical.length > 0) {
      console.error(`[DEBUG] 🚨 CRITICAL: Still missing columns after recreation:`, missingCritical);
    } else {
      console.log(`[DEBUG] ✅ All critical columns present after recreation`);
    }
  }

  private async waitForMigration(): Promise<void> {
    if (this.migrationComplete) return;
    if (this.migrationPromise) {
      await this.migrationPromise;
    }
  }

  getDB(): SQLite.SQLiteDatabase {
    if (!this.db) {
      throw new Error('Database not initialized. Call init() first.');
    }
    return this.db;
  }

  async addWorkoutSession(session: WorkoutSession): Promise<void> {
    const db = this.getDB();
    console.log('[Database] addWorkoutSession called with rating:', session.rating);
    await db.runAsync(
      `INSERT OR REPLACE INTO workout_sessions
       (id, user_id, session_date, template_name, completed_at, rating, duration_string, t_path_id, created_at, sync_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        (session as any).sync_status || 'local_only',
      ]
    );
    console.log('[Database] addWorkoutSession completed');
    
    // Clear session cache to ensure fresh data is loaded
    this.clearSessionCache(session.user_id);
    
    // Clear weekly volume cache since new workout affects volume calculations
    this.clearWeeklyVolumeCache(session.user_id);
    
    // Clear all caches for the user to ensure immediate updates
    this.clearAllCachesForUser(session.user_id);
  }

  async updateWorkoutSession(sessionId: string, updates: Partial<WorkoutSession>): Promise<void> {
    const db = this.getDB();
    console.log('[Database] updateWorkoutSession called for session:', sessionId, 'updates:', updates);
    
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.rating !== undefined) {
      fields.push('rating = ?');
      values.push(updates.rating);
    }
    if (updates.completed_at !== undefined) {
      fields.push('completed_at = ?');
      values.push(updates.completed_at);
    }
    if (updates.duration_string !== undefined) {
      fields.push('duration_string = ?');
      values.push(updates.duration_string);
    }
    if ((updates as any).sync_status !== undefined) {
      fields.push('sync_status = ?');
      values.push((updates as any).sync_status);
    }

    if (fields.length > 0) {
      values.push(sessionId);
      await db.runAsync(
        `UPDATE workout_sessions SET ${fields.join(', ')} WHERE id = ?`,
        values
      );
      console.log('[Database] updateWorkoutSession completed');
      
      // Clear session cache to ensure fresh data is loaded
      this.clearSessionCache();
      
      // Clear weekly volume cache since updated workout may affect volume calculations
      this.clearWeeklyVolumeCache();
      
      // Clear all caches for the user to ensure immediate updates
      if (updates.user_id) {
        this.clearAllCachesForUser(updates.user_id);
      }
    }
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
    
    // Clear weekly volume cache since new set log affects volume calculations
    this.clearWeeklyVolumeCache();
    
    // Clear all caches for the user to ensure immediate updates
    // Note: SetLog doesn't have user_id directly, but we can get it from the session
    const session = await this.getWorkoutSessionById(setLog.session_id);
    if (session?.user_id) {
      this.clearAllCachesForUser(session.user_id);
    }
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
    
    // Clear weekly volume cache since set logs replacement affects volume calculations
    this.clearWeeklyVolumeCache();
    
    // Clear all caches for the user to ensure immediate updates
    this.clearAllCachesForUser(sessionId);
  }

  // Session caching with TTL
  private sessionCache: {[userId: string]: { data: WorkoutSession[]; timestamp: number }} = {};
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  
  async getWorkoutSessions(userId: string): Promise<WorkoutSession[]> {
    // Check cache first
    const cached = this.sessionCache[userId];
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_TTL) {
      console.log('[Database] Using cached workout sessions for user:', userId);
      return cached.data;
    }
    
    const db = this.getDB();
    console.log('[Database] getWorkoutSessions called for user:', userId);
    const result = await db.getAllAsync<WorkoutSession>(
      'SELECT * FROM workout_sessions WHERE user_id = ? ORDER BY session_date DESC',
      [userId]
    );
    console.log('[Database] getWorkoutSessions returned', result.length, 'sessions');
    if (result.length > 0) {
      console.log('[Database] Sample session rating:', result[0].rating);
    }
    
    // Cache the result with timestamp
    this.sessionCache[userId] = {
      data: result,
      timestamp: Date.now()
    };
    console.log('[Database] Cached workout sessions for user:', userId, 'count:', result.length);
    
    return result;
  }
  
  async getWorkoutSessionById(sessionId: string): Promise<WorkoutSession | null> {
    const db = this.getDB();
    console.log('[Database] getWorkoutSessionById called for session:', sessionId);
    const result = await db.getFirstAsync<WorkoutSession>(
      'SELECT * FROM workout_sessions WHERE id = ?',
      [sessionId]
    );
    console.log('[Database] getWorkoutSessionById returned:', !!result);
    if (result) {
      console.log('[Database] Session rating:', result.rating);
    }
    return result || null;
  }
  
  // Clear session cache (call when data changes)
  clearSessionCache(userId?: string): void {
    try {
      if (userId) {
        delete this.sessionCache[userId];
        console.log('[Database] Cleared session cache for user:', userId);
      } else {
        this.sessionCache = {};
        console.log('[Database] Cleared all session caches');
      }
    } catch (error) {
      console.error('[Database] Failed to clear session cache:', error);
    }
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

  // Workout stats caching
  private workoutStatsCache: {[userId: string]: { data: any; timestamp: number }} = {};
  private readonly STATS_CACHE_TTL = 2 * 60 * 1000; // 2 minutes

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
    // Check cache first
    const cacheKey = `${userId}_${days}`;
    const cached = this.workoutStatsCache[cacheKey];
    if (cached && (Date.now() - cached.timestamp) < this.STATS_CACHE_TTL) {
      console.log('[Database] Using cached workout stats for user:', userId);
      return cached.data;
    }

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

    const result = {
      totalWorkouts,
      totalVolume,
      averageVolume,
      currentStreak,
      longestStreak,
    };

    // Cache the result
    this.workoutStatsCache[cacheKey] = {
      data: result,
      timestamp: Date.now()
    };

    console.log('[Database] Cached workout stats for user:', userId);
    return result;
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

  // Analytics caching
  private analyticsCache: {[key: string]: { data: any; timestamp: number }} = {};
  private readonly ANALYTICS_CACHE_TTL = 3 * 60 * 1000; // 3 minutes

  async getWorkoutFrequency(
    userId: string,
    days: number = 30
  ): Promise<Array<{ date: string; count: number }>> {
    const cacheKey = `frequency_${userId}_${days}`;
    const cached = this.analyticsCache[cacheKey];
    if (cached && (Date.now() - cached.timestamp) < this.ANALYTICS_CACHE_TTL) {
      console.log('[Database] Using cached workout frequency for user:', userId);
      return cached.data;
    }

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

    // Cache the result
    this.analyticsCache[cacheKey] = {
      data: result,
      timestamp: Date.now()
    };

    console.log('[Database] Cached workout frequency for user:', userId);
    return result;
  }

  async getVolumeHistory(
    userId: string,
    days: number = 30
  ): Promise<Array<{ date: string; volume: number }>> {
    const cacheKey = `volume_${userId}_${days}`;
    const cached = this.analyticsCache[cacheKey];
    if (cached && (Date.now() - cached.timestamp) < this.ANALYTICS_CACHE_TTL) {
      console.log('[Database] Using cached volume history for user:', userId);
      return cached.data;
    }

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

    // Cache the result
    this.analyticsCache[cacheKey] = {
      data: result,
      timestamp: Date.now()
    };

    console.log('[Database] Cached volume history for user:', userId);
    return result;
  }

  async getPRHistory(
    userId: string,
    exerciseId: string
  ): Promise<Array<{ date: string; weight: number }>> {
    const cacheKey = `pr_${userId}_${exerciseId}`;
    const cached = this.analyticsCache[cacheKey];
    if (cached && (Date.now() - cached.timestamp) < this.ANALYTICS_CACHE_TTL) {
      console.log('[Database] Using cached PR history for user:', userId);
      return cached.data;
    }

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

    // Cache the result
    this.analyticsCache[cacheKey] = {
      data: result,
      timestamp: Date.now()
    };

    console.log('[Database] Cached PR history for user:', userId);
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

  // Achievements caching
  private achievementsCache: {[userId: string]: { data: any[]; timestamp: number }} = {};
  private readonly ACHIEVEMENTS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  
  // Cache versioning to prevent stale data
  private cacheVersion: number = Date.now();
  
  // Clear achievements cache
  clearAchievementsCache(userId?: string): void {
    try {
      if (userId) {
        delete this.achievementsCache[userId];
        console.log('[Database] Cleared achievements cache for user:', userId);
      } else {
        this.achievementsCache = {};
        console.log('[Database] Cleared all achievements caches');
      }
    } catch (error) {
      console.error('[Database] Failed to clear achievements cache:', error);
    }
  }

  async getUserAchievements(userId: string): Promise<any[]> {
    // Check cache first
    const cached = this.achievementsCache[userId];
    if (cached && (Date.now() - cached.timestamp) < this.ACHIEVEMENTS_CACHE_TTL) {
      console.log('[Database] Using cached achievements for user:', userId);
      return cached.data;
    }

    const db = this.getDB();
    const result = await db.getAllAsync<any>(
      'SELECT * FROM user_achievements WHERE user_id = ? ORDER BY unlocked_at DESC',
      [userId]
    );

    // Cache the result
    this.achievementsCache[userId] = {
      data: result,
      timestamp: Date.now()
    };

    console.log('[Database] Cached achievements for user:', userId, 'count:', result.length);
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
  
  // Enhanced cache clearing with versioning
  clearAllCachesForUser(userId: string): void {
    try {
      console.log('[Database] Starting comprehensive cache clearing for user:', userId);
      
      // Clear all user-specific caches
      this.clearSessionCache(userId);
      this.clearAchievementsCache(userId);
      this.clearWeeklyVolumeCache(userId);
      this.clearExerciseDefinitionsCache();
      
      // Clear composite key caches
      Object.keys(this.workoutStatsCache).forEach(key => {
        if (key.startsWith(userId)) {
          delete this.workoutStatsCache[key];
        }
      });
      
      Object.keys(this.analyticsCache).forEach(key => {
        if (key.includes(userId)) {
          delete this.analyticsCache[key];
        }
      });
      
      // Increment cache version to invalidate any remaining stale data
      this.cacheVersion = Date.now();
      
      console.log('[Database] Cache clearing completed for user:', userId);
    } catch (error) {
      console.error('[Database] Failed to clear caches for user:', userId, error);
    }
  }

  async addTPath(tPath: TPath): Promise<void> {
    await this.waitForMigration(); // BLOCK until migration completes
    const db = this.getDB();
    
    try {
      // Check current table structure to handle missing columns gracefully
      const tableInfo = await db.getAllAsync<any>("PRAGMA table_info(t_paths);");
      const columns = tableInfo.map((col: any) => col.name);
      console.log(`[DEBUG] 📋 Current t_paths columns for addTPath:`, columns);
      
      // Build dynamic query based on available columns
      const baseColumns = ['id', 'user_id', 'template_name', 'is_bonus', 'created_at', 'updated_at'];
      const optionalColumns = {
        'version': (tPath as any).version || 1,
        'settings': (tPath as any).settings ? JSON.stringify((tPath as any).settings) : null,
        'progression_settings': (tPath as any).progression_settings ? JSON.stringify((tPath as any).progression_settings) : null,
        'parent_t_path_id': tPath.parent_t_path_id || null,
        'gym_id': (tPath as any).gym_id || null,
        'is_main_program': (tPath as any).is_main_program ? 1 : 0,
        'is_ai_generated': (tPath as any).is_ai_generated ? 1 : 0,
        'description': (tPath as any).description || null,
        'order_index': (tPath as any).order_index || null,
        'ai_generation_params': (tPath as any).ai_generation_params || null
      };
      
      // Only include columns that exist in the table
      const availableColumns = [...baseColumns];
      const availableValues = [
        tPath.id,
        tPath.user_id,
        tPath.template_name,
        (tPath as any).is_bonus ? 1 : 0,
        tPath.created_at || new Date().toISOString(),
        new Date().toISOString() // updated_at
      ];
      
      // Add optional columns that exist
      for (const [colName, value] of Object.entries(optionalColumns)) {
        if (columns.includes(colName)) {
          availableColumns.push(colName);
          availableValues.push(value);
        }
      }
      
      const placeholders = availableColumns.map(() => '?').join(', ');
      const query = `INSERT OR REPLACE INTO t_paths (${availableColumns.join(', ')}) VALUES (${placeholders})`;
      
      console.log(`[DEBUG] 🔧 addTPath - Using columns:`, availableColumns);
      console.log(`[DEBUG] 🔧 addTPath - Values count:`, availableValues.length);
      
      await db.runAsync(query, availableValues);
      console.log(`[DEBUG] ✅ addTPath successful for:`, tPath.template_name);
      
    } catch (error: any) {
      console.error(`[DEBUG] ❌ addTPath failed:`, error.message);
      
      // Enhanced error handling for missing columns
      if (error.message.includes('no column named')) {
        console.error(`[DEBUG] 🎯 Missing column in t_paths table:`, error.message);
        console.error(`[DEBUG] 💡 This should be fixed by the migration system`);
        
        // Try emergency column addition
        try {
          console.log(`[DEBUG] 🔄 Attempting emergency column addition for t_paths...`);
          const missingCols = ['version', 'settings', 'progression_settings', 'gym_id', 'is_main_program', 'is_ai_generated', 'description', 'order_index'];
          
          for (const col of missingCols) {
            try {
              if (col === 'version') {
                await db.execAsync('ALTER TABLE t_paths ADD COLUMN version INTEGER DEFAULT 1');
              } else if (col === 'settings') {
                await db.execAsync('ALTER TABLE t_paths ADD COLUMN settings TEXT');
              } else if (col === 'progression_settings') {
                await db.execAsync('ALTER TABLE t_paths ADD COLUMN progression_settings TEXT');
              } else if (col === 'gym_id') {
                await db.execAsync('ALTER TABLE t_paths ADD COLUMN gym_id TEXT');
              } else if (col === 'is_main_program') {
                await db.execAsync('ALTER TABLE t_paths ADD COLUMN is_main_program INTEGER DEFAULT 0');
              } else if (col === 'is_ai_generated') {
                await db.execAsync('ALTER TABLE t_paths ADD COLUMN is_ai_generated INTEGER DEFAULT 0');
              } else if (col === 'description') {
                await db.execAsync('ALTER TABLE t_paths ADD COLUMN description TEXT');
              } else if (col === 'order_index') {
                await db.execAsync('ALTER TABLE t_paths ADD COLUMN order_index INTEGER');
              }
              console.log(`[DEBUG] ✅ Emergency column added to t_paths: ${col}`);
            } catch (colError: any) {
              console.log(`[DEBUG] ℹ️  Column ${col} already exists or failed:`, colError.message);
            }
          }
          
          // Retry the save after adding columns
          await db.runAsync(
            `INSERT OR REPLACE INTO t_paths
             (id, user_id, template_name, is_bonus, created_at, updated_at, version, settings, progression_settings, parent_t_path_id, gym_id, is_main_program, is_ai_generated, description, order_index, ai_generation_params)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              tPath.id,
              tPath.user_id,
              tPath.template_name,
              (tPath as any).is_bonus ? 1 : 0,
              tPath.created_at || new Date().toISOString(),
              new Date().toISOString(), // updated_at
              (tPath as any).version || 1,
              (tPath as any).settings ? JSON.stringify((tPath as any).settings) : null,
              (tPath as any).progression_settings ? JSON.stringify((tPath as any).progression_settings) : null,
              tPath.parent_t_path_id || null,
              (tPath as any).gym_id || null,
              (tPath as any).is_main_program ? 1 : 0,
              (tPath as any).is_ai_generated ? 1 : 0,
              (tPath as any).description || null,
              (tPath as any).order_index || null,
              (tPath as any).ai_generation_params || null
            ]
          );
          
          console.log(`[DEBUG] ✅ addTPath successful after emergency column addition`);
          return;
          
        } catch (emergencyError: any) {
          console.error(`[DEBUG] ❌ Emergency column addition failed:`, emergencyError.message);
        }
      }
      
      throw error;
    }
  }

  async getTPath(tPathId: string): Promise<TPathWithExercises | null> {
    await this.waitForMigration(); // BLOCK until migration completes
    const db = this.getDB();
    const tPath = await db.getFirstAsync<any>(
      'SELECT * FROM t_paths WHERE id = ?',
      [tPathId]
    );

    if (!tPath) {
      return null;
    }

    // Try template_id first (new schema), fallback to t_path_id (old schema)
    let exercisesQuery = 'SELECT * FROM t_path_exercises WHERE ';
    let exercisesParams: any[] = [tPathId];

    try {
      // Check if template_id column exists
      const tableInfo = await db.getAllAsync<any>("PRAGMA table_info(t_path_exercises);");
      const columns = tableInfo.map((col: any) => col.name);

      if (columns.includes('template_id')) {
        exercisesQuery += 'template_id = ?';
      } else if (columns.includes('t_path_id')) {
        exercisesQuery += 't_path_id = ?';
      } else {
        console.warn('[Database] Neither template_id nor t_path_id found in t_path_exercises table');
        // Return TPath without exercises
        return {
          ...tPath,
          is_bonus: Boolean(tPath.is_bonus),
          settings: tPath.settings ? JSON.parse(tPath.settings) : null,
          progression_settings: tPath.progression_settings ? JSON.parse(tPath.progression_settings) : null,
          exercises: [],
        };
      }
    } catch (error: any) {
      console.warn('[Database] Could not check t_path_exercises table structure:', error.message);
      // Default to template_id
      exercisesQuery += 'template_id = ?';
    }

    exercisesQuery += ' ORDER BY order_index ASC';

    const exercises = await db.getAllAsync<any>(exercisesQuery, exercisesParams);

    return {
      ...tPath,
      is_bonus: Boolean(tPath.is_bonus),
      settings: tPath.settings ? JSON.parse(tPath.settings) : null,
      progression_settings: tPath.progression_settings ? JSON.parse(tPath.progression_settings) : null,
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
    await this.waitForMigration(); // BLOCK until migration completes
    const db = this.getDB();
    await db.runAsync('DELETE FROM t_path_exercises WHERE template_id = ?', [
      tPathId,
    ]);
    await db.runAsync('DELETE FROM t_path_progress WHERE t_path_id = ?', [
      tPathId,
    ]);
    await db.runAsync('DELETE FROM t_paths WHERE id = ?', [tPathId]);
  }

  async addTPathExercise(exercise: TPathExercise): Promise<void> {
    await this.waitForMigration(); // BLOCK until migration completes
    const db = this.getDB();
    
    // Check if template_id or t_path_id column exists
    let query = '';
    let params: any[] = [];
    
    try {
      const tableInfo = await db.getAllAsync<any>("PRAGMA table_info(t_path_exercises);");
      const columns = tableInfo.map((col: any) => col.name);
      
      if (columns.includes('template_id')) {
        query = `INSERT OR REPLACE INTO t_path_exercises
                 (id, template_id, exercise_id, order_index, created_at, is_bonus_exercise)
                 VALUES (?, ?, ?, ?, ?, ?)`;
        params = [
          exercise.id,
          exercise.t_path_id || (exercise as any).template_id,
          exercise.exercise_id,
          exercise.order_index,
          exercise.created_at || new Date().toISOString(),
          exercise.is_bonus_exercise ? 1 : 0,
        ];
      } else if (columns.includes('t_path_id')) {
        query = `INSERT OR REPLACE INTO t_path_exercises
                 (id, t_path_id, exercise_id, order_index, created_at, is_bonus_exercise)
                 VALUES (?, ?, ?, ?, ?, ?)`;
        params = [
          exercise.id,
          exercise.t_path_id || (exercise as any).template_id,
          exercise.exercise_id,
          exercise.order_index,
          exercise.created_at || new Date().toISOString(),
          exercise.is_bonus_exercise ? 1 : 0,
        ];
      } else {
        throw new Error('Neither template_id nor t_path_id found in t_path_exercises table');
      }
    } catch (error: any) {
      console.error('[Database] Could not determine t_path_exercises schema:', error.message);
      // Default to template_id
      query = `INSERT OR REPLACE INTO t_path_exercises
               (id, template_id, exercise_id, order_index, created_at, is_bonus_exercise)
               VALUES (?, ?, ?, ?, ?, ?)`;
      params = [
        exercise.id,
        exercise.t_path_id || (exercise as any).template_id,
        exercise.exercise_id,
        exercise.order_index,
        exercise.created_at || new Date().toISOString(),
        exercise.is_bonus_exercise ? 1 : 0,
      ];
    }
    
    await db.runAsync(query, params);
  }

  async getTPathExercises(tPathId: string): Promise<TPathExercise[]> {
    await this.waitForMigration(); // BLOCK until migration completes
    const db = this.getDB();
    
    // Try template_id first (new schema), fallback to t_path_id (old schema)
    let query = 'SELECT * FROM t_path_exercises WHERE ';
    let params: any[] = [tPathId];
    
    try {
      // Check if template_id column exists
      const tableInfo = await db.getAllAsync<any>("PRAGMA table_info(t_path_exercises);");
      const columns = tableInfo.map((col: any) => col.name);
      
      if (columns.includes('template_id')) {
        query += 'template_id = ?';
      } else if (columns.includes('t_path_id')) {
        query += 't_path_id = ?';
      } else {
        console.warn('[Database] Neither template_id nor t_path_id found in t_path_exercises table');
        return [];
      }
    } catch (error: any) {
      console.warn('[Database] Could not check t_path_exercises table structure:', error.message);
      // Default to template_id
      query += 'template_id = ?';
    }
    
    query += ' ORDER BY order_index ASC';
    
    const result = await db.getAllAsync<any>(query, params);
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

  async addExerciseDefinition(exercise: any): Promise<void> {
    const db = this.getDB();
    await db.runAsync(
      `INSERT OR REPLACE INTO exercise_definitions
       (id, user_id, name, main_muscle, description, pro_tip, video_url, type, category, created_at, library_id, is_favorite, icon_url, location_tags, movement_type, movement_pattern)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        exercise.id,
        exercise.user_id || null,
        exercise.name,
        exercise.main_muscle || null,
        exercise.description || null,
        exercise.pro_tip || null,
        exercise.video_url || null,
        exercise.type || 'weight',
        exercise.category || null,
        exercise.created_at || new Date().toISOString(),
        exercise.library_id || null,
        exercise.is_favorite ? 1 : 0,
        exercise.icon_url || null,
        exercise.location_tags || null,
        exercise.movement_type || null,
        exercise.movement_pattern || null,
      ]
    );
  }

  async getExerciseDefinition(exerciseId: string): Promise<any | null> {
    const db = this.getDB();
    const result = await db.getFirstAsync<any>(
      'SELECT * FROM exercise_definitions WHERE id = ?',
      [exerciseId]
    );
    return result || null;
  }

  // Exercise definitions caching
  private exerciseDefinitionsCache: { data: any[]; timestamp: number } | null = null;
  private readonly EXERCISE_CACHE_TTL = 10 * 60 * 1000; // 10 minutes
  
  async getExerciseDefinitions(): Promise<any[]> {
    // Check cache first
    if (this.exerciseDefinitionsCache &&
        (Date.now() - this.exerciseDefinitionsCache.timestamp) < this.EXERCISE_CACHE_TTL) {
      console.log('[Database] Using cached exercise definitions');
      return this.exerciseDefinitionsCache.data;
    }
    
    const db = this.getDB();
    console.log('[Database] Fetching exercise definitions from database');
    const result = await db.getAllAsync<any>(
      'SELECT id, name FROM exercise_definitions ORDER BY name ASC'
    );
    
    // Cache the result
    this.exerciseDefinitionsCache = {
      data: result,
      timestamp: Date.now()
    };
    
    console.log('[Database] Cached exercise definitions:', result.length);
    return result;
  }
  
  // Clear exercise definitions cache
  clearExerciseDefinitionsCache(): void {
    this.exerciseDefinitionsCache = null;
  }

  // Cleanup incomplete workout sessions older than specified hours
  async cleanupIncompleteSessions(olderThanHours: number = 24): Promise<number> {
    const db = this.getDB();
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - olderThanHours);

    // Get incomplete sessions to clean up
    const incompleteSessions = await db.getAllAsync<{ id: string }>(
      'SELECT id FROM workout_sessions WHERE completed_at IS NULL AND created_at < ?',
      [cutoffDate.toISOString()]
    );

    if (incompleteSessions.length > 0) {
      const sessionIds = incompleteSessions.map(s => s.id);

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

      return incompleteSessions.length;
    } else {
      return 0;
    }
  }

  async getProfile(userId: string): Promise<any | null> {
    const db = this.getDB();
    const result = await db.getFirstAsync<any>(
      'SELECT * FROM profiles WHERE user_id = ?',
      [userId]
    );
    return result || null;
  }

  async saveProfile(profile: any): Promise<void> {
    await this.waitForMigration(); // BLOCK until migration completes
    const db = this.getDB();
    
    console.log(`[DEBUG] 💾 saveProfile called for user:`, profile.id);
    console.log(`[DEBUG] 📋 Profile data:`, JSON.stringify(profile, null, 2));
    
    try {
      // First, let's check what columns actually exist in the profiles table
      console.log(`[DEBUG] 🔍 Checking current profiles table structure...`);
      const tableInfo = await db.getAllAsync("PRAGMA table_info(profiles)");
      const columns = tableInfo.map((col: any) => col.name);
      console.log(`[DEBUG] 📊 Current profiles columns:`, columns);
      
      // Check if target_date column exists
      const hasTargetDate = columns.includes('target_date');
      console.log(`[DEBUG] 🎯 target_date column exists:`, hasTargetDate);
      
      if (!hasTargetDate) {
        throw new Error(`CRITICAL: target_date column missing from profiles table. Current columns: ${columns.join(', ')}`);
      }
      
      // Prepare profile data with proper defaults
      const profileData = [
        profile.id,
        profile.user_id || profile.id,
        profile.full_name || null,
        profile.height_cm || null,
        profile.weight_kg || null,
        profile.body_fat_pct || null,
        profile.primary_goal || null,
        profile.target_date || null,
        profile.health_notes || null,
        profile.preferred_muscles || null,
        profile.created_at || new Date().toISOString(),
        profile.first_name || null,
        profile.last_name || null,
        profile.preferred_weight_unit || 'kg',
        profile.preferred_distance_unit || 'km',
        profile.default_rest_time_seconds || 60,
        profile.last_ai_coach_use_at || null,
        profile.preferred_session_length || null,
        profile.active_t_path_id || null,
        profile.updated_at || new Date().toISOString(),
        profile.total_points || 0,
        profile.current_streak || 0,
        profile.longest_streak || 0,
        profile.last_workout_date || null,
        profile.rolling_workout_status || 'Ready to Start',
        profile.active_location_tag || null,
        profile.active_gym_id || null,
        profile.t_path_generation_status || 'not_started',
        profile.t_path_generation_error || null,
        profile.programme_type || null,
        profile.onboarding_completed ? 1 : 0
      ];
      
      console.log(`[DEBUG] 📝 Prepared ${profileData.length} profile parameters for insertion`);
      
      // Try to save with complete schema
      await db.runAsync(
        `INSERT OR REPLACE INTO profiles
         (id, user_id, full_name, height_cm, weight_kg, body_fat_pct, primary_goal, target_date, health_notes, preferred_muscles, created_at, first_name, last_name, preferred_weight_unit, preferred_distance_unit, default_rest_time_seconds, last_ai_coach_use_at, preferred_session_length, active_t_path_id, updated_at, total_points, current_streak, longest_streak, last_workout_date, rolling_workout_status, active_location_tag, active_gym_id, t_path_generation_status, t_path_generation_error, programme_type, onboarding_completed)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        profileData
      );
      
      console.log(`[DEBUG] ✅ Profile saved successfully with complete schema`);
      
    } catch (error: any) {
      console.error(`[DEBUG] ❌ Profile save failed:`, error.message);
      console.error(`[DEBUG] 📊 Error code:`, error.code);
      console.error(`[DEBUG] 📋 Error details:`, error);
      console.error(`[DEBUG] 🔍 Profile that failed:`, JSON.stringify(profile, null, 2));
      
      // Enhanced error analysis for different missing column errors
      if (error.message.includes('no column named target_date') ||
          error.message.includes('no column named preferred_weight_unit') ||
          error.message.includes('no column named preferred_distance_unit') ||
          error.message.includes('no column named')) {
        
        console.error(`[DEBUG] 🎯 SPECIFIC ERROR: Missing columns in profiles table`);
        console.error(`[DEBUG] 💡 SOLUTION NEEDED: Database migration to add missing columns`);
        console.log(`[DEBUG] 🔄 Attempting emergency column addition...`);
        
        try {
          // Add all potential missing columns
          const columnsToAdd = [
            { name: 'target_date', sql: 'ALTER TABLE profiles ADD COLUMN target_date DATE' },
            { name: 'preferred_weight_unit', sql: 'ALTER TABLE profiles ADD COLUMN preferred_weight_unit TEXT DEFAULT "kg"' },
            { name: 'preferred_distance_unit', sql: 'ALTER TABLE profiles ADD COLUMN preferred_distance_unit TEXT DEFAULT "km"' },
            { name: 'last_ai_coach_use_at', sql: 'ALTER TABLE profiles ADD COLUMN last_ai_coach_use_at TEXT' },
            { name: 'total_points', sql: 'ALTER TABLE profiles ADD COLUMN total_points INTEGER DEFAULT 0' },
            { name: 'current_streak', sql: 'ALTER TABLE profiles ADD COLUMN current_streak INTEGER DEFAULT 0' },
            { name: 'longest_streak', sql: 'ALTER TABLE profiles ADD COLUMN longest_streak INTEGER DEFAULT 0' },
            { name: 'last_workout_date', sql: 'ALTER TABLE profiles ADD COLUMN last_workout_date DATE' },
            { name: 'rolling_workout_status', sql: 'ALTER TABLE profiles ADD COLUMN rolling_workout_status TEXT DEFAULT "Ready to Start"' },
            { name: 'active_location_tag', sql: 'ALTER TABLE profiles ADD COLUMN active_location_tag TEXT' }
          ];
          
          for (const column of columnsToAdd) {
            try {
              await db.execAsync(column.sql);
              console.log(`[DEBUG] ✅ Emergency column added: ${column.name}`);
            } catch (columnError: any) {
              // Column might already exist, continue
              console.log(`[DEBUG] ℹ️  Column ${column.name} already exists or failed: ${columnError.message}`);
            }
          }
          
          console.log(`[DEBUG] ✅ Emergency column addition completed, retrying profile save...`);
          
          // Retry the save with same parameters
          await db.runAsync(
            `INSERT OR REPLACE INTO profiles
             (id, user_id, full_name, height_cm, weight_kg, body_fat_pct, primary_goal, target_date, health_notes, preferred_muscles, created_at, first_name, last_name, preferred_weight_unit, preferred_distance_unit, default_rest_time_seconds, last_ai_coach_use_at, preferred_session_length, active_t_path_id, updated_at, total_points, current_streak, longest_streak, last_workout_date, rolling_workout_status, active_location_tag, active_gym_id, t_path_generation_status, t_path_generation_error, programme_type, onboarding_completed)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              profile.id,
              profile.user_id || profile.id,
              profile.full_name || null,
              profile.height_cm || null,
              profile.weight_kg || null,
              profile.body_fat_pct || null,
              profile.primary_goal || null,
              profile.target_date || null,
              profile.health_notes || null,
              profile.preferred_muscles || null,
              profile.created_at || new Date().toISOString(),
              profile.first_name || null,
              profile.last_name || null,
              profile.preferred_weight_unit || 'kg',
              profile.preferred_distance_unit || 'km',
              profile.default_rest_time_seconds || 60,
              profile.last_ai_coach_use_at || null,
              profile.preferred_session_length || null,
              profile.active_t_path_id || null,
              profile.updated_at || new Date().toISOString(),
              profile.total_points || 0,
              profile.current_streak || 0,
              profile.longest_streak || 0,
              profile.last_workout_date || null,
              profile.rolling_workout_status || 'Ready to Start',
              profile.active_location_tag || null,
              profile.active_gym_id || null,
              profile.t_path_generation_status || 'not_started',
              profile.t_path_generation_error || null,
              profile.programme_type || null,
              profile.onboarding_completed ? 1 : 0
            ]
          );
          
          console.log(`[DEBUG] ✅ Profile saved successfully after emergency migration`);
          return;
          
        } catch (migrationError: any) {
          console.error(`[DEBUG] ❌ Emergency migration failed:`, migrationError.message);
        }
      }
      
      throw error;
    }
  }

  async deleteWorkoutSession(sessionId: string): Promise<void> {
    const db = this.getDB();
    
    // Get the user_id before deleting the session
    const session = await db.getFirstAsync<{ user_id: string }>(
      'SELECT user_id FROM workout_sessions WHERE id = ?',
      [sessionId]
    );
    
    console.log('[Database] Starting enhanced workout session deletion:', sessionId, 'user:', session?.user_id);
    
    // Clear ALL caches immediately before deletion to prevent stale data restoration
    if (session?.user_id) {
      console.log('[Database] Clearing ALL caches before deletion for user:', session.user_id);
      this.clearAllCachesForUser(session.user_id);
      
      // Also clear any analytics caches that might contain this session
      Object.keys(this.analyticsCache).forEach(key => {
        if (key.includes(session.user_id)) {
          delete this.analyticsCache[key];
          console.log('[Database] Cleared analytics cache:', key);
        }
      });
      
      // Clear workout stats cache
      Object.keys(this.workoutStatsCache).forEach(key => {
        if (key.startsWith(session.user_id)) {
          delete this.workoutStatsCache[key];
          console.log('[Database] Cleared stats cache:', key);
        }
      });
    }
    
    // Delete associated set logs first
    await db.runAsync('DELETE FROM set_logs WHERE session_id = ?', [sessionId]);
    console.log('[Database] Deleted set logs for session:', sessionId);
    
    // Then delete the workout session
    const deleteResult = await db.runAsync('DELETE FROM workout_sessions WHERE id = ?', [sessionId]);
    console.log('[Database] Deleted workout session:', sessionId, 'changes:', deleteResult.changes);
    
    // Clear caches one more time after deletion to be absolutely sure
    if (session?.user_id) {
      this.clearAllCachesForUser(session.user_id);
      console.log('[Database] Final cache clear completed for user:', session.user_id);
    }
  }

  async cleanupUserData(userId: string): Promise<{
    success: boolean;
    cleanedTables: string[];
    errors: string[];
  }> {
    const db = this.getDB();
    const result = {
      success: true,
      cleanedTables: [] as string[],
      errors: [] as string[],
    };

    try {
      // Define user data tables and their cleaning operations
      const userDataTables = [
        {
          name: 'workout_sessions',
          operation: async () => {
            await db.runAsync('DELETE FROM workout_sessions WHERE user_id = ?', [userId]);
            result.cleanedTables.push('workout_sessions');
          }
        },
        {
          name: 'set_logs',
          operation: async () => {
            await db.runAsync('DELETE FROM set_logs WHERE session_id IN (SELECT id FROM workout_sessions WHERE user_id = ?)', [userId]);
            result.cleanedTables.push('set_logs');
          }
        },
        {
          name: 'gyms',
          operation: async () => {
            await db.runAsync('DELETE FROM gyms WHERE user_id = ?', [userId]);
            result.cleanedTables.push('gyms');
          }
        },
        {
          name: 'workout_templates',
          operation: async () => {
            await db.runAsync('DELETE FROM workout_templates WHERE user_id = ?', [userId]);
            result.cleanedTables.push('workout_templates');
          }
        },
        {
          name: 'body_measurements',
          operation: async () => {
            await db.runAsync('DELETE FROM body_measurements WHERE user_id = ?', [userId]);
            result.cleanedTables.push('body_measurements');
          }
        },
        {
          name: 'user_goals',
          operation: async () => {
            await db.runAsync('DELETE FROM user_goals WHERE user_id = ?', [userId]);
            result.cleanedTables.push('user_goals');
          }
        },
        {
          name: 'user_achievements',
          operation: async () => {
            await db.runAsync('DELETE FROM user_achievements WHERE user_id = ?', [userId]);
            result.cleanedTables.push('user_achievements');
          }
        },
        {
          name: 't_path_progress',
          operation: async () => {
            await db.runAsync('DELETE FROM t_path_progress WHERE user_id = ?', [userId]);
            result.cleanedTables.push('t_path_progress');
          }
        },
        {
          name: 't_paths',
          operation: async () => {
            await db.runAsync('DELETE FROM t_paths WHERE user_id = ?', [userId]);
            result.cleanedTables.push('t_paths');
          }
        },
        {
          name: 'user_preferences',
          operation: async () => {
            await db.runAsync('DELETE FROM user_preferences WHERE user_id = ?', [userId]);
            result.cleanedTables.push('user_preferences');
          }
        },
        {
          name: 'profiles',
          operation: async () => {
            await db.runAsync('DELETE FROM profiles WHERE user_id = ?', [userId]);
            result.cleanedTables.push('profiles');
          }
        }
      ];

      // Execute cleanup for each table
      for (const table of userDataTables) {
        try {
          await table.operation();
        } catch (error) {
          result.errors.push(`Failed to clean ${table.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          result.success = false;
        }
      }

      console.log(`[Database] Cleanup completed for user ${userId}:`, result);
      return result;

    } catch (error) {
      result.success = false;
      result.errors.push(`General cleanup error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.error('[Database] User data cleanup failed:', error);
      return result;
    }
  }

  async emergencyReset(): Promise<{ success: boolean; error?: string }> {
    const db = this.getDB();
    try {
      // Get all table names except sync_queue
      const tables = [
        'workout_sessions', 'set_logs', 'gyms', 'workout_templates',
        'body_measurements', 'user_goals', 'user_achievements',
        't_path_progress', 't_paths', 'user_preferences', 'profiles'
      ];

      for (const table of tables) {
        await db.runAsync(`DELETE FROM ${table}`);
      }

      console.log('[Database] Emergency reset completed');
      return { success: true };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('[Database] Emergency reset failed:', error);
      return { success: false, error: errorMsg };
    }
  }

  // DATA CLEANUP METHODS - Prevent storage bloat
  async cleanupOldWorkoutData(userId: string): Promise<{ cleanedRecords: number; freedSpace: string }> {
    const db = this.getDB();
    let totalCleaned = 0;

    try {
      // Keep detailed set logs for only last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const detailedCutoff = thirtyDaysAgo.toISOString();

      // Delete old detailed set logs (keep summaries)
      const oldSetLogsResult = await db.runAsync(
        `DELETE FROM set_logs WHERE created_at < ? AND session_id IN (
          SELECT id FROM workout_sessions WHERE completed_at < ?
        )`,
        [detailedCutoff, detailedCutoff]
      );
      totalCleaned += oldSetLogsResult.changes || 0;
      console.log(`[Cleanup] Removed ${oldSetLogsResult.changes || 0} old set logs`);

      // Keep only last 100 workout sessions per user
      const recentSessions = await db.getAllAsync<{ id: string }>(
        `SELECT id FROM workout_sessions
         WHERE user_id = ?
         ORDER BY completed_at DESC
         LIMIT 100 OFFSET 100`, // Skip first 100, delete the rest
        [userId]
      );

      if (recentSessions.length > 0) {
        const sessionIds = recentSessions.map(s => s.id);
        const oldSessionsResult = await db.runAsync(
          `DELETE FROM workout_sessions WHERE id IN (${sessionIds.map(() => '?').join(',')})`,
          sessionIds
        );
        totalCleaned += oldSessionsResult.changes || 0;
        console.log(`[Cleanup] Removed ${oldSessionsResult.changes || 0} old workout sessions`);
      }

      // Estimate freed space (rough calculation)
      const avgRecordSize = 500; // bytes per record
      const freedBytes = totalCleaned * avgRecordSize;
      const freedSpace = freedBytes > 1024 * 1024
        ? `${(freedBytes / (1024 * 1024)).toFixed(1)}MB`
        : `${(freedBytes / 1024).toFixed(1)}KB`;

      console.log(`[Cleanup] Total records cleaned: ${totalCleaned}, estimated space freed: ${freedSpace}`);

      return { cleanedRecords: totalCleaned, freedSpace };
    } catch (error) {
      console.error('[Database] Cleanup failed:', error);
      return { cleanedRecords: 0, freedSpace: '0KB' };
    }
  }

  async getStorageStats(userId: string): Promise<{
    workoutSessions: number;
    setLogs: number;
    estimatedSize: string;
    lastCleanup: string | null;
  }> {
    const db = this.getDB();

    try {
      const sessionsResult = await db.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) as count FROM workout_sessions WHERE user_id = ?',
        [userId]
      );

      const setLogsResult = await db.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) as count FROM set_logs WHERE session_id IN (SELECT id FROM workout_sessions WHERE user_id = ?)',
        [userId]
      );

      const workoutSessions = sessionsResult?.count || 0;
      const setLogs = setLogsResult?.count || 0;

      // Rough size estimation
      const estimatedBytes = (workoutSessions * 800) + (setLogs * 300); // Rough per-record sizes
      const estimatedSize = estimatedBytes > 1024 * 1024
        ? `${(estimatedBytes / (1024 * 1024)).toFixed(1)}MB`
        : `${(estimatedBytes / 1024).toFixed(1)}KB`;

      return {
        workoutSessions,
        setLogs,
        estimatedSize,
        lastCleanup: null // Could track this in a preferences table
      };
    } catch (error) {
      console.error('[Database] Failed to get storage stats:', error);
      return {
        workoutSessions: 0,
        setLogs: 0,
        estimatedSize: '0KB',
        lastCleanup: null
      };
    }
  }

  // WEEKLY VOLUME CACHE - Performance optimization for WorkoutSummaryModal
  private weeklyVolumeCache: {[userId: string]: { data: any; timestamp: number }} = {};
  private readonly WEEKLY_VOLUME_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

  async getWeeklyVolumeData(userId: string): Promise<{
    Arms: number[];
    Back: number[];
    Chest: number[];
    Core: number[];
    Legs: number[];
    Shoulders: number[];
  }> {
    // Check cache first
    const cached = this.weeklyVolumeCache[userId];
    if (cached && (Date.now() - cached.timestamp) < this.WEEKLY_VOLUME_CACHE_TTL) {
      console.log('[Database] Using cached weekly volume data for user:', userId);
      return cached.data;
    }

    console.log('[Database] Calculating weekly volume data for user:', userId);
    
    // Get workouts from this week (last 7 days)
    const db = this.getDB();
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const workouts = await db.getAllAsync<any>(
      `SELECT ws.id, ws.session_date, sl.exercise_id, sl.reps, sl.weight_kg
       FROM workout_sessions ws
       JOIN set_logs sl ON ws.id = sl.session_id
       WHERE ws.user_id = ? AND ws.session_date >= ?
       ORDER BY ws.session_date ASC`,
      [userId, oneWeekAgo.toISOString()]
    );

    // Get exercise definitions for muscle group mapping
    const exerciseDefinitions = await this.getExerciseDefinitions();
    const exerciseMap = new Map(exerciseDefinitions.map(ex => [ex.id, ex.name]));

    // Standardized muscle groups from WorkoutSummaryModal charts
    const STANDARD_MUSCLE_GROUPS = [
      'Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Core'
    ];

    // Standardized muscle groups from WorkoutSummaryModal constants
    const UPPER_BODY_MUSCLES = [
      'Abs', 'Abdominals', 'Core',
      'Back', 'Lats',
      'Biceps',
      'Chest', 'Pectorals',
      'Shoulders', 'Deltoids',
      'Traps', 'Rear Delts',
      'Triceps',
      'Full Body'
    ];
    
    const LOWER_BODY_MUSCLES = [
      'Calves',
      'Glutes', 'Outer Glutes',
      'Hamstrings',
      'Inner Thighs',
      'Quads', 'Quadriceps'
    ];

    // Initialize weekly data arrays (7 days) for all muscle groups
    const weeklyData: any = {};
    [...UPPER_BODY_MUSCLES, ...LOWER_BODY_MUSCLES].forEach(muscle => {
      weeklyData[muscle] = new Array(7).fill(0);
    });

    // Process each workout set
    for (const set of workouts) {
      const exerciseName = exerciseMap.get(set.exercise_id) || 'Unknown';
      const volume = (set.reps || 0) * (set.weight_kg || 0);
      
      // Determine muscle group from exercise name
      const muscleGroup = this.getMuscleGroupFromExercise(exerciseName);
      
      if (muscleGroup) {
        // Calculate day index (0 = today, 6 = 6 days ago)
        const workoutDate = new Date(set.session_date);
        const dayIndex = Math.floor((new Date().getTime() - workoutDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (dayIndex >= 0 && dayIndex < 7) {
          weeklyData[muscleGroup][dayIndex] += volume;
        }
      }
    }

    // Cache the result
    this.weeklyVolumeCache[userId] = {
      data: weeklyData,
      timestamp: Date.now()
    };

    console.log('[Database] Cached weekly volume data for user:', userId);
    return weeklyData;
  }

  private getMuscleGroupFromExercise(exerciseName: string): string | null {
    const name = exerciseName.toLowerCase();
    
    // Upper body muscle groups
    if (name.includes('abs') || name.includes('abdominals')) return 'Abs';
    if (name.includes('core')) return 'Core';
    if (name.includes('back') || name.includes('lats')) return 'Back';
    if (name.includes('biceps')) return 'Biceps';
    if (name.includes('chest') || name.includes('pectorals')) return 'Chest';
    if (name.includes('shoulders') || name.includes('deltoids')) return 'Shoulders';
    if (name.includes('traps') || name.includes('rear delts')) return 'Traps';
    if (name.includes('triceps')) return 'Triceps';
    if (name.includes('full body')) return 'Full Body';
    
    // Lower body muscle groups
    if (name.includes('calves')) return 'Calves';
    if (name.includes('glutes') || name.includes('outer glutes')) return 'Glutes';
    if (name.includes('hamstrings')) return 'Hamstrings';
    if (name.includes('inner thighs')) return 'Inner Thighs';
    if (name.includes('quads') || name.includes('quadriceps')) return 'Quads';
    
    return null;
  }

  // Clear weekly volume cache (call when new workouts sync)
  clearWeeklyVolumeCache(userId?: string): void {
    if (userId) {
      delete this.weeklyVolumeCache[userId];
    } else {
      this.weeklyVolumeCache = {};
    }
  }

  // AUTO CLEANUP - Call this during app initialization
  async performAutoCleanup(userId: string): Promise<{ performed: boolean; cleanedRecords: number; reason: string }> {
    try {
      // Check if cleanup is needed (run weekly)
      const lastCleanupKey = 'last_cleanup';
      const lastCleanup = await this.getUserPreference(userId, lastCleanupKey);

      const now = new Date();
      const lastCleanupDate = lastCleanup ? new Date(lastCleanup) : null;
      const daysSinceCleanup = lastCleanupDate
        ? Math.floor((now.getTime() - lastCleanupDate.getTime()) / (1000 * 60 * 60 * 24))
        : 999; // Force cleanup if never done

      if (daysSinceCleanup < 7) {
        return { performed: false, cleanedRecords: 0, reason: `Last cleanup ${daysSinceCleanup} days ago` };
      }

      console.log(`[AutoCleanup] Starting cleanup for user ${userId} (${daysSinceCleanup} days since last cleanup)`);

      // Perform cleanup
      const result = await this.cleanupOldWorkoutData(userId);

      // Record cleanup timestamp
      await this.saveUserPreference(userId, lastCleanupKey, now.toISOString());

      console.log(`[AutoCleanup] Completed: ${result.cleanedRecords} records cleaned, ${result.freedSpace} freed`);

      return {
        performed: true,
        cleanedRecords: result.cleanedRecords,
        reason: `Cleaned ${result.cleanedRecords} records, freed ${result.freedSpace}`
      };

    } catch (error) {
      console.error('[AutoCleanup] Failed:', error);
      return { performed: false, cleanedRecords: 0, reason: 'Cleanup failed' };
    }
  }

  // Helper methods for preferences (using existing user_preferences table structure)
  private async getUserPreference(userId: string, key: string): Promise<string | null> {
    try {
      const db = this.getDB();
      // Store preferences as JSON in the theme field (hack for now)
      const result = await db.getFirstAsync<{ theme: string }>(
        'SELECT theme FROM user_preferences WHERE user_id = ?',
        [userId]
      );

      if (result?.theme && result.theme.startsWith('{')) {
        const prefs = JSON.parse(result.theme);
        return prefs[key] || null;
      }

      return null;
    } catch {
      return null;
    }
  }

  private async saveUserPreference(userId: string, key: string, value: string): Promise<void> {
    try {
      const db = this.getDB();

      // Get existing preferences
      const existingPrefs = await this.getUserPreference(userId, key) || '{}';
      let prefs;
      try {
        prefs = JSON.parse(existingPrefs);
      } catch {
        prefs = {};
      }

      // Update preference
      prefs[key] = value;

      // Save back as JSON string in theme field (temporary solution)
      await db.runAsync(
        'INSERT OR REPLACE INTO user_preferences (user_id, theme, updated_at) VALUES (?, ?, ?)',
        [userId, JSON.stringify(prefs), new Date().toISOString()]
      );
    } catch (error) {
      console.warn('[Database] Failed to save preference:', error);
    }
  }

  // Cache invalidation triggers - call these when data changes
  async invalidateCachesForUser(userId: string): Promise<void> {
    // Clear all caches for the user when their data changes
    this.clearSessionCache(userId);
    this.clearExerciseDefinitionsCache();
    this.clearWeeklyVolumeCache(userId);
    
    // Clear workout stats cache (has composite keys)
    Object.keys(this.workoutStatsCache).forEach(key => {
      if (key.startsWith(userId)) {
        delete this.workoutStatsCache[key];
      }
    });
    
    // Clear analytics cache (has composite keys)
    Object.keys(this.analyticsCache).forEach(key => {
      if (key.includes(userId)) {
        delete this.analyticsCache[key];
      }
    });
    
    // Clear achievements cache
    delete this.achievementsCache[userId];
    
    console.log('[Database] Cleared all caches for user:', userId);
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
        'UPDATE sync_queue SET attempts = attempts + 1, error = ?, timestamp = ? WHERE id = ?',
        [error, Date.now(), id]
      );
    },

    clear: async (): Promise<void> => {
      const db = this.getDB();
      await db.runAsync('DELETE FROM sync_queue');
    },
  };
}

export const database = new Database();

// Export cache management functions for external use
export const clearAllCaches = () => {
  database.clearSessionCache();
  database.clearExerciseDefinitionsCache();
  database.clearWeeklyVolumeCache();
  console.log('[Database] Cleared all caches');
};

export const getCacheStats = () => {
  return {
    sessionCache: 0,
    exerciseCache: 0,
    weeklyVolumeCache: 0,
    statsCache: 0,
    analyticsCache: 0,
    achievementsCache: 0,
  };
};

export const addToSyncQueue = async (
  operation: 'create' | 'update' | 'delete',
  table: 'workout_sessions' | 'set_logs',
  payload: { id: string; [key: string]: any }
) => {
  // For workout sessions, only queue if completed (has completed_at)
  if (table === 'workout_sessions' && operation !== 'delete') {
    if (!payload.completed_at) {
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

  // Invalidate relevant caches when data changes
  if (payload.user_id) {
    await database.invalidateCachesForUser(payload.user_id);
  }
};

export default Database;
