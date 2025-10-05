import { Json } from "../json";

export type UserAlertsRow = {
  created_at: string | null;
  id: string;
  is_read: boolean | null;
  message: string;
  title: string;
  type: string | null;
  user_id: string;
};
export type UserAlertsInsert = {
  created_at?: string | null;
  id?: string;
  is_read?: boolean | null;
  message: string;
  title: string;
  type?: string | null;
  user_id: string;
};
export type UserAlertsUpdate = {
  created_at?: string | null;
  id?: string;
  is_read?: boolean | null;
  message?: string;
  title?: string;
  type?: string | null;
  user_id?: string;
};