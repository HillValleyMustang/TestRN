import { Json } from "../json";

export type TPathsRow = {
  created_at: string | null;
  id: string;
  is_bonus: boolean | null;
  template_name: string;
  user_id: string | null;
  version: number | null;
  settings: Json | null;
  progression_settings: Json | null;
  parent_t_path_id: string | null;
};
export type TPathsInsert = {
  created_at?: string | null;
  id?: string;
  is_bonus?: boolean | null;
  template_name: string;
  user_id?: string | null;
  version?: number | null;
  settings?: Json | null;
  progression_settings?: Json | null;
  parent_t_path_id?: string | null;
};
export type TPathsUpdate = {
  created_at?: string | null;
  id?: string;
  is_bonus?: boolean | null;
  template_name?: string;
  user_id?: string | null;
  version?: number | null;
  settings?: Json | null;
  progression_settings?: Json | null;
  parent_t_path_id?: string | null;
};