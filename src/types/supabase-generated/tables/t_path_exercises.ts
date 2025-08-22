import { Json } from "../json";

export type TPathExercisesRow = {
  created_at: string | null;
  exercise_id: string;
  id: string;
  order_index: number;
  template_id: string;
  is_bonus_exercise: boolean | null;
};
export type TPathExercisesInsert = {
  created_at?: string | null;
  exercise_id: string;
  id?: string;
  order_index: number;
  template_id: string;
  is_bonus_exercise?: boolean | null;
};
export type TPathExercisesUpdate = {
  created_at?: string | null;
  exercise_id?: string;
  id?: string;
  order_index?: number;
  template_id?: string;
  is_bonus_exercise?: boolean | null;
};