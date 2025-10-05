import { Json } from "../json";

export type ExerciseDefinitionsRow = {
  category: string | null;
  created_at: string | null;
  description: string | null;
  id: string;
  main_muscle: string;
  name: string;
  pro_tip: string | null;
  type: string;
  user_id: string | null;
  video_url: string | null;
  library_id: string | null;
  is_favorite: boolean | null;
  icon_url: string | null;
  movement_type: string | null; // ADDED
  movement_pattern: string | null; // ADDED
};
export type ExerciseDefinitionsInsert = {
  category?: string | null;
  created_at?: string | null;
  description?: string | null;
  id?: string;
  main_muscle: string;
  name: string;
  pro_tip?: string | null;
  type?: string;
  user_id?: string | null;
  video_url?: string | null;
  library_id?: string | null;
  is_favorite?: boolean | null;
  icon_url?: string | null;
  movement_type?: string | null; // ADDED
  movement_pattern?: string | null; // ADDED
};
export type ExerciseDefinitionsUpdate = {
  category?: string | null;
  created_at?: string | null;
  description?: string | null;
  id?: string;
  main_muscle?: string;
  name?: string;
  pro_tip?: string | null;
  type?: string;
  user_id?: string | null;
  video_url?: string | null;
  library_id?: string | null;
  is_favorite?: boolean | null;
  icon_url?: string | null;
  movement_type?: string | null; // ADDED
  movement_pattern?: string | null; // ADDED
};