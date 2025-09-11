/**
 * This file acts as the main entry point for all generated Supabase types,
 * re-exporting them from their modular files.
 */

export * from './database';
export * from './json';
export * from './tables';
export * from './enums';

// Re-export specific table row types for convenience
export * from './tables/activity_logs';
export * from './tables/ai_coach_usage_logs';
export * from './tables/body_fat_reference_images';
export * from './tables/exercise_definitions';
export * from './tables/notifications';
export * from './tables/profiles';
export * from './tables/set_logs';
export * from './tables/t_path_exercises';
export * from './tables/t_paths';
export * from './tables/user_achievements';
export * from './tables/user_alerts';
export * from './tables/user_exercise_prs';
export * from './tables/user_global_favorites';
export * from './tables/user_notifications';
export * from './tables/workout_exercise_structure';
export * from './tables/workout_sessions';

// Re-export specific function types
export * from './functions/get_last_exercise_sets_for_exercise';
export * from './functions/get_notifications_with_read_status';
export * from './functions/get_total_completed_exercise_instances';
export * from './functions/handle_new_user';