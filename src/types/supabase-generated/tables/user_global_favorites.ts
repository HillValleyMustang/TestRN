import { Json } from "../json";

export type UserGlobalFavoritesRow = {
  user_id: string;
  exercise_id: string;
  created_at: string | null;
};
export type UserGlobalFavoritesInsert = {
  user_id: string;
  exercise_id: string;
  created_at?: string | null;
};
export type UserGlobalFavoritesUpdate = {
  user_id?: string;
  exercise_id?: string;
  created_at?: string | null;
};