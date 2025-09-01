// --- Type Definitions ---
export interface ExerciseDefFromCSV {
  exercise_id: string; // This is the library_id
  name: string;
  main_muscle: string;
  type: string;
  category: string | null;
  description: string | null;
  pro_tip: string | null;
  video_url: string | null;
  icon_url: string | null;
}

export interface WorkoutStructureEntry {
  exercise_library_id: string;
  workout_split: string;
  workout_name: string;
  min_session_minutes: number | null;
  bonus_for_time_group: number | null;
}

export interface ExerciseDefinitionForWorkoutGeneration {
  id: string;
  name: string;
  user_id: string | null;
  library_id: string | null;
  icon_url: string | null;
}

export interface TPathExerciseLink {
  id: string; // t_path_exercises.id
  exercise_id: string;
  order_index: number;
  is_bonus_exercise: boolean;
}

export interface TPathData {
  id: string;
  template_name: string;
  settings: { tPathType?: string } | null;
  user_id: string;
}

export interface ProfileData {
  preferred_session_length: string | null;
}

export interface NullIconExercise {
  id: string;
  library_id: string | null;
}