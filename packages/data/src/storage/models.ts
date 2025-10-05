export interface WorkoutSession {
  id: string;
  user_id: string;
  session_date: string;
  template_name: string | null;
  completed_at: string | null;
  rating: number | null;
  duration_string: string | null;
  t_path_id: string | null;
  created_at: string;
}

export interface SetLog {
  id: string;
  session_id: string;
  exercise_id: string;
  weight_kg: number | null;
  reps: number | null;
  reps_l: number | null;
  reps_r: number | null;
  time_seconds: number | null;
  is_pb: boolean | null;
  created_at: string;
}

export interface ExerciseDefinition {
  id: string;
  user_id: string | null;
  library_id: string | null;
  name: string;
  description: string | null;
  instructions: string | null;
  difficulty: string | null;
  muscle_group: string | null;
  equipment: string | null;
  created_at: string;
}

export interface WorkoutTemplate {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  exercises: TemplateExercise[];
  created_at: string;
  updated_at: string;
}

export interface TemplateExercise {
  exercise_id: string;
  order_index: number;
  default_sets: number;
  default_weight_kg: number | null;
  default_reps: number | null;
}

export interface TPath {
  id: string;
  user_id: string;
  template_name: string;
  description: string | null;
  is_main_program: boolean;
  parent_t_path_id: string | null;
  order_index: number | null;
  is_ai_generated: boolean;
  ai_generation_params: string | null;
  created_at: string;
  updated_at: string;
}

export interface TPathExercise {
  id: string;
  t_path_id: string;
  exercise_id: string;
  order_index: number;
  is_bonus_exercise: boolean;
  target_sets: number | null;
  target_reps_min: number | null;
  target_reps_max: number | null;
  notes: string | null;
  created_at: string;
}

export interface TPathProgress {
  id: string;
  user_id: string;
  t_path_id: string;
  completed_at: string | null;
  last_accessed_at: string | null;
  total_workouts_completed: number;
  created_at: string;
  updated_at: string;
}

export interface TPathWithExercises extends TPath {
  exercises: TPathExercise[];
  progress?: TPathProgress;
}
