import { Json } from "../json";

export type GymExercisesRow = {
  created_at: string;
  exercise_id: string;
  gym_id: string;
};
export type GymExercisesInsert = {
  created_at?: string;
  exercise_id: string;
  gym_id: string;
};
export type GymExercisesUpdate = {
  created_at?: string;
  exercise_id?: string;
  gym_id?: string;
};