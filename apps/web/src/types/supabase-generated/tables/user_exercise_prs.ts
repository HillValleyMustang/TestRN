import { Json } from "../json";

export type UserExercisePrsRow = {
  id: string;
  user_id: string;
  exercise_id: string;
  best_volume_kg: number | null;
  best_time_seconds: number | null;
  last_achieved_date: string;
  created_at: string | null;
  updated_at: string | null;
};
export type UserExercisePrsInsert = {
  id?: string;
  user_id: string;
  exercise_id: string;
  best_volume_kg?: number | null;
  best_time_seconds?: number | null;
  last_achieved_date?: string;
  created_at?: string | null;
  updated_at?: string | null;
};
export type UserExercisePrsUpdate = {
  id?: string;
  user_id?: string;
  exercise_id?: string;
  best_volume_kg?: number | null;
  best_time_seconds?: number | null;
  last_achieved_date?: string;
  created_at?: string | null;
  updated_at?: string | null;
};