import { Json } from "../json";

export type ProgressPhotosRow = {
  id: string;
  user_id: string;
  photo_path: string;
  notes: string | null;
  created_at: string;
  workouts_since_last_photo: number | null;
};
export type ProgressPhotosInsert = {
  id?: string;
  user_id: string;
  photo_path: string;
  notes?: string | null;
  created_at?: string;
  workouts_since_last_photo?: number | null;
};
export type ProgressPhotosUpdate = {
  id?: string;
  user_id?: string;
  photo_path?: string;
  notes?: string | null;
  created_at?: string;
  workouts_since_last_photo?: number | null;
};