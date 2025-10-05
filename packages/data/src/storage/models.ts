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
