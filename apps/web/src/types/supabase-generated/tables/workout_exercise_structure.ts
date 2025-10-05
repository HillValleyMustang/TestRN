import { Json } from "../json";

export type WorkoutExerciseStructureRow = {
  id: string;
  exercise_library_id: string;
  workout_split: string;
  workout_name: string;
  min_session_minutes: number | null;
  bonus_for_time_group: number | null;
  created_at: string | null;
};
export type WorkoutExerciseStructureInsert = {
  id?: string;
  exercise_library_id: string;
  workout_split: string;
  workout_name: string;
  min_session_minutes?: number | null;
  bonus_for_time_group?: number | null;
  created_at?: string | null;
};
export type WorkoutExerciseStructureUpdate = {
  id?: string;
  exercise_library_id?: string;
  workout_split?: string;
  workout_name?: string;
  min_session_minutes?: number | null;
  bonus_for_time_group?: number | null;
  created_at?: string | null;
};