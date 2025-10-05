import { Json } from "../json";

export type SetLogsRow = {
  created_at: string | null;
  exercise_id: string | null;
  id: string;
  is_pb: boolean | null;
  reps: number | null;
  reps_l: number | null;
  reps_r: number | null;
  session_id: string | null;
  time_seconds: number | null;
  weight_kg: number | null;
};
export type SetLogsInsert = {
  created_at?: string | null;
  exercise_id?: string | null;
  id?: string;
  is_pb?: boolean | null;
  reps?: number | null;
  reps_l?: number | null;
  reps_r?: number | null;
  session_id?: string | null;
  time_seconds?: number | null;
  weight_kg?: number | null;
};
export type SetLogsUpdate = {
  created_at?: string | null;
  exercise_id?: string | null;
  id?: string;
  is_pb?: boolean | null;
  reps?: number | null;
  reps_l?: number | null;
  reps_r?: number | null;
  session_id?: string | null;
  time_seconds?: number | null;
  weight_kg?: number | null;
};