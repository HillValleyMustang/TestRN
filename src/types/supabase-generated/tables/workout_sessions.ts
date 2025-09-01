import { Json } from "../json";

export type WorkoutSessionsRow = {
  created_at: string | null;
  duration_string: string | null;
  id: string;
  rating: number | null;
  session_date: string;
  template_name: string | null;
  user_id: string | null;
  completed_at: string | null; // Added new column
  t_path_id: string | null; // Added new column
};
export type WorkoutSessionsInsert = {
  created_at?: string | null;
  duration_string?: string | null;
  id?: string;
  rating?: number | null;
  session_date: string;
  template_name?: string | null;
  user_id?: string | null;
  completed_at?: string | null; // Added new column
  t_path_id?: string | null; // Added new column
};
export type WorkoutSessionsUpdate = {
  created_at?: string | null;
  duration_string?: string | null;
  id?: string;
  rating?: number | null;
  session_date?: string;
  template_name?: string | null;
  user_id?: string | null;
  completed_at?: string | null; // Added new column
  t_path_id?: string | null; // Added new column
};