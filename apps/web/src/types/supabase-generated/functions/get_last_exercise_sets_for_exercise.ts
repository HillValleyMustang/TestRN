import { Json } from "../json";

export type GetLastExerciseSetsForExerciseArgs = {
  p_user_id: string;
  p_exercise_id: string;
};
export type GetLastExerciseSetsForExerciseReturns = {
  set_id: string;
  weight_kg: number | null;
  reps: number | null;
  reps_l: number | null;
  reps_r: number | null;
  time_seconds: number | null;
  created_at: string;
}[];